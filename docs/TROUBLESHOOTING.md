# Troubleshooting Guide

Common issues and solutions for the SmartSuite ↔ Webflow Sync application.

## Events Not Processing

### Symptoms
- Events stuck in "queued" status
- Queue depth keeps growing
- No activity in logs

### Possible Causes

1. **Worker not running**
   - Check: Vercel Dashboard → Cron Jobs
   - Verify cron is enabled and scheduled
   - Check last execution time

2. **Connection status not active**
   - Go to `/admin/connections`
   - Check connection status
   - If paused/error, update to active

3. **Distributed lock stuck**
   ```sql
   -- Check for stuck locks
   SELECT * FROM "DistributedLock" WHERE "expiresAt" < NOW();

   -- Clear stuck locks
   DELETE FROM "DistributedLock" WHERE "expiresAt" < NOW();
   ```

4. **Database connection issues**
   - Check Prisma Studio: `npm run db:studio`
   - Verify DATABASE_URL is correct
   - Check database is not paused (Neon)

### Solutions

**Restart worker:**
```bash
# Manually trigger
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/jobs/ingest
```

**Check logs:**
```bash
# Vercel
vercel logs --follow

# Or in Vercel Dashboard
Deployments → Functions → View logs
```

**Verify worker runs:**
- Should see "Worker started" log every minute
- Should see "Worker completed" with processed count

## Webhook Signature Errors

### Symptoms
- Webhooks return 401 Unauthorized
- Error: "Invalid signature"
- Events not created from webhooks

### Possible Causes

1. **Wrong webhook secret**
   - Secret in SmartSuite doesn't match connection
   - Secret was regenerated

2. **Timestamp too old**
   - System clocks out of sync
   - Webhook delayed >5 minutes

3. **Payload modified**
   - Proxy/middleware modifying body
   - Body not sent as raw

### Solutions

**Verify webhook configuration in SmartSuite:**
1. Settings → Webhooks
2. Check URL matches connection webhook URL
3. Check secret matches

**Test webhook signature locally:**
```javascript
const crypto = require('crypto');

const secret = 'your-webhook-secret';
const body = '{"test":"data"}';
const timestamp = Math.floor(Date.now() / 1000);

const signature = crypto
  .createHmac('sha256', secret)
  .update(timestamp + body)
  .digest('hex');

console.log('Signature:', `sha256=${signature}`);
console.log('Timestamp:', timestamp);
```

**Check webhook logs:**
```bash
# Look for signature verification failures
vercel logs --grep="signature"
```

**Regenerate webhook secret:**
1. Go to connection details
2. Click "Regenerate Secret"
3. Update in SmartSuite webhook configuration

## Items Not Syncing to Webflow

### Symptoms
- Events show "success" but item not in Webflow
- Error: "Item not found"
- Sync appears to work but nothing in CMS

### Possible Causes

1. **IdMap entry missing**
   - Database race condition
   - Mapping failed to create entry

2. **Wrong collection ID**
   - Collection was deleted/changed
   - ID in connection is incorrect

3. **Webflow token expired/invalid**
   - Token revoked
   - Insufficient permissions

4. **Field validation errors**
   - Required fields not mapped
   - Invalid field values

### Solutions

**Check IdMap:**
```sql
SELECT * FROM "IdMap"
WHERE "connectionId" = 'your-connection-id'
  AND "externalId" = 'your-record-id';
```

**Verify Webflow collection:**
```bash
# Test with curl
curl -X GET \
  -H "Authorization: Bearer YOUR_WEBFLOW_TOKEN" \
  https://api.webflow.com/v2/collections/YOUR_COLLECTION_ID
```

**Check event details:**
1. Go to `/admin/events`
2. Find the event
3. Look at `wfResponse` and `error` fields
4. Check `warnings` array

**Test mapping:**
1. Go to connection detail
2. Send test webhook
3. Check event processing

**Regenerate Webflow token:**
1. Go to Webflow Account Settings → Integrations
2. Regenerate API token
3. Update in connection settings

