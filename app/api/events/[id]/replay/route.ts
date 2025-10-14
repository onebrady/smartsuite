import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;

    const event = await prisma.event.update({
      where: { id },
      data: {
        status: 'queued',
        attempts: 0,
        retryAfter: null,
        error: null,
        errorStack: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        connectionId: event.connectionId,
        action: 'event.replayed',
        actor: 'admin',
        metadata: { eventId: id },
      },
    });

    logger.info({ eventId: id }, 'Event replayed');

    return Response.json(event);
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ err }, 'Replay event error');
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
