import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const status = searchParams.get('status');
    const externalId = searchParams.get('externalId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (connectionId) where.connectionId = connectionId;
    if (status) where.status = status;
    if (externalId)
      where.externalId = { contains: externalId, mode: 'insensitive' as const };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { queuedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          connection: {
            select: { name: true },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    return Response.json({ events, total, limit, offset });
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ err }, 'List events error');
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
