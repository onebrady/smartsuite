# SmartSuite ↔ Webflow Sync - Implementation Task List

**Project Location**: `/home/onebrady/projects/smartsuite` (root directory)
**Reference Specification**: `documents/smartsuite_webflow_sync_spec.txt`
**Estimated Timeline**: 5 weeks
**Last Updated**: 2025-10-13

---

## Overview

This task list provides a step-by-step guide to implement the SmartSuite ↔ Webflow synchronization system. Each phase builds upon the previous one, and tasks should generally be completed in order.

**Key Reference Sections in Spec**:
- Architecture: Section 2
- Technology Stack: Section 3
- Database Schema: Section 5
- Security: Section 7
- Core Logic: Section 8
- UI Requirements: Section 11
- API Endpoints: Section 12

---

## Phase 1: Project Setup & Foundation (Days 1-2)

### 1.1 Initialize Next.js Project

- [ ] Create new Next.js 14.2+ project with App Router in project root
  ```bash
  npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
  ```
- [ ] Verify TypeScript configuration (strict mode enabled)
- [ ] Test dev server runs successfully: `npm run dev`
- [ ] Create `.gitignore` (include `.env*`, `node_modules`, `.next`, etc.)
- [ ] Initialize git repository: `git init`
- [ ] Create initial commit

**Reference**: Section 3.1 (Core Framework)

### 1.2 Install Dependencies

- [ ] Install all production dependencies:
  ```bash
  npm install @prisma/client@^5.15.0 prisma@^5.15.0 zod@^3.23.8 @t3-oss/env-nextjs@^0.10.1 undici@^6.18.2 p-retry@^6.2.0 p-queue@^8.0.1 p-limit@^5.0.0 jsonata@^2.0.5 change-case@^5.4.4 date-fns@^3.6.0 date-fns-tz@^3.1.3 iron-session@^8.0.1 bcryptjs@^2.4.3 nanoid@^5.0.7 pino@^9.1.0 pino-pretty@^11.1.0 @tanstack/react-table@^8.17.3 react-hook-form@^7.51.5 @hookform/resolvers@^3.6.0 recharts@^2.12.7 clsx@^2.1.1 tailwind-merge@^2.3.0 lucide-react@^0.395.0 class-variance-authority@^0.7.0
  ```
- [ ] Install Radix UI components:
  ```bash
  npm install @radix-ui/react-dialog@^1.0.5 @radix-ui/react-select@^2.0.0 @radix-ui/react-tooltip@^1.0.7 @radix-ui/react-tabs@^1.0.4 @radix-ui/react-toast@^1.1.5 @radix-ui/react-switch@^1.0.3 @radix-ui/react-dropdown-menu@^2.0.6
  ```
- [ ] Install dev dependencies:
  ```bash
  npm install -D @types/node@^20.14.9 @types/bcryptjs@^2.4.6 @types/jsonata@^1.5.1 eslint@^8.57.0 eslint-config-next@^14.2.5 prettier@^3.3.2 prettier-plugin-tailwindcss@^0.6.5 tsx@^4.15.7 vitest@^1.6.0 @testing-library/react@^16.0.0 @testing-library/jest-dom@^6.4.6 @vitejs/plugin-react@^4.3.1
  ```
- [ ] Verify all packages installed: `npm list --depth=0`

**Reference**: Section 3.11 (Package.json Structure)

### 1.3 Configure Build Tools

- [ ] Update `tailwind.config.ts` with custom theme (colors, spacing)
- [ ] Create `.prettierrc.json` with formatting rules
- [ ] Update `package.json` scripts:
  ```json
  {
    "scripts": {
      "dev": "next dev",
      "build": "prisma generate && next build",
      "start": "next start",
      "lint": "next lint",
      "db:push": "prisma db push",
      "db:migrate": "prisma migrate dev",
      "db:studio": "prisma studio",
      "db:seed": "tsx prisma/seed.ts",
      "type-check": "tsc --noEmit",
      "test": "vitest",
      "test:ui": "vitest --ui"
    }
  }
  ```
- [ ] Create `next.config.js` with security headers
- [ ] Create `vercel.json` with cron configuration

**Reference**: Section 7.5 (Security Headers)

### 1.4 Create Folder Structure

Create the following directory structure in project root:

```
/
├── app/
│   ├── (auth)/
│   │   └── admin/
│   │       └── login/
│   ├── admin/
│   │   ├── connections/
│   │   ├── events/
│   │   ├── items/
│   │   └── settings/
│   ├── api/
│   │   ├── auth/
│   │   ├── connections/
│   │   ├── events/
│   │   ├── hooks/
│   │   ├── items/
│   │   ├── jobs/
│   │   ├── mappings/
│   │   ├── analytics/
│   │   └── discovery/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/           # shadcn components
│   ├── dashboard/    # Dashboard-specific components
│   └── forms/        # Form components
├── lib/
│   ├── db.ts
│   ├── env.ts
│   ├── crypto.ts
│   ├── session.ts
│   ├── logger.ts
│   ├── webhook-security.ts
│   ├── webflow.ts
│   ├── smartsuite.ts
│   ├── mapper.ts
│   ├── event-processor.ts
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   └── integration/
├── types/
│   └── index.ts
├── documents/         # Specification documents
└── public/
```

- [ ] Create all directories listed above
- [ ] Create placeholder `.gitkeep` files in empty directories

**Reference**: Inferred from project structure

---

## Phase 2: Environment & Security Configuration (Days 2-3)

### 2.1 Environment Variables Setup

- [ ] Create `.env.example` with all required variables (template)
- [ ] Create `.env.local` for development
- [ ] Generate secrets using OpenSSL:
  ```bash
  # SESSION_PASSWORD
  openssl rand -base64 32

  # DATA_ENCRYPTION_KEY
  openssl rand -hex 32

  # CRON_SECRET
  openssl rand -base64 32

  # DASHBOARD_PASSWORD_HASH (replace 'password' with your password)
  node -e "console.log(require('bcryptjs').hashSync('password', 10))"
  ```
- [ ] Add all environment variables to `.env.local`
- [ ] Add `.env*` to `.gitignore` (except `.env.example`)

**Reference**: Section 4 (Environment Configuration)

### 2.2 Environment Validation (lib/env.ts)

- [ ] Create `lib/env.ts` using `@t3-oss/env-nextjs`
- [ ] Add Zod schemas for all environment variables
- [ ] Implement validation rules:
  - SESSION_PASSWORD: min 32 chars
  - DATA_ENCRYPTION_KEY: exactly 64 hex chars
  - DASHBOARD_PASSWORD_HASH: bcrypt format validation
  - DATABASE_URL: valid PostgreSQL connection string
  - APP_URL: valid URL (HTTPS in production)
  - Numeric vars: integer validation with ranges
- [ ] Export typed `env` object
- [ ] Test by intentionally using invalid values (should fail at startup)

**Reference**: Section 4.2 (Environment Variable Validation)

