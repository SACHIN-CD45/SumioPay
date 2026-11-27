import { Router } from 'express';
import {
  handleListenerPush,
  testWebhookDispatch,
  getWebhookLogs,
  resendWebhook,
  getUnmappedPayments,
  reconcileUnmappedPayment,
  simulatePushAlert,
} from '../controllers/webhook.controller';
import { requireDeviceToken } from '../middleware/deviceToken.middleware';
import { requireMerchantAuth } from '../middleware/auth.middleware';
import { requireActiveSubscription } from '../middleware/subscription.middleware';

const router = Router();

// Android Listener push notification webhook (Authorized by device token + active subscription)
router.post('/listener-push', requireDeviceToken, requireActiveSubscription, handleListenerPush);

// Merchant testing & audit logs
router.post('/test-dispatch', requireMerchantAuth, requireActiveSubscription, testWebhookDispatch);
router.post('/simulate-push', requireMerchantAuth, requireActiveSubscription, simulatePushAlert);
router.get('/logs', requireMerchantAuth, requireActiveSubscription, getWebhookLogs);
router.post('/resend/:logId', requireMerchantAuth, requireActiveSubscription, resendWebhook);

// Unmapped / Disputed Payments & Reconciliation
router.get('/unmapped', requireMerchantAuth, requireActiveSubscription, getUnmappedPayments);
router.post('/reconcile/:unmappedId', requireMerchantAuth, requireActiveSubscription, reconcileUnmappedPayment);

export default router;