## High Error Rate

### Symptoms
- Many events in "failed" or "dead_letter"
- Consecutive errors >5
- Connection status: "error"

### Possible Causes

1. **Rate limiting (429 errors)**
   - Too many requests
   - Rate limit too high

2. **Invalid field mappings**
   - Type mismatches
   - Required fields missing

3. **External API issues**
   - Webflow/SmartSuite downtime
   - Network problems

### Solutions

**For rate limiting:**
```sql
-- Reduce rate limit
UPDATE "Connection"
SET "rateLimitPerMin" = 30
WHERE id = 'your-connection-id';
```

**For mapping errors:**
1. Review event errors in dashboard
2. Identify common error patterns
3. Update field mapping
4. Replay dead letter events

**For external API issues:**
- Check status pages:
  - Webflow: status.webflow.com
  - SmartSuite: status.smartsuite.com
- Wait for resolution
- Replay events after recovery

**Bulk replay failed events:**
```sql
-- Reset all dead letter events for a connection
UPDATE "Event"
SET status = 'queued',
    attempts = 0,
    "retryAfter" = NULL,
    error = NULL
WHERE "connectionId" = 'your-connection-id'
  AND status = 'dead_letter';
```

## Database Issues

### Too Many Connections

**Symptoms:**
- Error: "too many connections"
- Worker fails to start
- Dashboard slow/unresponsive

**Solutions:**

1. **Use connection pooling:**
   - Ensure `DATABASE_URL` has `pgbouncer=true`
   - Use Neon's pooled connection string

2. **Reduce concurrent operations:**
   ```bash
   WORKER_BATCH_SIZE=10  # Reduce from 25
   ```

3. **Check for connection leaks:**
   ```bash
   # Review Prisma queries
   # Ensure all queries complete
   ```

### Slow Queries

**Symptoms:**
- Worker timeouts
- Dashboard pages slow to load
- Events take long to process

**Solutions:**

1. **Add indexes:**
   ```sql
   -- Already included in schema.prisma
   -- But verify they exist:
   SELECT * FROM pg_indexes WHERE tablename = 'Event';
   ```

2. **Clean up old data:**
   ```sql
   -- Archive events older than 30 days
   UPDATE "Event"
   SET status = 'archived'
   WHERE "createdAt" < NOW() - INTERVAL '30 days'
     AND status IN ('success', 'skipped');
   ```

3. **Optimize connection:**
   - Use Neon's nearest region
   - Upgrade database compute

## Worker Issues

### Worker Times Out

**Symptoms:**
- Worker logs show "timeout"
- Max duration exceeded
- Events not fully processed

**Solutions:**

1. **Reduce batch size:**
   ```bash
   WORKER_BATCH_SIZE=10
   ```

2. **Check for slow operations:**
   - Review event `durationMs`
   - Look for events >30 seconds
   - Optimize mapping logic

3. **Increase timeout (Vercel Pro):**
   ```javascript
   // In route.ts
   export const maxDuration = 300; // 5 minutes
   ```

### Multiple Workers Running

**Symptoms:**
- "Worker already running" errors
- Duplicate processing
- Lock conflicts

**Solutions:**

1. **Clear stuck locks:**
   ```sql
   DELETE FROM "DistributedLock"
   WHERE "expiresAt" < NOW();
   ```

2. **Increase lock timeout:**
   ```bash
   LOCK_TIMEOUT_MS=600000  # 10 minutes
   ```

3. **Check cron configuration:**
   - Should be only one cron job
   - Check `vercel.json`

## Mapping Issues

### Field Not Mapping

**Symptoms:**
- Field empty in Webflow
- Value not transferred
- No errors in logs

**Solutions:**

1. **Check source field exists:**
   - Verify SmartSuite field slug
   - Check field in webhook payload