### 2.3 Cryptography Implementation (lib/crypto.ts)

- [ ] Implement `encryptSecret(plaintext)` using AES-256-GCM
  - Generate random 12-byte IV
  - Encrypt with DATA_ENCRYPTION_KEY
  - Return `{ ciphertext: base64, iv: base64 }`
- [ ] Implement `decryptSecret({ ciphertext, iv })`
  - Decode base64 values
  - Decrypt using AES-256-GCM
  - Return plaintext string
- [ ] Implement `generateSecret(length)` using crypto.randomBytes
- [ ] Write unit tests for encrypt/decrypt round-trip
- [ ] Test with various input sizes

**Reference**: Section 7.1 (Credential Encryption)

### 2.4 Webhook Security (lib/webhook-security.ts)

- [ ] Implement `verifyWebhookSignature(body, signature, secret)`
  - Compute HMAC-SHA256(body, secret)
  - Compare with signature using crypto.timingSafeEqual
  - Return boolean
- [ ] Implement `verifyTimestamp(timestamp, maxAgeSeconds)`
  - Parse timestamp
  - Check if within maxAge window (default 300s)
  - Reject future timestamps
  - Return boolean
- [ ] Implement `generateWebhookSecret()` for new connections
- [ ] Write unit tests for signature verification
- [ ] Test timestamp validation edge cases

**Reference**: Section 7.2 (Webhook Signature Verification)

### 2.5 Session Management (lib/session.ts)

- [ ] Configure iron-session with session options
- [ ] Define SessionData interface
- [ ] Implement `getSession()` - returns IronSession
- [ ] Implement `requireAuth()` - throws if not authenticated
- [ ] Implement `createSession(password)` - verify password and create session
- [ ] Implement `destroySession()` - clear session
- [ ] Test session creation and validation

**Reference**: Section 7.3 (Dashboard Authentication)

### 2.6 Logger Setup (lib/logger.ts)

- [ ] Configure Pino logger with appropriate settings:
  - Production: JSON output, level: info
  - Development: pretty output, level: debug
- [ ] Add redaction for sensitive fields
- [ ] Create child logger helper for adding context
- [ ] Export configured logger instance
- [ ] Test logging at different levels

**Reference**: Section 14.1 (Logging Implementation)

---

## Phase 3: Database Setup (Days 3-4)

### 3.1 Create Prisma Schema

- [ ] Create `prisma/schema.prisma` with complete schema
- [ ] Define all enums:
  - EventStatus (queued, processing, success, failed, dead_letter, skipped)
  - SourceType (smartsuite)
  - TargetType (webflow)
  - ConnectionStatus (active, paused, error, archived)
  - FieldMappingType (direct, jsonata, template, constant, reference)
- [ ] Define all models:
  - Connection (with encrypted credentials, webhook config, rate limiting)
  - Mapping (field mappings, transforms, validation rules)
  - IdMap (external ID ↔ Webflow ID mapping)
  - Event (webhook queue with full lifecycle)
  - AnalyticsDaily (aggregated metrics)
  - AuditLog (change tracking)
  - DistributedLock (worker coordination)
- [ ] Add all indexes per specification
- [ ] Add all relationships and cascades

**Reference**: Section 5.1 (Complete Prisma Schema)

### 3.2 Database Client (lib/db.ts)

- [ ] Implement Prisma Client singleton pattern
- [ ] Use `globalThis` to prevent multiple instances in dev
- [ ] Configure query logging based on environment
- [ ] Export single `prisma` instance
- [ ] Add connection error handling

**Reference**: Section 5.5 (Database Client Setup)

### 3.3 Run Database Migrations

- [ ] Set up Neon PostgreSQL database (or local PostgreSQL for dev)
- [ ] Add DATABASE_URL and DIRECT_DATABASE_URL to `.env.local`
- [ ] Generate Prisma Client: `npm run db:push`
- [ ] Verify schema created successfully
- [ ] Open Prisma Studio to inspect: `npm run db:studio`

**Reference**: Section 16.2 (Database Setup)

### 3.4 Seed Script (Optional)

- [ ] Create `prisma/seed.ts` for test data
- [ ] Add sample connection (inactive by default)
- [ ] Add sample events for testing
- [ ] Test seed script: `npm run db:seed`

**Reference**: Implied from package.json scripts

---

## Phase 4: External API Clients (Days 4-5)

### 4.1 SmartSuite API Client (lib/smartsuite.ts)

- [ ] Create SmartSuiteClient class
- [ ] Implement authentication (Token header)
- [ ] Implement `getBases(apiKey)` - list solutions
- [ ] Implement `getTables(apiKey, baseId)` - list applications
- [ ] Implement `getSchema(apiKey, baseId, tableId)` - get field schema
- [ ] Implement `getRecords(apiKey, baseId, tableId, options)` - list records with pagination
- [ ] Add error handling for 401, 403, 404, 429, 500s
- [ ] Add 30s timeout on all requests
- [ ] Test with real SmartSuite credentials

**Reference**: Section 6.1 (SmartSuite API)

### 4.2 Webflow API Client (lib/webflow.ts)

- [ ] Create WebflowClient class
- [ ] Implement authentication (Bearer token)
- [ ] Implement `getSites(token)` - list sites
- [ ] Implement `getCollections(token, siteId)` - list collections
- [ ] Implement `getCollectionSchema(token, collectionId)` - get fields
- [ ] Implement `createItem(token, collectionId, fieldData)` - POST /items/live
- [ ] Implement `updateItem(token, collectionId, itemId, fieldData)` - PATCH /items/{id}/live
- [ ] Implement `deleteItem(token, collectionId, itemId)` - DELETE /items/{id}
- [ ] Implement `upsertWebflowItem(connection, externalId, fieldData)` - main upsert logic
  - Check IdMap for existing item
  - Call create or update accordingly
  - Update IdMap after success
  - Handle slug collisions with retry logic
- [ ] Add error handling and response parsing
- [ ] Test with real Webflow credentials

**Reference**: Section 6.2 (Webflow API)

### 4.3 Rate Limiting & Retry Logic

- [ ] Create per-connection queue manager using p-queue
- [ ] Implement queue factory function:
  ```typescript
  function getConnectionQueue(connectionId: string, rateLimitPerMin: number): PQueue
  ```
- [ ] Configure queue with interval, intervalCap, timeout
- [ ] Implement retry wrapper using p-retry for Webflow calls:
  - Max retries from connection.maxRetries
  - Exponential backoff with jitter
  - Retry on: 429, 500s, network errors
  - Don't retry: 400, 401, 403, 404, 422
- [ ] Test rate limiting by making many rapid requests
- [ ] Test retry logic with simulated failures

**Reference**: Section 9.4-9.5 (Rate Limiting & Retry Strategy)

---

## Phase 5: Webhook Ingress & Event Creation (Days 5-6)

### 5.1 Webhook Endpoint (app/api/hooks/[connectionId]/route.ts)

