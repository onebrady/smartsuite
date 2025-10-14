# End-to-End Test Scenario 2: Failed Event Recovery

## Objective
Verify that failed events can be identified, fixed, and replayed successfully.

## Prerequisites
- Running application with existing connection
- Access to admin dashboard
- Ability to modify field mappings

## Test Steps

### 1. Create Invalid Mapping

1. Go to connection detail page
2. Edit field mapping
3. Intentionally create invalid mapping:
   - Map a required Webflow field to non-existent SmartSuite field
   - Example: Map `name` to `$.invalid_field`
4. Save mapping

**Expected Result**: Mapping saved (validation may warn but allow)

### 2. Send Test Webhook

1. Create new record in SmartSuite
2. Wait for webhook to arrive
3. Check Events inbox

**Expected Result**: Event created with status "queued"

### 3. Verify Event Fails

1. Wait for worker to process event
2. Refresh Events page
3. Check event status

**Expected Result**:
- Event status = "failed" or "dead_letter"
- Error message indicates missing field
- Error is clear and actionable

### 4. Review Error Details

1. Click on failed event
2. Review error details panel
3. Check:
   - Error message
   - Stack trace (if available)
   - Payload data
   - Attempt count

**Expected Result**:
- Error clearly explains the problem
- Payload shows what data was received
- Attempt count shows retry attempts

### 5. Fix Mapping

1. Return to connection detail page
2. Click "Edit Mapping"
3. Fix the invalid field mapping:
   - Map `name` to valid field like `$.title`
4. Save corrected mapping

**Expected Result**: Mapping updated successfully

### 6. Replay Failed Event

1. Return to Events page
2. Find the failed event
3. Click "Replay" button
4. Confirm replay action

**Expected Result**:
- Event status resets to "queued"
- Attempts counter resets to 0
- Success message displayed

### 7. Verify Event Succeeds

1. Wait for worker to process event
2. Refresh Events page
3. Check event status

**Expected Result**:
- Event status = "success"
- Item created in Webflow
- No error message

### 8. Verify Item in Webflow

1. Go to Webflow CMS
2. Find the synced item
3. Verify all fields populated correctly

**Expected Result**: Item exists with correct data

## Success Criteria

- ✅ Invalid mapping causes event to fail predictably
- ✅ Error message is clear and actionable
- ✅ Failed event appears in inbox with proper status
- ✅ Mapping can be corrected via UI
- ✅ Failed event can be replayed via UI
- ✅ Replayed event processes successfully
- ✅ Item eventually synced to Webflow

## Test Variations

### Variation 1: Non-Retriable Error (400)
- Use invalid data that causes Webflow 400 error
- Verify event goes to dead_letter immediately
- Verify can still be replayed after fix

### Variation 2: Retriable Error (500)
- Temporarily break Webflow token
- Verify event retries with exponential backoff
- Fix token
- Verify event eventually succeeds

### Variation 3: Rate Limit (429)
- Send many webhooks to trigger rate limit
- Verify events retry appropriately
- Verify all eventually succeed

## Cleanup

1. Delete test items from Webflow
2. Delete test records from SmartSuite
3. Restore original mapping (if needed)

## Notes

- Document exact error messages
- Time the replay-to-success flow
- Note retry timing and backoff behavior
- Test with different error scenarios
