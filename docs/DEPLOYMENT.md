# Deployment Guide

This guide covers deploying the SmartSuite ↔ Webflow Sync application to production.

## Prerequisites

- GitHub repository (for Vercel deployment)
- Vercel account (free tier works)
- PostgreSQL database (Neon recommended)
- Domain name (optional)

## Step 1: Database Setup

### Option A: Neon (Recommended)

1. Go to [neon.tech](https://neon.tech)
2. Create new project
3. Select region closest to your Vercel deployment
4. Copy both connection strings:
   - **Pooled connection** (with pgbouncer=true) for `DATABASE_URL`
   - **Direct connection** for `DIRECT_DATABASE_URL`

### Option B: Other PostgreSQL Providers

Any PostgreSQL provider works (Railway, Supabase, etc.). You need:
- A pooled/connection-pooling URL for `DATABASE_URL`
- A direct connection URL for `DIRECT_DATABASE_URL`

## Step 2: Generate Secrets

Generate all required secrets locally:

```bash
# SESSION_PASSWORD (32+ characters)
openssl rand -base64 32

# DATA_ENCRYPTION_KEY (64 hex characters)
openssl rand -hex 32

# CRON_SECRET (32+ characters)
openssl rand -base64 32

# DASHBOARD_PASSWORD_HASH (bcrypt hash)
node -e "console.log(require('bcryptjs').hashSync('YourPassword', 10))"
```

Save these securely - you'll need them for Vercel environment variables.

## Step 3: Configure Vercel

### 3.1 Install Vercel CLI (Optional)

```bash
npm i -g vercel
vercel login
```

### 3.2 Link Project

Either:
- **Via CLI:** `vercel link`
- **Via Dashboard:** Import from GitHub at vercel.com

### 3.3 Set Environment Variables

Via CLI:

```bash
vercel env add SESSION_PASSWORD production
vercel env add DATA_ENCRYPTION_KEY production
vercel env add DASHBOARD_PASSWORD_HASH production
vercel env add CRON_SECRET production
vercel env add DATABASE_URL production
vercel env add DIRECT_DATABASE_URL production
vercel env add APP_URL production  # e.g., https://sync.yourcompany.com
vercel env add NODE_ENV production
vercel env add LOG_LEVEL production  # info or warn for production
vercel env add PRETTY_LOGS production  # false for production
```

Or via Dashboard:
1. Go to Project Settings → Environment Variables
2. Add all variables above
3. Set environment to "Production"

### 3.4 Optional: Add Performance Tuning Variables

```bash
vercel env add WRITE_CAP_PER_MINUTE production  # default: 50
vercel env add MAX_RETRY_ATTEMPTS production    # default: 5
vercel env add RETRY_BACKOFF_MS production      # default: 1000
vercel env add WORKER_BATCH_SIZE production     # default: 25
```

## Step 4: Push Database Schema

Before deploying, push the schema to production database:

```bash
# Using production database URL
DATABASE_URL="your-production-url" npx prisma db push

# Or create migration
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

## Step 5: Deploy

### Via CLI:

```bash
vercel --prod
```

### Via GitHub:

1. Push to `main` branch
2. Vercel auto-deploys
3. Wait for deployment to complete

### Verify Deployment

Check these URLs work:

```bash
# Health check
curl https://your-domain.vercel.app/api/health

# Should see: {"status":"healthy",...}
```

## Step 6: Configure Cron Job

The cron job is configured in `vercel.json`:

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

Verify in Vercel Dashboard:
1. Go to Project Settings → Cron Jobs
2. Verify worker appears and is active
3. Check it runs every minute

Monitor first few runs:

```bash
vercel logs --follow
```

## Step 7: Custom Domain (Optional)

### 7.1 Add Domain in Vercel

1. Go to Project Settings → Domains
2. Add your domain (e.g., `sync.yourcompany.com`)

### 7.2 Configure DNS

**For subdomain:**
Add CNAME record:
- Name: `sync`
- Value: `cname.vercel-dns.com`

**For root domain:**
Add A record:
- Name: `@`
- Value: `76.76.21.21` (Vercel's IP)

### 7.3 Update APP_URL

Update environment variable:

```bash
vercel env rm APP_URL production
vercel env add APP_URL production
# Enter: https://sync.yourcompany.com
```

Redeploy:

```bash
vercel --prod
```

### 7.4 Wait for SSL

Vercel automatically provisions SSL certificate (usually < 5 minutes).

## Step 8: Post-Deployment Verification

### 8.1 Test Health Endpoint

```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "database": "connected",
  "worker": "active"
}
```

### 8.2 Login to Dashboard

1. Go to `https://your-domain.com/admin/login`
2. Login with password you used for DASHBOARD_PASSWORD_HASH
3. Verify dashboard loads

