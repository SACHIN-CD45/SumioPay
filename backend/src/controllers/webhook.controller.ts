import { Request, Response } from 'express';
import { parseBankNotification } from '../utils/bankNotificationParser';
import { Order } from '../models/order.model';
import { Merchant } from '../models/merchant.model';
import { WebhookLog } from '../models/webhookLog.model';
import { UnmappedPayment } from '../models/unmappedPayment.model';
import { dispatchMerchantWebhook } from '../utils/hmacSigner';
import { EmailService } from '../services/email.service';

// Android APK Listener calls this when any bank/UPI notification is intercepted
export const handleListenerPush = async (req: Request, res: Response): Promise<void> => {
  try {
    const device = (req as any).device;
    if (!device) {
      res.status(401).json({ success: false, message: 'Unauthorized device' });
      return;
    }

    const { package_name = '', title = '', message = '', post_time } = req.body;

    if (!message) {
      res.status(400).json({ success: false, message: 'Notification message is required' });
      return;
    }

    // 1. Parse notification using universal regex engine
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

    const merchantId = device.merchantId;
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    // 2. Anti-Fraud Check: Prevent Duplicate UTR Reuse (Replay Attack)
    if (parsed.utr) {
      const utrExists = await Order.findOne({
        merchantId,
        utrNumber: parsed.utr,
        status: 'PAID',
      });
      if (utrExists) {
        res.status(409).json({
          success: false,
          securityAlert: 'DUPLICATE_UTR_REPLAY_ATTEMPT',
          message: `Security Warning: UTR ${parsed.utr} has already been credited to order ${utrExists.orderId}. Replay rejected.`,
        });
        return;
      }
    }

    // 3. Strict Differential Matching: Look for matching active PENDING order with exact rupee & paise
    const matchingOrder = await Order.findOne({
      merchantId,
      exactAmount: parsed.amount,
      status: 'PENDING',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!matchingOrder) {
      // Check if order exists but already marked paid
      const alreadyPaid = await Order.findOne({
        merchantId,
        exactAmount: parsed.amount,
        status: 'PAID',
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

      // Log into Unmapped Payments for Merchant Reconciliation
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

      res.status(200).json({
        success: true,
        matched: false,
        amount: parsed.amount,
        utr: parsed.utr,
        message: `No active PENDING order matched ₹${parsed.amount.toFixed(2)}. Saved to Unmapped Payments ledger for manual review.`,
      });
      return;
    }

    // 4. Mark Order as PAID atomically
    matchingOrder.status = 'PAID';
    matchingOrder.paidAt = new Date();
    matchingOrder.utrNumber = parsed.utr || matchingOrder.utrNumber || '';
    matchingOrder.rawNotificationMessage = message;
    matchingOrder.bankAppName = parsed.appName || package_name;
    await matchingOrder.save();

    // 5. Update merchant lifetime volume and transactions counter
    await Merchant.findByIdAndUpdate(merchantId, {
      $inc: { totalVolume: matchingOrder.exactAmount, totalTransactions: 1 },
    });

    // 6. Send Instant Payment Confirmation / Invoice Email
    const customerOrMerchantEmail = matchingOrder.customerEmail || merchant.email;
    if (customerOrMerchantEmail) {
      EmailService.sendPaymentReceipt(
        customerOrMerchantEmail,
        matchingOrder.customerPhone || merchant.businessName,
        {
          orderId: matchingOrder.orderId,
          amount: matchingOrder.baseAmount,
          exactAmount: matchingOrder.exactAmount,
          paiseOffset: matchingOrder.paiseOffset,
          utr: matchingOrder.utrNumber || 'Direct Bank Credit',
          merchantBusinessName: merchant.businessName,
          appName: matchingOrder.appName,
          paymentDate: matchingOrder.paidAt
            ? matchingOrder.paidAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
            : undefined,
        }
      ).catch((emailErr) => {
        console.error(`[EmailReceipt] Failed to send receipt for ${matchingOrder.orderId}:`, emailErr.message);
      });
    }

    // 7. Trigger Webhook with HMAC-SHA256 signature to client's SaaS endpoint
    const targetUrl = matchingOrder.callbackWebhookUrl || merchant.webhookUrl;
    if (targetUrl) {
      dispatchMerchantWebhook(
        merchant._id,
        matchingOrder.orderId,
        targetUrl,
        merchant.webhookSecret,
        {
          orderId: matchingOrder.orderId,
          appName: matchingOrder.appName,
          userId: matchingOrder.customerUserId,
          customerUserId: matchingOrder.customerUserId,
          baseAmount: matchingOrder.baseAmount,
          exactAmount: matchingOrder.exactAmount,
          amount: matchingOrder.exactAmount,
          amountInPaise: Math.round(matchingOrder.exactAmount * 100),
          status: 'PAID',
          utr: matchingOrder.utrNumber,
          utrNumber: matchingOrder.utrNumber,
          metadata: matchingOrder.metadata || {},
          paidAt: matchingOrder.paidAt,
        }
      ).catch((err) => {
        console.error(`[Webhook] Dispatch failed for order ${matchingOrder.orderId}:`, err.message);
      });
    }

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

    if (!destinationUrl) {
      res.status(400).json({
        success: false,
        message: 'No webhook URL provided or configured on merchant account',
      });
      return;
    }

    const delivered = await dispatchMerchantWebhook(
      merchant._id,
      `TEST_${Date.now()}`,
      destinationUrl,
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
      destinationUrl,
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

    // If linked to an order, mark that order as PAID
    if (orderId) {
      const order = await Order.findOne({ orderId, merchantId });
      if (order && order.status === 'PENDING') {
        order.status = 'PAID';
        order.paidAt = new Date();
        order.utrNumber = payment.utrNumber || order.utrNumber || '';
        order.rawNotificationMessage = payment.rawMessage;
        await order.save();
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
