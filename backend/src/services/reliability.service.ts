import { Device } from '../models/device.model';
import { IMerchant, Merchant } from '../models/merchant.model';
import { IOrder } from '../models/order.model';
import { EmailService } from './email.service';

export const DEVICE_ONLINE_WINDOW_MS = 3 * 60 * 1000;
const OFFLINE_ALERT_COOLDOWN_MS = 60 * 60 * 1000;

export function isValidTelegramBotToken(token: string): boolean {
  return /^\d+:[A-Za-z0-9_-]{20,}$/.test(String(token || '').trim());
}

export function isValidTelegramChatId(chatId: string): boolean {
  return /^-?\d{5,20}$/.test(String(chatId || '').trim()) || /^@[a-zA-Z0-9_]{5,}$/.test(String(chatId || '').trim());
}

/**
 * Checks whether live checkout initiation is permitted given the merchant's listener phone status
 * and `pauseCheckoutWhenOffline` safety shield. Test mode orders are never blocked.
 */
export async function checkMerchantListenerAvailability(
  merchant: IMerchant,
  isTestOrder: boolean
): Promise<{
  allowed: boolean;
  onlineCount: number;
  totalPaired: number;
  reason?: string;
}> {
  if (isTestOrder || !merchant?.reliabilitySettings?.pauseCheckoutWhenOffline) {
    return { allowed: true, onlineCount: 0, totalPaired: 0 };
  }

  const cutoff = new Date(Date.now() - DEVICE_ONLINE_WINDOW_MS);
  const [totalPaired, onlineCount] = await Promise.all([
    Device.countDocuments({ merchantId: merchant._id, isPaired: true, isActive: true }),
    Device.countDocuments({
      merchantId: merchant._id,
      isPaired: true,
      isActive: true,
      lastPingAt: { $gt: cutoff },
    }),
  ]);

  if (onlineCount === 0) {
    return {
      allowed: false,
      onlineCount: 0,
      totalPaired,
      reason:
        totalPaired === 0
          ? 'Checkout paused: No Android Listener device is paired to auto-verify UPI payments.'
          : 'Checkout temporarily paused: All paired Android Listener devices are offline. Please check your listener phone connection.',
    };
  }

  return { allowed: true, onlineCount, totalPaired };
}

/**
 * Sends a Telegram notification via official Bot API (`https://api.telegram.org`).
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const cleanToken = String(botToken || '').trim();
  const cleanChatId = String(chatId || '').trim();

  if (!isValidTelegramBotToken(cleanToken) || !isValidTelegramChatId(cleanChatId)) {
    return { ok: false, error: 'Invalid Telegram Bot Token or Chat ID format.' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: text.slice(0, 4000),
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      return {
        ok: false,
        error: data?.description || `Telegram API returned HTTP ${res.status}`,
      };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Telegram network request failed' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sends an instant payment credit receipt ping to the merchant's Telegram chat.
 */
export async function sendTelegramPaymentAlert(
  merchant: IMerchant,
  order: Partial<IOrder>
): Promise<boolean> {
  const rel = merchant?.reliabilitySettings;
  if (!rel?.telegramAlertsEnabled || !rel?.telegramBotToken || !rel?.telegramChatId) {
    return false;
  }

  const amountStr = Number(order.exactAmount || order.baseAmount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const modeTag = order.isTest ? '[TEST] ' : '';
  const customerInfo = [order.senderName, order.customerEmail, order.customerUserId]
    .filter(Boolean)
    .slice(0, 2)
    .join(' | ');

  const lines = [
    `✅ ${modeTag}₹${amountStr} Received via SumioPay`,
    `Store: ${merchant.websiteName || merchant.businessName}`,
    `Order: ${order.orderId || 'N/A'}`,
    `UTR: ${order.utrNumber || 'Bank Credit Confirmed'}`,
    order.bankAppName ? `App/Bank: ${order.bankAppName}` : '',
    customerInfo ? `Payer: ${customerInfo}` : '',
  ].filter(Boolean);

  const result = await sendTelegramMessage(rel.telegramBotToken, rel.telegramChatId, lines.join('\n'));
  return result.ok;
}

/**
 * Proactive sweep checking whether any active merchant's listener devices have gone offline
 * beyond their configured alert threshold. Cooldown prevents alert storms (1 alert / 60 mins).
 */
export async function runOfflineDeviceAlertSweep(): Promise<{ checked: number; alerted: number }> {
  const now = Date.now();
  let checked = 0;
  let alerted = 0;

  // Group paired active devices by merchant and check latest heartbeat timestamp
  const deviceStats = await Device.aggregate([
    { $match: { isPaired: true, isActive: true } },
    {
      $group: {
        _id: '$merchantId',
        totalDevices: { $sum: 1 },
        latestPing: { $max: '$lastPingAt' },
      },
    },
  ]);

  for (const stat of deviceStats) {
    checked += 1;
    const merchant = await Merchant.findById(stat._id);
    if (!merchant || !merchant.isActive) continue;

    const alertMinutes = Math.max(3, Math.min(120, merchant.reliabilitySettings?.offlineAlertMinutes || 5));
    const cutoff = now - alertMinutes * 60 * 1000;
    const latestPingMs = stat.latestPing ? new Date(stat.latestPing).getTime() : 0;

    if (latestPingMs > cutoff) {
      continue; // At least one device is healthy/online
    }

    const lastAlertAt = merchant.reliabilitySettings?.lastOfflineAlertAt
      ? new Date(merchant.reliabilitySettings.lastOfflineAlertAt).getTime()
      : 0;
    if (lastAlertAt && now - lastAlertAt < OFFLINE_ALERT_COOLDOWN_MS) {
      continue; // Inside cooldown window
    }

    // Acquire cooldown lock atomically before sending external alerts
    const claimed = await Merchant.findOneAndUpdate(
      {
        _id: merchant._id,
        $or: [
          { 'reliabilitySettings.lastOfflineAlertAt': null },
          { 'reliabilitySettings.lastOfflineAlertAt': { $exists: false } },
          { 'reliabilitySettings.lastOfflineAlertAt': { $lt: new Date(now - OFFLINE_ALERT_COOLDOWN_MS) } },
        ],
      },
      { $set: { 'reliabilitySettings.lastOfflineAlertAt': new Date(now) } },
      { new: true }
    );
    if (!claimed) continue;

    alerted += 1;
    const pauseCheckout = Boolean(merchant.reliabilitySettings?.pauseCheckoutWhenOffline);

    EmailService.sendDeviceOfflineAlert(merchant.email, merchant.name, merchant.businessName, {
      offlineMinutes: alertMinutes,
      totalDevices: stat.totalDevices,
      pauseCheckoutWhenOffline: pauseCheckout,
    }).catch(() => {});

    if (
      merchant.reliabilitySettings?.telegramAlertsEnabled &&
      merchant.reliabilitySettings?.telegramBotToken &&
      merchant.reliabilitySettings?.telegramChatId
    ) {
      sendTelegramMessage(
        merchant.reliabilitySettings.telegramBotToken,
        merchant.reliabilitySettings.telegramChatId,
        [
          `⚠️ SumioPay Listener Offline Alert`,
          `Business: ${merchant.businessName}`,
          `All ${stat.totalDevices} paired Android listener(s) have been silent for >= ${alertMinutes} min.`,
          pauseCheckout
            ? `Checkout Shield: Live QR initiation is PAUSED until a device reconnects.`
            : `Tip: Check phone Wi-Fi/battery or enable Pause Checkout When Offline in /devices.`,
        ].join('\n')
      ).catch(() => {});
    }
  }

  return { checked, alerted };
}
