import { Router } from 'express';
import {
  createOrder,
  getOrderStatus,
  getMerchantOrders,
  simulatePayment,
} from '../controllers/order.controller';
import { requireApiKeyOrMerchantAuth } from '../middleware/apiKey.middleware';
import { requireMerchantAuth } from '../middleware/auth.middleware';

const router = Router();

// Create payment order (supports both Merchant Dashboard JWT & API Key / Secret headers)
router.post('/create', requireApiKeyOrMerchantAuth, createOrder);

// Poll order status (public endpoint with CORS allowed for frontend modals)
router.get('/status/:orderId', getOrderStatus);

// Merchant ledger
router.get('/my-orders', requireMerchantAuth, getMerchantOrders);

// Sandbox simulator for instant developer testing
router.post('/sandbox-simulate-payment/:orderId', requireApiKeyOrMerchantAuth, simulatePayment);

export default router;
