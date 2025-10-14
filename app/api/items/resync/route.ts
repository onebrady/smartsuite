import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { decryptSecret } from '@/lib/crypto';
import { smartsuiteClient } from '@/lib/smartsuite';
import { EventProcessor } from '@/lib/event-processor';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { connectionId, externalId } = body;

    if (!connectionId || !externalId) {
      return Response.json(
        { error: 'connectionId and externalId required' },
        { status: 400 }
      );
    }

    // Fetch fresh data from SmartSuite
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return Response.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const ssApiKey = await decryptSecret({
      ciphertext: connection.ssApiKeyEnc,
      iv: connection.ssApiKeyIv,
    });

    // Note: We need to add getRecord method to SmartSuiteClient
    // For now, create event with placeholder data
    const record = { id: externalId, manual_resync: true };

    // Create new event
    const event = await prisma.event.create({
      data: {
        connectionId,
        externalSource: 'smartsuite',
        externalId,
        idempotencyKey: `manual-resync-${Date.now()}`,
        payload: { event_type: 'manual_resync', data: record },
        payloadHash: crypto
          .createHash('sha256')
          .update(JSON.stringify(record))
          .digest('hex'),
        status: 'queued',
      },
    });

    logger.info({ eventId: event.id, externalId }, 'Manual resync triggered');

    return Response.json({
      eventId: event.id,
      status: 'queued',
      message: 'Manual resync triggered',
    });
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ err }, 'Resync item error');
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
