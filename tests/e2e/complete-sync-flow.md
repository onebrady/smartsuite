# End-to-End Test Scenario 1: Complete Sync Flow

## Objective
Verify that a complete sync flow works from connection creation to item appearing in Webflow.

## Prerequisites
- Running application (dev or deployed)
- Valid SmartSuite account with API key
- Valid Webflow site with API token
- Access to admin dashboard

## Test Steps

### 1. Create Connection via Dashboard

1. Navigate to `/admin` and login
2. Click "New Connection"
3. Complete the 7-step wizard:
   - **Step 1: Name & Description**
     - Name: "E2E Test Connection"
     - Description: "End-to-end testing"
   - **Step 2: SmartSuite Credentials**
     - API Key: [Your SmartSuite API key]
     - Select Base: [Test base]
     - Select Table: [Test table]
   - **Step 3: Webflow Credentials**
     - Site Token: [Your Webflow token]
     - Select Site: [Test site]
     - Select Collection: [Test collection]
   - **Step 4: Field Mapping**
     - Map required fields (name, slug)
     - Configure slug template: `{{title}}`
   - **Step 5: Review**
     - Verify all settings
   - **Step 6: Test**
     - Send test webhook
     - Verify validation passes
   - **Step 7: Complete**
     - Copy webhook URL
     - Copy webhook secret

**Expected Result**: Connection created successfully with status "active"

### 2. Configure SmartSuite Webhook

1. Go to SmartSuite → Settings → Webhooks
2. Add new webhook:
   - URL: [Webhook URL from step 1]
   - Events: record_created, record_updated
   - Headers:
     - `x-smartsuite-signature`: [Webhook secret]
3. Save webhook configuration

**Expected Result**: Webhook configured in SmartSuite

### 3. Create Test Record in SmartSuite

1. Go to your test table in SmartSuite
2. Create new record:
   - Title: "E2E Test Product"
   - [Fill other mapped fields]
3. Save record
4. Note the record ID

**Expected Result**: Record created in SmartSuite

### 4. Verify Event Created

1. Go to dashboard Events page (`/admin/events`)
2. Look for new event with:
   - External ID: [SmartSuite record ID]
   - Event Type: "record_created"
   - Status: "queued" or "processing"

**Expected Result**: Event appears in inbox with status "queued"

### 5. Wait for Worker to Process Event

1. Wait 1-2 minutes for worker to pick up event
2. Refresh Events page
3. Check event status

**Expected Result**: Event status changes to "success"

### 6. Verify Item in Webflow

1. Go to Webflow CMS for your test collection
2. Look for item with slug "e2e-test-product"
3. Verify all mapped fields populated correctly

**Expected Result**: Item exists in Webflow with correct data

### 7. Update Record in SmartSuite

1. Go back to SmartSuite record
2. Update a mapped field (e.g., change title to "E2E Test Product v2")
3. Save changes

**Expected Result**: Record updated in SmartSuite

### 8. Verify Update Synced

1. Return to dashboard Events page
2. Look for new "record_updated" event
3. Wait for worker to process
4. Verify event succeeds
5. Check Webflow CMS
6. Verify item updated with new values

**Expected Result**:
- New event created and processed successfully
- Webflow item updated with new values

## Success Criteria

- ✅ Connection created successfully
- ✅ Webhook configured in SmartSuite
- ✅ Create event processed successfully
- ✅ Item appears in Webflow with correct data
- ✅ Update event processed successfully
- ✅ Webflow item updated correctly
- ✅ Total sync time < 5 seconds from webhook to Webflow

## Cleanup

1. Delete test item from Webflow
2. Delete test record from SmartSuite
3. Archive or delete test connection
4. Remove webhook from SmartSuite

## Notes

- Record timestamps for performance analysis
- Screenshot each step for documentation
- Note any warnings or errors encountered
- Test with different field types (text, number, date, etc.)