- [ ] Create POST handler for webhook ingress
- [ ] Extract connectionId from URL params
- [ ] Verify connection exists and is active
- [ ] Extract headers: x-smartsuite-signature, x-smartsuite-timestamp, x-idempotency-key
- [ ] Read raw request body as text (needed for signature verification)
- [ ] Verify webhook signature using webhook-security lib
- [ ] Verify timestamp (within 5 minutes)
- [ ] Parse JSON body
- [ ] Generate idempotency key if not provided (hash of payload)
- [ ] Check for duplicate idempotency key in events table
  - If found: return 409 Conflict with existing event ID
- [ ] Create Event record with status='queued'
- [ ] Return 202 Accepted with event ID
- [ ] Handle errors:
  - 404 if connection not found
  - 401 if signature invalid
  - 400 if body invalid
  - 500 for unexpected errors
- [ ] Add comprehensive logging

**Reference**: Section 2 (Webhook Ingress Layer) and Section 12.8 (Webhook API)

### 5.2 Test Webhook Ingress

- [ ] Create test script to send mock webhook
- [ ] Test with valid signature
- [ ] Test with invalid signature (should reject)
- [ ] Test with old timestamp (should reject)
- [ ] Test duplicate idempotency key (should return 409)
- [ ] Verify event created in database
- [ ] Check logs for proper context

**Reference**: Section 8.2 (Idempotency Strategy)

---

## Phase 6: Mapping Engine (Days 6-7)

### 6.1 Field Type Compatibility (lib/field-types.ts)

- [ ] Create FIELD_TYPE_COMPATIBILITY constant mapping SmartSuite types to Webflow types
- [ ] Implement `isCompatible(ssType, wfType)` function
- [ ] Implement `getCompatibleTypes(ssType)` function
- [ ] Create type guards for field validation
- [ ] Write unit tests for type compatibility

**Reference**: Section 6.3 (Field Type Compatibility Matrix)

### 6.2 Transform Functions (lib/transforms.ts)

- [ ] Implement string transforms:
  - uppercase, lowercase, title
  - camel, pascal, snake, kebab (using change-case)
  - trim, truncate
- [ ] Implement numeric transforms:
  - round, floor, ceil
- [ ] Implement date transforms (using date-fns):
  - formatDate
- [ ] Implement slug generation:
  - kebabCase + remove special chars + truncate to 100
- [ ] Export TRANSFORMS object with all functions
- [ ] Write unit tests for each transform

**Reference**: Section 10.2 (Transform Functions)

### 6.3 Core Mapper (lib/mapper.ts)

- [ ] Implement `normalizeSmartSuitePayload(payload)`:
  - Extract record data
  - Flatten nested structures
  - Normalize field values
- [ ] Implement `applyFieldMapping(config, data)`:
  - Handle 'direct' type: JSONPath extraction
  - Handle 'jsonata' type: evaluate expression
  - Handle 'template' type: render template with placeholders
  - Handle 'constant' type: return fixed value
  - Handle 'reference' type: lookup in IdMap
  - Apply transform if specified
  - Apply default if source is null
- [ ] Implement `buildWebflowBody(mapping, ssData, connection)`:
  - Iterate through fieldMap
  - Apply each mapping
  - Collect warnings for non-fatal issues
  - Validate required fields present
  - Return { fieldData, warnings }
- [ ] Implement `generateSlug(template, data)`:
  - Render template
  - Apply slug transforms
  - Handle collisions with counter suffix
- [ ] Write comprehensive unit tests with sample data

**Reference**: Section 10 (Mapping Engine Specification)

### 6.4 Validation (lib/validator.ts)

- [ ] Implement `validateFieldType(value, expectedType)`:
  - Check type matches
  - Coerce when safe (string "123" → number 123)
  - Throw error if invalid
- [ ] Implement `validateRequiredFields(fieldData, requiredFields)`:
  - Check all required fields have values
  - Throw error listing missing fields
- [ ] Implement `validateSlug(slug)`:
  - Check format (lowercase, alphanumeric, hyphens)
  - Check length (<= 100)
  - Return boolean
- [ ] Write unit tests for validation rules

**Reference**: Section 8.7 (Validation Before Webflow Call)

---

## Phase 7: Event Processor & Worker (Days 7-9)

### 7.1 Event Processor (lib/event-processor.ts)

- [ ] Create EventProcessor class
- [ ] Implement `processEvent(eventId)` main method:
  1. Load event from database
  2. Update status to 'processing', increment attempts
  3. Load connection and mapping
  4. Decrypt credentials (ssApiKey, wfToken)
  5. Normalize SmartSuite payload
  6. Build Webflow body using mapper
  7. Validate required fields
  8. Call Webflow upsert (via rate-limited queue)
  9. Update IdMap on success
  10. Update event status (success/failed/dead_letter)
  11. Record metrics (duration, warnings)
  12. Update connection health (lastSuccessAt, consecutiveErrors)
- [ ] Implement error handling:
  - Classify errors as retriable/non-retriable
  - Calculate retryAfter timestamp for retriable errors
  - Mark as dead_letter if max retries exhausted
  - Store error message and stack trace
- [ ] Handle special cases:
  - Status behavior (archive/delete)
  - Image validation
  - Reference field resolution
  - Partial success
- [ ] Add comprehensive logging at each step
- [ ] Write integration tests with mocked Webflow API

**Reference**: Section 8 (Core Business Logic)

### 7.2 Distributed Lock (lib/distributed-lock.ts)

- [ ] Implement `acquireLock(lockId, processId, expiresIn)`:
  - Try to INSERT lock row
  - If conflict, check if expired and take over
  - Return boolean indicating success
- [ ] Implement `releaseLock(lockId, processId)`:
  - DELETE lock row WHERE id AND acquiredBy
- [ ] Implement `refreshLock(lockId, processId, expiresIn)`:
  - UPDATE expiresAt timestamp
- [ ] Write tests for lock acquisition and release

**Reference**: Section 9.3 (Distributed Lock)

### 7.3 Worker Cron Job (app/api/jobs/ingest/route.ts)

- [ ] Create POST handler for worker
- [ ] Verify CRON_SECRET from Authorization header
- [ ] Generate unique processId using nanoid
- [ ] Try to acquire distributed lock 'worker:ingest'
  - If locked: return 423 Locked
- [ ] Query events ready for processing:
  ```sql
  WHERE (status = 'queued' OR (status = 'failed' AND retryAfter <= NOW()))
    AND connection.status = 'active'
  ORDER BY queuedAt ASC
  LIMIT WORKER_BATCH_SIZE
  ```
- [ ] Process events in parallel (up to 10 concurrent using p-limit)
- [ ] For each event, call EventProcessor.processEvent()
- [ ] Collect results (processed, succeeded, failed counts)
- [ ] Release distributed lock
- [ ] Return summary with metrics
- [ ] Add error handling and timeout (max 5 minutes)
- [ ] Log worker run details

