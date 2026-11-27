import { Router, Request, Response } from 'express';
import { requireMerchantAuth, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireActiveSubscription } from '../../middleware/subscription.middleware';
import { ReconciliationService } from '../../services/reconciliation.service';
import { ReconciliationBatch } from '../../models/reconciliation.model';
import { UnmappedPayment } from '../../models/unmappedPayment.model';

const router = Router();
router.use(requireMerchantAuth, requireActiveSubscription);

// Upload bank statement batch for auto-matching (Accepts JSON entries or raw CSV text)
router.post('/upload-statement', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant!._id;
    const { entries, csvText } = req.body;

    let parsedEntries = entries;

    if (csvText && typeof csvText === 'string') {
      parsedEntries = ReconciliationService.parseCsvStatement(csvText);
    }

    if (!Array.isArray(parsedEntries) || parsedEntries.length === 0) {
      res.status(400).json({ success: false, message: 'entries array or valid csvText is required' });
      return;
    }

    const batch = await ReconciliationService.processStatement({
      merchantId,
      entries: parsedEntries,
    });

    res.status(201).json({
      success: true,
      message: 'Bank statement batch processed successfully',
      data: batch,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// List reconciliation history batches
router.get('/batches', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant!._id;
    const batches = await ReconciliationBatch.find({ merchantId }).sort({ createdAt: -1 }).limit(30);

    res.status(200).json({
      success: true,
      data: batches,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// List unmatched payments queue
router.get('/unmatched', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant!._id;
    const unmatched = await UnmappedPayment.find({ merchantId }).sort({ createdAt: -1 }).limit(50);

    res.status(200).json({
      success: true,
      data: unmatched,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Manual Match Resolution
router.post('/resolve-unmatched', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant!._id;
    const { unmappedId, orderId } = req.body;

    if (!unmappedId || !orderId) {
      res.status(400).json({ success: false, message: 'unmappedId and orderId are required' });
      return;
    }

    const result = await ReconciliationService.resolveManualMatch({
      merchantId,
      unmappedId,
      orderId,
      actorEmail: req.merchant!.email,
    });

    res.status(200).json({
      success: true,
      message: `Payment successfully linked to order ${orderId}`,
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
