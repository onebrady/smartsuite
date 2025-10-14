# SmartSuite ↔ Webflow Sync - Stage 1: Foundation & Core Infrastructure

**Project Location**: `/home/onebrady/projects/smartsuite` (root directory)
**Reference Specification**: `documents/smartsuite_webflow_sync_spec.txt`
**Estimated Timeline**: 2 weeks (Days 1-10)
**Stage Goal**: Build the complete backend sync engine that can receive webhooks and sync data to Webflow

---

## Stage 1 Overview

Stage 1 focuses on building the core synchronization engine without any UI. By the end of this stage, you'll have:

✅ Complete project setup with all dependencies
✅ Secure credential encryption and webhook verification
✅ Full database schema with all models
✅ SmartSuite and Webflow API clients with retry/rate limiting
✅ Webhook ingress endpoint that receives and queues events
✅ Complete mapping engine for data transformation
✅ Event processor that syncs data to Webflow
✅ Worker cron job that processes the queue

**What's NOT in Stage 1**: Any UI or dashboard. This is all backend/API work.

**Testing Strategy**: Use command-line tools (curl), Postman, or scripts to test all functionality.

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
  npm install @prisma/client@^5.15.0 prisma@^5.15.0 zod@^3.23.8 @t3-oss/env-nextjs@^0.10.1 undici@^6.18.2 p-retry@^6.2.0 p-queue@^8.0.1 p-limit@^5.0.0 jsonata@^2.0.5 change-case@^5.4.4 date-fns@^3.6.0 date-fns-tz@^3.1.3 iron-session@^8.0.1 bcryptjs@^2.4.3 nanoid@^5.0.7 pino@^9.1.0 pino-pretty@^11.1.0
  ```
- [ ] Install dev dependencies:
  ```bash
  npm install -D @types/node@^20.14.9 @types/bcryptjs@^2.4.6 @types/jsonata@^1.5.1 eslint@^8.57.0 eslint-config-next@^14.2.5 prettier@^3.3.2 prettier-plugin-tailwindcss@^0.6.5 tsx@^4.15.7 vitest@^1.6.0
  ```
- [ ] Verify all packages installed: `npm list --depth=0`

**Reference**: Section 3.11 (Package.json Structure)

### 1.3 Configure Build Tools

- [ ] Update `tailwind.config.ts` with custom theme
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
      "test": "vitest"
    }
  }
  ```
- [ ] Create `next.config.js` with security headers
- [ ] Create `vercel.json` with cron configuration:
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

**Reference**: Section 7.5 (Security Headers)

### 1.4 Create Folder Structure

Create the following directory structure:

```
/
├── app/
│   └── api/
│       ├── hooks/
│       │   └── [connectionId]/
│       ├── jobs/
│       │   └── ingest/
│       └── health/
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
│   ├── transforms.ts
│   ├── field-types.ts
│   ├── validator.ts
│   ├── event-processor.ts
│   ├── distributed-lock.ts
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
└── documents/
```

- [ ] Create all directories listed above
- [ ] Create placeholder `.gitkeep` files in empty test directories

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
- [ ] Add all environment variables to `.env.local`:
  ```bash
  NODE_ENV=development
  APP_URL=http://localhost:3000
  SESSION_PASSWORD=<generated>
  DATA_ENCRYPTION_KEY=<generated>
  DASHBOARD_PASSWORD_HASH=<generated>
  DATABASE_URL=<from Neon>
  DIRECT_DATABASE_URL=<from Neon>
  CRON_SECRET=<generated>
  WRITE_CAP_PER_MINUTE=50
  MAX_RETRY_ATTEMPTS=5
  RETRY_BACKOFF_MS=1000
  MAX_RETRY_BACKOFF_MS=60000
  WORKER_BATCH_SIZE=25
  LOCK_TIMEOUT_MS=300000
  LOG_LEVEL=debug
  PRETTY_LOGS=true
  ```
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
  - APP_URL: valid URL
  - Numeric vars: integer validation with ranges
- [ ] Export typed `env` object
- [ ] Test by intentionally using invalid values (should fail at startup)

**Reference**: Section 4.2 (Environment Variable Validation)

### 2.3 Logger Setup (lib/logger.ts)

- [ ] Configure Pino logger with appropriate settings:
  - Production: JSON output, level: info
  - Development: pretty output, level: debug
- [ ] Add redaction for sensitive fields
- [ ] Create child logger helper for adding context
- [ ] Export configured logger instance
- [ ] Test logging at different levels

**Reference**: Section 14.1 (Logging Implementation)

### 2.4 Cryptography Implementation (lib/crypto.ts)

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

**Test Script**:
```typescript
// test-crypto.ts
import { encryptSecret, decryptSecret } from './lib/crypto';

const plaintext = 'my-secret-api-key-12345';
const encrypted = await encryptSecret(plaintext);
console.log('Encrypted:', encrypted);

const decrypted = await decryptSecret(encrypted);
console.log('Decrypted:', decrypted);
console.log('Match:', plaintext === decrypted);
```

