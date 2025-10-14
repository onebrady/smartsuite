# SmartSuite ↔ Webflow Sync - Stage 3: Testing, Documentation & Deployment

**Project Location**: `/home/onebrady/projects/smartsuite` (root directory)
**Reference Specification**: `documents/smartsuite_webflow_sync_spec.txt`
**Estimated Timeline**: 1 week (Days 23-30)
**Stage Goal**: Production-ready application with comprehensive testing, documentation, and deployed to Vercel

---

## Stage 3 Overview

Stage 3 focuses on preparing the application for production use. By the end of this stage, you'll have:

✅ Comprehensive unit and integration tests
✅ Complete documentation (README, API docs, user guide)
✅ Production deployment on Vercel
✅ Configured cron job for worker
✅ Monitoring and alerting set up
✅ Troubleshooting guides
✅ Production-ready application

**Prerequisites**: Stages 1 and 2 must be complete and working.

---

## Phase 15: Testing (Days 23-25)

### 15.1 Unit Tests Setup

- [ ] Configure Vitest:
  ```typescript
  // vitest.config.ts
  import { defineConfig } from 'vitest/config';
  import react from '@vitejs/plugin-react';
  import path from 'path';

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'node',
      globals: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
  });
  ```
- [ ] Create test utilities in `tests/utils/`
- [ ] Set up test database connection

**Reference**: Section 15 (Testing Requirements)

### 15.2 Unit Tests - Core Libraries

#### Crypto Tests (tests/unit/crypto.test.ts)

