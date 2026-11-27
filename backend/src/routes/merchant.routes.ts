import { Router } from 'express';
import {
  registerMerchant,
  sendRegistrationOtp,
  sendForgotPasswordOtp,
  resetPasswordWithOtp,
  loginMerchant,
  getMerchantProfile,
  updateMerchantProfile,
  addUpiAccount,
  updateUpiAccount,
  deleteUpiAccount,
  updateUpiRoutingMode,
  regenerateApiKeys,
  getDashboardStats,
  listTeamMembers,
  inviteTeamMember,
  deleteTeamMember,
  getSubscription,
  changePlan,
  initiateSubscriptionCheckout,
  checkSubscriptionCheckoutStatus,
  listRefunds,
  createRefund,
  listDisputes,
  getKyc,
  submitKyc,
  exportReport,
  testTelegramAlert,
  refreshMerchantToken,
  logoutMerchant,
  logoutAllDevices,
} from '../controllers/merchant.controller';
import { requireMerchantAuth } from '../middleware/auth.middleware';
import { requireActiveSubscription } from '../middleware/subscription.middleware';

const router = Router();

// Public auth endpoints
router.post('/register', registerMerchant);
router.post('/send-registration-otp', sendRegistrationOtp);
router.post('/forgot-password/send-otp', sendForgotPasswordOtp);
router.post('/forgot-password/reset', resetPasswordWithOtp);
router.post('/login', loginMerchant);
router.post('/refresh-token', refreshMerchantToken);
router.post('/logout', logoutMerchant);

// Always accessible for authenticated merchant (profile read for navbar + plan reactivation)
router.post('/logout-all', requireMerchantAuth, logoutAllDevices);
router.get('/profile', requireMerchantAuth, getMerchantProfile);
router.get('/subscription', requireMerchantAuth, getSubscription);
router.post('/subscription/plan', requireMerchantAuth, changePlan);
router.post('/subscription/checkout', requireMerchantAuth, initiateSubscriptionCheckout);
router.get('/subscription/checkout-status/:orderId', requireMerchantAuth, checkSubscriptionCheckoutStatus);

// All operational merchant routes strictly enforce an active 3-day trial or paid subscription
router.put('/profile', requireMerchantAuth, requireActiveSubscription, updateMerchantProfile);
router.post('/upi-accounts', requireMerchantAuth, requireActiveSubscription, addUpiAccount);
router.patch('/upi-accounts/:accountId', requireMerchantAuth, requireActiveSubscription, updateUpiAccount);
router.delete('/upi-accounts/:accountId', requireMerchantAuth, requireActiveSubscription, deleteUpiAccount);
router.patch('/upi-routing', requireMerchantAuth, requireActiveSubscription, updateUpiRoutingMode);
router.post('/regenerate-api-keys', requireMerchantAuth, requireActiveSubscription, regenerateApiKeys);
router.get('/dashboard-stats', requireMerchantAuth, requireActiveSubscription, getDashboardStats);

// Team management
router.get('/team', requireMerchantAuth, requireActiveSubscription, listTeamMembers);
router.post('/team/invite', requireMerchantAuth, requireActiveSubscription, inviteTeamMember);
router.delete('/team/:memberId', requireMerchantAuth, requireActiveSubscription, deleteTeamMember);

// Refunds & Disputes
router.get('/refunds', requireMerchantAuth, requireActiveSubscription, listRefunds);
router.post('/refunds', requireMerchantAuth, requireActiveSubscription, createRefund);
router.get('/disputes', requireMerchantAuth, requireActiveSubscription, listDisputes);

// KYC
router.get('/kyc', requireMerchantAuth, requireActiveSubscription, getKyc);
router.post('/kyc', requireMerchantAuth, requireActiveSubscription, submitKyc);

// Financial Reports export & Reliability alerts
router.get('/reports/export', requireMerchantAuth, requireActiveSubscription, exportReport);
router.post('/reliability/test-telegram', requireMerchantAuth, requireActiveSubscription, testTelegramAlert);

export default router;
