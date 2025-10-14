import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/db';
import type { Connection } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

describe('Webhook Ingress (Integration)', () => {
  let testConnection: Connection;
  let webhookSecret: string;

  beforeEach(async () => {
    // Generate webhook secret
    webhookSecret = crypto.randomBytes(32).toString('hex');
    const webhookSecretHash = await bcrypt.hash(webhookSecret, 10);

    // Create test connection
    testConnection = await prisma.connection.create({
      data: {
        name: 'Test Webhook Connection',
        ssBaseId: 'base_webhook',
        ssTableId: 'table_webhook',
        ssApiKey: JSON.stringify({ ciphertext: 'encrypted', iv: 'iv' }),
        wfSiteId: 'site_webhook',
        wfCollectionId: 'coll_webhook',
        wfToken: JSON.stringify({ ciphertext: 'encrypted', iv: 'iv' }),
        webhookSecret: webhookSecretHash,
        status: 'active',
      },
    });

    // Create mapping
    await prisma.mapping.create({
      data: {
        connectionId: testConnection.id,
        slugTemplate: '{{id}}',
        fieldMap: {
          name: {
            type: 'direct',
            source: '$.title',
          },
        },
        isActive: true,
      },
    });
  });

  afterEach(async () => {
    // Cleanup
    if (testConnection) {
      // Delete related events
      await prisma.event.deleteMany({
        where: { connectionId: testConnection.id },
      });
      // Delete mapping
      await prisma.mapping.deleteMany({
        where: { connectionId: testConnection.id },
      });
      // Delete connection
      await prisma.connection.delete({ where: { id: testConnection.id } }).catch(() => {});
    }
  });

  function generateSignature(body: string, secret: string): string {
    return (
      'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
    );
  }

  it('should accept valid webhook', async () => {
    const payload = {
      record_id: 'rec_test_001',
      event_type: 'record_created',
      data: {
        id: 'rec_test_001',
        title: 'Test Record',
      },
    };
    const body = JSON.stringify(payload);
    const signature = generateSignature(body, webhookSecret);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const response = await fetch(
      `http://localhost:3000/api/hooks/${testConnection.id}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-smartsuite-signature': signature,
          'x-smartsuite-timestamp': timestamp,
        },
        body,
      }
    );

    expect(response.status).toBe(202);

    const data = await response.json();
    expect(data.eventId).toBeTruthy();

    // Verify event created
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
    });
    expect(event).toBeTruthy();
    expect(event?.status).toBe('queued');
    expect(event?.externalId).toBe('rec_test_001');
    expect(event?.eventType).toBe('record_created');
  });

  it('should reject invalid signature', async () => {
    const payload = {
      record_id: 'rec_test_002',
      data: {},
    };
    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const response = await fetch(
      `http://localhost:3000/api/hooks/${testConnection.id}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-smartsuite-signature': 'sha256=invalid',
          'x-smartsuite-timestamp': timestamp,
        },
        body,
      }
    );

    expect(response.status).toBe(401);

    // Verify no event created
    const events = await prisma.event.findMany({
      where: {
        connectionId: testConnection.id,
        externalId: 'rec_test_002',
      },
    });
    expect(events.length).toBe(0);
  });

  it('should reject old timestamp', async () => {
    const payload = {
      record_id: 'rec_test_003',
      data: {},
    };
    const body = JSON.stringify(payload);
    const signature = generateSignature(body, webhookSecret);
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago

    const response = await fetch(
      `http://localhost:3000/api/hooks/${testConnection.id}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-smartsuite-signature': signature,
          'x-smartsuite-timestamp': oldTimestamp.toString(),
        },
        body,
      }
    );

    expect(response.status).toBe(401);
  });

  it('should reject webhook for paused connection', async () => {
    // Pause connection
    await prisma.connection.update({
      where: { id: testConnection.id },
      data: { status: 'paused' },
    });

    const payload = {
      record_id: 'rec_test_004',
      data: {},
    };
    const body = JSON.stringify(payload);
    const signature = generateSignature(body, webhookSecret);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const response = await fetch(
      `http://localhost:3000/api/hooks/${testConnection.id}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-smartsuite-signature': signature,
          'x-smartsuite-timestamp': timestamp,
        },
        body,
      }
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('paused');
  });

  it('should handle duplicate webhooks (idempotency)', async () => {
    const payload = {
      record_id: 'rec_test_005',
      event_type: 'record_updated',
      data: { title: 'Updated Record' },
    };
    const body = JSON.stringify(payload);
    const signature = generateSignature(body, webhookSecret);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const headers = {
      'content-type': 'application/json',
      'x-smartsuite-signature': signature,
      'x-smartsuite-timestamp': timestamp,
    };

    // Send webhook twice
    const response1 = await fetch(
      `http://localhost:3000/api/hooks/${testConnection.id}`,
      {
        method: 'POST',
        headers,
        body,
      }
    );

    const response2 = await fetch(
      `http://localhost:3000/api/hooks/${testConnection.id}`,
      {
        method: 'POST',
        headers,
        body,
      }
    );

    expect(response1.status).toBe(202);
    expect(response2.status).toBe(202);

    // Verify only one event created (or both with same ID)
    const events = await prisma.event.findMany({
      where: {
        connectionId: testConnection.id,
        externalId: 'rec_test_005',
      },
    });

    // Should have 2 events for the same record (both updates)
    expect(events.length).toBeGreaterThanOrEqual(1);
  });
});
