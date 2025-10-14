import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventProcessor } from '@/lib/event-processor';
import { prisma } from '@/lib/db';
import type { Connection, Event } from '@prisma/client';

// Mock external API clients
vi.mock('@/lib/webflow', () => ({
  webflowClient: {
    upsertWebflowItem: vi.fn(),
  },
}));

vi.mock('@/lib/smartsuite', () => ({
  smartsuiteClient: {
    getRecords: vi.fn(),
  },
}));

describe('Event Processor (Integration)', () => {
  let testConnection: Connection;
  let testEvent: Event;

  beforeEach(async () => {
    // Create test connection
    testConnection = await prisma.connection.create({
      data: {
        name: 'Test Connection',
        ssBaseId: 'base_test',
        ssTableId: 'table_test',
        ssApiKey: JSON.stringify({ ciphertext: 'encrypted', iv: 'iv' }),
        wfSiteId: 'site_test',
        wfCollectionId: 'coll_test',
        wfToken: JSON.stringify({ ciphertext: 'encrypted', iv: 'iv' }),
        webhookSecret: 'test-secret',
        status: 'active',
      },
    });

    // Create mapping
    await prisma.mapping.create({
      data: {
        connectionId: testConnection.id,
        slugTemplate: '{{title}}',
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
    if (testEvent) {
      await prisma.event.delete({ where: { id: testEvent.id } }).catch(() => {});
    }
    if (testConnection) {
      await prisma.mapping.deleteMany({ where: { connectionId: testConnection.id } });
      await prisma.connection.delete({ where: { id: testConnection.id } }).catch(() => {});
    }
  });

  it('should process event successfully', async () => {
    const { webflowClient } = await import('@/lib/webflow');

    // Mock successful Webflow response
    vi.mocked(webflowClient.upsertWebflowItem).mockResolvedValue({
      wfItemId: 'wf_item_123',
      response: {
        id: 'wf_item_123',
        cmsLocaleId: 'en',
        lastPublished: null,
        lastUpdated: '2024-01-15T12:00:00Z',
        createdOn: '2024-01-15T12:00:00Z',
        isArchived: false,
        isDraft: false,
        fieldData: { name: 'Test Item' },
      },
      warnings: [],
    });

    // Create test event
    testEvent = await prisma.event.create({
      data: {
        connectionId: testConnection.id,
        externalId: 'ss_record_123',
        eventType: 'record_created',
        payload: { title: 'Test Item' },
        status: 'queued',
      },
    });

    const processor = new EventProcessor();
    const result = await processor.processEvent(testEvent.id);

    expect(result.success).toBe(true);

    // Verify event status updated
    const updatedEvent = await prisma.event.findUnique({
      where: { id: testEvent.id },
    });
    expect(updatedEvent?.status).toBe('success');

    // Verify IdMap created
    const idMap = await prisma.idMap.findFirst({
      where: {
        connectionId: testConnection.id,
        externalId: 'ss_record_123',
      },
    });
    expect(idMap).toBeTruthy();
    expect(idMap?.wfItemId).toBe('wf_item_123');
  });

  it('should handle retriable errors', async () => {
    const { webflowClient } = await import('@/lib/webflow');

    // Mock 500 error
    const error: any = new Error('Internal Server Error');
    error.status = 500;
    vi.mocked(webflowClient.upsertWebflowItem).mockRejectedValue(error);

    testEvent = await prisma.event.create({
      data: {
        connectionId: testConnection.id,
        externalId: 'ss_record_456',
        eventType: 'record_created',
        payload: { title: 'Test Item' },
        status: 'queued',
      },
    });

    const processor = new EventProcessor();
    const result = await processor.processEvent(testEvent.id);

    expect(result.success).toBe(false);

    // Verify event status updated to failed (will retry)
    const updatedEvent = await prisma.event.findUnique({
      where: { id: testEvent.id },
    });
    expect(updatedEvent?.status).toBe('failed');
    expect(updatedEvent?.attempts).toBe(1);
    expect(updatedEvent?.retryAfter).toBeTruthy();
  });

  it('should move to dead letter after max retries', async () => {
    const { webflowClient } = await import('@/lib/webflow');

    // Mock permanent error
    const error: any = new Error('Bad Request');
    error.status = 400;
    vi.mocked(webflowClient.upsertWebflowItem).mockRejectedValue(error);

    testEvent = await prisma.event.create({
      data: {
        connectionId: testConnection.id,
        externalId: 'ss_record_789',
        eventType: 'record_created',
        payload: { title: 'Test Item' },
        status: 'queued',
        attempts: 5, // Already at max retries
      },
    });

    const processor = new EventProcessor();
    const result = await processor.processEvent(testEvent.id);

    expect(result.success).toBe(false);

    // Verify event moved to dead letter
    const updatedEvent = await prisma.event.findUnique({
      where: { id: testEvent.id },
    });
    expect(updatedEvent?.status).toBe('dead_letter');
  });

  it('should skip processing for paused connections', async () => {
    // Pause connection
    await prisma.connection.update({
      where: { id: testConnection.id },
      data: { status: 'paused' },
    });

    testEvent = await prisma.event.create({
      data: {
        connectionId: testConnection.id,
        externalId: 'ss_record_999',
        eventType: 'record_created',
        payload: { title: 'Test Item' },
        status: 'queued',
      },
    });

    const processor = new EventProcessor();
    const result = await processor.processEvent(testEvent.id);

    expect(result.success).toBe(false);

    // Verify event skipped
    const updatedEvent = await prisma.event.findUnique({
      where: { id: testEvent.id },
    });
    expect(updatedEvent?.status).toBe('skipped');
  });
});
