import { Request, Response } from 'express';
import { parseBankNotification } from '../utils/bankNotificationParser';
import { Order } from '../models/order.model';
import { Merchant } from '../models/merchant.model';
import { Device } from '../models/device.model';
import { WebhookLog } from '../models/webhookLog.model';
import { UnmappedPayment } from '../models/unmappedPayment.model';
import { SecurityEvent } from '../models/securityEvent.model';
import { dispatchMerchantWebhook } from '../utils/hmacSigner';
import { validateSafeWebhookUrl } from '../utils/securityGuards';
import { finalizePaidOrderSideEffects } from '../services/paymentSettlement.service';

// Android APK Listener calls this when any bank/UPI notification is intercepted
export const handleListenerPush = async (req: Request, res: Response): Promise<void> => {
  try {
    const device = (req as any).device;
    if (!device) {
      res.status(401).json({ success: false, message: 'Unauthorized device' });
      return;
    }

    const { package_name = '', title = '', message = '' } = req.body;

    if (!message || typeof message !== 'string' || message.length > 2000) {
      res.status(400).json({ success: false, message: 'Valid notification message (<= 2000 chars) is required' });
      return;
    }

    const merchantId = device.merchantId;

    // Refresh device heartbeat timestamp on any legitimate telemetry ping
    Device.updateOne({ _id: device._id }, { $set: { lastPingAt: new Date() } }).catch(() => {});

    // 1. Parse notification using universal regex engine (ignores debits, OTPs & collect requests)
    const parsed = parseBankNotification(message, package_name);

    if (!parsed.isPaymentAlert || !parsed.amount || parsed.amount <= 0) {
      res.status(200).json({
        success: true,
        ignored: true,
        reason: 'Not an incoming credit payment notification',
        extracted: parsed,
      });
      return;
    }

    const merchant = await Merchant.findById(merchantId);
    if (!merchant || !merchant.isActive) {
      res.status(403).json({ success: false, message: 'Merchant account inactive or not found' });
      return;
    }

    const isApkSandboxCheck =
      package_name === 'com.phonepe.simulator' ||
      message.includes('(PhonePe Test Alert)');

    // 2. Anti-Fraud Check: Prevent Duplicate UTR Reuse (Replay Attack) across paid orders
    if (parsed.utr && !isApkSandboxCheck) {
      const utrExists = await Order.findOne({
        merchantId,
        utrNumber: parsed.utr,
        status: 'PAID',
        isTest: { $ne: true },
      });
      if (utrExists) {
        // Check if this is just the same order's dual alert (e.g. PhonePe + Bank SMS for identical amount)
        if (Math.abs(Number(utrExists.exactAmount || 0) - parsed.amount) <= 0.01) {
          res.status(200).json({
            success: true,
            matched: true,
            duplicate: true,
            orderId: utrExists.orderId,
            message: 'Order was already verified and marked as PAID',
          });
          return;
        }

        SecurityEvent.create({
          merchantId,
          eventType: 'DUPLICATE_UTR_ATTEMPT',
          severity: 'HIGH',
          description: `Duplicate UTR ${parsed.utr} replay attempt detected against settled order ${utrExists.orderId}.`,
          ipAddress: req.ip || '',
          userAgent: req.get('user-agent') || 'SumioPayListener',
          metadata: { utr: parsed.utr, existingOrderId: utrExists.orderId, incomingAmount: parsed.amount },
        }).catch(() => {});

        res.status(409).json({
          success: false,
          securityAlert: 'DUPLICATE_UTR_REPLAY_ATTEMPT',
          message: `Security Warning: UTR ${parsed.utr} has already been credited to order ${utrExists.orderId}. Replay rejected.`,
        });
        return;
      }
    }

    // 3. Atomic Differential Matching: Isolate Test vs Live orders & prevent double-credit race conditions
    // when Bank SMS and UPI push notifications arrive milliseconds apart.
    const updateFields: Record<string, any> = {
      status: 'PAID',
      paidAt: new Date(),
      rawNotificationMessage: message,
      senderName: parsed.senderName || '',
      bankAppName: parsed.appName || package_name,
    };
    if (parsed.utr) {
      updateFields.utrNumber = parsed.utr;
    }

    const matchingOrder = await Order.findOneAndUpdate(
      {
        merchantId,
        exactAmount: parsed.amount,
        status: 'PENDING',
        isTest: isApkSandboxCheck ? true : { $ne: true },
        expiresAt: { $gt: new Date() },
      },
      { $set: updateFields },
      { new: true, sort: { createdAt: -1 } }
    );

    if (!matchingOrder) {
      // Check if an order with this exact amount was already settled cleanly by a parallel alert
      const alreadyPaid = await Order.findOne({
        merchantId,
        exactAmount: parsed.amount,
        status: 'PAID',
        isTest: isApkSandboxCheck ? true : { $ne: true },
      }).sort({ updatedAt: -1 });

      if (alreadyPaid) {
        res.status(200).json({
          success: true,
          matched: true,
          duplicate: true,
          orderId: alreadyPaid.orderId,
          message: 'Order was already verified and marked as PAID',
        });
        return;
      }

      if (isApkSandboxCheck) {
        res.status(200).json({
          success: true,
          matched: false,
          amount: parsed.amount,
          utr: parsed.utr,
          message: `Sandbox check ignored for live orders — create a Test Mode ₹${parsed.amount.toFixed(2)} order to test matching.`,
        });
        return;
      }

      // Deduplicate unmapped credit entries when both UPI app and Bank SMS fire for the same UTR
      let existingUnmapped = null;
      if (parsed.utr) {
        existingUnmapped = await UnmappedPayment.findOne({
          merchantId,
          utrNumber: parsed.utr,
        });
      }

      if (!existingUnmapped) {
        try {
          await UnmappedPayment.create({
            merchantId,
            amount: parsed.amount,
            utrNumber: parsed.utr || '',
            senderName: parsed.senderName || '',
            rawMessage: message,
            bankAppName: parsed.appName || package_name,
            status: 'UNRESOLVED',
            notes: `Received at ${new Date().toISOString()} but no pending order matched exact amount ₹${parsed.amount.toFixed(2)}`,
          });
        } catch (err: any) {
          console.error('[UnmappedPayment Log Error]', err.message);
        }
      }

      res.status(200).json({
        success: true,
        matched: false,
        amount: parsed.amount,
        utr: parsed.utr,
        message: `No active PENDING order matched ₹${parsed.amount.toFixed(2)}. Saved to Unmapped Payments ledger for manual review.`,
      });
      return;
    }

    // 4. Unified Post-Payment Fulfillment: Subscription Activation, Live GMV, Enterprise Bill Emails & Signed Webhook
    await finalizePaidOrderSideEffects({
      order: matchingOrder,
      merchant,
    });

    res.status(200).json({
      success: true,
      matched: true,
      orderId: matchingOrder.orderId,
      appName: matchingOrder.appName,
      amount: matchingOrder.exactAmount,
      utr: matchingOrder.utrNumber,
      message: 'Payment verified and marked as PAID successfully',
    });
  } catch (err: any) {
    console.error('[handleListenerPush Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Developer Simulator: Test webhook dispatch to client's server
export const testWebhookDispatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchant?.id || (req as any).merchant?._id;
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    const { targetUrl } = req.body;
    const destinationUrl = targetUrl || merchant.webhookUrl;

    const urlCheck = validateSafeWebhookUrl(destinationUrl);
    if (!urlCheck.valid || !urlCheck.url) {
      res.status(400).json({
        success: false,
        message: urlCheck.reason || 'No valid webhook URL provided or configured on merchant account',
      });
      return;
    }

    const delivered = await dispatchMerchantWebhook(
      merchant._id,
      `TEST_${Date.now()}`,
      urlCheck.url,
      merchant.webhookSecret,
      {
        orderId: `ORD_DEMO_${Date.now()}`,
        appName: 'TEST_DEMO',
        userId: 'usr_sample_123',
        baseAmount: 499,
        exactAmount: 499.45,
        status: 'PAID',
        utr: '432109876543',
        paidAt: new Date().toISOString(),
      }
    );

    res.status(200).json({
      success: delivered,
      message: delivered ? 'Test webhook delivered successfully' : 'Webhook destination unreachable',
      destinationUrl: urlCheck.url,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Merchant queries Webhook Delivery Logs
export const getWebhookLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchant?.id || (req as any).merchant?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [logs, total] = await Promise.all([
      WebhookLog.find({ merchantId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      WebhookLog.countDocuments({ merchantId }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Merchant retries/redelivers a specific webhook event
export const resendWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchant?.id || (req as any).merchant?._id;
    const { logId } = req.params;

    const log = await WebhookLog.findOne({ _id: logId, merchantId });
    if (!log) {
      res.status(404).json({ success: false, message: 'Webhook delivery log not found' });
      return;
    }

    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    const eventData = log.payload?.data || log.payload;
    const eventType = log.payload?.type || 'payment.succeeded';

    const delivered = await dispatchMerchantWebhook(
      merchant._id,
      log.orderId,
      log.url,
      merchant.webhookSecret,
      eventData,
      eventType as any
    );

    res.status(200).json({
      success: delivered,
      message: delivered ? 'Webhook event redelivered successfully' : 'Redelivery failed to destination endpoint',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Merchant queries Unmapped Payments (Disputes / Unknown credits)
export const getUnmappedPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchant?.id || (req as any).merchant?._id;
    const unmapped = await UnmappedPayment.find({ merchantId }).sort({ createdAt: -1 }).limit(50);

    res.status(200).json({
      success: true,
      data: unmapped,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Merchant reconciles an unmapped payment manually
export const reconcileUnmappedPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchant?.id || (req as any).merchant?._id;
    const { unmappedId } = req.params;
    const { status = 'RESOLVED', notes = '', orderId = '' } = req.body;

    const payment = await UnmappedPayment.findOne({ _id: unmappedId, merchantId });
    if (!payment) {
      res.status(404).json({ success: false, message: 'Unmapped payment record not found' });
      return;
    }

    payment.status = status;
    payment.notes = notes || payment.notes;
    payment.resolvedOrderId = orderId || payment.resolvedOrderId;
    await payment.save();

    if (orderId) {
      const updatedOrder = await Order.findOneAndUpdate(
        { orderId, merchantId, status: { $in: ['PENDING', 'EXPIRED'] } },
        {
          $set: {
            status: 'PAID',
            paidAt: new Date(),
            ...(payment.utrNumber ? { utrNumber: payment.utrNumber } : {}),
            rawNotificationMessage: payment.rawMessage,
            senderName: payment.senderName || '',
            bankAppName: payment.bankAppName || '',
          },
        },
        { new: true }
      );
      if (updatedOrder) {
        await finalizePaidOrderSideEffects({ order: updatedOrder });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Unmapped payment reconciled successfully',
      data: payment,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Authenticated Merchant Simulator: strictly tests Test Mode (`isTest: true`) orders within same merchant
export const simulatePushAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchant = (req as any).merchant;
    const merchantId = merchant._id;
    const { package_name = '', message = '' } = req.body;

    if (!message || typeof message !== 'string' || message.length > 2000) {
      res.status(400).json({ success: false, message: 'Valid notification message (<= 2000 chars) is required' });
      return;
    }

    const parsed = parseBankNotification(message, package_name);
    if (!parsed.isPaymentAlert || !parsed.amount || parsed.amount <= 0) {
      res.status(200).json({
        success: true,
        matched: false,
        message: 'Message is not a credit payment alert',
        extracted: parsed,
      });
      return;
    }

    const matchingOrder = await Order.findOneAndUpdate(
      {
        merchantId,
        exactAmount: parsed.amount,
        status: 'PENDING',
        isTest: true,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: 'PAID',
          paidAt: new Date(),
          utrNumber: parsed.utr || `SIM${Date.now().toString().slice(-9)}`,
          rawNotificationMessage: message,
          senderName: parsed.senderName || '',
          bankAppName: parsed.appName || package_name,
        },
      },
      { new: true, sort: { createdAt: -1 } }
    );

    if (!matchingOrder) {
      const liveOrderSameAmount = await Order.findOne({
        merchantId,
        exactAmount: parsed.amount,
        status: 'PENDING',
        isTest: { $ne: true },
      });

      res.status(200).json({
        success: true,
        matched: false,
        message: liveOrderSameAmount
          ? `Order ${liveOrderSameAmount.orderId} (₹${parsed.amount.toFixed(2)}) is a LIVE order and cannot be credited via browser simulator. Switch top toggle to Test Mode when creating test orders.`
          : `No active Test Mode pending order matched exact ₹${parsed.amount.toFixed(2)}.`,
      });
      return;
    }

    await finalizePaidOrderSideEffects({
      order: matchingOrder,
      merchant,
      skipVolumeIncrement: true,
    });

    res.status(200).json({
      success: true,
      matched: true,
      orderId: matchingOrder.orderId,
      amount: matchingOrder.exactAmount,
      utr: matchingOrder.utrNumber,
      message: `Test Mode order ${matchingOrder.orderId} matched & marked PAID via simulated ${parsed.appName} alert!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
