import { Router } from 'express';
import {
  handleListenerPush,
  testWebhookDispatch,
  getWebhookLogs,
  getUnmappedPayments,
  reconcileUnmappedPayment,
} from '../controllers/webhook.controller';
import { requireDeviceToken } from '../middleware/deviceToken.middleware';
import { requireMerchantAuth } from '../middleware/auth.middleware';

const router = Router();

// Android Listener push notification webhook (Authorized by device token)
router.post('/listener-push', requireDeviceToken, handleListenerPush);

// Merchant testing & audit logs
router.post('/test-dispatch', requireMerchantAuth, testWebhookDispatch);
router.get('/logs', requireMerchantAuth, getWebhookLogs);

// Unmapped / Disputed Payments & Reconciliation
router.get('/unmapped', requireMerchantAuth, getUnmappedPayments);
router.post('/reconcile/:unmappedId', requireMerchantAuth, reconcileUnmappedPayment);

export default router;
