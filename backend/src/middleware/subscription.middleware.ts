import { Request, Response, NextFunction } from 'express';
import { evaluateMerchantSubscription } from '../services/subscriptionActivation.service';

/**
 * Enforces that a merchant's 3-day free trial or paid subscription plan is currently active.
 * Rejects ALL operational portal & API actions with HTTP 402 SUBSCRIPTION_EXPIRED once expired,
 * leaving only login/auth and /billing subscription activation accessible.
 */
export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = (req as any).merchant;
    if (!merchant || !merchant._id) {
      res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Merchant authentication is required.',
      });
      return;
    }

    const entitlement = await evaluateMerchantSubscription(merchant);
    (req as any).subscriptionEntitlement = entitlement;

    if (!entitlement.isEntitled) {
      const msg =
        entitlement.status === 'TRIAL'
          ? 'Your 3-day free trial has expired. Please activate a subscription plan under Billing & Plans to continue using SumioPay.'
          : 'Your SumioPay subscription plan has expired. Please renew your plan under Billing & Plans to regain access.';

      res.status(402).json({
        success: false,
        code: 'SUBSCRIPTION_EXPIRED',
        message: msg,
        error: {
          code: 'SUBSCRIPTION_EXPIRED',
          message: msg,
        },
        subscription: {
          planTier: entitlement.planTier,
          status: entitlement.status,
          isExpired: true,
          daysRemaining: 0,
          currentPeriodEnd: entitlement.currentPeriodEnd,
        },
      });
      return;
    }

    next();
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify subscription entitlement',
      error: err.message,
    });
  }
};
