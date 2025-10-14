import { defineConfig } from 'vitest/config';
import path from 'path';

// Set test environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.DATA_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.DIRECT_DATABASE_URL =
  'postgresql://test:test@localhost:5432/test';
process.env.SESSION_PASSWORD =
  'test-session-password-at-least-32-chars-long-for-testing';
process.env.DASHBOARD_PASSWORD_HASH =
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
process.env.APP_URL = 'http://localhost:3000';
process.env.CRON_SECRET =
  'test-cron-secret-at-least-32-characters-long-for-testing';
process.env.WRITE_CAP_PER_MINUTE = '50';
process.env.MAX_RETRY_ATTEMPTS = '5';
process.env.RETRY_BACKOFF_MS = '1000';
process.env.MAX_RETRY_BACKOFF_MS = '300000';
process.env.WORKER_BATCH_SIZE = '10';
process.env.LOCK_TIMEOUT_MS = '60000';
process.env.LOG_LEVEL = 'fatal'; // Use fatal to minimize test output
process.env.PRETTY_LOGS = 'false';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Skip tests that require database or server
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/integration/**', // Skip integration tests for now
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
        '*.config.js',
        '.next/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  css: {
    postcss: false as any,
  },
});