### 2.5 Webhook Security (lib/webhook-security.ts)

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

### 2.6 Session Management (lib/session.ts)

- [ ] Configure iron-session with session options
- [ ] Define SessionData interface
- [ ] Implement `getSession()` - returns IronSession
- [ ] Implement `requireAuth()` - throws if not authenticated
- [ ] Implement `createSession(password)` - verify password and create session
- [ ] Implement `destroySession()` - clear session
- [ ] Test session creation and validation

**Reference**: Section 7.3 (Dashboard Authentication)

---

## Phase 3: Database Setup (Days 3-4)

### 3.1 Create Prisma Schema

- [ ] Create `prisma/schema.prisma` with complete schema
- [ ] Define all enums:
  ```prisma
  enum EventStatus {
    queued
    processing
    success
    failed
    dead_letter
    skipped
  }

  enum SourceType {
    smartsuite
  }

  enum TargetType {
    webflow
  }

  enum ConnectionStatus {
    active
    paused
    error
    archived
  }

  enum FieldMappingType {
    direct
    jsonata
    template
    constant
    reference
  }
  ```
- [ ] Define Connection model with:
  - Encrypted credentials (ssApiKeyEnc, ssApiKeyIv, wfTokenEnc, wfTokenIv)
  - Webhook config (secretHash, url)
  - Rate limiting (rateLimitPerMin, maxRetries, retryBackoffMs)
  - Health tracking (lastSuccessAt, consecutiveErrors)
- [ ] Define Mapping model with:
  - fieldMap (JSON)
  - slugTemplate
  - statusBehavior
  - imageFieldMap
  - referenceMap
  - requiredFields
- [ ] Define IdMap model (external ID ↔ Webflow ID mapping)
- [ ] Define Event model (webhook queue):
  - Status, attempts, retryAfter
  - Payload, payloadHash, idempotencyKey
  - Error tracking
  - Timing metrics
- [ ] Define AnalyticsDaily model
- [ ] Define AuditLog model
- [ ] Define DistributedLock model
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
  - Sign up at https://neon.tech
  - Create new project
  - Copy connection strings
- [ ] Add DATABASE_URL and DIRECT_DATABASE_URL to `.env.local`
- [ ] Generate Prisma Client: `npx prisma generate`
- [ ] Push schema: `npm run db:push`
- [ ] Verify schema created successfully
- [ ] Open Prisma Studio to inspect: `npm run db:studio`

**Reference**: Section 16.2 (Database Setup)

### 3.4 Seed Script (Optional but Recommended)

- [ ] Create `prisma/seed.ts` for test data
- [ ] Add sample connection (inactive by default):
  ```typescript
  // Encrypt test credentials
  const ssApiKey = await encryptSecret('test-smartsuite-key');
  const wfToken = await encryptSecret('test-webflow-token');

  await prisma.connection.create({
    data: {
      name: 'Test Products Sync',
      status: 'paused', // Don't activate automatically
      sourceType: 'smartsuite',
      ssBaseId: 'test_base',
      ssTableId: 'test_table',
      ssApiKeyEnc: ssApiKey.ciphertext,
      ssApiKeyIv: ssApiKey.iv,
      targetType: 'webflow',
      wfSiteId: 'test_site',
      wfCollectionId: 'test_collection',
      wfTokenEnc: wfToken.ciphertext,
      wfTokenIv: wfToken.iv,
      webhookSecretHash: await bcrypt.hash('test-secret', 10),
      webhookUrl: `${env.APP_URL}/api/hooks/test-connection`,
    }
  });
  ```
- [ ] Test seed script: `npm run db:seed`

---

## Phase 4: External API Clients (Days 4-5)

### 4.1 SmartSuite API Client (lib/smartsuite.ts)

- [ ] Create SmartSuiteClient class
- [ ] Implement authentication (Token header)
- [ ] Implement `getBases(apiKey)` - GET /bases
- [ ] Implement `getTables(apiKey, baseId)` - GET /bases/{baseId}/apps
- [ ] Implement `getSchema(apiKey, baseId, tableId)` - GET /bases/{baseId}/apps/{tableId}/schema
- [ ] Implement `getRecords(apiKey, baseId, tableId, options)` - GET /bases/{baseId}/apps/{tableId}/records
  - Support pagination (limit, offset)
  - Support filters (optional)
- [ ] Add error handling for 401, 403, 404, 429, 500s
- [ ] Add 30s timeout on all requests
- [ ] Add comprehensive logging
- [ ] Test with real SmartSuite credentials (get free trial account)

**Reference**: Section 6.1 (SmartSuite API)

