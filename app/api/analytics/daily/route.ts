import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: any = {};
    if (connectionId) where.connectionId = connectionId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const analytics = await prisma.analyticsDaily.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return Response.json({ analytics });
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ err }, 'Get analytics error');
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
