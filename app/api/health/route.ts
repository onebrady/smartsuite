import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    // Query queue depth
    const queueDepth = await prisma.event.count({
      where: { status: { in: ['queued', 'failed'] } },
    });

    // Query oldest event
    const oldestEvent = await prisma.event.findFirst({
      where: { status: 'queued' },
      orderBy: { queuedAt: 'asc' },
    });

    const oldestAge = oldestEvent
      ? Math.floor((Date.now() - oldestEvent.queuedAt.getTime()) / 1000)
      : 0;

    // Query worker last run
    const recentWorkerRun = await prisma.auditLog.findFirst({
      where: { action: 'worker.completed' },
      orderBy: { createdAt: 'desc' },
    });

    // Query connection health
    const connections = await prisma.connection.groupBy({
      by: ['status'],
      _count: true,
    });

    // Query event status breakdown
    const eventsByStatus = await prisma.event.groupBy({
      by: ['status'],
      _count: true,
    });

    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        queueDepth,
        oldestEventAge: oldestAge,
        workerLastRun: recentWorkerRun?.createdAt?.toISOString(),
        connections: Object.fromEntries(
          connections.map((c) => [c.status, c._count])
        ),
        events: Object.fromEntries(
          eventsByStatus.map((e) => [e.status, e._count])
        ),
      },
    };

    logger.debug({ health: response }, 'Health check');

    return Response.json(response);
  } catch (err: any) {
    logger.error({ err }, 'Health check failed');

    return Response.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: err.message,
      },
      { status: 503 }
    );
  }
}
