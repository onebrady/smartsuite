import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifyWebhookSignature, verifyTimestamp } from '@/lib/webhook-security';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  const startTime = Date.now();
  const { connectionId } = await params;

  const log = logger.child({ connectionId });

  try {
    // 1. Load connection
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      log.warn('Connection not found');
      return Response.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (connection.status !== 'active') {
      log.warn({ status: connection.status }, 'Connection not active');
      return Response.json({ error: 'Connection not active' }, { status: 403 });
    }

    // 2. Extract headers
    const signature = request.headers.get('x-smartsuite-signature');
    const timestamp = request.headers.get('x-smartsuite-timestamp');
    const idempotencyKey = request.headers.get('x-idempotency-key');

    // 3. Read raw body (needed for signature verification)
    const rawBody = await request.text();

    // 4. Verify signature
    if (!signature || !verifyWebhookSignature(rawBody, signature, connection.webhookSecretHash)) {
      log.warn('Invalid webhook signature');
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 5. Verify timestamp (optional but recommended)
    if (timestamp && !verifyTimestamp(timestamp)) {
      log.warn({ timestamp }, 'Invalid webhook timestamp');
      return Response.json({ error: 'Invalid timestamp' }, { status: 401 });
    }

    // 6. Parse body
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      log.error({ err }, 'Failed to parse webhook payload');
      return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // 7. Extract external ID from payload
    const externalId = payload.record_id || payload.id || payload.data?.id;

    if (!externalId) {
      log.error({ payload }, 'No record ID found in payload');
      return Response.json({ error: 'No record ID in payload' }, { status: 400 });
    }

    // 8. Generate idempotency key if not provided
    const idemKey =
      idempotencyKey ||
      crypto
        .createHash('sha256')
        .update(`${connectionId}-${externalId}-${timestamp || Date.now()}`)
        .digest('hex');

    // 9. Check for duplicate
    const existing = await prisma.event.findUnique({
      where: { idempotencyKey: idemKey },
    });

    if (existing) {
      log.info({ eventId: existing.id }, 'Duplicate webhook (idempotency)');
      return Response.json(
        {
          message: 'Duplicate event',
          eventId: existing.id,
        },
        { status: 200 } // Return 200 for idempotent requests
      );
    }

    // 10. Create event
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

    const event = await prisma.event.create({
      data: {
        connectionId,
        externalSource: 'smartsuite',
        externalId: externalId,
        idempotencyKey: idemKey,
        payload: payload,
        payloadHash: payloadHash,
        status: 'queued',
        webhookTimestamp: timestamp
          ? new Date(parseInt(timestamp) * 1000)
          : undefined,
      },
    });

    log.info(
      {
        eventId: event.id,
        externalId,
        processingTime: Date.now() - startTime,
      },
      'Webhook received and queued'
    );

    // 11. Return 202 Accepted
    return Response.json(
      {
        eventId: event.id,
        status: 'queued',
        message: 'Webhook received and queued for processing',
      },
      { status: 202 }
    );
  } catch (err: any) {
    log.error({ err }, 'Webhook ingress error');
    return Response.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
