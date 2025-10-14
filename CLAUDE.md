# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A production-ready webhook sync engine that automatically syncs data from SmartSuite to Webflow. The system uses a database-backed queue with distributed locking, rate limiting, retry logic with exponential backoff, and AES-256-GCM encryption for credentials.

**Current Status**: Stage 1 Complete - Full backend infrastructure is built and ready for testing. Stage 2 (Dashboard UI) is pending.

## Common Commands

### Development
```bash
npm run dev              # Start dev server (uses Turbopack)
npm run build            # Build for production (runs prisma generate first)
npm run start            # Start production server
npm run type-check       # Run TypeScript compiler without emitting
npm run lint             # Run ESLint
```

### Database
```bash
npx prisma generate      # Generate Prisma Client (required after schema changes)
npm run db:push          # Push schema to database (development)
npm run db:migrate       # Create and run migrations (production)
npm run db:studio        # Open Prisma Studio GUI
npm run db:seed          # Seed test data (creates sample connection)
```

### Testing
```bash
npm run test                              # Run Vitest
curl http://localhost:3000/api/health     # Test health endpoint
```

### Manual Testing
```bash
# Trigger worker manually
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/jobs/ingest
```

## Architecture

### High-Level Flow
```
SmartSuite Webhook → Ingress API (/api/hooks/[connectionId])
                           ↓
                    Event Record (queued)
                           ↓
                    Worker Cron (/api/jobs/ingest)
                           ↓
                    Event Processor (lib/event-processor.ts)
                           ↓
                    Mapping Engine (lib/mapper.ts)
                           ↓
                    Queue Manager (lib/queue-manager.ts)
                           ↓
                    Webflow API Client (lib/webflow.ts)
                           ↓
                    Update IdMap & Event Status
```

### Core Components

**Webhook Ingress** (`app/api/hooks/[connectionId]/route.ts`)
- Validates HMAC-SHA256 signatures via `lib/webhook-security.ts`
- Handles idempotency with SHA-256 payload hashing
- Creates queued Event records in the database
- Returns 202 immediately (async processing)

**Worker** (`app/api/jobs/ingest/route.ts`)
- Runs every minute via Vercel cron (`vercel.json`)
- Uses distributed locking (`lib/distributed-lock.ts`) to prevent concurrent runs
- Fetches up to `WORKER_BATCH_SIZE` (default 25) events
- Processes events in parallel with concurrency limit of 10
- Only processes events from active connections

**Event Processor** (`lib/event-processor.ts`)
- Orchestrates event processing lifecycle
- Decrypts credentials using AES-256-GCM
- Calls mapping engine to build Webflow field data
- Validates required fields
- Executes Webflow upsert with rate limiting and retry
- Updates event status (success/failed/dead_letter)
- Tracks connection health (consecutiveErrors, lastSuccessAt, etc.)

**Mapping Engine** (`lib/mapper.ts`)
- Supports 5 mapping types: direct, jsonata, template, constant, reference
- `normalizeSmartSuitePayload()`: Extracts record data from webhook payload
- `buildWebflowBody()`: Applies field mappings and generates slug
- `applyFieldMapping()`: Handles individual field transformations
- Transform functions in `lib/transforms.ts` (date formatting, case conversion, etc.)
- Reference resolution via IdMap for cross-record relationships

**Queue Manager** (`lib/queue-manager.ts`)
- Per-connection queues using `p-queue` for rate limiting
- `executeWithQueueAndRetry()`: Wraps operations with both queue and retry
- `isRetriableError()`: Classifies errors (429, 5xx, timeouts = retriable; 4xx = not retriable)
- Exponential backoff with jitter using `p-retry`
- Max timeout: `MAX_RETRY_BACKOFF_MS` (default 60s)

**Webflow Client** (`lib/webflow.ts`)
- V2 API wrapper using `undici` fetch
- `upsertWebflowItem()`: Checks IdMap, then creates or updates
- Automatic slug collision handling (adds suffix -1, -2, etc.)
- 30-second request timeout
- Error handling with status code preservation

**IdMap System** (`prisma/schema.prisma`)
- Maps SmartSuite record IDs to Webflow item IDs
- Unique constraint: `(connectionId, externalSource, externalId)`
- Used for upserts and reference field resolution
- Tracks `lastSyncedAt` timestamp

### Database Schema

**Key Models**:
- `Connection`: Sync configuration with encrypted credentials (SmartSuite API key, Webflow token)
- `Mapping`: Field mapping rules, slug template, status behavior, required fields
- `Event`: Webhook events with status (queued/processing/success/failed/dead_letter/skipped)
- `IdMap`: External ID to Webflow ID mapping
- `DistributedLock`: Prevents concurrent worker execution
- `AnalyticsDaily`: Daily metrics per connection
- `AuditLog`: System actions and events

**Important**: After modifying `prisma/schema.prisma`, always run `npx prisma generate` to update the Prisma Client.

### Security

**Credential Encryption** (`lib/crypto.ts`)
- AES-256-GCM with random IVs (12 bytes)
- Key: 64-character hex string in `DATA_ENCRYPTION_KEY`
- Credentials stored as: `{ciphertext, iv, authTag}` (all base64)

**Webhook Security** (`lib/webhook-security.ts`)
- HMAC-SHA256 signature verification
- Timestamp validation (max 5 minutes skew)
- Secret stored as bcrypt hash in `Connection.webhookSecretHash`

