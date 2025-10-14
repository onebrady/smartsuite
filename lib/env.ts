import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    // Node Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Application
    APP_URL: z.string().url(),

    // Session
    SESSION_PASSWORD: z.string().min(32, 'SESSION_PASSWORD must be at least 32 characters'),

    // Encryption
    DATA_ENCRYPTION_KEY: z
      .string()
      .length(64, 'DATA_ENCRYPTION_KEY must be exactly 64 hex characters')
      .regex(/^[0-9a-f]{64}$/, 'DATA_ENCRYPTION_KEY must be valid hex'),

    // Authentication
    DASHBOARD_PASSWORD_HASH: z
      .string()
      .length(60, 'DASHBOARD_PASSWORD_HASH must be 60 characters')
      .regex(/^\$2[ayb]\$/, 'DASHBOARD_PASSWORD_HASH must be a valid bcrypt hash'),

    // Database
    DATABASE_URL: z.string().url().startsWith('postgresql://'),
    DIRECT_DATABASE_URL: z.string().url().startsWith('postgresql://'),

    // Cron
    CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters'),

    // Rate Limiting
    WRITE_CAP_PER_MINUTE: z.coerce.number().int().positive().default(50),
    MAX_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(5),
    RETRY_BACKOFF_MS: z.coerce.number().int().positive().default(1000),
    MAX_RETRY_BACKOFF_MS: z.coerce.number().int().positive().default(60000),

    // Worker
    WORKER_BATCH_SIZE: z.coerce.number().int().positive().default(25),
    LOCK_TIMEOUT_MS: z.coerce.number().int().positive().default(300000),

    // Logging
    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
      .default('info'),
    PRETTY_LOGS: z
      .string()
      .transform((val) => val === 'true')
      .default('false'),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    APP_URL: process.env.APP_URL,
    SESSION_PASSWORD: process.env.SESSION_PASSWORD,
    DATA_ENCRYPTION_KEY: process.env.DATA_ENCRYPTION_KEY,
    DASHBOARD_PASSWORD_HASH: process.env.DASHBOARD_PASSWORD_HASH,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    WRITE_CAP_PER_MINUTE: process.env.WRITE_CAP_PER_MINUTE,
    MAX_RETRY_ATTEMPTS: process.env.MAX_RETRY_ATTEMPTS,
    RETRY_BACKOFF_MS: process.env.RETRY_BACKOFF_MS,
    MAX_RETRY_BACKOFF_MS: process.env.MAX_RETRY_BACKOFF_MS,
    WORKER_BATCH_SIZE: process.env.WORKER_BATCH_SIZE,
    LOCK_TIMEOUT_MS: process.env.LOCK_TIMEOUT_MS,
    LOG_LEVEL: process.env.LOG_LEVEL,
    PRETTY_LOGS: process.env.PRETTY_LOGS,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
