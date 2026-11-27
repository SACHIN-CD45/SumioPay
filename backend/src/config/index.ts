import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Multi-environment loader: reads .env.local, .env.<NODE_ENV>, then .env
const nodeEnv = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`) });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Environment schema with runtime Zod validation
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),
  PORT: z.string().default('8090'),
  HOST: z.string().default('0.0.0.0'),
  BASE_URL: z.string().default('http://localhost:8090'),

  // Databases
  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/sumiopay_saas'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  // Enterprise JWT Dual-Token Configuration
  JWT_SECRET: z.string().default('sumiopay_enterprise_master_jwt_secret_key_2026_prod'),
  JWT_ACCESS_SECRET: z.string().default('sumiopay_access_token_super_secret_key_2026_fintech'),
  JWT_REFRESH_SECRET: z.string().default('sumiopay_refresh_token_super_secret_key_2026_fintech_rotate'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().default('sumiopay.io'),
  JWT_AUDIENCE: z.string().default('sumiopay-clients'),

  // Super Admin Default Credentials
  SUPERADMIN_EMAIL: z.string().email().default('admin@sumiopay.com'),
  SUPERADMIN_PASSWORD: z.string().default('Admin@SumioPay2026!'),
  SUPERADMIN_NAME: z.string().default('SumioPay Master Admin'),

  // Security & Throttling
  BCRYPT_ROUNDS: z.string().default('10'),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX: z.string().default('120'),
  ORDER_TTL_MINUTES: z.string().default('15'),
  CORS_ORIGINS: z.string().default('*'),

  // Providers (Optional / Fallback)
  CASHFREE_APP_ID: z.string().optional().default(''),
  CASHFREE_SECRET_KEY: z.string().optional().default(''),
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),

  // SMTP / Email Receipt Delivery (Hostinger / Standard SMTP)
  SMTP_HOST: z.string().optional().default('smtp.hostinger.com'),
  SMTP_PORT: z.string().optional().default('465'),
  SMTP_SECURE: z.string().optional().default('true'),
  SMTP_USER: z.string().optional().default('contact@sumiotech.in'),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default(''),
  PUBLIC_URL: z.string().optional().default('https://sumiopay.sumiotech.in'),
  API_PUBLIC_URL: z.string().optional().default('https://apipay.sumiotech.in'),
});

if (nodeEnv === 'production') {
  if (
    !process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_ACCESS_SECRET.includes('REPLACE_WITH_') ||
    !process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_REFRESH_SECRET.includes('REPLACE_WITH_')
  ) {
    console.warn(
      '[SumioPay SECURITY WARNING] Production JWT_ACCESS_SECRET / JWT_REFRESH_SECRET are using fallback defaults or placeholders. Set strong random secrets in backend/.env!'
    );
  }
  if (!process.env.SMTP_PASS) {
    console.warn(
      '[SumioPay EMAIL WARNING] SMTP_PASS is not configured in backend/.env — OTPs and Enterprise Payment Bill emails are running in console-simulator mode.'
    );
  }
}

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[SumioPay Config Error] Invalid environment variables:', parsed.error.format());
  if (nodeEnv === 'production') {
    throw new Error('Fatal: Production environment validation failed');
  }
}

const env = parsed.success ? parsed.data : (process.env as any);

const port = parseInt(env.PORT || '8090', 10);
const mongoUri = env.MONGO_URI || 'mongodb://127.0.0.1:27017/sumiopay_saas';
const jwtSecret = env.JWT_ACCESS_SECRET || env.JWT_SECRET || 'sumiopay_enterprise_master_jwt_secret_key_2026_prod';
const baseUrl = env.BASE_URL || `http://localhost:${port}`;

export const config = {
  // Core
  port,
  PORT: port,
  host: env.HOST || '0.0.0.0',
  nodeEnv: env.NODE_ENV || 'development',
  baseUrl,
  BASE_URL: baseUrl,

  // Database
  mongoUri,
  MONGODB_URI: mongoUri,
  redisUrl: env.REDIS_URL || 'redis://127.0.0.1:6379',
  REDIS_URL: env.REDIS_URL || 'redis://127.0.0.1:6379',

  // Senior-Level JWT Configuration
  jwtSecret,
  JWT_SECRET: jwtSecret,
  jwtExpiresIn: env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET || jwtSecret,
    refreshSecret: env.JWT_REFRESH_SECRET || jwtSecret,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: env.JWT_ISSUER || 'sumiopay.io',
    audience: env.JWT_AUDIENCE || 'sumiopay-clients',
  },

  // Security
  security: {
    bcryptRounds: parseInt(env.BCRYPT_ROUNDS || '10', 10),
    rateLimitWindowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    rateLimitMax: parseInt(env.RATE_LIMIT_MAX || '120', 10),
  },

  // Super Admin Default
  superAdminDefault: {
    email: env.SUPERADMIN_EMAIL || 'admin@sumiopay.com',
    password: env.SUPERADMIN_PASSWORD || 'Admin@SumioPay2026!',
    name: env.SUPERADMIN_NAME || 'SumioPay Master Admin',
  },

  // Orders & Business Logic
  orderTtlMinutes: parseInt(env.ORDER_TTL_MINUTES || '15', 10),
  corsOrigins: env.CORS_ORIGINS === '*' ? ['*'] : (env.CORS_ORIGINS || '').split(',').map((s: string) => s.trim()),

  // External Payment Gateways
  providers: {
    cashfree: {
      appId: env.CASHFREE_APP_ID || '',
      secretKey: env.CASHFREE_SECRET_KEY || '',
    },
    razorpay: {
      keyId: env.RAZORPAY_KEY_ID || '',
      keySecret: env.RAZORPAY_KEY_SECRET || '',
    },
  },
};

export default config;
