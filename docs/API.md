# API Reference

Base URL: `http://localhost:3000/api` (development) or `https://your-domain.com/api` (production)

## Authentication

Most API endpoints require authentication via session cookie. Public endpoints:
- `/api/health`
- `/api/hooks/[connectionId]`
- `/api/jobs/ingest` (requires CRON_SECRET)
- `/api/auth/login`

### POST /api/auth/login

Authenticate and create session.

**Request:**
```json
{
  "password": "your-password"
}
```

**Response (200):**
```json
{
  "success": true,
  "expiresAt": 1234567890000
}
```

**Errors:**
- 400: Password required
- 401: Invalid password

### POST /api/auth/logout

Destroy current session.

**Response (200):**
```json
{
  "success": true
}
```

### GET /api/auth/session

Check authentication status.

**Response (200):**
```json
{
  "authenticated": true,
  "user": {
    "id": "admin",
    "role": "admin"
  },
  "expiresAt": 1234567890000
}
```

**Response (401):**
```json
{
  "authenticated": false
}
```

## Connections

### GET /api/connections

List all connections with optional filtering and pagination.

**Query Parameters:**
- `status` (optional): Filter by status (active, paused, error, archived)
- `search` (optional): Search by name
- `limit` (optional, default: 50): Page size
- `offset` (optional, default: 0): Page offset