**Reference**: Section 9.2 (Worker Process) and Section 12.9 (Worker API)

### 7.4 Test Complete Flow

- [ ] Create test connection in database (with encrypted credentials)
- [ ] Create test mapping
- [ ] Send test webhook via API
- [ ] Verify event created
- [ ] Manually trigger worker: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/jobs/ingest`
- [ ] Verify event processed
- [ ] Check Webflow item created/updated
- [ ] Verify IdMap entry
- [ ] Check logs for complete flow

**Reference**: Section 2.2 (Data Flow Scenarios)

---

## Phase 8: API Endpoints - Connections & Mappings (Days 9-11)

### 8.1 Authentication API

- [ ] POST /api/auth/login (app/api/auth/login/route.ts)
  - Accept password in body
  - Compare with DASHBOARD_PASSWORD_HASH using bcrypt
  - Create session on success
  - Return success with expiry
  - Log failed attempts
- [ ] POST /api/auth/logout (app/api/auth/logout/route.ts)
  - Destroy session
  - Return success
- [ ] Test login flow
- [ ] Test logout flow

**Reference**: Section 12.1 (Authentication API)

### 8.2 Connections API

- [ ] GET /api/connections (app/api/connections/route.ts)
  - Require auth
  - Support query params: status, search, limit, offset
  - Return paginated list of connections
  - Omit sensitive fields (encrypted keys)
- [ ] GET /api/connections/[id] (app/api/connections/[id]/route.ts)
  - Require auth
  - Return single connection with mappings
  - Return 404 if not found
- [ ] POST /api/connections (app/api/connections/route.ts)
  - Require auth
  - Validate request body with Zod
  - Encrypt credentials (ssApiKey, wfToken)
  - Generate webhook secret and hash it
  - Generate webhook URL
  - Create connection record
  - Log in audit log
  - Return connection with webhook details
- [ ] PATCH /api/connections/[id] (app/api/connections/[id]/route.ts)
  - Require auth
  - Support partial updates
  - Re-encrypt credentials if changed
  - Log in audit log
  - Return updated connection
- [ ] DELETE /api/connections/[id] (app/api/connections/[id]/route.ts)
  - Require auth
  - Soft delete (set status='archived')
  - Log in audit log
  - Return 204
- [ ] Write tests for all endpoints

**Reference**: Section 12.2 (Connections API)

### 8.3 Mappings API

- [ ] GET /api/mappings/[connectionId] (app/api/mappings/[connectionId]/route.ts)
  - Require auth
  - Return mapping for connection
  - Return 404 if no mapping
- [ ] POST /api/mappings/[connectionId] (app/api/mappings/[connectionId]/route.ts)
  - Require auth
  - Validate mapping configuration
  - Create mapping record
  - Increment mapping version if updating
  - Log in audit log
  - Return created mapping
- [ ] PATCH /api/mappings/[id] (app/api/mappings/[id]/route.ts)
  - Require auth
  - Support partial updates to fieldMap
  - Validate updated configuration
  - Log in audit log
  - Return updated mapping
- [ ] Write tests for all endpoints

**Reference**: Section 12.3 (Mappings API)

### 8.4 Discovery API

Create discovery endpoints for populating mapping wizard dropdowns:

- [ ] GET /api/discovery/smartsuite/bases (app/api/discovery/smartsuite/bases/route.ts)
  - Accept apiKey in query param
  - Call SmartSuite API
  - Return list of bases/solutions
- [ ] GET /api/discovery/smartsuite/tables
  - Accept apiKey, baseId in query params
  - Return list of tables/applications
- [ ] GET /api/discovery/smartsuite/fields
  - Accept apiKey, baseId, tableId in query params
  - Return field schema
- [ ] GET /api/discovery/webflow/sites (app/api/discovery/webflow/sites/route.ts)
  - Accept token in query param
  - Call Webflow API
  - Return list of sites
- [ ] GET /api/discovery/webflow/collections
  - Accept token, siteId in query params
  - Return list of collections
- [ ] GET /api/discovery/webflow/fields
  - Accept token, collectionId in query params
  - Return collection schema with fields
- [ ] Add error handling for invalid credentials
- [ ] Write tests with mocked external APIs

**Reference**: Section 12.7 (Discovery API)

---

## Phase 9: API Endpoints - Events & Items (Days 11-12)

### 9.1 Events API

- [ ] GET /api/events (app/api/events/route.ts)
  - Require auth
  - Support filters: connectionId, status, externalId, dateFrom, dateTo
  - Support pagination: limit, offset
  - Return paginated list of events
- [ ] GET /api/events/[id] (app/api/events/[id]/route.ts)
  - Require auth
  - Return full event details including payload and response
  - Return 404 if not found
- [ ] POST /api/events/[id]/replay (app/api/events/[id]/replay/route.ts)
  - Require auth
  - Reset event to queued status
  - Reset attempts to 0
  - Clear retryAfter
  - Log in audit log
  - Return updated event
- [ ] Write tests for all endpoints

**Reference**: Section 12.4 (Events API)

### 9.2 Items API

- [ ] GET /api/items/lookup (app/api/items/lookup/route.ts)
  - Require auth
  - Accept connectionId, externalId in query params
  - Query IdMap for item
  - Fetch current Webflow data
  - Return combined data
  - Return 404 if not in IdMap
- [ ] POST /api/items/resync (app/api/items/resync/route.ts)
  - Require auth
  - Accept connectionId, externalId in body
  - Fetch fresh data from SmartSuite
  - Create new event with current data
  - Process immediately (bypass queue)
  - Return event ID and result
- [ ] Write tests for both endpoints

**Reference**: Section 12.5 (Items API)

### 9.3 Analytics API

- [ ] GET /api/analytics/daily (app/api/analytics/daily/route.ts)
  - Require auth
  - Accept connectionId, dateFrom, dateTo in query params
  - Query AnalyticsDaily table
  - Compute rollups if needed
  - Return aggregated metrics
- [ ] Implement background job to compute daily analytics (optional for MVP)
- [ ] Write tests with sample data

**Reference**: Section 12.6 (Analytics API)

### 9.4 Health Check API

- [ ] GET /api/health (app/api/health/route.ts)
  - Public endpoint (no auth required)
  - Check database connection
  - Query queue depth
  - Query oldest event age
  - Query worker last run time
  - Query connection health stats
  - Return health status object
  - Return 200 if healthy, 503 if unhealthy
- [ ] Test health endpoint

**Reference**: Section 14.4 (Health Check Endpoint)

---

## Phase 10: Dashboard UI - Authentication & Layout (Days 12-13)

### 10.1 Shared UI Components (components/ui/)

Install shadcn/ui components:

- [ ] Initialize shadcn: `npx shadcn-ui@latest init`
- [ ] Add Button: `npx shadcn-ui@latest add button`
- [ ] Add Input: `npx shadcn-ui@latest add input`
- [ ] Add Label: `npx shadcn-ui@latest add label`
- [ ] Add Card: `npx shadcn-ui@latest add card`
- [ ] Add Badge: `npx shadcn-ui@latest add badge`
- [ ] Add Table: `npx shadcn-ui@latest add table`
- [ ] Add Dialog: `npx shadcn-ui@latest add dialog`
- [ ] Add Select: `npx shadcn-ui@latest add select`
- [ ] Add Tooltip: `npx shadcn-ui@latest add tooltip`
- [ ] Add Tabs: `npx shadcn-ui@latest add tabs`
- [ ] Add Toast: `npx shadcn-ui@latest add toast`
- [ ] Add Switch: `npx shadcn-ui@latest add switch`
- [ ] Add Dropdown Menu: `npx shadcn-ui@latest add dropdown-menu`
- [ ] Customize component styles in `components/ui/`

**Reference**: Section 3.8 (UI Components)

### 10.2 Authentication Middleware

- [ ] Create `middleware.ts` in root
- [ ] Implement route protection logic:
  - Public routes: /api/hooks/*, /api/health
  - Protected routes: /admin/*, /api/* (except public)
- [ ] Check session for protected routes
- [ ] Redirect to /admin/login if not authenticated
- [ ] Implement CSRF token generation and verification
- [ ] Test middleware with various routes

**Reference**: Section 7.3 (Dashboard Authentication)

### 10.3 Login Page (app/admin/login/page.tsx)

- [ ] Create login page layout
- [ ] Add password input field (type=password)
- [ ] Add "Sign In" button
- [ ] Implement form submission:
  - Call POST /api/auth/login
  - Show error message on failure
  - Redirect to /admin on success
- [ ] Add "Remember me" checkbox (extend session)
- [ ] Style with Tailwind CSS
- [ ] Test login with correct and incorrect passwords

**Reference**: Section 11.1 (Authentication Page)

### 10.4 Dashboard Layout (app/admin/layout.tsx)

- [ ] Create admin layout component
- [ ] Add navigation header with:
  - App title/logo
  - Navigation links (Overview, Connections, Events, Items, Settings)
  - User dropdown (logout button)
- [ ] Add breadcrumb navigation
- [ ] Add footer
- [ ] Make responsive (mobile, tablet, desktop)
- [ ] Test navigation between pages

**Reference**: Section 11 (Dashboard UI Requirements)

---

## Phase 11: Dashboard UI - Overview & Connections (Days 13-15)

### 11.1 Overview Dashboard (app/admin/page.tsx)

- [ ] Create overview page layout
- [ ] Add metrics cards section:
  - Total events (24h)
  - Success count
  - Failed count
  - Success percentage
- [ ] Add time range selector (24h, 7d, 30d tabs)
- [ ] Add event volume chart using Recharts:
  - Line chart showing events per day
  - Color-coded by status
- [ ] Add active connections table:
  - Name, status badge, last success time
  - Quick actions (View, Pause)
- [ ] Add recent errors list:
  - Top 5 errors with counts
  - Link to filtered events list
- [ ] Fetch data from API on load
- [ ] Add loading states
- [ ] Add error handling
- [ ] Style with cards and proper spacing

**Reference**: Section 11.2 (Overview Dashboard)

### 11.2 Connections List (app/admin/connections/page.tsx)

- [ ] Create connections list page
- [ ] Add "+ New Connection" button (links to wizard)
- [ ] Add search input
- [ ] Add status filter dropdown (All, Active, Paused, Error, Archived)
- [ ] Implement table using TanStack Table:
  - Columns: Name, Source, Target, Status, Last Success, Actions
  - Sortable columns
  - Status badges with colors
- [ ] Add actions dropdown for each row:
  - View Details
  - Edit Mapping
  - Pause/Resume
  - Test Webhook
  - Delete (with confirmation dialog)
- [ ] Implement pagination
- [ ] Fetch data from GET /api/connections
- [ ] Handle loading and error states
- [ ] Test all actions

**Reference**: Section 11.3 (Connections List)

### 11.3 Connection Detail (app/admin/connections/[id]/page.tsx)

- [ ] Create connection detail page
- [ ] Add breadcrumb: Back to Connections
- [ ] Show connection header with name, status, actions (Edit, Pause, Delete)
- [ ] Add configuration card showing:
  - Source details (SmartSuite base/table)
  - Target details (Webflow site/collection)
  - Rate limiting settings
  - Health metrics
- [ ] Add webhook configuration card:
  - Webhook URL (with copy button)
  - Secret (masked, with Show/Regenerate buttons)
  - Test webhook button
- [ ] Add field mapping summary:
  - Table showing all mapped fields
  - Edit Mapping button
- [ ] Add recent events section:
  - Last 24h stats
  - Link to full events list (filtered)
- [ ] Add performance charts:
  - Events per day (last 7d)
  - P95 latency
- [ ] Fetch data from GET /api/connections/[id]
- [ ] Implement test webhook modal
- [ ] Test all interactive elements

**Reference**: Section 11.4 (Connection Detail Page)

---

## Phase 12: Dashboard UI - Mapping Wizard (Days 15-18)

### 12.1 Wizard Container & Navigation

- [ ] Create mapping wizard at app/admin/connections/new or [id]/edit
- [ ] Implement multi-step form container with react-hook-form
- [ ] Add step progress indicator (Step 1 of 7)
- [ ] Add navigation buttons (Cancel, Back, Next)
- [ ] Implement form state management across steps
- [ ] Add form validation with Zod resolvers
- [ ] Style wizard modal/page

**Reference**: Section 11.5 (Mapping Wizard)

### 12.2 Step 1: Credentials

- [ ] Create step 1 layout
- [ ] Add connection name input (required)
- [ ] Add description textarea (optional)
- [ ] Add SmartSuite API key input (password type)
  - Show/hide toggle
  - Test connection button
- [ ] Add Webflow token input (password type)
  - Show/hide toggle
  - Test connection button
- [ ] Implement connection testing:
  - Call discovery endpoints to validate
  - Show success/error feedback
- [ ] Validate before allowing Next
- [ ] Save form state

**Reference**: Section 11.5 Step 1 (Credentials)

### 12.3 Step 2: Source Selection (SmartSuite)

- [ ] Fetch bases using credentials from step 1
- [ ] Add base/solution dropdown (populated from API)
- [ ] On base selection, fetch tables
- [ ] Add table/application dropdown
- [ ] On table selection, fetch fields
- [ ] Display fields table showing:
  - Slug, Label, Type
  - Filterable and searchable
- [ ] Handle loading states
- [ ] Handle API errors gracefully
- [ ] Save selections

**Reference**: Section 11.5 Step 2 (Source Selection)

### 12.4 Step 3: Target Selection (Webflow)

- [ ] Fetch sites using credentials from step 1
- [ ] Add site dropdown (populated from API)
- [ ] On site selection, fetch collections
- [ ] Add collection dropdown
- [ ] On collection selection, fetch schema
- [ ] Display fields table showing:
  - Slug, Label, Type, Required indicator
  - Highlight required fields
  - Show incompatible types as grayed out
- [ ] Handle loading states
- [ ] Handle API errors
- [ ] Save selections

**Reference**: Section 11.5 Step 3 (Target Selection)

### 12.5 Step 4: Auto-Map Fields

- [ ] Add "Auto-Map Similar Fields" button
- [ ] Implement auto-mapping algorithm:
  - Compare field names (similarity score)
  - Check type compatibility
  - Suggest best matches
- [ ] Display mapping table:
  - Webflow field (required indicator)
  - SmartSuite source dropdown
  - Mapping type (direct, jsonata, template, constant, reference)
  - Gear icon for advanced config
- [ ] Implement advanced config modal:
  - Select mapping type (radio buttons)
  - Type-specific inputs (source, expression, template, value)
  - Transform dropdown
  - Default value input
  - Preview section showing input/output
- [ ] Highlight required fields without mappings
- [ ] Validate all required fields mapped before Next
- [ ] Save field mappings

**Reference**: Section 11.5 Step 4 (Auto-Map Fields)

### 12.6 Step 5: Configure Transforms

- [ ] Add slug generation section:
  - Auto-generate checkbox
  - Template input with placeholders
  - Preview showing generated slug
- [ ] Add status behavior section:
  - Checkbox options for each status value
  - Archive/Delete radio buttons
- [ ] Add image handling section:
  - Primary image field dropdown/expression
  - Gallery images field dropdown/expression
  - Fallback image URL input
  - Checkbox: Skip item if primary image invalid
- [ ] Add rate limiting section:
  - Max requests per minute input
  - Max retry attempts input
  - Initial retry backoff (ms) input
- [ ] Use sensible defaults
- [ ] Validate inputs
- [ ] Save configuration

**Reference**: Section 11.5 Step 5 (Configure Transforms)

### 12.7 Step 6: Test Mapping

- [ ] Add "Fetch from SmartSuite" button to get sample record
- [ ] Add "Paste JSON" textarea for custom sample data
- [ ] Display SmartSuite input (prettified JSON)
- [ ] Add "Apply Mapping" button
- [ ] Show transformed Webflow output (prettified JSON)
- [ ] Show validation results:
  - Green checkmarks for passing validations
  - Red errors for failing validations
  - Yellow warnings for non-critical issues
- [ ] Add "Test Upsert to Webflow" button:
  - Actually creates/updates item in Webflow
  - Shows success/error result
  - Shows returned Webflow item data
- [ ] Allow user to go back and fix mappings
- [ ] Save when validation passes

**Reference**: Section 11.5 Step 6 (Test Mapping)

### 12.8 Step 7: Webhook Setup

- [ ] Display generated webhook URL (with copy button)
- [ ] Display generated webhook secret (with copy button, show only once warning)
- [ ] Add instruction card with step-by-step guide for SmartSuite setup
- [ ] Add "View Full Instructions" link (opens documentation)
- [ ] Add "Create Connection" button (final step)
- [ ] On submit:
  - Call POST /api/connections with all form data
  - Call POST /api/mappings with mapping config
  - Show success modal
  - Offer "View Connection" or "Create Another" buttons
- [ ] Handle errors on submission
- [ ] Test complete wizard flow end-to-end

**Reference**: Section 11.5 Step 7 (Webhook Setup)

---

## Phase 13: Dashboard UI - Events & Items (Days 18-19)

### 13.1 Events Inbox (app/admin/events/page.tsx)

- [ ] Create events list page
- [ ] Add search input (search by ID)
- [ ] Add filters:
  - Status dropdown (All, Queued, Processing, Success, Failed, Dead Letter, Skipped)
  - Connection dropdown (All + list of connections)
  - Date range picker (Last 7d, Last 30d, Custom)
- [ ] Add bulk actions dropdown:
  - Retry selected
  - Mark as dead letter
  - Export to CSV
- [ ] Implement table using TanStack Table:
  - Checkbox column for bulk selection
  - Status icon column
  - Connection name
  - External ID
  - Time (relative, e.g., "2m ago")
  - Duration
  - Sortable columns
  - Click row to view details
- [ ] Implement pagination
- [ ] Add status badges with colors:
  - Success: green ✓
  - Queued: blue ⏳
  - Failed: yellow ⚠️
  - Dead Letter: red 🔴
  - Skipped: gray ⏸
- [ ] Fetch data from GET /api/events with filters
- [ ] Handle loading and error states

**Reference**: Section 11.6 (Events Inbox)

### 13.2 Event Detail Modal

- [ ] Create event detail modal component
- [ ] Add header with event ID and status badge
- [ ] Add timeline showing status transitions with timestamps
- [ ] Add tabs: Payload, Transformed, Webflow Response
- [ ] Display JSON in syntax-highlighted code blocks
- [ ] For failed/dead letter events:
  - Show error message prominently
  - Show stack trace (collapsible)
  - Show attempt count
- [ ] Add "View in Webflow" link (if wfItemId exists)
- [ ] Add "Replay Event" button:
  - Show confirmation dialog
  - Call POST /api/events/[id]/replay
  - Show success/error feedback
  - Refresh events list
- [ ] Add "Close" button
- [ ] Fetch data from GET /api/events/[id]
- [ ] Test with different event statuses

**Reference**: Section 11.6 (Event Detail Modal)

### 13.3 Item Inspector (app/admin/items/page.tsx)

- [ ] Create item inspector page
- [ ] Add search input (external ID or Webflow item ID)
- [ ] Add connection dropdown filter
- [ ] Add search button
- [ ] On search, fetch data from GET /api/items/lookup
- [ ] Display item details:
  - External ID
  - Webflow item ID
  - Webflow slug
  - Last synced timestamp
  - Sync count
- [ ] Add "Current Webflow Data" card:
  - Display JSON (prettified)
  - "View in Webflow" link
  - "Manual Resync" button
- [ ] Add "Sync History" section:
  - Table of last 10 syncs
  - Columns: Date, Event Type, Status
  - Click to view event details
  - "View All" link
- [ ] Add "Compare Syncs" button:
  - Opens modal
  - Dropdowns to select two sync timestamps
  - Shows diff table with changed fields highlighted
- [ ] Implement manual resync:
  - Call POST /api/items/resync
  - Show loading state
  - Show result
  - Refresh item data
- [ ] Handle not found case (404)
- [ ] Test with various items

**Reference**: Section 11.7 (Item Inspector)

---

## Phase 14: Testing & Quality Assurance (Days 19-21)

### 14.1 Unit Tests

Write unit tests using Vitest:

- [ ] tests/unit/crypto.test.ts
  - Test encrypt/decrypt round-trip
  - Test with various input sizes
  - Test IV uniqueness
- [ ] tests/unit/webhook-security.test.ts
  - Test signature verification (valid/invalid)
  - Test timestamp verification (valid/expired/future)
- [ ] tests/unit/mapper.test.ts
  - Test all mapping types (direct, jsonata, template, constant, reference)
  - Test all transform functions
  - Test edge cases (null values, missing fields)
- [ ] tests/unit/field-types.test.ts
  - Test type compatibility checks
  - Test type coercion
- [ ] tests/unit/validator.test.ts
  - Test field validation
  - Test required field checks
  - Test slug validation
- [ ] Run tests: `npm test`
- [ ] Aim for >80% coverage on core logic

**Reference**: Section 15.1 (Unit Tests)

### 14.2 Integration Tests

Write integration tests:

- [ ] tests/integration/webhook-ingress.test.ts
  - Test webhook flow from POST to event creation
  - Test signature verification
  - Test idempotency
  - Mock database
- [ ] tests/integration/event-processor.test.ts
  - Test event processing with mocked Webflow API
  - Test retry logic
  - Test error handling
  - Test IdMap updates
- [ ] tests/integration/connections.test.ts
  - Test connection CRUD operations
  - Test credential encryption/decryption
  - Use test database
- [ ] tests/integration/discovery.test.ts
  - Test discovery endpoints
  - Mock SmartSuite and Webflow APIs
- [ ] Run tests: `npm test`

**Reference**: Section 15.2 (Integration Tests)

### 14.3 End-to-End Testing

Manual testing of critical flows:

- [ ] Test complete sync flow:
  1. Create new connection via wizard
  2. Configure mapping with real APIs
  3. Send test webhook
  4. Verify event created
  5. Trigger worker
  6. Verify item synced to Webflow
- [ ] Test failed event → fix → replay flow:
  1. Create connection with invalid mapping
  2. Send webhook
  3. Verify event fails
  4. Fix mapping
  5. Replay event
  6. Verify success
- [ ] Test rate limiting:
  1. Send many webhooks rapidly
  2. Verify queue builds up
  3. Verify rate-limited processing
  4. Verify all eventually succeed
- [ ] Test authentication:
  1. Try accessing /admin without login
  2. Login with password
  3. Verify access granted
  4. Logout
  5. Verify access denied

**Reference**: Section 15.3 (End-to-End Tests)

### 14.4 Manual Testing Checklist

Complete the checklist from the spec:

- [ ] Create new connection (full wizard flow)
- [ ] Test webhook with real SmartSuite data
- [ ] Verify event appears in inbox
- [ ] Verify item created in Webflow
- [ ] Update SmartSuite record, verify update in Webflow
- [ ] Test failed event (invalid field), verify dead letter
- [ ] Fix mapping, replay event, verify success
- [ ] Test all dashboard pages render correctly
- [ ] Test logout and login
- [ ] Test CSRF protection
- [ ] Test rate limiting (send many webhooks quickly)

**Reference**: Section 15.4 (Manual Testing Checklist)

---

## Phase 15: Documentation & Polish (Days 21-22)

### 15.1 README Documentation

- [ ] Create comprehensive README.md with:
  - Project overview
  - Features list
  - Technology stack
  - Prerequisites
  - Installation instructions
  - Environment variables setup
  - Database setup
  - Running locally
  - Deployment instructions
  - Usage guide
  - Troubleshooting
  - Contributing guidelines (if applicable)
  - License
- [ ] Add architecture diagram (ASCII or image)
- [ ] Add screenshots of dashboard

**Reference**: Implied from best practices

### 15.2 API Documentation

- [ ] Document all API endpoints:
  - URL pattern
  - HTTP method
  - Authentication requirements
  - Request parameters/body
  - Response format
  - Error codes
  - Example requests/responses
- [ ] Create API reference document or use OpenAPI/Swagger
- [ ] Add inline JSDoc comments to API route files

**Reference**: Section 12 (API Endpoints Specification)

### 15.3 User Guide

Create user-facing documentation:

- [ ] How to create a connection
- [ ] How to configure field mappings
- [ ] How to set up webhooks in SmartSuite
- [ ] How to monitor sync status
- [ ] How to troubleshoot failed events
- [ ] How to replay events
- [ ] FAQ section
- [ ] Save in `docs/user-guide.md` or create wiki

**Reference**: Implied from UI requirements

### 15.4 Code Comments & Cleanup

- [ ] Add JSDoc comments to all major functions
- [ ] Add inline comments for complex logic
- [ ] Remove console.logs and debug code
- [ ] Remove unused imports
- [ ] Format all code: `npm run prettier:write` (add script)
- [ ] Lint all code: `npm run lint`
- [ ] Fix TypeScript strict mode errors
- [ ] Review TODOs and address or document

**Reference**: Best practices

### 15.5 Error Messages & UX Polish

- [ ] Review all user-facing error messages
- [ ] Ensure errors are clear and actionable
- [ ] Add help text and tooltips where needed
- [ ] Add loading spinners for async operations
- [ ] Add success toasts for completed actions
- [ ] Add confirmation dialogs for destructive actions
- [ ] Test all forms for validation and UX
- [ ] Make responsive on mobile (if not done already)
- [ ] Test accessibility (keyboard navigation, screen readers)

**Reference**: Section 13.4 (User-Facing Error Messages)

---

## Phase 16: Deployment (Days 22-23)

### 16.1 Prepare for Production

- [ ] Review all environment variables
- [ ] Ensure all secrets are generated securely
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS for APP_URL
- [ ] Disable debug logging (LOG_LEVEL=info)
- [ ] Set PRETTY_LOGS=false
- [ ] Review security headers in next.config.js
- [ ] Test production build locally: `npm run build && npm start`

**Reference**: Section 16 (Deployment Instructions)

### 16.2 Database Setup (Production)

- [ ] Create production Neon database
- [ ] Copy connection strings (pooled and direct)
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Verify schema in Prisma Studio
- [ ] Set up database backups (Neon handles this)

**Reference**: Section 16.2 (Database Setup)

### 16.3 Deploy to Vercel

- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Login: `vercel login`
- [ ] Link project: `vercel link`
- [ ] Add all environment variables via Vercel dashboard or CLI:
  ```bash
  vercel env add SESSION_PASSWORD production
  vercel env add DATA_ENCRYPTION_KEY production
  vercel env add DASHBOARD_PASSWORD_HASH production
  vercel env add DATABASE_URL production
  vercel env add DIRECT_DATABASE_URL production
  vercel env add CRON_SECRET production
  vercel env add APP_URL production
  # ... add all other env vars
  ```
- [ ] Deploy to production: `vercel --prod`
- [ ] Verify deployment successful
- [ ] Test deployed URL

**Reference**: Section 16.3 (Vercel Deployment)

### 16.4 Configure Cron Job

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
- [ ] Deploy again to activate cron
- [ ] Monitor cron logs in Vercel dashboard
- [ ] Verify worker runs every minute

**Reference**: Section 16.3 (Vercel Deployment)

### 16.5 Custom Domain (Optional)

- [ ] Add custom domain in Vercel dashboard
- [ ] Configure DNS records (CNAME or A)
- [ ] Wait for SSL certificate provisioning
- [ ] Update APP_URL environment variable
- [ ] Redeploy
- [ ] Test custom domain

**Reference**: Section 16.5 (Domain Configuration)

### 16.6 Post-Deployment Verification

- [ ] Test health endpoint: `curl https://your-domain.com/api/health`
- [ ] Test login page loads
- [ ] Login to dashboard
- [ ] Create test connection
- [ ] Send test webhook
- [ ] Verify event processed
- [ ] Check Vercel logs for errors
- [ ] Monitor for first few hours

