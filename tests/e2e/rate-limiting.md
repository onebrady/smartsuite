# End-to-End Test Scenario 3: Rate Limiting

## Objective
Verify that the system properly rate limits requests to Webflow and handles high webhook volume.

## Prerequisites
- Running application with active connection
- Script to generate test webhooks
- Access to logs and analytics

## Test Steps

### 1. Prepare Test Script

Create a script to send webhooks rapidly:

```bash
#!/bin/bash
CONNECTION_ID="your-connection-id"
WEBHOOK_URL="https://your-domain.com/api/hooks/$CONNECTION_ID"
SECRET="your-webhook-secret"

for i in {1..100}; do
  TIMESTAMP=$(date +%s)
  BODY=$(cat <<EOF
{
  "record_id": "rec_load_test_$i",
  "event_type": "record_created",
  "data": {
    "id": "rec_load_test_$i",
    "title": "Load Test Item $i"
  }
}
EOF
)
  SIGNATURE="sha256=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')"

  curl -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -H "x-smartsuite-signature: $SIGNATURE" \
    -H "x-smartsuite-timestamp: $TIMESTAMP" \
    -d "$BODY" &
done

wait
echo "Sent 100 webhooks"
```

**Expected Result**: Script ready to execute

### 2. Check Initial Queue Depth

1. Go to dashboard overview
2. Note current queue depth
3. Note current processing rate

**Expected Result**: Queue depth near 0 initially

### 3. Send 100 Webhooks Rapidly

1. Run the test script
2. Wait for all requests to complete
3. Immediately check dashboard

**Expected Result**:
- All 100 webhooks accepted (202 responses)
- Queue depth increases to ~100

### 4. Monitor Queue Processing

1. Refresh dashboard every 30 seconds
2. Track queue depth over time
3. Monitor for at least 5 minutes

**Expected Result**:
- Queue depth decreases steadily
- Processing rate approximately 50 events/minute (per connection)
- No events fail due to rate limiting from dashboard

### 5. Check Worker Logs

1. Open Vercel logs or local logs
2. Filter for rate limit indicators
3. Look for:
   - "Rate limited" messages
   - 429 responses from Webflow
   - Retry indicators

**Expected Result**:
- System respects rate limits
- Requests queued appropriately
- No 429 errors (or if present, handled with retries)

### 6. Verify All Events Processed

1. Wait until queue depth = 0
2. Go to Events page
3. Filter by connection
4. Check event statuses

**Expected Result**:
- All 100 events show status "success"
- No events in "dead_letter"
- Processing time reasonable (< 10 minutes total)

### 7. Verify Items in Webflow

1. Go to Webflow CMS
2. Check for "Load Test Item" items
3. Verify all 100 items present

**Expected Result**: All 100 items created in Webflow

### 8. Check Analytics

1. Go to Analytics page
2. Check metrics for test period:
   - Total events
   - Success rate
   - Average processing time
   - Queue statistics

**Expected Result**:
- 100 events processed
- 100% success rate
- Average processing time < 5 seconds
- Max queue depth = 100

## Performance Benchmarks

| Metric | Target | Actual |
|--------|--------|--------|
| Webhooks accepted | 100 | ___ |
| Success rate | 100% | ___% |
| Total processing time | < 10 min | ___ min |
| Average event time | < 5 sec | ___ sec |
| Max queue depth | ~100 | ___ |
| 429 errors | 0 | ___ |
| Failed events | 0 | ___ |

## Success Criteria

- ✅ All 100 webhooks accepted
- ✅ Queue builds up as expected
- ✅ Processing rate limited to ~50/min per connection
- ✅ All events eventually succeed
- ✅ No 429 errors from Webflow
- ✅ All items created in Webflow
- ✅ System remains stable under load
- ✅ Processing time meets targets

## Test Variations

### Variation 1: Higher Volume
- Send 500 webhooks
- Verify system handles larger queue
- Check for memory/performance issues

### Variation 2: Multiple Connections
- Send 50 webhooks to 3 different connections simultaneously
- Verify separate queues work independently
- Verify total throughput = 50/min × 3 = 150/min

### Variation 3: Sustained Load
- Send 10 webhooks/minute for 30 minutes
- Verify consistent processing
- Verify no queue buildup

## Cleanup

1. Delete all "Load Test Item" items from Webflow (use bulk delete if available)
2. Clean up test events from database (optional)
3. Archive test records in SmartSuite

## Notes

- Record exact timestamps for performance analysis
- Monitor server resources (CPU, memory)
- Check database connection pool usage
- Note any warnings or errors in logs
- Compare results to success criteria from spec
