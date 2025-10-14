import { NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { acquireLock, releaseLock } from '@/lib/distributed-lock';
import { EventProcessor } from '@/lib/event-processor';
import pLimit from 'p-limit';

export const maxDuration = 300; // 5 minutes for Vercel
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    logger.warn('Unauthorized worker request');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let processId: string | null = null;

  try {
    // Acquire distributed lock
    processId = await acquireLock('worker:ingest', env.LOCK_TIMEOUT_MS);

    if (!processId) {
      logger.warn('Worker already running');
      return Response.json(
        {
          message: 'Worker already running',
        },
        { status: 423 } // 423 Locked
      );
    }

    logger.info({ processId }, 'Worker started');

    // Query events ready for processing
    const events = await prisma.event.findMany({
      where: {
        OR: [
          { status: 'queued' },
          {
            status: 'failed',
            retryAfter: { lte: new Date() },
          },
        ],
        connection: { status: 'active' },
      },
      orderBy: { queuedAt: 'asc' },
      take: env.WORKER_BATCH_SIZE,
      include: { connection: true },
    });

    logger.info({ count: events.length }, 'Events to process');

    if (events.length === 0) {
      const duration = Date.now() - startTime;
      logger.info({ duration }, 'No events to process');

      return Response.json({
        processed: 0,
        succeeded: 0,
        failed: 0,
        durationMs: duration,
        queueDepth: 0,
      });
    }

    // Process events in parallel (max 10 concurrent)
    const limit = pLimit(10);
    const processor = new EventProcessor();

    const results = await Promise.allSettled(
      events.map((event) => limit(() => processor.processEvent(event.id)))
    );

    // Count results
    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;

    const failed = results.filter(
      (r) =>
        r.status === 'rejected' ||
        (r.status === 'fulfilled' && !r.value.success)
    ).length;

    // Query queue depth
    const queueDepth = await prisma.event.count({
      where: {
        status: { in: ['queued', 'failed'] },
        connection: { status: 'active' },
      },
    });

    // Query oldest event
    const oldestEvent = await prisma.event.findFirst({
      where: { status: 'queued' },
      orderBy: { queuedAt: 'asc' },
    });

    const oldestAge = oldestEvent
      ? Math.floor((Date.now() - oldestEvent.queuedAt.getTime()) / 1000)
      : 0;

    const duration = Date.now() - startTime;

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: 'worker.completed',
        actor: 'system',
        metadata: {
          processed: events.length,
          succeeded,
          failed,
          duration,
          queueDepth,
          oldestAge,
        },
      },
    });

    logger.info(
      {
        processed: events.length,
        succeeded,
        failed,
        queueDepth,
        oldestAge,
        duration,
      },
      'Worker completed'
    );

    return Response.json({
      processed: events.length,
      succeeded,
      failed,
      durationMs: duration,
      queueDepth,
      oldestEventAge: oldestAge,
    });
  } catch (err: any) {
    logger.error({ err }, 'Worker error');
    return Response.json(
      {
        error: 'Internal server error',
        message: err.message,
      },
      { status: 500 }
    );
  } finally {
    // Release lock
    if (processId) {
      await releaseLock('worker:ingest', processId);
    }
  }
}