**Reference**: Section 16.4 (Post-Deployment Verification)

---

## Phase 17: Monitoring & Maintenance (Ongoing)

### 17.1 Set Up Monitoring

- [ ] Configure Vercel Analytics
- [ ] Set up error tracking (Sentry - optional)
  - Add SENTRY_DSN to environment
  - Configure Sentry SDK
- [ ] Set up log aggregation (BetterStack - optional)
  - Add BETTERSTACK_TOKEN
  - Configure log shipping
- [ ] Set up uptime monitoring (Vercel, UptimeRobot, etc.)
- [ ] Create alerting rules for critical issues

**Reference**: Section 14 (Logging & Monitoring)

### 17.2 Create Runbook

Document operational procedures:

- [ ] How to check system health
- [ ] How to restart worker (if needed)
- [ ] How to handle failed connections
- [ ] How to replay dead letter events
- [ ] How to rotate credentials
- [ ] How to scale (if needed)
- [ ] How to backup/restore database
- [ ] Emergency contacts and escalation

**Reference**: Implied from operations needs

### 17.3 Regular Maintenance Tasks

Set up schedule for:

- [ ] Weekly: Review error logs and dead letter events
- [ ] Weekly: Check connection health and fix issues
- [ ] Monthly: Review analytics and performance metrics
- [ ] Monthly: Update dependencies (security patches)
- [ ] Quarterly: Review and optimize database queries
- [ ] Quarterly: Review and update documentation

