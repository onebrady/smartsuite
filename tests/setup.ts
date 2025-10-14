import { vi } from 'vitest';

// Mock environment variables (must be set before any imports)
process.env.NODE_ENV = 'test';
process.env.DATA_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.DIRECT_DATABASE_URL =
  'postgresql://test:test@localhost:5432/test';
process.env.SESSION_PASSWORD =
  'test-session-password-at-least-32-chars-long-for-testing';
process.env.DASHBOARD_PASSWORD_HASH =
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'; // bcrypt hash of "password"
process.env.APP_URL = 'http://localhost:3000';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.WRITE_CAP_PER_MINUTE = '50';
process.env.MAX_RETRY_ATTEMPTS = '5';
process.env.RETRY_BACKOFF_MS = '1000';
process.env.MAX_RETRY_BACKOFF_MS = '300000';
process.env.WORKER_BATCH_SIZE = '10';
process.env.LOCK_TIMEOUT_MS = '60000';
process.env.LOG_LEVEL = 'silent';
process.env.PRETTY_LOGS = 'false';

// Mock Prisma client
vi.mock('@/lib/db', () => ({
  prisma: {
    connection: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mapping: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    idMap: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));
