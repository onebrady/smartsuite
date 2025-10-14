# End-to-End Test Scenario 4: Error Handling

## Objective
Verify that the system handles various error conditions gracefully with clear error messages and appropriate recovery paths.

## Prerequisites
- Running application with active connection
- Access to modify credentials and configurations
- Access to logs

## Error Scenarios to Test

## Scenario 1: Invalid SmartSuite API Key

### Steps
1. Go to connection settings
2. Edit SmartSuite credentials
3. Enter invalid API key
4. Save changes
5. Send test webhook

### Expected Results
- ✅ Validation error shown when saving (if validated)
- ✅ OR Event fails with clear "authentication failed" error
- ✅ Error message suggests checking API key
- ✅ Connection status shows error
- ✅ User can easily fix by updating credentials

---

## Scenario 2: Invalid Webflow Token

### Steps
1. Go to connection settings
2. Edit Webflow token
3. Enter invalid or expired token
4. Save changes
5. Send test webhook

### Expected Results
- ✅ Event fails during processing
- ✅ Error message: "Webflow API error: 401 Unauthorized"
- ✅ Event goes to dead_letter (non-retriable)
- ✅ Connection status shows error state
- ✅ Clear instructions to regenerate token

---

## Scenario 3: Missing Required Field

### Steps
1. Configure mapping without a required Webflow field
2. Send webhook with data missing that field
3. Check event processing

### Expected Results
- ✅ Event fails with "Missing required field" error
- ✅ Error specifies which field is missing
- ✅ Event goes to dead_letter
- ✅ User can fix mapping and replay event

---

## Scenario 4: Invalid Field Data Type

### Steps
1. Map text field to number field
2. Send webhook with text value
3. Check event processing

### Expected Results
- ✅ Event fails with type validation error
- ✅ Error shows expected vs actual type
- ✅ Suggests how to fix (use transform or fix mapping)

---

## Scenario 5: Webflow Collection Deleted

### Steps
1. Delete Webflow collection used in connection
2. Send webhook
3. Check event processing

### Expected Results
- ✅ Event fails with "Collection not found" error
- ✅ Error suggests checking Webflow collection exists
- ✅ Connection can be updated to use different collection

---

## Scenario 6: Slug Collision

### Steps
1. Create item with slug "test-item"
2. Send webhook that would create another "test-item"
3. Check event processing

### Expected Results
- ✅ System automatically appends suffix (test-item-1)
- ✅ Event succeeds with warning
- ✅ Warning message explains slug was modified
- ✅ Both items exist in Webflow

---

## Scenario 7: Network Timeout

### Steps
1. Temporarily block outbound requests (firewall/network)
2. Send webhook
3. Check event processing

### Expected Results
- ✅ Event fails with timeout error
- ✅ Event retries with exponential backoff
- ✅ Restore network
- ✅ Event eventually succeeds

---

## Scenario 8: Database Connection Lost

### Steps
1. Temporarily stop database (if possible in test env)
2. Try to access dashboard

### Expected Results
- ✅ Error page shown (not crash)
- ✅ Clear error message
- ✅ Suggestion to check database connection
- ✅ Restore database
- ✅ Application recovers automatically

---

## Scenario 9: Worker Lock Stuck

### Steps
1. Manually create stuck distributed lock in database:
```sql
INSERT INTO distributed_locks (id, owner, expiresAt)
VALUES ('worker', 'test', NOW() - INTERVAL '1 hour');
```
2. Wait for worker to run
3. Check processing

### Expected Results
- ✅ Worker detects expired lock
- ✅ Worker clears expired lock
- ✅ Worker acquires new lock
- ✅ Processing continues normally

---

## Scenario 10: Malformed Webhook Payload

### Steps
1. Send webhook with invalid JSON
2. Check response

### Expected Results
- ✅ Webhook rejected with 400 error
- ✅ Error message: "Invalid JSON"
- ✅ No event created
- ✅ No crash or internal error

---

## Scenario 11: Missing Webhook Signature

### Steps
1. Send webhook without signature header
2. Check response

### Expected Results
- ✅ Webhook rejected with 401 error
- ✅ Error message: "Missing signature"
- ✅ No event created

---

## Scenario 12: Paused Connection Receives Webhook

### Steps
1. Pause connection
2. Send webhook
3. Check response

### Expected Results
- ✅ Webhook rejected with 400 error
- ✅ Error message: "Connection is paused"
- ✅ Optionally: Event created but marked as skipped

---

## General Error Handling Checks

For each error scenario, verify:

1. **Error Messages**
   - ✅ Clear and actionable
   - ✅ No technical jargon (or explained)
   - ✅ Suggests next steps
   - ✅ Includes relevant details (field names, IDs, etc.)

2. **Logging**
   - ✅ Error logged with appropriate level
   - ✅ Includes context (connection ID, event ID, etc.)
   - ✅ Stack trace available in logs
   - ✅ No sensitive data logged

3. **User Experience**
   - ✅ No application crashes
   - ✅ Graceful degradation
   - ✅ User can recover from error
   - ✅ Help text or documentation linked

4. **Data Integrity**
   - ✅ No partial updates
   - ✅ Events tracked correctly
   - ✅ Audit log records error
   - ✅ Can replay after fix

5. **Monitoring**
   - ✅ Error appears in dashboard
   - ✅ Connection health reflects error state
   - ✅ Analytics count errors correctly
   - ✅ Alerts triggered (if configured)

## Success Criteria

- ✅ All 12 error scenarios tested
- ✅ All errors handled gracefully (no crashes)
- ✅ Error messages clear and actionable
- ✅ Users can recover from all error states
- ✅ System logs errors appropriately
- ✅ Data integrity maintained
- ✅ Monitoring reflects error states

## Documentation

For each error scenario, document:
1. Error message shown to user
2. Error message in logs
3. Recovery steps
4. Screenshots of error states

Create summary table:

| Scenario | Error Message | Recovery Path | Pass/Fail |
|----------|--------------|---------------|-----------|
| Invalid SS API Key | ___ | Update credentials | ___ |
| Invalid WF Token | ___ | Regenerate token | ___ |
| Missing Required Field | ___ | Fix mapping, replay | ___ |
| ... | ... | ... | ... |

## Notes

- Test in development environment first
- Some scenarios may require production-like setup
- Document any unexpected behaviors
- Add new scenarios as edge cases discovered
