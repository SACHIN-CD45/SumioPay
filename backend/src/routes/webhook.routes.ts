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

const router = Router();

// Android Listener push notification webhook (Authorized by device token)
router.post('/listener-push', requireDeviceToken, handleListenerPush);

// Merchant testing & audit logs
router.post('/test-dispatch', requireMerchantAuth, testWebhookDispatch);
router.post('/simulate-push', requireMerchantAuth, simulatePushAlert);
router.get('/logs', requireMerchantAuth, getWebhookLogs);
router.post('/resend/:logId', requireMerchantAuth, resendWebhook);

// Unmapped / Disputed Payments & Reconciliation
router.get('/unmapped', requireMerchantAuth, getUnmappedPayments);
router.post('/reconcile/:unmappedId', requireMerchantAuth, reconcileUnmappedPayment);

export default router;