**Test Script**:
```typescript
// test-smartsuite.ts
import { SmartSuiteClient } from './lib/smartsuite';

const client = new SmartSuiteClient();
const apiKey = 'your-test-key';

const bases = await client.getBases(apiKey);
console.log('Bases:', bases);

if (bases.length > 0) {
  const tables = await client.getTables(apiKey, bases[0].id);
  console.log('Tables:', tables);

  if (tables.length > 0) {
    const schema = await client.getSchema(apiKey, bases[0].id, tables[0].id);
    console.log('Schema:', schema);
  }
}
```

### 4.2 Webflow API Client (lib/webflow.ts)

- [ ] Create WebflowClient class
- [ ] Implement authentication (Bearer token)
- [ ] Implement `getSites(token)` - GET /sites
- [ ] Implement `getCollections(token, siteId)` - GET /sites/{siteId}/collections
- [ ] Implement `getCollectionSchema(token, collectionId)` - GET /collections/{collectionId}
- [ ] Implement `createItem(token, collectionId, fieldData)` - POST /collections/{collectionId}/items/live
- [ ] Implement `updateItem(token, collectionId, itemId, fieldData)` - PATCH /collections/{collectionId}/items/{itemId}/live
- [ ] Implement `deleteItem(token, collectionId, itemId)` - DELETE /collections/{collectionId}/items/{itemId}
- [ ] Add error handling and response parsing
- [ ] Add 30s timeout
- [ ] Add comprehensive logging
- [ ] Test with real Webflow credentials

**Reference**: Section 6.2 (Webflow API)

**Test Script**:
```typescript
// test-webflow.ts
import { WebflowClient } from './lib/webflow';

const client = new WebflowClient();
const token = 'your-test-token';

const sites = await client.getSites(token);
console.log('Sites:', sites);

if (sites.length > 0) {
  const collections = await client.getCollections(token, sites[0].id);
  console.log('Collections:', collections);
}
```

### 4.3 Upsert Logic (lib/webflow.ts continued)

- [ ] Implement `upsertWebflowItem(connection, externalId, fieldData)`:
  - Check IdMap for existing item:
    ```typescript
    const existing = await prisma.idMap.findUnique({
      where: {
        connectionId_externalSource_externalId: {
          connectionId: connection.id,
          externalSource: 'smartsuite',
          externalId: externalId
        }
      }
    });
    ```
  - If exists: call `updateItem()`
  - If not exists: call `createItem()`
  - Handle slug collisions with retry logic:
    ```typescript
    let slug = generatedSlug;
    let attempt = 0;
    while (attempt < 10) {
      try {
        const result = await createItem(..., { ...fieldData, slug });
        break; // Success
      } catch (err) {
        if (err.status === 409 && err.message.includes('slug')) {
          attempt++;
          slug = `${generatedSlug}-${attempt}`;
          continue;
        }
        throw err; // Non-slug error
      }
    }
    ```
  - Update/create IdMap entry on success
  - Return `{ wfItemId, response, warnings }`

**Reference**: Section 8.3 (Upsert Logic)

### 4.4 Rate Limiting & Retry Logic

- [ ] Create per-connection queue manager using p-queue (lib/queue-manager.ts):
  ```typescript
  const queues = new Map<string, PQueue>();

  export function getConnectionQueue(
    connectionId: string,
    rateLimitPerMin: number
  ): PQueue {
    if (!queues.has(connectionId)) {
      queues.set(connectionId, new PQueue({
        interval: 60_000,
        intervalCap: rateLimitPerMin,
        carryoverConcurrencyCount: true,
        timeout: 30_000,
      }));
    }
    return queues.get(connectionId)!;
  }
  ```
- [ ] Wrap Webflow API calls with p-retry:
  ```typescript
  await pRetry(
    async () => {
      return await queue.add(() => webflowClient.createItem(...));
    },
    {
      retries: connection.maxRetries,
      minTimeout: connection.retryBackoffMs,
      maxTimeout: env.MAX_RETRY_BACKOFF_MS,
      factor: 2,
      randomize: true,
      onFailedAttempt: (error) => {
        logger.warn({ attempt: error.attemptNumber }, 'Retry attempt failed');
      }
    }
  );
  ```
- [ ] Classify errors as retriable/non-retriable:
  ```typescript
  function isRetriable(error: Error): boolean {
    const status = error.statusCode;
    if (status === 429) return true; // Rate limit
    if (status >= 500) return true;  // Server error
    if (status === 408) return true; // Timeout
    if (error.code === 'ETIMEDOUT') return true;
    if (error.code === 'ECONNREFUSED') return true;
    return false; // 400, 401, 403, 404, 422
  }
  ```
- [ ] Test rate limiting by making many rapid requests
- [ ] Test retry logic with simulated failures

**Reference**: Section 9.4-9.5 (Rate Limiting & Retry Strategy)

---

## Phase 5: Mapping Engine (Days 5-6)

### 5.1 Field Type Compatibility (lib/field-types.ts)

