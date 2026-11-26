import { Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { Device } from '../models/device.model';
import { Merchant } from '../models/merchant.model';
import { config } from '../config';

// Merchant generates pairing QR data
export const generatePairingToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchant?.id || (req as any).merchant?._id;
    const { deviceName = 'Android Payment Listener' } = req.body;

    // Remove any stale un-paired tokens for this merchant
    await Device.deleteMany({ merchantId, isPaired: { $ne: true } });

    const pairingToken = `pair_${crypto.randomBytes(16).toString('hex')}`;
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Create a provisional device record (isPaired: false, isActive: false, lastPingAt: null)
    const device = new Device({
      merchantId,
      deviceName,
      pairingToken,
      deviceToken: `dev_${crypto.randomBytes(20).toString('hex')}`,
      batteryPercent: 100,
      isCharging: false,
      isPaired: false,
      isActive: false,
    });

    await device.save();

    const pairingPayload = {
      serverUrl: config.BASE_URL,
      pairingToken,
      merchantId,
      expiresAt: tokenExpiry.toISOString(),
    };

    res.status(201).json({
      success: true,
      data: {
        deviceId: device._id,
        pairingToken,
        pairingPayloadJson: JSON.stringify(pairingPayload),
        expiresAt: tokenExpiry,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Android APK scans QR and completes pairing
export const completePairing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pairingToken, deviceModel, androidVersion, batteryPercent, isCharging } = req.body;

    if (!pairingToken) {
      res.status(400).json({ success: false, message: 'pairingToken is required' });
      return;
    }

    const device = await Device.findOne({ pairingToken });
    if (!device) {
      res.status(404).json({ success: false, message: 'Invalid or expired pairing token' });
      return;
    }

    const merchant = await Merchant.findById(device.merchantId);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Associated merchant not found' });
      return;
    }

    device.isPaired = true;
    device.isActive = true;
    device.deviceModel = deviceModel || 'Android Device';
    device.androidVersion = androidVersion || '13';
    device.batteryPercent = batteryPercent ?? 100;
    device.isCharging = isCharging !== undefined ? !!isCharging : true;
    device.lastPingAt = new Date();
    device.pairingToken = undefined; // consume pairing token
    await device.save();

    res.status(200).json({
      success: true,
      message: 'Device successfully paired',
      data: {
        deviceToken: device.deviceToken,
        merchantId: merchant._id,
        merchantName: merchant.businessName,
        upiId: merchant.upiId,
        serverUrl: config.BASE_URL,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Android APK sends periodic heartbeat
export const deviceHeartbeat = async (req: Request, res: Response): Promise<void> => {
  try {
    const device = (req as any).device;
    if (!device) {
      res.status(401).json({ success: false, message: 'Unauthorized device' });
      return;
    }

    const { batteryPercent, isCharging } = req.body;

    device.lastPingAt = new Date();
    if (batteryPercent !== undefined) device.batteryPercent = batteryPercent;
    if (isCharging !== undefined) device.isCharging = !!isCharging;
    await device.save();

    res.status(200).json({
      success: true,
      message: 'Heartbeat acknowledged',
      timestamp: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Merchant lists their registered devices
export const listMerchantDevices = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchant?.id || (req as any).merchant?._id;

    // Prune any legacy un-paired or phantom devices
    await Device.deleteMany({
      merchantId,
      isPaired: { $ne: true },
    });

    const devices = await Device.find({ merchantId, isPaired: true }).sort({ createdAt: -1 });

    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    const formattedDevices = devices.map((d: any) => {
      const isOnline = d.isActive && d.lastPingAt && new Date(d.lastPingAt) > threeMinutesAgo;
      return {
        id: d._id,
        deviceName: d.deviceName,
        deviceModel: d.deviceModel || 'Android Phone',
        androidVersion: d.androidVersion || 'Android',
        batteryPercent: d.batteryPercent ?? 100,
        isCharging: !!d.isCharging,
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        lastPingAt: d.lastPingAt,
        createdAt: d.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedDevices,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Merchant deletes / unlinks a device
export const deleteDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchant?.id || (req as any).merchant?._id;
    const { deviceId } = req.params;

    const device = await Device.findOneAndDelete({ _id: deviceId, merchantId });
    if (!device) {
      res.status(404).json({ success: false, message: 'Device not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Device unlinked successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Download Companion Android Listener APK
export const downloadApk = async (_req: Request, res: Response): Promise<void> => {
  try {
    const candidatePaths = [
      path.resolve(process.cwd(), 'backend/public/downloads/SumioPayListener-v2.5.apk'),
      path.resolve(process.cwd(), 'public/downloads/SumioPayListener-v2.5.apk'),
      path.resolve(process.cwd(), 'frontend/public/downloads/SumioPayListener-v2.5.apk'),
      path.resolve(process.cwd(), 'frontend/dist/downloads/SumioPayListener-v2.5.apk'),
      path.resolve(__dirname, '../../../android-listener-apk/SumioPayListener-v2.5.apk'),
      path.resolve(__dirname, '../../public/downloads/SumioPayListener-v2.5.apk'),
      path.resolve(process.cwd(), 'android-listener-apk/SumioPayListener-v2.5.apk'),
      path.resolve(process.cwd(), '../android-listener-apk/SumioPayListener-v2.5.apk'),
      path.resolve(process.cwd(), 'backend/public/downloads/SumioPayListener-v2.4.apk'),
      path.resolve(process.cwd(), 'public/downloads/SumioPayListener-v2.4.apk'),
      path.resolve(process.cwd(), 'frontend/public/downloads/SumioPayListener-v2.4.apk'),
      path.resolve(process.cwd(), 'frontend/dist/downloads/SumioPayListener-v2.4.apk'),
      path.resolve(__dirname, '../../../android-listener-apk/SumioPayListener-v2.4.apk'),
      path.resolve(__dirname, '../../public/downloads/SumioPayListener-v2.4.apk'),
      path.resolve(process.cwd(), 'android-listener-apk/SumioPayListener-v2.4.apk'),
      path.resolve(process.cwd(), '../android-listener-apk/SumioPayListener-v2.4.apk'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const filename = path.basename(p);
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.sendFile(p);
        return;
      }
    }

    res.status(404).json({ success: false, message: 'SumioPayListener APK binary file not found' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