**Reference**: Best practices

---

## Phase 18: Advanced Features (Future Enhancements)

These are nice-to-have features that can be added after MVP:

### 18.1 Backfill Historical Data

- [ ] Add "Backfill" button to connection detail page
- [ ] Implement backfill job that fetches existing SmartSuite records
- [ ] Create events for historical records
- [ ] Process via normal worker
- [ ] Show progress bar
- [ ] Allow cancellation and resumption

**Reference**: Section 18.10 (Backfill Historical Data)

### 18.2 Advanced Analytics

- [ ] Add more detailed performance metrics
- [ ] Create custom date range reports
- [ ] Add export functionality (CSV, PDF)
- [ ] Create email/Slack notifications for issues
- [ ] Add SLA tracking and alerts

**Reference**: Implied from analytics requirements

### 18.3 Multi-Locale Support

- [ ] Add locale selection to mapping wizard
- [ ] Store locale ID in IdMap
- [ ] Support syncing to multiple locales
- [ ] Handle locale-specific field mappings

**Reference**: Section 18.9 (Multi-Locale Support)

### 18.4 Image Proxy Feature

- [ ] Implement image download and re-upload
- [ ] Handle private/presigned URLs
- [ ] Store images in CDN or cloud storage
- [ ] Replace SmartSuite URLs with permanent URLs