- [ ] Create FIELD_TYPE_COMPATIBILITY constant:
  ```typescript
  export const FIELD_TYPE_COMPATIBILITY = {
    'textfield': ['PlainText', 'Link', 'Email', 'Phone'],
    'textarea': ['RichText', 'PlainText'],
    'numberfield': ['Number'],
    'currencyfield': ['Number'],
    'duedatefield': ['DateTime'],
    'singleselectfield': ['Option', 'PlainText'],
    'singlecheckbox': ['Switch'],
    'linkedrecord': ['Reference', 'MultiReference'],
    'files': ['File', 'Image', 'MultiImage', 'Video'],
    'emailfield': ['Email', 'PlainText'],
    'phonefield': ['Phone', 'PlainText'],
    'urlfield': ['Link', 'PlainText'],
  } as const;
  ```
- [ ] Implement `isCompatible(ssType, wfType)` function
- [ ] Implement `getCompatibleTypes(ssType)` function
- [ ] Write unit tests for type compatibility

**Reference**: Section 6.3 (Field Type Compatibility Matrix)

### 5.2 Transform Functions (lib/transforms.ts)

- [ ] Implement string transforms:
  ```typescript
  import { camelCase, kebabCase, snakeCase, pascalCase } from 'change-case';
  import { format } from 'date-fns';

  export const TRANSFORMS = {
    // Case
    uppercase: (str: string) => str.toUpperCase(),
    lowercase: (str: string) => str.toLowerCase(),
    title: (str: string) => str.replace(/\w\S*/g, t =>
      t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
    ),
    camel: (str: string) => camelCase(str),
    pascal: (str: string) => pascalCase(str),
    snake: (str: string) => snakeCase(str),
    kebab: (str: string) => kebabCase(str),

    // String manipulation
    trim: (str: string) => str.trim(),
    truncate: (str: string, len: number = 100) => str.substring(0, len),

    // Numeric
    round: (num: number, decimals: number = 0) =>
      Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals),
    floor: (num: number) => Math.floor(num),
    ceil: (num: number) => Math.ceil(num),

    // Date
    formatDate: (date: string | Date, formatStr: string = 'yyyy-MM-dd') =>
      format(new Date(date), formatStr),
  };
  ```
- [ ] Implement slug generation function
- [ ] Write unit tests for each transform

**Reference**: Section 10.2 (Transform Functions)

### 5.3 Core Mapper (lib/mapper.ts)

- [ ] Implement `normalizeSmartSuitePayload(payload)`:
  ```typescript
  export function normalizeSmartSuitePayload(payload: any) {
    // Extract record data from webhook payload
    const data = payload.data || payload;

    // Flatten nested structures if needed
    // Normalize field values (e.g., dates, numbers)

    return data;
  }
  ```
- [ ] Implement `applyFieldMapping(config, data, context)`:
  ```typescript
  export async function applyFieldMapping(
    config: FieldMappingConfig,
    data: any,
    context: MappingContext
  ): Promise<any> {
    switch (config.type) {
      case 'direct':
        // Use JSONPath to extract value
        const value = jp.query(data, config.source)[0];
        return config.transform
          ? TRANSFORMS[config.transform](value)
          : value;

      case 'jsonata':
        // Evaluate JSONata expression
        const expr = jsonata(config.expression);
        return await expr.evaluate(data);

      case 'template':
        // Render template with data
        return renderTemplate(config.template, data);

      case 'constant':
        return config.value;

      case 'reference':
        // Lookup in IdMap
        return await resolveReference(config, data, context);

      default:
        throw new Error(`Unknown mapping type: ${config.type}`);
    }
  }
  ```
- [ ] Implement `buildWebflowBody(mapping, ssData, connection)`:
  ```typescript
  export async function buildWebflowBody(
    mapping: Mapping,
    ssData: any,
    connection: Connection
  ) {
    const fieldData: Record<string, any> = {};
    const warnings: string[] = [];

    // Apply each field mapping
    for (const [wfField, config] of Object.entries(mapping.fieldMap)) {
      try {
        const value = await applyFieldMapping(config, ssData, { connection });
        if (value !== undefined && value !== null) {
          fieldData[wfField] = value;
        } else if (config.default) {
          fieldData[wfField] = config.default;
        }
      } catch (err) {
        warnings.push(`Field '${wfField}': ${err.message}`);
      }
    }

    // Generate slug if template provided
    if (mapping.slugTemplate) {
      fieldData.slug = generateSlug(mapping.slugTemplate, ssData);
    }

    return { fieldData, warnings };
  }
  ```
- [ ] Implement `generateSlug(template, data)`:
  ```typescript
  export function generateSlug(template: string, data: any): string {
    let slug = renderTemplate(template, data);

    // Apply transformations
    slug = kebabCase(slug);
    slug = slug.replace(/[^a-z0-9-]/g, '');
    slug = slug.substring(0, 100);

    return slug;
  }
  ```
