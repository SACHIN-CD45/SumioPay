import { Request, Response, NextFunction } from 'express';
import { Device, IDevice } from '../models/device.model';
import { Merchant, IMerchant } from '../models/merchant.model';

export interface DeviceRequest extends Request {
  device?: IDevice;
  merchant?: IMerchant;
}

/**
 * Authenticates incoming HTTP webhook from the Android PaymentListenerService
 * Header required:
 * - x-device-token: dev_xxxx
 */
export const requireDeviceToken = async (
  req: DeviceRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawToken =
      (req.headers['x-device-token'] as string) || (req.body?.deviceToken as string);
    const deviceToken = typeof rawToken === 'string' ? rawToken.trim() : '';

    if (!deviceToken) {
      res.status(401).json({
        success: false,
        error: 'DEVICE_TOKEN_MISSING',
        message: 'Device Token is missing. Configure your Android Listener App.',
      });
      return;
    }

    // Only fully paired and active listener devices can authenticate
    const device = await Device.findOne({ deviceToken, isActive: true, isPaired: true });
    if (!device) {
      res.status(401).json({
        success: false,
        error: 'INVALID_DEVICE_TOKEN',
        message: 'Device token not recognized or deactivated.',
      });
      return;
    }

    const merchant = await Merchant.findById(device.merchantId);
    if (!merchant || !merchant.isActive) {
      res.status(403).json({
        success: false,
        error: 'MERCHANT_INACTIVE',
        message: 'Associated merchant account is inactive.',
      });
      return;
    }

    req.device = device;
    req.merchant = merchant;
    next();
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Device authorization failed', error: err.message });
  }
};

export const authenticateDeviceToken = requireDeviceToken;
