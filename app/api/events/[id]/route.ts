import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: { connection: true },
    });

    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    return Response.json(event);
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ err }, 'Get event error');
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
