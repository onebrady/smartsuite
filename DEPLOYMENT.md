# Vercel Deployment Guide

This guide covers deploying the SmartSuite webhook sync engine to Vercel.

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Neon PostgreSQL database (integrated with Vercel)

## Step 1: Prepare Your Repository

1. Initialize git (if not already done):
```bash
git init
git add .
git commit -m "Initial commit"
```

2. Push to GitHub:
```bash
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

## Step 2: Set Up Neon Database in Vercel

1. Go to your Vercel project settings
2. Navigate to Storage → Create Database → Neon
3. This will automatically create both connection strings:
   - `POSTGRES_URL` (pooled connection for serverless)
   - `POSTGRES_URL_NON_POOLING` (direct connection for migrations)

## Step 3: Configure Environment Variables

In Vercel project settings → Environment Variables, add:

### Required Variables

```env
# Application
APP_URL=https://your-app.vercel.app
NODE_ENV=production

# Session & Encryption
SESSION_PASSWORD=<generate: openssl rand -base64 32>
DATA_ENCRYPTION_KEY=<generate: openssl rand -hex 32>
DASHBOARD_PASSWORD_HASH=<generate: node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))">

# Database (automatically set by Vercel Neon integration)
DATABASE_URL=${POSTGRES_URL}
DIRECT_DATABASE_URL=${POSTGRES_URL_NON_POOLING}

# Cron Authentication
CRON_SECRET=<generate: openssl rand -base64 32>

# Optional: Rate Limiting & Worker Config
WRITE_CAP_PER_MINUTE=50
MAX_RETRY_ATTEMPTS=5
RETRY_BACKOFF_MS=1000
MAX_RETRY_BACKOFF_MS=60000
WORKER_BATCH_SIZE=25
LOCK_TIMEOUT_MS=300000
LOG_LEVEL=info
PRETTY_LOGS=false
```

### Generate Secrets

Run these commands locally to generate secure secrets:

```bash
# Session password
openssl rand -base64 32

# Data encryption key
openssl rand -hex 32

# Cron secret
openssl rand -base64 32

# Dashboard password hash (replace 'yourpassword' with desired password)
node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"
```

## Step 4: Deploy to Vercel

### Option A: Via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Vercel will auto-detect Next.js
4. Click "Deploy"

### Option B: Via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# For production
vercel --prod
```

## Step 5: Initialize Database Schema

After first deployment, run migrations:

```bash
# Using Vercel CLI
vercel env pull .env.production
npx prisma migrate deploy
```

Or manually run in Vercel project:
1. Go to Deployments → Latest → More → Redeploy
2. The build will run `prisma generate` automatically

Then you can use Prisma Studio locally:
```bash
npx prisma studio
```

## Step 6: Verify Deployment

1. Visit `https://your-app.vercel.app`
   - Should redirect to `/admin/login`

2. Test the health endpoint:
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

3. Check cron job:
   - Go to Vercel project → Deployments → Functions → Cron Jobs
   - Should see `/api/jobs/ingest` running every 5 minutes

## Step 7: Seed Test Data (Optional)

To create a test connection:

```bash
# Pull production env vars
vercel env pull .env.production

# Run seed script
npm run db:seed
```

## Important Notes

### Database Connection Strings

- **DATABASE_URL**: Uses connection pooling (required for serverless)
- **DIRECT_DATABASE_URL**: Direct connection (required for Prisma migrations)

If you set up Neon manually (not via Vercel integration):
- Get both URLs from Neon dashboard
- Pooled URL has `pooler.` or `-pooler` in hostname
- Direct URL connects directly to database

### Cron Jobs

The `vercel.json` file configures a cron job to process webhook events automatically.

**Current Schedule: Every 5 minutes** (Free Tier Compatible)
```json
{
  "crons": [
    {
      "path": "/api/jobs/ingest",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**For Production (Vercel Pro):** Change to run every minute for faster processing:
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

**Cron Schedule Options:**
- `*/5 * * * *` = Every 5 minutes (Free tier)
- `* * * * *` = Every minute (Pro/Enterprise)
- `*/15 * * * *` = Every 15 minutes
- `0 * * * *` = Every hour

**Note:** More frequent cron jobs may require a paid Vercel plan. The free tier works well with 5-minute intervals for testing.

### Security Headers

Security headers are configured in `next.config.ts` and automatically applied to all routes.

### Build Configuration

The build script in `package.json` skips environment validation during build:
```json
"build": "SKIP_ENV_VALIDATION=1 prisma generate && SKIP_ENV_VALIDATION=1 next build --turbopack"
```

This is intentional - environment variables are validated at runtime.

## Troubleshooting

### Build Fails

1. Check that all required environment variables are set
2. Ensure `DASHBOARD_PASSWORD_HASH` is exactly 60 characters
3. Verify database URLs are correct

### Database Connection Issues

1. Check that Neon database is running
2. Verify both DATABASE_URL and DIRECT_DATABASE_URL are set
3. Ensure IP allowlist in Neon allows Vercel (usually automatic with integration)

### Cron Job Not Running

1. Check Vercel logs: Project → Deployments → Function Logs
2. Verify `CRON_SECRET` matches between env vars and worker auth
3. Ensure the cron schedule is compatible with your Vercel plan (free tier works with 5+ minute intervals)
4. Manually trigger the worker to test: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/jobs/ingest`

### Local Development with Neon

If you can't connect to Neon locally:

1. **Check IP Allowlist**: In Neon dashboard → Project Settings → IP Allow
   - Add your IP or allow all IPs (0.0.0.0/0) for development

2. **Use Direct Connection**: For local development, use the non-pooled URL:
   ```env
   DATABASE_URL=<direct-connection-url>
   DIRECT_DATABASE_URL=<direct-connection-url>
   ```

3. **Test Connection**:
   ```bash
   npx prisma studio
   ```

## Post-Deployment

1. Update `APP_URL` in Vercel env vars to your actual domain
2. Configure SmartSuite webhooks to point to your Vercel URL
3. Create connections via dashboard UI at `/admin/connections/new`
4. Monitor events at `/admin/events`

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Project README](./README.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
