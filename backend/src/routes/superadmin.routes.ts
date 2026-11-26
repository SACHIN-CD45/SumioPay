import { Router } from 'express';
import {
  superadminLogin,
  getGlobalMetrics,
  listAllMerchants,
  toggleMerchantStatus,
  listAllOrders,
  listAllDevices,
  listKycWorkflows,
  updateKycStatus,
  listSecurityAlerts,
  resolveSecurityAlert,
  listAuditLogs,
  getSystemHealth,
  listAllSubscriptions,
  updateMerchantSubscriptionTier,
  createSubscriptionBill,
  updateSubscriptionBill,
  deleteSubscriptionBill,
  getSubscriptionMetrics,
  getPlatformSettings,
  updatePlatformSettings,
  listUnmappedPayments,
  listWebhookLogs,
} from '../controllers/superadmin.controller';
import { requireSuperAdminAuth } from '../middleware/auth.middleware';

const router = Router();

// SuperAdmin Auth
router.post('/login', superadminLogin);

// Platform Overview & GMV
router.get('/metrics', requireSuperAdminAuth, getGlobalMetrics);

// Merchants management
router.get('/merchants', requireSuperAdminAuth, listAllMerchants);
router.patch('/merchants/:merchantId/toggle-status', requireSuperAdminAuth, toggleMerchantStatus);

// Global Orders & Devices
router.get('/orders', requireSuperAdminAuth, listAllOrders);
router.get('/devices', requireSuperAdminAuth, listAllDevices);

// Reconciliation Engine & Unmapped Payments
router.get('/unmapped-payments', requireSuperAdminAuth, listUnmappedPayments);

// Global Webhook Delivery Logs
router.get('/webhook-logs', requireSuperAdminAuth, listWebhookLogs);

// KYC Workflows
router.get('/kyc', requireSuperAdminAuth, listKycWorkflows);
router.patch('/kyc/:orgId', requireSuperAdminAuth, updateKycStatus);

// Risk Management & Security Alerts
router.get('/security-alerts', requireSuperAdminAuth, listSecurityAlerts);
router.patch('/security-alerts/:alertId/resolve', requireSuperAdminAuth, resolveSecurityAlert);

// Platform Subscriptions & Pricing Control (SuperAdmin)
router.get('/subscriptions', requireSuperAdminAuth, listAllSubscriptions);
router.patch('/subscriptions/:merchantId/tier', requireSuperAdminAuth, updateMerchantSubscriptionTier);
router.post('/subscriptions/:merchantId/bills', requireSuperAdminAuth, createSubscriptionBill);
router.patch('/subscriptions/:merchantId/bills/:invoiceId', requireSuperAdminAuth, updateSubscriptionBill);
router.delete('/subscriptions/:merchantId/bills/:invoiceId', requireSuperAdminAuth, deleteSubscriptionBill);
router.get('/subscriptions/metrics', requireSuperAdminAuth, getSubscriptionMetrics);

// Global Platform Controls & Settings (SuperAdmin)
router.get('/settings', requireSuperAdminAuth, getPlatformSettings);
router.patch('/settings', requireSuperAdminAuth, updatePlatformSettings);

// Audit Logs & System Health
router.get('/audit-logs', requireSuperAdminAuth, listAuditLogs);
router.get('/system-health', requireSuperAdminAuth, getSystemHealth);

export default router;
