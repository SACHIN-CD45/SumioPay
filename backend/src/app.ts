import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';

// Legacy / Specialized Route Mounts
import merchantRoutes from './routes/merchant.routes';
import orderRoutes from './routes/order.routes';
import deviceRoutes from './routes/device.routes';
import webhookRoutes from './routes/webhook.routes';
import superadminRoutes from './routes/superadmin.routes';
import centralPaymentRoutes from './routes/centralPayment.routes';
import publicRoutes from './routes/public.routes';

// Enterprise Version 1 (v1) RESTful Routes
import v1OrdersRoutes from './routes/v1/orders.routes';
import v1ReconciliationRoutes from './routes/v1/reconciliation.routes';
import v1ProjectsRoutes from './routes/v1/projects.routes';
import v1ApiKeysRoutes from './routes/v1/apiKeys.routes';
import v1WebhooksRoutes from './routes/v1/webhooks.routes';

export const createApp = (): express.Application => {
  const app = express();

  // Security and Utilities
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(morgan('dev'));

  // NoSQL Injection Defense: Strip malicious operator keys starting with '$' or '.'
  const sanitizeNoSql = (obj: any) => {
    if (obj && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else {
          sanitizeNoSql(obj[key]);
        }
      }
    }
  };

  app.use((req, _res, next) => {
    if (req.body) sanitizeNoSql(req.body);
    if (req.query) sanitizeNoSql(req.query);
    if (req.params) sanitizeNoSql(req.params);
    next();
  });

  // API Rate Limiting to prevent DDoS and brute-force
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' },
    },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'AUTH_RATE_LIMIT_EXCEEDED', message: 'Too many login attempts. Please wait 15 minutes.' },
    },
  });

  app.use('/api', apiLimiter);
  app.use('/api/superadmin/login', authLimiter);
  app.use('/api/merchant/login', authLimiter);

  // Comprehensive SRE Health Probes
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'UP',
      service: 'SumioPay Universal Payment Gateway SaaS',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health/ready', (_req, res) => {
    const isDbReady = mongoose.connection.readyState === 1;
    if (isDbReady) {
      res.status(200).json({
        status: 'READY',
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'NOT_READY',
        database: mongoose.connection.readyState === 2 ? 'CONNECTING' : 'DISCONNECTED',
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get('/health/live', (_req, res) => {
    res.status(200).json({
      status: 'ALIVE',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    });
  });

  // Enterprise V1 API Routes
  app.use('/api/v1/payments', v1OrdersRoutes);
  app.use('/api/v1/reconciliation', v1ReconciliationRoutes);
  app.use('/api/v1/projects', v1ProjectsRoutes);
  app.use('/api/v1/api-keys', v1ApiKeysRoutes);
  app.use('/api/v1/webhooks', v1WebhooksRoutes);

  // Core Merchant & Management Routes
  app.use('/api/merchant', merchantRoutes);
  app.use('/api/order', orderRoutes);
  app.use('/api/device', deviceRoutes);
  app.use('/api/webhook', webhookRoutes);
  app.use('/api/superadmin', superadminRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/public', publicRoutes);

  // Central Payment Compatibility Route (Cross-app single Android listener)
  app.use('/api/central-payment', centralPaymentRoutes);

  // Serve backend public static assets (checkout.js, downloads, APKs, plugins)
  const backendPublic = path.resolve(__dirname, '../public');
  if (fs.existsSync(backendPublic)) {
    app.use(express.static(backendPublic));
    app.use('/downloads', express.static(path.join(backendPublic, 'downloads')));
  }

  // Unified Single-Server Deployment: Serve built React frontend SPA if present
  const possibleDistPaths = [
    path.resolve(__dirname, '../../frontend/dist'),
    path.resolve(process.cwd(), '../frontend/dist'),
    path.resolve(process.cwd(), 'frontend/dist'),
    path.resolve(__dirname, '../public/dist'),
  ];
  const distPath = possibleDistPaths.find((p) => fs.existsSync(p));

  if (distPath) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global 404 Handler for unhandled API routes
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Endpoint ${req.method} ${req.url} does not exist on SumioPay API`,
      },
    });
  });

  // Global Enterprise Error Handler
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[SumioPay Error Handler]', {
      path: req.path,
      method: req.method,
      error: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });

    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected internal error occurred',
      },
    });
  });

  return app;
};
export default createApp;