- [ ] Write comprehensive unit tests with sample data

**Reference**: Section 10 (Mapping Engine Specification)

### 5.4 Validator (lib/validator.ts)

- [ ] Implement `validateFieldType(value, expectedType)`:
  ```typescript
  export function validateFieldType(value: any, expectedType: string): any {
    switch (expectedType) {
      case 'Number':
        if (typeof value === 'number') return value;
        if (typeof value === 'string' && !isNaN(Number(value))) {
          return Number(value);
        }
        throw new Error(`Expected number, got ${typeof value}`);

      case 'Switch':
        if (typeof value === 'boolean') return value;
        if (value === 'true' || value === 'false') {
          return value === 'true';
        }
        throw new Error(`Expected boolean, got ${typeof value}`);

      // ... other types

      default:
        return value;
    }
  }
  ```
- [ ] Implement `validateRequiredFields(fieldData, requiredFields)`:
  ```typescript
  export function validateRequiredFields(
    fieldData: Record<string, any>,
    requiredFields: string[]
  ) {
    const missing = requiredFields.filter(field =>
      fieldData[field] === undefined || fieldData[field] === null
    );

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }
  ```
- [ ] Implement `validateSlug(slug)`:
  ```typescript
  export function validateSlug(slug: string): boolean {
    return /^[a-z0-9-]{1,100}$/.test(slug);
  }
  ```
- [ ] Write unit tests for validation rules

**Reference**: Section 8.7 (Validation Before Webflow Call)

---

## Phase 6: Webhook Ingress & Event Creation (Days 6-7)

### 6.1 Webhook Endpoint (app/api/hooks/[connectionId]/route.ts)

- [ ] Create POST handler for webhook ingress:
  ```typescript
  import { NextRequest } from 'next/server';
  import { prisma } from '@/lib/db';
  import { logger } from '@/lib/logger';
  import { verifyWebhookSignature, verifyTimestamp } from '@/lib/webhook-security';
  import crypto from 'crypto';

  export async function POST(
    request: NextRequest,
    { params }: { params: { connectionId: string } }
  ) {
    const startTime = Date.now();
    const connectionId = params.connectionId;

    try {
      // 1. Load connection
      const connection = await prisma.connection.findUnique({
        where: { id: connectionId }
      });

      if (!connection) {
        return Response.json({ error: 'Connection not found' }, { status: 404 });
      }

      if (connection.status !== 'active') {
        return Response.json({ error: 'Connection not active' }, { status: 403 });
      }

      // 2. Extract headers
      const signature = request.headers.get('x-smartsuite-signature');
      const timestamp = request.headers.get('x-smartsuite-timestamp');
      const idempotencyKey = request.headers.get('x-idempotency-key');

      // 3. Read raw body (needed for signature verification)
      const rawBody = await request.text();

      // 4. Verify signature
      if (!signature || !verifyWebhookSignature(rawBody, signature, connection.webhookSecretHash)) {
        logger.warn({ connectionId }, 'Invalid webhook signature');
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }

      // 5. Verify timestamp
      if (timestamp && !verifyTimestamp(timestamp)) {
        logger.warn({ connectionId, timestamp }, 'Invalid webhook timestamp');
        return Response.json({ error: 'Invalid timestamp' }, { status: 401 });
      }

      // 6. Parse body
      const payload = JSON.parse(rawBody);

      // 7. Generate idempotency key if not provided
      const idemKey = idempotencyKey || crypto
        .createHash('sha256')
        .update(`${connectionId}-${payload.record_id}-${timestamp}`)
        .digest('hex');

      // 8. Check for duplicate
      const existing = await prisma.event.findUnique({
        where: { idempotencyKey: idemKey }
      });

      if (existing) {
        logger.info({ eventId: existing.id }, 'Duplicate webhook (idempotency)');
        return Response.json({
          error: 'Duplicate event',
          eventId: existing.id
        }, { status: 409 });
      }

      // 9. Create event
      const payloadHash = crypto
        .createHash('sha256')
        .update(rawBody)
        .digest('hex');

      const event = await prisma.event.create({
        data: {
          connectionId,
          externalSource: 'smartsuite',
          externalId: payload.record_id,
          idempotencyKey: idemKey,
          payload: payload,
          payloadHash: payloadHash,
          status: 'queued',
          webhookTimestamp: timestamp ? new Date(parseInt(timestamp) * 1000) : undefined,
        }
      });

      logger.info({
        eventId: event.id,
        connectionId,
        externalId: payload.record_id
      }, 'Webhook received and queued');

      // 10. Return 202 Accepted
      return Response.json({
        eventId: event.id,
        status: 'queued'
      }, { status: 202 });

    } catch (err) {
      logger.error({ err, connectionId }, 'Webhook ingress error');
      return Response.json({
        error: 'Internal server error'
      }, { status: 500 });
    }
  }
  ```