**Authentication**
- Dashboard: `iron-session` with bcrypt password hash
- Worker: Bearer token authentication using `CRON_SECRET`

**Headers**: Security headers configured in `next.config.ts` (X-Frame-Options, HSTS, etc.)

### Environment Variables

Validated using `@t3-oss/env-nextjs` in `lib/env.ts`. All validation rules are defined there.

**Required Variables**:
- `DATABASE_URL`: PostgreSQL connection (pooled)
- `DIRECT_DATABASE_URL`: Direct PostgreSQL connection
- `DATA_ENCRYPTION_KEY`: 64-char hex string for AES-256
- `SESSION_PASSWORD`: Min 32 chars for session encryption
- `DASHBOARD_PASSWORD_HASH`: Bcrypt hash for dashboard login
- `CRON_SECRET`: Min 32 chars for worker auth
- `APP_URL`: Full application URL

**Optional Tuning**:
- `WRITE_CAP_PER_MINUTE` (default: 50)
- `MAX_RETRY_ATTEMPTS` (default: 5)
- `RETRY_BACKOFF_MS` (default: 1000)
- `MAX_RETRY_BACKOFF_MS` (default: 60000)
- `WORKER_BATCH_SIZE` (default: 25)
- `LOCK_TIMEOUT_MS` (default: 300000)
- `LOG_LEVEL` (default: info)
- `PRETTY_LOGS` (default: false)

### Logging

Using Pino (`lib/logger.ts`) with:
- Structured JSON logging
- Automatic redaction of sensitive fields (password, token, apiKey, etc.)
- Child loggers with contextual fields (connectionId, eventId, etc.)
- Pretty printing in development when `PRETTY_LOGS=true`

### Code Style

Prettier configuration (`.prettierrc.json`):
- Single quotes
- 2-space tabs
- Semicolons
- 80 character line width
- Tailwind plugin for class sorting

## Important Patterns

### Error Handling
- Use `isRetriableError()` to classify errors before retrying
- Non-retriable errors (4xx except 429, 408) go directly to dead_letter
- Retriable errors retry with exponential backoff until `maxRetries` reached
- Always log errors with context (eventId, connectionId, etc.)

### Working with Encrypted Credentials
```typescript
import { encryptSecret, decryptSecret } from '@/lib/crypto';

// Encrypt
const encrypted = await encryptSecret(plaintext);
// Store: encrypted.ciphertext, encrypted.iv, encrypted.authTag

// Decrypt
const plaintext = await decryptSecret({
  ciphertext: stored.ciphertext,
  iv: stored.iv,
  authTag: stored.authTag,
});
```

### Adding New Field Transforms
Add to `lib/transforms.ts`:
```typescript
export const transforms: Record<string, TransformFunction> = {
  myTransform: (value, ...args) => {
    // Transform logic
    return transformedValue;
  },
};
```

Then reference in field mapping config:
```typescript
{
  type: 'direct',
  source: 'field',
  transform: 'myTransform',
  transformArgs: [arg1, arg2],
}
```

### Testing Webhooks
The SmartSuite webhook signature format:
```
Headers:
  x-smartsuite-signature: HMAC-SHA256 hex of (timestamp + body)
  x-smartsuite-timestamp: Unix timestamp in seconds
  x-idempotency-key: Optional unique key
```

Use `lib/webhook-security.ts` functions to generate test signatures.

## File Organization

```
/app/api/              # Next.js API routes
  /health/             # Health check endpoint
  /hooks/              # Webhook ingress
  /jobs/               # Worker cron jobs

/lib/                  # Core business logic (NO UI code here)
  crypto.ts            # Encryption utilities
  db.ts                # Prisma client singleton
  distributed-lock.ts  # Worker coordination
  env.ts               # Environment validation
  event-processor.ts   # Event processing orchestration
  field-types.ts       # Field type compatibility matrix
  logger.ts            # Pino logger setup
  mapper.ts            # Data mapping engine
  queue-manager.ts     # Rate limiting & retry
  session.ts           # Iron-session config
  smartsuite.ts        # SmartSuite API client (minimal, not heavily used)
  transforms.ts        # Transform function library
  utils.ts             # Misc utilities
  validator.ts         # Field validation & type coercion
  webflow.ts           # Webflow API client
  webhook-security.ts  # Signature verification

/prisma/
  schema.prisma        # Database schema (single source of truth)
  seed.ts              # Test data seeding

/types/
  index.ts             # Shared TypeScript types

/documents/           # Implementation guides and specs (reference only)
```

## Known Issues and Gotchas

1. **Prisma Client**: After changing `schema.prisma`, run `npx prisma generate` before building or running tests
2. **Worker Lock**: If worker gets stuck, manually delete from `DistributedLock` table or wait for `LOCK_TIMEOUT_MS`
3. **Slug Collisions**: Handled automatically with suffix (-1, -2, etc.) but logged as warnings
4. **Rate Limits**: Each connection has its own queue; tune `rateLimitPerMin` per connection in database
5. **Timezone Handling**: Webflow uses specific timezone formats; see `lib/transforms.ts` for date handling
6. **Reference Fields**: Must have IdMap entry; fails silently if not found (returns null)

## Next Steps (Stage 2)

Stage 2 will add:
- Dashboard UI for managing connections
- API endpoints for CRUD operations (connections, mappings, events)
- Connection setup wizard
- Field mapping UI builder
- Event monitoring and analytics dashboard

When working on Stage 2, maintain the separation: business logic in `/lib`, UI components in `/app` or `/components`.