**Response (200):**
```json
{
  "connections": [
    {
      "id": "conn_123",
      "name": "My Sync",
      "description": "Syncs products",
      "status": "active",
      "sourceType": "smartsuite",
      "targetType": "webflow",
      "lastSuccessAt": "2025-01-01T12:00:00Z",
      "lastErrorAt": null,
      "consecutiveErrors": 0,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T12:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### GET /api/connections/[id]

Get single connection with mappings.

**Response (200):**
```json
{
  "id": "conn_123",
  "name": "My Sync",
  "status": "active",
  "mappings": [...],
  ...
}
```

**Errors:**
- 404: Connection not found

### POST /api/connections

Create new connection.

**Request:**
```json
{
  "name": "My Sync",
  "description": "Syncs products",
  "ssApiKey": "your-smartsuite-api-key",
  "ssBaseId": "base_123",
  "ssTableId": "table_456",
  "wfToken": "your-webflow-token",
  "wfSiteId": "site_789",
  "wfCollectionId": "collection_abc",
  "rateLimitPerMin": 50,
  "maxRetries": 5
}
```

**Response (201):**
```json
{
  "id": "conn_123",
  "webhookUrl": "https://your-domain.com/api/hooks/conn_123",
  "webhookSecret": "secret_xyz123..."
}
```

**Note:** The webhook secret is returned only once. Save it securely!

### PATCH /api/connections/[id]

Update connection.

**Request (partial):**
```json
{
  "name": "Updated Name",
  "status": "paused",
  "rateLimitPerMin": 100
}
```

**Response (200):** Updated connection object

### DELETE /api/connections/[id]

Soft delete connection (sets status to archived).

**Response (204):** No content

## Mappings

### GET /api/mappings/[connectionId]

Get active mapping for connection.

**Response (200):**
```json
{
  "id": "mapping_123",
  "connectionId": "conn_123",
  "fieldMap": {
    "name": {
      "type": "direct",
      "source": "$.title"
    },
    "slug": {
      "type": "template",
      "template": "{{sku}}-{{name}}"
    }
  },
  "slugTemplate": "{{name}}",
  "requiredFields": ["name", "slug"],
  "isActive": true
}
```

**Errors:**
- 404: Mapping not found

### POST /api/mappings/[connectionId]

Create or update mapping. Automatically deactivates previous mappings.

**Request:**
```json
{
  "fieldMap": {
    "name": { "type": "direct", "source": "$.title" },
    "slug": { "type": "template", "template": "{{name}}" }
  },
  "slugTemplate": "{{name}}",
  "statusBehavior": null,
  "imageFieldMap": null,
  "referenceMap": null,
  "requiredFields": ["name", "slug"]
}
```

**Response (201):** Created mapping object

## Discovery

These endpoints help discover available resources from SmartSuite and Webflow.

### GET /api/discovery/smartsuite/bases

List SmartSuite bases.

**Query Parameters:**
- `apiKey` (required): SmartSuite API key

**Response (200):**
```json
{
  "bases": [
    {
      "id": "base_123",
      "name": "Products",
      "structure": "..."
    }
  ]
}
```

### GET /api/discovery/smartsuite/tables

List tables in a SmartSuite base.

**Query Parameters:**
- `apiKey` (required)
- `baseId` (required)

**Response (200):**
```json
{
  "tables": [
    {
      "id": "table_456",
      "name": "Inventory",
      "structure": "..."
    }
  ]
}
```

### GET /api/discovery/smartsuite/fields

Get schema for a SmartSuite table.

**Query Parameters:**
- `apiKey` (required)
- `baseId` (required)
- `tableId` (required)

**Response (200):**
```json
{
  "fields": [
    {
      "slug": "title",
      "label": "Title",
      "field_type": "text"
    }
  ]
}
```

### GET /api/discovery/webflow/sites

List Webflow sites.

**Query Parameters:**
- `token` (required): Webflow API token

**Response (200):**
```json
{
  "sites": [
    {
      "id": "site_789",
      "displayName": "My Site",
      "shortName": "mysite",
      "previewUrl": "https://..."
    }
  ]
}
```

### GET /api/discovery/webflow/collections

List collections in a Webflow site.

**Query Parameters:**
- `token` (required)
- `siteId` (required)

**Response (200):**
```json
{
  "collections": [
    {
      "id": "collection_abc",
      "displayName": "Products",
      "slug": "products"
    }
  ]
}
```

### GET /api/discovery/webflow/fields

Get schema for a Webflow collection.

**Query Parameters:**
- `token` (required)
- `collectionId` (required)

**Response (200):**
```json
{
  "fields": [
    {
      "id": "field_123",
      "slug": "name",
      "displayName": "Name",
      "type": "PlainText",
      "isRequired": true
    }
  ]
}
```

## Events

### GET /api/events

List events with filtering and pagination.

**Query Parameters:**
- `connectionId` (optional)
- `status` (optional): queued, processing, success, failed, dead_letter, skipped
- `externalId` (optional): Search by external ID
- `dateFrom` (optional): ISO 8601 date
- `dateTo` (optional): ISO 8601 date
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)

**Response (200):**
```json
{
  "events": [
    {
      "id": "event_123",
      "status": "success",
      "externalId": "rec_abc123",
      "queuedAt": "2025-01-01T12:00:00Z",
      "processedAt": "2025-01-01T12:00:05Z",
      "durationMs": 5000,
      "connection": {
        "name": "My Sync"
      }
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

### GET /api/events/[id]

Get event details including full payload and response.

**Response (200):**
```json
{
  "id": "event_123",
  "status": "success",
  "payload": {...},
  "wfResponse": {...},
  "error": null,
  "warnings": [],
  ...
}
```

### POST /api/events/[id]/replay

Replay failed or dead letter event.

**Response (200):** Updated event object with status reset to "queued"

## Items

### GET /api/items/lookup

Look up synced item by external ID.

**Query Parameters:**
- `connectionId` (required)
- `externalId` (required)

**Response (200):**
```json
{
  "id": "idmap_123",
  "connectionId": "conn_123",
  "externalSource": "smartsuite",
  "externalId": "rec_abc123",
  "wfItemId": "item_xyz789",
  "lastSyncedAt": "2025-01-01T12:00:00Z",
  "connection": {
    "id": "conn_123",
    "name": "My Sync",
    "wfCollectionId": "collection_abc"
  }
}
```

**Errors:**
- 400: Missing required parameters
- 404: Item not found

### POST /api/items/resync

Manually trigger resync for an item.

**Request:**
```json
{
  "connectionId": "conn_123",
  "externalId": "rec_abc123"
}
```

**Response (200):**
```json
{
  "eventId": "event_456",
  "status": "queued",
  "message": "Manual resync triggered"
}
```

## Analytics

### GET /api/analytics/daily

Get daily analytics metrics.

**Query Parameters:**
- `connectionId` (optional): Filter by connection
- `dateFrom` (optional): ISO 8601 date
- `dateTo` (optional): ISO 8601 date

**Response (200):**
```json
{
  "analytics": [
    {
      "id": "analytics_123",
      "date": "2025-01-01",
      "connectionId": "conn_123",
      "eventsReceived": 150,
      "eventsProcessed": 150,
      "eventsSucceeded": 148,
      "eventsFailed": 2,
      "eventsSkipped": 0,
      "itemsCreated": 50,
      "itemsUpdated": 98,
      "itemsDeleted": 0,
      "avgDurationMs": 3500,
      "p95DurationMs": 5000,
      "p99DurationMs": 7500
    }
  ]
}
```

## Webhooks

### POST /api/hooks/[connectionId]

Webhook ingress endpoint. Called by SmartSuite when records change.

**Headers:**
- `x-smartsuite-signature` (required): HMAC-SHA256 signature
- `x-smartsuite-timestamp` (required): Unix timestamp in seconds
- `x-idempotency-key` (optional): Unique key for idempotency

**Request:** SmartSuite webhook payload (format varies)

**Response (202):**
```json
{
  "eventId": "event_123",
  "status": "queued"
}
```

**Errors:**
- 401: Invalid signature or timestamp
- 404: Connection not found
- 409: Duplicate webhook (same idempotency key)

## Worker

### POST /api/jobs/ingest

Worker cron endpoint. Processes queued events.

**Headers:**
- `Authorization: Bearer {CRON_SECRET}` (required)

**Response (200):**
```json
{
  "processed": 25,
  "succeeded": 23,
  "failed": 2,
  "durationMs": 15000,
  "queueDepth": 50,
  "oldestEventAge": 30
}
```

**Errors:**
- 401: Unauthorized (invalid CRON_SECRET)
- 423: Worker already running (locked)

## Error Responses

All endpoints may return these error responses:

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```
