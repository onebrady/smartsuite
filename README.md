# SmartSuite ↔ Webflow Sync Engine

A robust, production-ready sync engine that automatically syncs data from SmartSuite to Webflow via webhooks.

## 🚀 Current Status

**Stage 1: COMPLETE** ✅ - Full backend infrastructure
**Stage 2: COMPLETE** ✅ - REST API & Dashboard UI
**Stage 3: COMPLETE** ✅ - Testing, Documentation & Deployment

🎉 **All stages complete! Application is production-ready.**

See [STAGE3_COMPLETE.md](./STAGE3_COMPLETE.md) for Stage 3 completion details.
See [CLAUDE.md](./CLAUDE.md) for development documentation.

## 📋 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- SmartSuite account
- Webflow account

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your database URLs
   ```

3. **Set up database:**
   ```bash
   # Generate Prisma Client
   npx prisma generate

   # Push schema to database
   npm run db:push

   # (Optional) Seed test data
   npm run db:seed
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Verify installation:**
   ```bash
   curl http://localhost:3000/api/health
   ```

## 🏗️ Architecture

- **Framework**: Next.js 14.2+ with App Router
- **Database**: PostgreSQL via Prisma
- **Queue**: Database-backed with distributed locking
- **Rate Limiting**: p-queue with configurable limits
- **Retry Logic**: Exponential backoff with p-retry
- **Mapping**: JSONata expressions + templates
- **Security**: AES-256-GCM encryption, HMAC signatures

## 📁 Project Structure

```
/
├── app/api/           # API routes
│   ├── health/        # Health check endpoint
│   ├── hooks/         # Webhook ingress
│   └── jobs/          # Worker cron jobs
├── lib/               # Core business logic
│   ├── crypto.ts      # Encryption utilities
│   ├── db.ts          # Prisma client
│   ├── env.ts         # Environment validation
│   ├── logger.ts      # Logging setup
│   ├── mapper.ts      # Data mapping engine
│   ├── webflow.ts     # Webflow API client
│   └── ...
├── prisma/            # Database schema & migrations
├── types/             # TypeScript definitions
└── documents/         # Implementation guides
```

## 🔧 Available Scripts

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run type-check    # Run TypeScript compiler
npm run test          # Run tests
npm run db:push       # Push schema to database
npm run db:migrate    # Create migration
npm run db:studio     # Open Prisma Studio
npm run db:seed       # Seed test data
```

## 🔐 Environment Variables

Required variables (see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_DATABASE_URL` - Direct PostgreSQL connection
- `SESSION_PASSWORD` - Session encryption key (auto-generated)
- `DATA_ENCRYPTION_KEY` - Credential encryption key (auto-generated)
- `DASHBOARD_PASSWORD_HASH` - Dashboard password hash (auto-generated)
- `CRON_SECRET` - Worker authentication secret (auto-generated)

## 📊 API Endpoints

### Health Check
```bash
GET /api/health
```

### Webhook Ingress
```bash
POST /api/hooks/[connectionId]
Headers:
  - x-smartsuite-signature
  - x-smartsuite-timestamp
  - x-idempotency-key (optional)
```

### Worker (Cron)
```bash
POST /api/jobs/ingest
Headers:
  - Authorization: Bearer {CRON_SECRET}
```

## 🧪 Testing

### Manual Webhook Test

See `documents/implementation_task_list_stage1.md` Phase 6.2 for webhook test scripts.

### Manual Worker Trigger

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/jobs/ingest
```

## 📝 Configuration

### Rate Limiting

Configure in `.env.local`:
```
WRITE_CAP_PER_MINUTE=50
MAX_RETRY_ATTEMPTS=5
RETRY_BACKOFF_MS=1000
MAX_RETRY_BACKOFF_MS=60000
```

### Worker Settings

```
WORKER_BATCH_SIZE=25
LOCK_TIMEOUT_MS=300000
```

### Logging

```
LOG_LEVEL=debug
PRETTY_LOGS=true
```

## 🚧 Roadmap

- [x] **Stage 1**: Backend infrastructure (COMPLETE)
- [x] **Stage 2**: Dashboard UI & API endpoints (COMPLETE)
- [x] **Stage 3**: Testing, Documentation & Deployment (COMPLETE)

## 📖 Documentation

- [Stage 1 Implementation Guide](./documents/implementation_task_list_stage1.md)
- [Stage 1 Completion Report](./STAGE1_COMPLETE.md)
- [Stage 2 Implementation Guide](./documents/implementation_task_list_stage2.md)
- [Stage 2 Completion Report](./STAGE2_COMPLETE.md)
- [Stage 3 Implementation Guide](./documents/implementation_task_list_stage3.md)
- [Stage 3 Completion Report](./STAGE3_COMPLETE.md)
- [Full Specification](./documents/smartsuite_webflow_sync_spec.txt)
- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)
- [Test Documentation](./tests/README.md)

## 🐛 Troubleshooting

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Check database is running
- Test connection with `npm run db:studio`

### Webhook Signature Errors
- Verify webhook secret matches between SmartSuite and database
- Check timestamp is within 5 minutes
- Ensure raw body is used for signature verification

### Worker Not Processing
- Check `CRON_SECRET` is correct
- Verify distributed lock is not stuck
- Check connection status is 'active'
- Review worker logs

## 📄 License

Private - All rights reserved

## 👤 Author

Built with Claude Code
