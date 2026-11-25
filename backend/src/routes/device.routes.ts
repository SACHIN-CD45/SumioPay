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

const router = Router();

// Public APK Download (Direct link or QR scan on phone)
router.get('/download-apk', downloadApk);

// Merchant portal endpoints
router.post('/generate-pairing-token', requireMerchantAuth, generatePairingToken);
router.get('/my-devices', requireMerchantAuth, listMerchantDevices);
router.delete('/:deviceId', requireMerchantAuth, deleteDevice);

// Android App endpoints
router.post('/pair', completePairing);
router.post('/heartbeat', requireDeviceToken, deviceHeartbeat);

export default router;
