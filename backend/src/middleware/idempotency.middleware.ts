import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { IdempotencyRecord } from '../models/idempotency.model';

export const requireIdempotency = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    // If client did not provide Idempotency-Key, proceed normally
    return next();
  }

  const merchantId = (req as any).merchant?._id;
  if (!merchantId) {
    return next();
  }

  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(req.body || {}))
    .digest('hex');

  try {
    const existing = await IdempotencyRecord.findOne({
      key: idempotencyKey,
      merchantId,
    });

    if (existing) {
      res.setHeader('x-idempotent-replay', 'true');
      res.status(existing.responseStatus).json(existing.responseBody);
      return;
    }

    // Intercept res.json to cache response upon successful completion
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        IdempotencyRecord.create({
          key: idempotencyKey,
          merchantId,
          endpoint: req.originalUrl,
          requestHash,
          responseStatus: res.statusCode,
          responseBody: body,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours TTL
        }).catch((err) => console.error('[Idempotency Cache Error]', err.message));
      }
      return originalJson(body);
    };

    next();
  } catch (err: any) {
    next(err);
  }
};