- [ ] Test encryption/decryption round-trip:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { encryptSecret, decryptSecret } from '@/lib/crypto';

  describe('Crypto', () => {
    it('should encrypt and decrypt successfully', async () => {
      const plaintext = 'my-secret-api-key';
      const encrypted = await encryptSecret(plaintext);

      expect(encrypted.ciphertext).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();

      const decrypted = await decryptSecret(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should generate unique IVs', async () => {
      const plaintext = 'test';
      const enc1 = await encryptSecret(plaintext);
      const enc2 = await encryptSecret(plaintext);

      expect(enc1.iv).not.toBe(enc2.iv);
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    });

    it('should handle various input sizes', async () => {
      const tests = ['a', 'short', 'a'.repeat(1000), 'special!@#$%'];

      for (const test of tests) {
        const encrypted = await encryptSecret(test);
        const decrypted = await decryptSecret(encrypted);
        expect(decrypted).toBe(test);
      }
    });
  });
  ```

#### Webhook Security Tests (tests/unit/webhook-security.test.ts)

- [ ] Test signature verification:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { verifyWebhookSignature, verifyTimestamp } from '@/lib/webhook-security';
  import crypto from 'crypto';

  describe('Webhook Security', () => {
    it('should verify valid signature', () => {
      const secret = 'test-secret';
      const body = JSON.stringify({ test: 'data' });
      const signature = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const body = JSON.stringify({ test: 'data' });
      const signature = 'sha256=invalid';
      const secret = 'test-secret';

      expect(verifyWebhookSignature(body, signature, secret)).toBe(false);
    });

    it('should verify recent timestamp', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(verifyTimestamp(now.toString())).toBe(true);
    });

    it('should reject old timestamp', () => {
      const old = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      expect(verifyTimestamp(old.toString())).toBe(false);
    });

    it('should reject future timestamp', () => {
      const future = Math.floor(Date.now() / 1000) + 600;
      expect(verifyTimestamp(future.toString())).toBe(false);
    });
  });
  ```

#### Mapper Tests (tests/unit/mapper.test.ts)

- [ ] Test all mapping types:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { applyFieldMapping } from '@/lib/mapper';

  describe('Mapper', () => {
    it('should apply direct mapping', async () => {
      const config = { type: 'direct', source: '$.title' };
      const data = { title: 'Widget Pro' };

      const result = await applyFieldMapping(config, data, {});
      expect(result).toBe('Widget Pro');
    });

    it('should apply JSONata expression', async () => {
      const config = {
        type: 'jsonata',
        expression: '$.price * 0.9'
      };
      const data = { price: 100 };

      const result = await applyFieldMapping(config, data, {});
      expect(result).toBe(90);
    });

    it('should apply template', async () => {
      const config = {
        type: 'template',
        template: '{{sku}}-{{name}}'
      };
      const data = { sku: 'ABC', name: 'Widget' };

      const result = await applyFieldMapping(config, data, {});
      expect(result).toBe('ABC-Widget');
    });

    it('should apply constant', async () => {
      const config = { type: 'constant', value: 'active' };

      const result = await applyFieldMapping(config, {}, {});
      expect(result).toBe('active');
    });

    it('should apply transforms', async () => {
      const config = {
        type: 'direct',
        source: '$.name',
        transform: 'uppercase'
      };
      const data = { name: 'widget' };

      const result = await applyFieldMapping(config, data, {});
      expect(result).toBe('WIDGET');
    });

    it('should use default value if source is null', async () => {
      const config = {
        type: 'direct',
        source: '$.missing',
        default: 'fallback'
      };
      const data = {};

      const result = await applyFieldMapping(config, data, {});
      expect(result).toBe('fallback');
    });
  });
  ```

#### Transform Tests (tests/unit/transforms.test.ts)

- [ ] Test all transform functions:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { TRANSFORMS } from '@/lib/transforms';

  describe('Transforms', () => {
    it('should transform case', () => {
      expect(TRANSFORMS.uppercase('hello')).toBe('HELLO');
      expect(TRANSFORMS.lowercase('HELLO')).toBe('hello');
      expect(TRANSFORMS.title('hello world')).toBe('Hello World');
      expect(TRANSFORMS.kebab('Hello World')).toBe('hello-world');
      expect(TRANSFORMS.camel('hello world')).toBe('helloWorld');
    });

    it('should manipulate strings', () => {
      expect(TRANSFORMS.trim('  hello  ')).toBe('hello');
      expect(TRANSFORMS.truncate('hello world', 5)).toBe('hello');
    });

    it('should transform numbers', () => {
      expect(TRANSFORMS.round(3.14159, 2)).toBe(3.14);
      expect(TRANSFORMS.floor(3.9)).toBe(3);
      expect(TRANSFORMS.ceil(3.1)).toBe(4);
    });
  });
  ```

#### Validator Tests (tests/unit/validator.test.ts)

- [ ] Test validation functions:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { validateFieldType, validateRequiredFields, validateSlug } from '@/lib/validator';

  describe('Validator', () => {
    it('should validate field types', () => {
      expect(validateFieldType(123, 'Number')).toBe(123);
      expect(validateFieldType('123', 'Number')).toBe(123);
      expect(() => validateFieldType('abc', 'Number')).toThrow();

      expect(validateFieldType(true, 'Switch')).toBe(true);
      expect(validateFieldType('true', 'Switch')).toBe(true);
    });

    it('should validate required fields', () => {
      const data = { name: 'Test', slug: 'test' };
      const required = ['name', 'slug'];

      expect(() => validateRequiredFields(data, required)).not.toThrow();

      const incomplete = { name: 'Test' };
      expect(() => validateRequiredFields(incomplete, required))
        .toThrow('Missing required fields: slug');
    });

    it('should validate slug format', () => {
      expect(validateSlug('valid-slug-123')).toBe(true);
      expect(validateSlug('Valid Slug')).toBe(false); // uppercase
      expect(validateSlug('invalid_slug')).toBe(false); // underscore
      expect(validateSlug('a'.repeat(101))).toBe(false); // too long
    });
  });
  ```

- [ ] Run unit tests: `npm test`
- [ ] Verify all tests pass
- [ ] Check coverage: aim for >80% on core logic

**Reference**: Section 15.1 (Unit Tests)

### 15.3 Integration Tests

#### Webhook Ingress Tests (tests/integration/webhook-ingress.test.ts)

- [ ] Test webhook flow:
  ```typescript
  import { describe, it, expect, beforeEach, afterEach } from 'vitest';
  import { prisma } from '@/lib/db';
  import crypto from 'crypto';

  describe('Webhook Ingress', () => {
    let connection;

    beforeEach(async () => {
      // Create test connection
      connection = await prisma.connection.create({
        data: {
          // ... test data
        }
      });
    });

    afterEach(async () => {
      // Clean up
      await prisma.connection.delete({ where: { id: connection.id } });
    });

    it('should accept valid webhook', async () => {
      const payload = { record_id: 'test', data: {} };
      const body = JSON.stringify(payload);
      const signature = generateSignature(body, 'test-secret');

      const res = await fetch(`http://localhost:3000/api/hooks/${connection.id}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-smartsuite-signature': signature,
          'x-smartsuite-timestamp': Math.floor(Date.now() / 1000).toString()
        },
        body
      });

      expect(res.status).toBe(202);
      const data = await res.json();
      expect(data.eventId).toBeTruthy();

      // Verify event created
      const event = await prisma.event.findUnique({
        where: { id: data.eventId }
      });
      expect(event).toBeTruthy();
      expect(event.status).toBe('queued');
    });

    it('should reject invalid signature', async () => {
      const res = await fetch(`http://localhost:3000/api/hooks/${connection.id}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-smartsuite-signature': 'sha256=invalid',
          'x-smartsuite-timestamp': Math.floor(Date.now() / 1000).toString()
        },
        body: '{}'
      });

      expect(res.status).toBe(401);
    });

    it('should handle duplicate webhooks', async () => {
      // Send same webhook twice
      // ... test idempotency
    });
  });
  ```

#### Event Processor Tests (tests/integration/event-processor.test.ts)

- [ ] Test event processing with mocked APIs:
  ```typescript
  import { describe, it, expect, vi } from 'vitest';
  import { EventProcessor } from '@/lib/event-processor';
  import { WebflowClient } from '@/lib/webflow';

  // Mock Webflow API
  vi.mock('@/lib/webflow');

  describe('Event Processor', () => {
    it('should process event successfully', async () => {
      // Mock successful Webflow response
      vi.mocked(WebflowClient.prototype.createItem).mockResolvedValue({
        id: 'wf_item_123',
        // ... response
      });

      const processor = new EventProcessor();
      const result = await processor.processEvent('event_id');

      expect(result.success).toBe(true);
      // Verify IdMap created
      // Verify event status updated
    });

    it('should handle retriable errors', async () => {
      // Mock 500 error
      vi.mocked(WebflowClient.prototype.createItem).mockRejectedValue({
        status: 500
      });

      const processor = new EventProcessor();
      const result = await processor.processEvent('event_id');

      expect(result.success).toBe(false);
      expect(result.willRetry).toBe(true);
      // Verify retryAfter set
    });

    it('should move to dead letter after max retries', async () => {
      // Test with event that has attempts = maxRetries
      // Verify status = dead_letter
    });
  });
  ```

- [ ] Run integration tests
- [ ] Verify all pass

**Reference**: Section 15.2 (Integration Tests)

### 15.4 End-to-End Testing

Create manual test scenarios:

- [ ] **Scenario 1: Complete sync flow**
  1. Create connection via wizard
  2. Configure mapping with real APIs
  3. Send test webhook
  4. Verify event created
  5. Trigger worker
  6. Verify item synced to Webflow
  7. Document results with screenshots

- [ ] **Scenario 2: Failed event recovery**
  1. Create connection with invalid mapping
  2. Send webhook → event fails
  3. Fix mapping via UI
  4. Replay event via UI
  5. Verify success
  6. Document flow

- [ ] **Scenario 3: Rate limiting**
  1. Send 100 webhooks rapidly
  2. Verify queue builds up
  3. Verify rate-limited processing (50/min)
  4. Verify all eventually succeed
  5. Document metrics

- [ ] **Scenario 4: Error handling**
  1. Test various error conditions
  2. Verify error messages clear
  3. Verify recovery paths work
  4. Document error scenarios

**Reference**: Section 15.3 (End-to-End Tests)

### 15.5 Manual Testing Checklist

Complete all items:

- [ ] Create new connection (full wizard flow)
- [ ] Test webhook with real SmartSuite data
- [ ] Verify event appears in inbox
- [ ] Verify item created in Webflow
- [ ] Update SmartSuite record, verify update in Webflow
- [ ] Test failed event (invalid field), verify dead letter
- [ ] Fix mapping, replay event, verify success
- [ ] Test all dashboard pages render correctly
- [ ] Test logout and login
- [ ] Test rate limiting (send many webhooks quickly)
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile device
- [ ] Test with slow network connection

**Reference**: Section 15.4 (Manual Testing Checklist)

---

## Phase 16: Documentation (Days 25-26)

### 16.1 README Documentation

- [ ] Create comprehensive README.md:
  ```markdown
  # SmartSuite ↔ Webflow Sync

  Real-time synchronization between SmartSuite and Webflow CMS.

  ## Features

  - ✅ Real-time webhook-based sync
  - ✅ Complex field mapping with transforms
  - ✅ Rate limiting and retry logic
  - ✅ Comprehensive event tracking
  - ✅ Admin dashboard for monitoring
  - ✅ 99.9% reliability

  ## Quick Start

  ### Prerequisites

  - Node.js 18+
  - PostgreSQL database (Neon recommended)
  - SmartSuite account
  - Webflow site with API access

  ### Installation

  1. Clone repository
  2. Install dependencies: `npm install`
  3. Set up environment variables (see below)
  4. Run database migrations: `npm run db:push`
  5. Start dev server: `npm run dev`

  ### Environment Variables

  Create `.env.local`:

  ```
  # Copy from .env.example and fill in values
  DATABASE_URL=...
  SESSION_PASSWORD=...
  # ... etc
  ```

  See `.env.example` for all required variables.

  ### Generate Secrets

  ```bash
  # SESSION_PASSWORD
  openssl rand -base64 32

  # DATA_ENCRYPTION_KEY
  openssl rand -hex 32

  # DASHBOARD_PASSWORD_HASH
  node -e "console.log(require('bcryptjs').hashSync('YourPassword', 10))"
  ```

  ## Usage

  ### 1. Create Connection

  1. Go to `/admin` and login
  2. Click "New Connection"
  3. Follow the 7-step wizard
  4. Copy webhook URL and secret

  ### 2. Configure SmartSuite

  1. In SmartSuite, go to Settings → Webhooks
  2. Add webhook URL from step 1
  3. Select events: record_created, record_updated
  4. Add signature header with secret

  ### 3. Test

  1. Create/update record in SmartSuite
  2. Check Events inbox in dashboard
  3. Verify item appears in Webflow

  ## Architecture

  [ASCII diagram of system architecture]

  ## API Documentation

  See [API.md](./docs/API.md) for complete API reference.

  ## Deployment

  ### Deploy to Vercel

  1. Connect GitHub repo to Vercel
  2. Set environment variables in Vercel dashboard
  3. Deploy

  See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

  ## Troubleshooting

  See [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

  ## Contributing

  [Contributing guidelines if applicable]

  ## License

  [License information]

  ## Support

  For issues, please open a GitHub issue or contact [email].
  ```

- [ ] Add architecture diagram (ASCII or image)
- [ ] Add screenshots of dashboard
- [ ] Proofread and test all commands

### 16.2 API Documentation

- [ ] Create `docs/API.md`:
  ```markdown
  # API Reference

  Base URL: `https://your-domain.com/api`

  ## Authentication

  Protected endpoints require authentication cookie from `/api/auth/login`.

  ### POST /api/auth/login

  Request:
  ```json
  {
    "password": "your-password"
  }
  ```

  Response (200):
  ```json
  {
    "success": true,
    "expiresAt": 1234567890
  }
  ```

  ## Connections

  ### GET /api/connections

  Query params:
  - `status`: Filter by status
  - `search`: Search by name
  - `limit`: Page size (default 50)
  - `offset`: Page offset (default 0)

  Response:
  ```json
  {
    "connections": [...],
    "total": 10,
    "limit": 50,
    "offset": 0
  }
  ```

  [Continue with all endpoints...]
  ```

- [ ] Document all endpoints from spec Section 12
- [ ] Include request/response examples
- [ ] Document error codes

### 16.3 User Guide

- [ ] Create `docs/USER_GUIDE.md`:
  ```markdown
  # User Guide

  ## Getting Started

  ### Creating Your First Connection

  1. Login to the admin dashboard
  2. Click "New Connection"
  3. ...

  ## Field Mapping

  ### Understanding Mapping Types

  - **Direct**: Simple field-to-field mapping
  - **JSONata**: Complex transformations using expressions
  - **Template**: String templates with placeholders
  - **Constant**: Fixed value for all items
  - **Reference**: Lookup related items

  ### Examples

  [Provide examples of common mapping scenarios]

  ## Monitoring

  ### Events Inbox

  The events inbox shows all sync activity...

  ### Understanding Event Statuses

  - 🟢 Success: Item synced successfully
  - 🔵 Queued: Waiting to be processed
  - 🟡 Failed: Will retry automatically
  - 🔴 Dead Letter: Manual intervention needed
  - ⚪ Skipped: Connection paused

  ## Troubleshooting

  ### Common Issues

  **Events stuck in queued status**
  - Check connection is active
  - Verify worker is running
  - ...

  [More troubleshooting scenarios]
  ```

- [ ] Add screenshots for each section
- [ ] Write step-by-step guides
- [ ] Include FAQ section

### 16.4 Deployment Guide

- [ ] Create `docs/DEPLOYMENT.md`:
  ```markdown
  # Deployment Guide

  ## Prerequisites

  - Vercel account
  - Neon PostgreSQL database
  - Domain name (optional)

  ## Step 1: Database Setup

  1. Create Neon project at https://neon.tech
  2. Copy connection strings
  3. Run migrations...

  ## Step 2: Environment Variables

  [Complete list with instructions]

  ## Step 3: Deploy to Vercel

  1. Install CLI: `npm i -g vercel`
  2. Login: `vercel login`
  3. Deploy: `vercel --prod`

  ## Step 4: Configure Cron

  [Instructions for cron setup]

  ## Step 5: Verify

  [Post-deployment checks]

  ## Monitoring

  [How to monitor in production]
  ```

### 16.5 Code Comments & Cleanup

- [ ] Add JSDoc comments to all major functions:
  ```typescript
  /**
   * Encrypts a secret using AES-256-GCM
   * @param plaintext - The secret to encrypt
   * @returns Object with ciphertext and IV (both base64 encoded)
   */
  export async function encryptSecret(plaintext: string): Promise<{
    ciphertext: string;
    iv: string;
  }> {
    // ...
  }
  ```
- [ ] Add inline comments for complex logic
- [ ] Remove console.logs and debug code
- [ ] Remove unused imports
- [ ] Format all code: `npm run lint && npm run format`
- [ ] Fix TypeScript errors
- [ ] Review TODOs in code

**Reference**: Section 15 and implied best practices

---

## Phase 17: Deployment (Days 26-28)

### 17.1 Pre-Deployment Checklist

- [ ] Review all environment variables
- [ ] Ensure all secrets generated securely
- [ ] Set NODE_ENV=production
- [ ] Set LOG_LEVEL=info
- [ ] Set PRETTY_LOGS=false
- [ ] Disable debug features
- [ ] Review security headers in next.config.js
- [ ] Test production build locally:
  ```bash
  npm run build
  npm start
  ```
- [ ] Verify no errors in build output
- [ ] Test critical flows in production mode

**Reference**: Section 16.1 (Prepare for Production)

### 17.2 Database Setup (Production)

- [ ] Create production Neon database:
  1. Go to https://neon.tech
  2. Create new project
  3. Select region closest to Vercel deployment
  4. Copy connection strings (pooled and direct)

- [ ] Set up database:
  ```bash
  # Add to .env.production.local
  DATABASE_URL=postgresql://...?pgbouncer=true
  DIRECT_DATABASE_URL=postgresql://...

  # Run migrations
  npx prisma migrate deploy
  ```

- [ ] Verify schema in Prisma Studio
- [ ] Configure automatic backups (Neon provides this)
- [ ] Note backup schedule in documentation

**Reference**: Section 16.2 (Database Setup)

### 17.3 Deploy to Vercel

- [ ] Install Vercel CLI:
  ```bash
  npm i -g vercel
  ```

- [ ] Login:
  ```bash
  vercel login
  ```

- [ ] Link project:
  ```bash
  vercel link
  ```

- [ ] Add environment variables:
  ```bash
  vercel env add SESSION_PASSWORD production
  vercel env add DATA_ENCRYPTION_KEY production
  vercel env add DASHBOARD_PASSWORD_HASH production
  vercel env add DATABASE_URL production
  vercel env add DIRECT_DATABASE_URL production
  vercel env add CRON_SECRET production
  vercel env add APP_URL production
  vercel env add WRITE_CAP_PER_MINUTE production
  vercel env add MAX_RETRY_ATTEMPTS production
  vercel env add RETRY_BACKOFF_MS production
  vercel env add MAX_RETRY_BACKOFF_MS production
  vercel env add WORKER_BATCH_SIZE production
  vercel env add LOCK_TIMEOUT_MS production
  vercel env add LOG_LEVEL production
  vercel env add PRETTY_LOGS production
  ```

- [ ] Deploy to production:
  ```bash
  vercel --prod
  ```

- [ ] Check deployment status:
  ```bash
  vercel ls
  ```

- [ ] Note deployment URL

**Reference**: Section 16.3 (Vercel Deployment)

### 17.4 Configure Cron Job

- [ ] Verify `vercel.json` has cron configuration:
  ```json
  {
    "crons": [
      {
        "path": "/api/jobs/ingest",
        "schedule": "* * * * *"
      }
    ]
  }
  ```

- [ ] Deploy to activate cron:
  ```bash
  vercel --prod
  ```

- [ ] Verify cron in Vercel dashboard:
  1. Go to project settings
  2. Click "Cron Jobs"
  3. Verify worker appears and is active

- [ ] Monitor first few cron executions:
  ```bash
  vercel logs --follow
  ```

- [ ] Verify worker runs every minute
- [ ] Check for errors in logs

**Reference**: Section 16.3 (Vercel Deployment)

### 17.5 Custom Domain (Optional)

- [ ] Add custom domain in Vercel:
  1. Go to project settings → Domains
  2. Add domain (e.g., sync.yourdomain.com)

- [ ] Configure DNS:
  - For subdomain: Add CNAME record pointing to Vercel
  - For root domain: Add A record to Vercel IP

- [ ] Wait for SSL certificate provisioning (automatic)

- [ ] Update APP_URL environment variable:
  ```bash
  vercel env add APP_URL production
  # Set to: https://sync.yourdomain.com
  ```

- [ ] Redeploy:
  ```bash
  vercel --prod
  ```

- [ ] Test custom domain works

**Reference**: Section 16.5 (Domain Configuration)

### 17.6 Post-Deployment Verification

- [ ] Test health endpoint:
  ```bash
  curl https://your-domain.vercel.app/api/health
  ```
  Expected: `{"status":"healthy",...}`

- [ ] Test API endpoints:
  ```bash
  # Should redirect to login
  curl https://your-domain.vercel.app/admin

  # Should return 401
  curl https://your-domain.vercel.app/api/connections
  ```

- [ ] Login to dashboard via browser
- [ ] Create test connection via UI
- [ ] Send test webhook
- [ ] Verify event processed
- [ ] Check Webflow item created
- [ ] Monitor logs in Vercel dashboard for first hour
- [ ] Check for any errors or warnings
- [ ] Verify worker running every minute

**Reference**: Section 16.4 (Post-Deployment Verification)

---

## Phase 18: Monitoring & Maintenance (Days 28-30)

### 18.1 Set Up Monitoring

#### Vercel Analytics

- [ ] Enable Vercel Analytics in project settings
- [ ] Monitor page load times
- [ ] Monitor API response times

#### Error Tracking (Optional - Sentry)

- [ ] Sign up for Sentry account
- [ ] Install Sentry SDK:
  ```bash
  npm install @sentry/nextjs
  ```
- [ ] Initialize Sentry:
  ```bash
  npx @sentry/wizard@latest -i nextjs
  ```
- [ ] Add SENTRY_DSN to environment variables
- [ ] Configure error tracking:
  ```typescript
  // sentry.client.config.ts
  import * as Sentry from '@sentry/nextjs';

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  });
  ```
- [ ] Test error reporting
- [ ] Set up alerts in Sentry

#### Log Aggregation (Optional - BetterStack)

- [ ] Sign up for BetterStack account
- [ ] Get source token
- [ ] Add BETTERSTACK_TOKEN to environment
- [ ] Configure log shipping (if needed)
- [ ] Create dashboards for key metrics
- [ ] Set up log-based alerts

**Reference**: Section 14 (Logging & Monitoring)

### 18.2 Create Operational Runbook

- [ ] Create `docs/RUNBOOK.md`:
  ```markdown
  # Operational Runbook

  ## System Health

  ### Check Health

  ```bash
  curl https://sync.yourdomain.com/api/health
  ```

  ### Metrics to Monitor

  - Queue depth: Should be < 100
  - Oldest event age: Should be < 5 minutes
  - Worker last run: Should be < 2 minutes ago
  - Connection errors: Should be 0

  ## Common Issues

  ### Worker Not Running

  **Symptoms**: Events stuck in queued, queue depth growing

  **Diagnosis**:
  1. Check Vercel cron logs
  2. Check for distributed lock stuck
  3. Check worker API errors

  **Resolution**:
  1. Manually trigger worker via Vercel
  2. Clear stuck lock in database
  3. Restart Vercel function

  ### Connection Errors

  **Symptoms**: Connection status = error, consecutive errors > 0

  **Diagnosis**:
  1. Check last error message
  2. Verify credentials still valid
  3. Check external API status

  **Resolution**:
  1. Update credentials if expired
  2. Test connection via UI
  3. Resume connection

  ### Rate Limiting

  **Symptoms**: Many 429 errors, high retry attempts

  **Diagnosis**:
  1. Check Webflow API rate limit headers
  2. Review queue interval settings
  3. Check for sudden spike in webhooks

  **Resolution**:
  1. Lower rateLimitPerMin setting
  2. Contact Webflow support for higher limits
  3. Implement adaptive rate limiting

  ## Maintenance Tasks

  ### Weekly
  - Review dead letter events
  - Check connection health
  - Review error logs

  ### Monthly
  - Update dependencies
  - Review performance metrics
  - Clean up old events (if retention policy)

  ## Emergency Contacts

  - Primary: [Your email/phone]
  - Vercel Support: support@vercel.com
  - Neon Support: [support contact]
  ```

### 18.3 Create Troubleshooting Guide

- [ ] Create `docs/TROUBLESHOOTING.md`:
  ```markdown
  # Troubleshooting Guide

  ## Events Not Processing

  ### Symptoms
  - Events stay in "queued" status
  - Queue depth keeps growing

  ### Possible Causes
  1. Worker not running
  2. Connection paused or archived
  3. Distributed lock stuck
  4. Database connection issues

  ### Solutions
  1. Check worker logs in Vercel
  2. Verify connection status is "active"
  3. Clear stuck locks:
     ```sql
     DELETE FROM distributed_locks WHERE expiresAt < NOW();
     ```
  4. Test database connection

  ## Webhook Signature Errors

  ### Symptoms
  - Webhooks rejected with 401
  - Error: "Invalid signature"

  ### Possible Causes
  1. Wrong webhook secret
  2. Timestamp too old
  3. Payload modified in transit

  ### Solutions
  1. Verify secret in SmartSuite matches database
  2. Check system clocks are synchronized
  3. Regenerate webhook secret:
     - Go to connection settings
     - Click "Regenerate Secret"
     - Update SmartSuite webhook

  ## Items Not Syncing to Webflow

  ### Symptoms
  - Events show "success" but item not in Webflow
  - Error: "Item not found"

  ### Possible Causes
  1. IdMap entry missing
  2. Webflow collection deleted
  3. Webflow token expired

  ### Solutions
  1. Check IdMap table for entry
  2. Verify collection exists in Webflow
  3. Update Webflow token:
     - Generate new PAT in Webflow
     - Update in connection settings
     - Test connection

  [More scenarios...]
  ```

### 18.4 Set Up Alerting

- [ ] Configure Vercel deployment notifications:
  - Email on deployment failure
  - Slack/Discord webhook (if applicable)

- [ ] Set up health check monitoring:
  - Use UptimeRobot or similar
  - Check `/api/health` every 5 minutes
  - Alert if unhealthy for >10 minutes

- [ ] Configure error alerts:
  - Sentry: Alert on new error types
  - Sentry: Alert if error rate >10/hour
  - BetterStack: Alert on log patterns

- [ ] Document alert escalation:
  ```markdown
  ## Alert Escalation

  **Critical Alerts** (immediate action):
  - Worker down for >10 minutes
  - Database connection lost
  - Queue depth >500

  **Warning Alerts** (investigate within 1 hour):
  - Queue depth >100
  - Success rate <90%
  - Dead letter events >50

  **Info Alerts** (review daily):
  - Credentials updated
  - Connection paused/resumed
  - New error types
  ```

**Reference**: Section 14 (Logging & Monitoring)

---

## Final Verification Checklist

Before considering the project complete:

### Functionality
- [ ] All features from spec implemented
- [ ] End-to-end sync works reliably
- [ ] Error handling works correctly
- [ ] Rate limiting prevents overload
- [ ] Retry logic recovers from transient failures
- [ ] Dead letter queue captures permanent failures

### Quality
- [ ] Unit tests passing (>80% coverage on core logic)
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] No critical bugs
- [ ] Performance meets targets (p95 < 5s)

### Documentation
- [ ] README complete and accurate
- [ ] API documentation complete
- [ ] User guide written
- [ ] Deployment guide tested
- [ ] Runbook created
- [ ] Troubleshooting guide comprehensive

### Deployment
- [ ] Deployed to Vercel successfully
- [ ] Database set up and migrated
- [ ] Cron job running
- [ ] Environment variables configured
- [ ] Custom domain working (if applicable)
- [ ] SSL certificate active

### Security
- [ ] All credentials encrypted
- [ ] Webhook signatures verified
- [ ] Session cookies secure
- [ ] CSRF protection working
- [ ] No credentials in logs
- [ ] Security headers configured

### Monitoring
- [ ] Health check endpoint working
- [ ] Logs visible in Vercel
- [ ] Error tracking configured
- [ ] Alerts set up
- [ ] Uptime monitoring active

### Success Criteria (from spec)
- [ ] Reliability: 99.9% successful sync rate
- [ ] Latency: <5 seconds p95
- [ ] Security: Zero credential exposure
- [ ] Observability: Complete event history
- [ ] Usability: Non-technical users can configure
- [ ] Scalability: Handles 10,000+ items, 100+ events/min

**Reference**: Section 1.2 (Success Criteria)

---

## Post-Launch Tasks

After successful deployment:

### Week 1
- [ ] Monitor system closely (check daily)
- [ ] Respond to any issues immediately
- [ ] Collect feedback from initial users
- [ ] Document any unexpected behaviors
- [ ] Fix any critical bugs

### Week 2-4
- [ ] Review analytics and metrics
- [ ] Optimize performance if needed
- [ ] Update documentation based on feedback
- [ ] Add any missing features
- [ ] Plan next iteration

### Ongoing
- [ ] Weekly review of dead letter events
- [ ] Monthly dependency updates
- [ ] Quarterly performance review
- [ ] Continuous monitoring

---

## Future Enhancements (Not in MVP)

These can be added after Stage 3:

### Phase 19: Advanced Features (Future)

- [ ] **Backfill Historical Data**
  - Add "Backfill" button to connection detail
  - Fetch existing SmartSuite records
  - Create events and process via worker
  - Show progress bar

- [ ] **Advanced Analytics**
  - More detailed metrics
  - Custom date range reports
  - Export to CSV/PDF
  - Email/Slack notifications

- [ ] **Multi-Locale Support**
  - Sync to multiple Webflow locales
  - Locale-specific field mappings
  - UI for managing locales

- [ ] **Image Proxy**
  - Download and re-upload images
  - Handle private/presigned URLs
  - Store in CDN

- [ ] **Bi-Directional Sync**
  - Webflow → SmartSuite
  - Conflict resolution
  - Two-way webhooks

**Reference**: Section 18 (Edge Cases & Special Scenarios)

---

## Success Criteria for Stage 3

✅ Comprehensive testing completed
✅ Full documentation written
✅ Production deployment successful
✅ Monitoring and alerting configured
✅ Runbook and troubleshooting guides created
✅ All success criteria from spec met
✅ Application production-ready

**Congratulations! The SmartSuite ↔ Webflow Sync application is complete and production-ready!**

---

## Getting Help

If you need assistance:

1. Review specification: `documents/smartsuite_webflow_sync_spec.txt`
2. Check documentation in `docs/` folder
3. Review troubleshooting guide
4. Check Vercel logs for errors
5. Open GitHub issue (if applicable)

## Maintenance Schedule

**Daily** (First week):
- Check health endpoint
- Review error logs
- Monitor queue depth

**Weekly**:
- Review dead letter events
- Check connection health
- Update dependencies

**Monthly**:
- Performance review
- Security audit
- Documentation updates

**Quarterly**:
- Feature planning
- Major updates
- User feedback review