**Reference**: Section 2 (Webhook Ingress Layer) and Section 12.8 (Webhook API)

### 6.2 Test Webhook Ingress

Create a test script to send mock webhooks:

- [ ] Create `scripts/test-webhook.ts`:
  ```typescript
  import crypto from 'crypto';

  const connectionId = 'your-connection-id';
  const secret = 'your-webhook-secret';
  const payload = {
    event_type: 'record_created',
    record_id: 'rec_test_123',
    data: {
      title: 'Test Product',
      sku: 'TEST-001',
      price: 99.99,
    }
  };

  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const response = await fetch(`http://localhost:3000/api/hooks/${connectionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-smartsuite-signature': `sha256=${signature}`,
      'x-smartsuite-timestamp': timestamp,
    },
    body: body
  });

  console.log('Status:', response.status);
  console.log('Response:', await response.json());
  ```
- [ ] Test with valid signature (should return 202)
- [ ] Test with invalid signature (should return 401)
- [ ] Test with old timestamp (should return 401)
- [ ] Test duplicate idempotency key (should return 409)
- [ ] Verify event created in database using Prisma Studio
- [ ] Check logs for proper context

**Reference**: Section 8.2 (Idempotency Strategy)

---

## Phase 7: Event Processor & Worker (Days 7-10)

### 7.1 Event Processor (lib/event-processor.ts)

- [ ] Create EventProcessor class with full processing logic:
  ```typescript
  export class EventProcessor {
    async processEvent(eventId: string): Promise<ProcessResult> {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { connection: { include: { mappings: true } } }
      });

      if (!event) throw new Error('Event not found');

      try {
        // Update to processing
        await prisma.event.update({
          where: { id: eventId },
          data: {
            status: 'processing',
            attempts: { increment: 1 }
          }
        });

        const { connection } = event;
        const mapping = connection.mappings[0]; // Assume one mapping per connection

        // Decrypt credentials
        const ssApiKey = await decryptSecret({
          ciphertext: connection.ssApiKeyEnc,
          iv: connection.ssApiKeyIv
        });
        const wfToken = await decryptSecret({
          ciphertext: connection.wfTokenEnc,
          iv: connection.wfTokenIv
        });

        // Normalize payload
        const normalizedData = normalizeSmartSuitePayload(event.payload);

        // Build Webflow body
        const { fieldData, warnings } = await buildWebflowBody(
          mapping,
          normalizedData,
          connection
        );

        // Validate required fields
        validateRequiredFields(fieldData, mapping.requiredFields);

        // Upsert to Webflow
        const result = await upsertWebflowItem(
          connection,
          event.externalId,
          fieldData
        );

        // Update event as success
        const duration = Date.now() - event.queuedAt.getTime();
        await prisma.event.update({
          where: { id: eventId },
          data: {
            status: 'success',
            processedAt: new Date(),
            durationMs: duration,
            wfItemId: result.wfItemId,
            wfResponse: result.response,
            warnings: warnings.length > 0 ? warnings : undefined,
            partialSuccess: warnings.length > 0
          }
        });

        // Update connection health
        await prisma.connection.update({
          where: { id: connection.id },
          data: {
            lastSuccessAt: new Date(),
            consecutiveErrors: 0
          }
        });

        logger.info({ eventId, wfItemId: result.wfItemId }, 'Event processed successfully');

        return { success: true, duration };

      } catch (err) {
        return await this.handleError(event, err);
      }
    }

    private async handleError(event: Event, err: any): Promise<ProcessResult> {
      const isRetriable = this.isRetriableError(err);
      const maxAttemptsReached = event.attempts >= event.connection.maxRetries;

      if (isRetriable && !maxAttemptsReached) {
        // Calculate backoff
        const backoffMs = Math.min(
          event.connection.retryBackoffMs * Math.pow(2, event.attempts - 1),
          env.MAX_RETRY_BACKOFF_MS
        );
        const jitter = Math.random() * 0.3 * backoffMs;
        const retryAfter = new Date(Date.now() + backoffMs + jitter);

        await prisma.event.update({
          where: { id: event.id },
          data: {
            status: 'failed',
            error: err.message,
            errorStack: err.stack,
            retryAfter: retryAfter
          }
        });

        logger.warn({
          eventId: event.id,
          attempt: event.attempts,
          retryAfter
        }, 'Event failed, will retry');

        return { success: false, willRetry: true };
      } else {
        // Dead letter
        await prisma.event.update({
          where: { id: event.id },
          data: {
            status: 'dead_letter',
            error: err.message,
            errorStack: err.stack
          }
        });

        // Increment connection errors
        await prisma.connection.update({
          where: { id: event.connectionId },
          data: {
            consecutiveErrors: { increment: 1 },
            lastErrorAt: new Date(),
            lastErrorMessage: err.message
          }
        });

        logger.error({ eventId: event.id, err }, 'Event moved to dead letter');

        return { success: false, willRetry: false };
      }
    }

    private isRetriableError(err: any): boolean {
      const status = err.status || err.statusCode;
      if (status === 429) return true;
      if (status >= 500) return true;
      if (status === 408) return true;
      if (err.code === 'ETIMEDOUT') return true;
      if (err.code === 'ECONNREFUSED') return true;
      return false;
    }
  }
  ```

**Reference**: Section 8 (Core Business Logic)

### 7.2 Distributed Lock (lib/distributed-lock.ts)

- [ ] Implement distributed lock functions:
  ```typescript
  import { nanoid } from 'nanoid';
  import { prisma } from './db';

  export async function acquireLock(
    lockId: string,
    expiresInMs: number = 300_000
  ): Promise<string | null> {
    const processId = nanoid();
    const expiresAt = new Date(Date.now() + expiresInMs);

    try {
      // Try to create lock
      await prisma.distributedLock.create({
        data: {
          id: lockId,
          acquiredBy: processId,
          expiresAt: expiresAt
        }
      });

      return processId;
    } catch (err) {
      // Lock exists, check if expired
      const existing = await prisma.distributedLock.findUnique({
        where: { id: lockId }
      });

      if (existing && existing.expiresAt < new Date()) {
        // Take over expired lock
        await prisma.distributedLock.update({
          where: { id: lockId },
          data: {
            acquiredBy: processId,
            acquiredAt: new Date(),
            expiresAt: expiresAt
          }
        });
        return processId;
      }

      return null; // Lock held by another process
    }
  }

  export async function releaseLock(lockId: string, processId: string) {
    await prisma.distributedLock.deleteMany({
      where: {
        id: lockId,
        acquiredBy: processId
      }
    });
  }
  ```
- [ ] Write tests for lock acquisition and release

**Reference**: Section 9.3 (Distributed Lock)

### 7.3 Worker Cron Job (app/api/jobs/ingest/route.ts)

- [ ] Create POST handler for worker:
  ```typescript
  import { NextRequest } from 'next/server';
  import { env } from '@/lib/env';
  import { prisma } from '@/lib/db';
  import { logger } from '@/lib/logger';
  import { acquireLock, releaseLock } from '@/lib/distributed-lock';
  import { EventProcessor } from '@/lib/event-processor';
  import pLimit from 'p-limit';

  export const maxDuration = 300; // 5 minutes

  export async function POST(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    let processId: string | null = null;

    try {
      // Acquire distributed lock
      processId = await acquireLock('worker:ingest', env.LOCK_TIMEOUT_MS);

      if (!processId) {
        logger.warn('Worker already running');
        return Response.json({
          error: 'Worker already running'
        }, { status: 423 });
      }

      logger.info({ processId }, 'Worker started');

      // Query events ready for processing
      const events = await prisma.event.findMany({
        where: {
          OR: [
            { status: 'queued' },
            {
              status: 'failed',
              retryAfter: { lte: new Date() }
            }
          ],
          connection: { status: 'active' }
        },
        orderBy: { queuedAt: 'asc' },
        take: env.WORKER_BATCH_SIZE,
        include: { connection: true }
      });

      logger.info({ count: events.length }, 'Events to process');

      // Process events in parallel (max 10 concurrent)
      const limit = pLimit(10);
      const processor = new EventProcessor();

      const results = await Promise.allSettled(
        events.map(event =>
          limit(() => processor.processEvent(event.id))
        )
      );

      // Count results
      const succeeded = results.filter(r =>
        r.status === 'fulfilled' && r.value.success
      ).length;
      const failed = results.filter(r =>
        r.status === 'rejected' ||
        (r.status === 'fulfilled' && !r.value.success)
      ).length;

      // Query queue depth
      const queueDepth = await prisma.event.count({
        where: {
          status: { in: ['queued', 'failed'] },
          connection: { status: 'active' }
        }
      });

      // Query oldest event
      const oldestEvent = await prisma.event.findFirst({
        where: { status: 'queued' },
        orderBy: { queuedAt: 'asc' }
      });

      const oldestAge = oldestEvent
        ? Math.floor((Date.now() - oldestEvent.queuedAt.getTime()) / 1000)
        : 0;

      const duration = Date.now() - startTime;

      logger.info({
        processed: events.length,
        succeeded,
        failed,
        queueDepth,
        oldestAge,
        duration
      }, 'Worker completed');

      return Response.json({
        processed: events.length,
        succeeded,
        failed,
        durationMs: duration,
        queueDepth,
        oldestEventAge: oldestAge
      });

    } catch (err) {
      logger.error({ err }, 'Worker error');
      return Response.json({
        error: 'Internal server error'
      }, { status: 500 });
    } finally {
      // Release lock
      if (processId) {
        await releaseLock('worker:ingest', processId);
      }
    }
  }
  ```

**Reference**: Section 9.2 (Worker Process) and Section 12.9 (Worker API)

### 7.4 Health Check Endpoint (app/api/health/route.ts)

- [ ] Create GET handler for health check:
  ```typescript
  import { prisma } from '@/lib/db';

  export async function GET() {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;

      // Query queue depth
      const queueDepth = await prisma.event.count({
        where: { status: { in: ['queued', 'failed'] } }
      });

      // Query oldest event
      const oldestEvent = await prisma.event.findFirst({
        where: { status: 'queued' },
        orderBy: { queuedAt: 'asc' }
      });

      const oldestAge = oldestEvent
        ? Math.floor((Date.now() - oldestEvent.queuedAt.getTime()) / 1000)
        : 0;

      // Query worker last run
      const recentWorkerRun = await prisma.auditLog.findFirst({
        where: { action: 'worker.completed' },
        orderBy: { createdAt: 'desc' }
      });

      // Query connection health
      const connections = await prisma.connection.groupBy({
        by: ['status'],
        _count: true
      });

      return Response.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'connected',
          queueDepth,
          oldestEventAge: oldestAge,
          workerLastRun: recentWorkerRun?.createdAt,
          connections: Object.fromEntries(
            connections.map(c => [c.status, c._count])
          )
        }
      });
    } catch (err) {
      return Response.json({
        status: 'unhealthy',
        error: err.message
      }, { status: 503 });
    }
  }
  ```

**Reference**: Section 14.4 (Health Check Endpoint)

### 7.5 Test Complete Flow

- [ ] Create test connection in database using Prisma Studio or seed script
  - Use real encrypted credentials
  - Create corresponding mapping
- [ ] Send test webhook using the test script from Phase 6.2
- [ ] Verify event created with status='queued'
- [ ] Manually trigger worker:
  ```bash
  curl -X POST \
    -H "Authorization: Bearer YOUR_CRON_SECRET" \
    http://localhost:3000/api/jobs/ingest
  ```
- [ ] Verify event status changed to 'processing' then 'success'
- [ ] Check Webflow site to verify item created/updated
- [ ] Verify IdMap entry created
- [ ] Check logs for complete flow with context
- [ ] Test failed event scenario:
  - Create mapping with invalid field
  - Send webhook
  - Verify event moves to 'failed'
  - Fix mapping
  - Manually replay event (update status to 'queued' in DB)
  - Verify success on retry

**Reference**: Section 2.2 (Data Flow Scenarios)

---

## Stage 1 Testing Checklist

Before moving to Stage 2, verify these work:

### Core Functionality
- [ ] Environment variables validated correctly
- [ ] Encryption/decryption works (test with sample secret)
- [ ] Webhook signature verification works
- [ ] Database schema created with all tables
- [ ] Can connect to SmartSuite API
- [ ] Can connect to Webflow API
- [ ] Webhook endpoint receives and queues events
- [ ] Worker processes queued events
- [ ] Events sync to Webflow successfully
- [ ] IdMap entries created correctly

### Error Handling
- [ ] Invalid webhook signature rejected
- [ ] Duplicate webhooks handled (idempotency)
- [ ] Failed events retry with backoff
- [ ] Dead letter events after max retries
- [ ] Rate limiting prevents API overload

### Logging
- [ ] All events logged with context
- [ ] Errors logged with stack traces
- [ ] No sensitive data in logs
- [ ] Health check endpoint returns status

### Performance
- [ ] Worker completes batch in <5 minutes
- [ ] Rate limiting respects Webflow limits (50/min)
- [ ] Queue doesn't grow during testing

---

## Next Steps

Once Stage 1 is complete and tested:

1. **Document what you built**: Update README with what's working
2. **Commit your work**: Git commit with clear message
3. **Deploy to staging** (optional): Test on Vercel with real cron
4. **Move to Stage 2**: Build API endpoints and dashboard UI

---

## Troubleshooting Stage 1

### Worker not processing events
- Check CRON_SECRET is correct
- Verify distributed lock not stuck (check distributed_locks table)
- Check connection status is 'active'
- Review worker logs for errors

### Events failing with signature errors
- Verify webhook secret matches between SmartSuite and database
- Check timestamp is within 5 minutes
- Verify raw body used for signature (not parsed JSON)

### Rate limiting errors
- Lower WRITE_CAP_PER_MINUTE in environment
- Check queue has room (intervalCap setting)
- Verify no other systems calling Webflow API

### Database connection errors
- Verify DATABASE_URL is correct
- Check Neon database is running
- Test connection with Prisma Studio

---

## Success Criteria for Stage 1

✅ Complete backend infrastructure
✅ End-to-end sync working (webhook → Webflow)
✅ All error cases handled
✅ Comprehensive logging
✅ Unit tests passing
✅ Manual testing successful
✅ Ready for UI development

**Estimated Completion**: End of Week 2
**Next**: Stage 2 - API Endpoints & Dashboard UI
