import { Card } from '@/components/ui/card';
import { prisma } from '@/lib/db';

export default async function DashboardPage() {
  // Fetch basic stats
  const [
    totalConnections,
    activeConnections,
    queuedEvents,
    recentErrors,
    todayEvents,
  ] = await Promise.all([
    prisma.connection.count(),
    prisma.connection.count({ where: { status: 'active' } }),
    prisma.event.count({ where: { status: 'queued' } }),
    prisma.event.count({
      where: {
        status: 'dead_letter',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.event.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Overview</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">
            Total Connections
          </div>
          <div className="mt-2 text-3xl font-bold">{totalConnections}</div>
          <div className="mt-1 text-sm text-gray-500">
            {activeConnections} active
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">
            Queued Events
          </div>
          <div className="mt-2 text-3xl font-bold">{queuedEvents}</div>
          <div className="mt-1 text-sm text-gray-500">Waiting to process</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">
            Events Today
          </div>
          <div className="mt-2 text-3xl font-bold">{todayEvents}</div>
          <div className="mt-1 text-sm text-gray-500">Last 24 hours</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">
            Recent Errors
          </div>
          <div className="mt-2 text-3xl font-bold text-red-600">
            {recentErrors}
          </div>
          <div className="mt-1 text-sm text-gray-500">Last 24 hours</div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Quick Start</h2>
        <div className="space-y-4">
          <p className="text-gray-600">
            Welcome to the SmartSuite ↔ Webflow Sync Admin Dashboard.
          </p>
          <ul className="list-inside list-disc space-y-2 text-gray-600">
            <li>Create a new connection to start syncing data</li>
            <li>Monitor events in the Events tab</li>
            <li>Check connection health and status</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
