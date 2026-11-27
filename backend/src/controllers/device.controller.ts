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
    const tokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 mins validity

    // Create a provisional device record (isPaired: false, isActive: false, lastPingAt: null)
    const device = new Device({
      merchantId,
      deviceName,
      pairingToken,
      pairingExpiresAt: tokenExpiry,
      deviceToken: `dev_${crypto.randomBytes(20).toString('hex')}`,
      batteryPercent: 100,
      isCharging: false,
      isPaired: false,
      isActive: false,
    });

    await device.save();

    const envPublicApi = (process.env.API_PUBLIC_URL || '').trim().replace(/\/+$/, '');
    const proto = String(req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
    const host = String(req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
    const configUrl = (config.BASE_URL || '').replace(/\/+$/, '');
    const resolvedServerUrl =
      envPublicApi ||
      (configUrl && !configUrl.includes('localhost') && !configUrl.includes('127.0.0.1')
        ? configUrl
        : host && !host.includes('localhost') && !host.includes('127.0.0.1')
        ? `${proto}://${host}`
        : configUrl || 'https://apipay.sumiotech.in');

    const pairingUri = `sumiopay://pair?token=${encodeURIComponent(pairingToken)}&server=${encodeURIComponent(resolvedServerUrl)}`;

    const pairingPayload = {
      serverUrl: resolvedServerUrl,
      pairingToken,
      merchantId,
      expiresAt: tokenExpiry.toISOString(),
    };

    res.status(201).json({
      success: true,
      data: {
        deviceId: device._id,
        pairingToken,
        serverUrl: resolvedServerUrl,
        pairingUri,
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

    const cleanToken = pairingToken.trim();
    const withPrefix = cleanToken.startsWith('pair_') ? cleanToken : `pair_${cleanToken}`;

    const device = await Device.findOne({
      $or: [{ pairingToken: cleanToken }, { pairingToken: withPrefix }],
    });
    if (!device || (device.pairingExpiresAt && device.pairingExpiresAt.getTime() <= Date.now())) {
      if (device && device.pairingExpiresAt && device.pairingExpiresAt.getTime() <= Date.now()) {
        await Device.deleteOne({ _id: device._id, isPaired: { $ne: true } }).catch(() => {});
      }
      res.status(400).json({
        success: false,
        message: 'Invalid or expired pairing token. Please generate a fresh token from your web dashboard.',
      });
      return;
    }

    const merchant = await Merchant.findById(device.merchantId);
    if (!merchant || !merchant.isActive) {
      res.status(403).json({ success: false, message: 'Associated merchant not found or suspended' });
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
    device.pairingExpiresAt = undefined;
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
      path.resolve(process.cwd(), 'backend/public/downloads/SumioPayListener-v2.6.apk'),
      path.resolve(process.cwd(), 'public/downloads/SumioPayListener-v2.6.apk'),
      path.resolve(process.cwd(), 'frontend/public/downloads/SumioPayListener-v2.6.apk'),
      path.resolve(process.cwd(), 'frontend/dist/downloads/SumioPayListener-v2.6.apk'),
      path.resolve(__dirname, '../../../android-listener-apk/SumioPayListener-v2.6.apk'),
      path.resolve(__dirname, '../../public/downloads/SumioPayListener-v2.6.apk'),
      path.resolve(process.cwd(), 'android-listener-apk/SumioPayListener-v2.6.apk'),
      path.resolve(process.cwd(), '../android-listener-apk/SumioPayListener-v2.6.apk'),
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
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.sendFile(p);
        return;
      }
    }

    res.status(404).json({ success: false, message: 'SumioPayListener APK binary file not found' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