**Reference**: Section 8.5 (Image Handling)

### 18.5 Bi-Directional Sync

- [ ] Design Webflow → SmartSuite sync architecture
- [ ] Implement Webflow webhook receiver
- [ ] Handle update conflicts
- [ ] Add UI for bi-directional configuration

**Reference**: Section 1.4 (Non-Goals - future consideration)

---

## Success Criteria Checklist

Before considering the project complete, verify all success criteria from spec:

### Reliability
- [ ] 99.9% successful sync rate in testing
- [ ] All error scenarios handled gracefully
- [ ] No data loss (all events logged)
- [ ] Automatic retry works correctly

### Performance
- [ ] P95 latency <5 seconds from webhook to publish
- [ ] Worker processes 25 events in <5 minutes
- [ ] UI loads in <2 seconds
- [ ] No memory leaks during extended testing

### Security
- [ ] All credentials encrypted at rest (verified)
- [ ] Webhook signatures verified (verified)
- [ ] Session cookies secure (HttpOnly, Secure, SameSite)
- [ ] CSRF protection working
- [ ] No credentials in logs
- [ ] Security headers configured

### Observability
- [ ] Complete event history accessible
- [ ] Replay capability works
- [ ] Dashboard shows all relevant metrics
- [ ] Logs are structured and searchable
- [ ] Health check endpoint functional