### 8.3 Create Test Connection

1. Click "New Connection" in dashboard
2. Follow wizard (you can use test credentials)
3. Verify connection appears in list

### 8.4 Monitor Logs

Via CLI:
```bash
vercel logs --follow
```

Via Dashboard:
1. Go to Deployments → Functions
2. Click on a function to see logs

### 8.5 Check Worker

Verify worker runs every minute:
1. Go to `/admin/events` in dashboard
2. Send a test webhook (if you have one)
3. Verify event processes within 1 minute

## Step 9: Monitoring Setup (Optional)

### 9.1 Vercel Analytics

Enable in Project Settings → Analytics

### 9.2 Error Tracking (Sentry)

1. Sign up at sentry.io
2. Create new Next.js project
3. Add `SENTRY_DSN` to Vercel environment variables
4. Install Sentry SDK:

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

5. Redeploy

### 9.3 Uptime Monitoring

Use UptimeRobot or similar:
- Monitor: `https://your-domain.com/api/health`
- Check interval: 5 minutes
- Alert if down for >10 minutes

## Troubleshooting Deployment

### Build Fails

**Issue:** TypeScript errors

```bash
# Check locally first
npm run type-check
npm run build
```

**Issue:** Prisma Client not generated

```bash
# Ensure build command includes prisma generate
npm run build  # Should run: prisma generate && next build
```

### Worker Not Running

**Check cron configuration:**
1. Verify `vercel.json` exists in root
2. Check Vercel Dashboard → Cron Jobs
3. Verify `CRON_SECRET` matches

**Check logs:**
```bash
vercel logs --grep="worker"
```

### Database Connection Issues

**Issue:** "Can't reach database server"

- Verify `DATABASE_URL` is correct
- Check Neon project is not paused
- Verify IP allowlist (if any)

**Issue:** "Too many connections"

- Use pooled connection (`pgbouncer=true`)
- Reduce `WORKER_BATCH_SIZE`

### Environment Variables Not Working

**Issue:** Variables not loaded

- Verify variables are set for "Production" environment
- Redeploy after changing variables
- Check variable names match exactly (case-sensitive)

## Rollback

If deployment fails:

```bash
# Via CLI
vercel rollback

# Via Dashboard
Go to Deployments → Click previous deployment → Promote to Production
```

## Scaling Considerations

### When to Scale

Monitor these metrics:
- Queue depth regularly >100
- Worker takes >2 minutes to process batch
- Event processing latency >30 seconds

### How to Scale

1. **Increase worker batch size:**
   ```bash
   WORKER_BATCH_SIZE=50  # default: 25
   ```

2. **Add more cron jobs** (run worker every 30 seconds):
   ```json
   {
     "crons": [
       {
         "path": "/api/jobs/ingest?worker=1",
         "schedule": "* * * * *"
       },
       {
         "path": "/api/jobs/ingest?worker=2",
         "schedule": "*/30 * * * * *"
       }
     ]
   }
   ```

3. **Upgrade database:**
   - Neon: Increase compute size
   - Consider connection pooler

4. **Optimize rate limits:**
   - Contact Webflow for higher rate limits
   - Tune `WRITE_CAP_PER_MINUTE` per connection

## Security Checklist

Before going live:

- [ ] All secrets are randomly generated
- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=info` or `warn`
- [ ] `PRETTY_LOGS=false`
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Database credentials not in logs
- [ ] Strong dashboard password
- [ ] Webhook secrets properly configured
- [ ] Regular database backups enabled

## Maintenance

### Weekly

- Check dead letter queue
- Review error logs
- Verify connection health

### Monthly

- Update dependencies (`npm update`)
- Review performance metrics
- Check for security updates

### Quarterly

- Review and optimize database
- Performance audit
- Security audit

## Support

For deployment issues:
- Vercel: [vercel.com/support](https://vercel.com/support)
- Neon: Support via dashboard
- Project issues: GitHub Issues

## Next Steps

After successful deployment:
1. Configure first production connection
2. Set up SmartSuite webhook
3. Monitor first syncs
4. Set up alerts
5. Document your specific configuration
