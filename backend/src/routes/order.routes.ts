import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createOrder,
  getOrderStatus,
  getMerchantOrders,
  simulatePayment,
  submitCustomerUtr,
} from '../controllers/order.controller';
import { requireApiKeyOrMerchantAuth } from '../middleware/apiKey.middleware';
import { requireMerchantAuth } from '../middleware/auth.middleware';
import { requireActiveSubscription } from '../middleware/subscription.middleware';

const router = Router();

const utrSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many UTR verification attempts. Please wait a few minutes before retrying.',
  },
});

// Create payment order (supports both Merchant Dashboard JWT & API Key / Secret headers; blocks when expired)
router.post('/create', requireApiKeyOrMerchantAuth, requireActiveSubscription, createOrder);

// Poll order status (public endpoint with CORS allowed for frontend modals)
router.get('/status/:orderId', getOrderStatus);

// Public checkout customer UTR submission (strictly rate-limited, matches real listener credits only)
router.post('/submit-utr/:orderId', utrSubmitLimiter, submitCustomerUtr);

// Merchant ledger
router.get('/my-orders', requireMerchantAuth, requireActiveSubscription, getMerchantOrders);

// Sandbox simulator for instant developer testing (strictly merchant portal JWT, Test orders only)
router.post('/sandbox-simulate-payment/:orderId', requireMerchantAuth, requireActiveSubscription, simulatePayment);

export default router;