2. **Test mapping:**
   ```javascript
   // In mapping test
   const data = { title: "Test" };
   const mapping = { type: "direct", source: "$.title" };
   const result = applyFieldMapping(mapping, data);
   console.log(result); // Should be "Test"
   ```

3. **Check transform:**
   - Verify transform function exists
   - Test with console.log

4. **Review default value:**
   - If field optional, provide default
   - Check required fields list

### Slug Collisions

**Symptoms:**
- Warning: "Slug collision resolved"
- Slugs have -1, -2 suffix
- Duplicate items created

**Solutions:**

1. **Improve slug template:**
   ```javascript
   // Instead of just name:
   slugTemplate: "{{name}}"

   // Add unique field:
   slugTemplate: "{{sku}}-{{name}}"
   ```

2. **Use ID in slug:**
   ```javascript
   slugTemplate: "{{id}}-{{name}}"
   ```

3. **Clean up duplicates manually:**
   - Find items with slug-1, slug-2
   - Merge or delete in Webflow

## Authentication Issues

### Can't Login to Dashboard

**Symptoms:**
- "Invalid password" error
- Password doesn't work
- Redirect loop

**Solutions:**

1. **Verify password hash:**
   ```bash
   # Generate new hash
   node -e "console.log(require('bcryptjs').hashSync('NewPassword', 10))"

   # Update DASHBOARD_PASSWORD_HASH
   vercel env rm DASHBOARD_PASSWORD_HASH production
   vercel env add DASHBOARD_PASSWORD_HASH production

   # Redeploy
   vercel --prod
   ```

2. **Check SESSION_PASSWORD:**
   - Must be 32+ characters
   - Verify environment variable set

3. **Clear browser cache:**
   - Clear cookies for domain
   - Try incognito mode

### Session Expires Too Quickly

**Symptoms:**
- Logged out frequently
- Session expires unexpectedly

**Solutions:**

1. **Check session settings:**
   ```typescript
   // In lib/session.ts
   cookieOptions: {
     maxAge: 60 * 60 * 24 * 7, // 7 days
   }
   ```

2. **Verify cookie settings:**
   - Check `secure` flag in production
   - Verify `httpOnly` is true

## Performance Issues

### Dashboard Slow

**Symptoms:**
- Pages take >5 seconds to load
- API requests timeout
- Unresponsive UI

**Solutions:**

1. **Optimize queries:**
   - Add pagination
   - Limit data fetched
   - Use select to exclude fields

2. **Add caching:**
   - Cache connection list
   - Use React Query
   - Add loading states

3. **Check database:**
   - Review slow query log
   - Optimize indexes
   - Upgrade compute

### High Memory Usage

**Symptoms:**
- Worker fails with OOM
- Slow performance
- Vercel function errors

**Solutions:**

1. **Reduce batch size:**
   ```bash
   WORKER_BATCH_SIZE=10
   ```

2. **Stream large payloads:**
   - Don't load all events at once
   - Process in chunks

3. **Upgrade Vercel plan:**
   - Pro: 1024 MB
   - Enterprise: Custom

## Getting Help

### Before Asking for Help

Gather this information:

1. **Error details:**
   - Full error message
   - Stack trace
   - Event/Connection ID

2. **Logs:**
   ```bash
   vercel logs --since=1h > logs.txt
   ```

3. **Environment:**
   - Node version
   - Vercel region
   - Database provider

4. **Steps to reproduce:**
   - What you did
   - What you expected
   - What actually happened

### Support Channels

- **GitHub Issues:** Report bugs
- **Documentation:** Check CLAUDE.md
- **Logs:** Use `vercel logs --follow`
- **Database:** Check Prisma Studio

### Emergency Recovery

If system is completely broken:

1. **Pause all connections:**
   ```sql
   UPDATE "Connection" SET status = 'paused';
   ```

2. **Clear queue:**
   ```sql
   UPDATE "Event"
   SET status = 'skipped'
   WHERE status = 'queued';
   ```

3. **Fix issue**

4. **Resume connections one by one**

5. **Monitor closely**
