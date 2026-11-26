import { Router } from 'express';
import {
  registerMerchant,
  sendRegistrationOtp,
  sendForgotPasswordOtp,
  resetPasswordWithOtp,
  loginMerchant,
  getMerchantProfile,
  updateMerchantProfile,
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
  refreshMerchantToken,
  logoutMerchant,
  logoutAllDevices,
} from '../controllers/merchant.controller';
import { requireMerchantAuth } from '../middleware/auth.middleware';

const router = Router();

// Public auth endpoints
router.post('/register', registerMerchant);
router.post('/send-registration-otp', sendRegistrationOtp);
router.post('/forgot-password/send-otp', sendForgotPasswordOtp);
router.post('/forgot-password/reset', resetPasswordWithOtp);
router.post('/login', loginMerchant);
router.post('/refresh-token', refreshMerchantToken);
router.post('/logout', logoutMerchant);

// Authenticated merchant portal endpoints
router.post('/logout-all', requireMerchantAuth, logoutAllDevices);
router.get('/profile', requireMerchantAuth, getMerchantProfile);
router.put('/profile', requireMerchantAuth, updateMerchantProfile);
router.post('/regenerate-api-keys', requireMerchantAuth, regenerateApiKeys);
router.get('/dashboard-stats', requireMerchantAuth, getDashboardStats);

// Team management
router.get('/team', requireMerchantAuth, listTeamMembers);
router.post('/team/invite', requireMerchantAuth, inviteTeamMember);
router.delete('/team/:memberId', requireMerchantAuth, deleteTeamMember);

// Subscription & billing
router.get('/subscription', requireMerchantAuth, getSubscription);
router.post('/subscription/plan', requireMerchantAuth, changePlan);
router.post('/subscription/checkout', requireMerchantAuth, initiateSubscriptionCheckout);
router.get('/subscription/checkout-status/:orderId', requireMerchantAuth, checkSubscriptionCheckoutStatus);

// Refunds & Disputes
router.get('/refunds', requireMerchantAuth, listRefunds);
router.post('/refunds', requireMerchantAuth, createRefund);
router.get('/disputes', requireMerchantAuth, listDisputes);

// KYC
router.get('/kyc', requireMerchantAuth, getKyc);
router.post('/kyc', requireMerchantAuth, submitKyc);

// Financial Reports export
router.get('/reports/export', requireMerchantAuth, exportReport);

export default router;