### Usability
- [ ] Non-technical users can configure connections via UI (tested)
- [ ] Error messages are clear and actionable
- [ ] All common tasks <5 clicks
- [ ] Mobile responsive (at least readable)

### Scalability
- [ ] Can handle 10,000+ items per connection (tested)
- [ ] Can handle 100+ events/minute (tested with simulation)
- [ ] Queue doesn't grow indefinitely
- [ ] Database queries optimized with indexes

**Reference**: Section 1.2 (Success Criteria)

---

## Troubleshooting Guide

Common issues and solutions:

### Issue: Worker not running
- Check Vercel cron is enabled
- Verify CRON_SECRET is correct
- Check worker logs for errors
- Verify distributed lock not stuck

### Issue: Events stuck in queued status
- Manually trigger worker via API
- Check connection status (may be paused/error)
- Check for database connection issues
- Review worker logs

### Issue: Signature verification failing
- Verify webhook secret matches SmartSuite config
- Check timestamp is within 5 minutes
- Verify raw body used for signature (not parsed)
- Check for character encoding issues

### Issue: Webflow items not updating
- Check IdMap has entry for external ID
- Verify Webflow collection still exists
- Check Webflow token permissions
- Review event error message

### Issue: Rate limiting errors
- Lower rateLimitPerMin setting
- Check for other systems calling Webflow API
- Verify rate limit headers from Webflow
- Consider spreading webhooks over time

**Reference**: Sections 13 and 18 (Error Handling and Edge Cases)

---

## Notes

- **Estimated total time**: 5 weeks for one developer
- **Critical path**: Database → API Clients → Event Processing → Worker → UI
- **Can work in parallel**: UI components while API is being built
- **Testing should be continuous**, not left to the end
- **Deploy early and often** to catch environment-specific issues
- **Refer to spec document** (`documents/smartsuite_webflow_sync_spec.txt`) for detailed requirements on any section

---

## Task Management

Track progress by checking off tasks as completed. Update this document as you discover additional tasks or changes to requirements.

**Project Start Date**: _____________________
**Target Completion Date**: _____________________
**Actual Completion Date**: _____________________

Good luck with the implementation! 🚀
