import { Router } from 'express';
import {
  generatePairingToken,
  completePairing,
  deviceHeartbeat,
  listMerchantDevices,
  deleteDevice,
  downloadApk,
} from '../controllers/device.controller';
import { requireMerchantAuth } from '../middleware/auth.middleware';
import { requireDeviceToken } from '../middleware/deviceToken.middleware';
import { requireActiveSubscription } from '../middleware/subscription.middleware';

const router = Router();

// Public APK Download (Direct link or QR scan on phone)
router.get('/download-apk', downloadApk);

// Merchant portal endpoints (require active 3-day trial or paid subscription)
router.post('/generate-pairing-token', requireMerchantAuth, requireActiveSubscription, generatePairingToken);
router.get('/my-devices', requireMerchantAuth, requireActiveSubscription, listMerchantDevices);
router.delete('/:deviceId', requireMerchantAuth, requireActiveSubscription, deleteDevice);

// Android App endpoints
router.post('/pair', completePairing);
router.post('/heartbeat', requireDeviceToken, deviceHeartbeat);

export default router;
