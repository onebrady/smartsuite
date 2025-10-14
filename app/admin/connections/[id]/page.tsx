import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function ConnectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const connection = await prisma.connection.findUnique({
    where: { id },
    include: { mappings: { where: { isActive: true } } },
  });

  if (!connection) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{connection.name}</h1>
          <Badge className="mt-2">{connection.status}</Badge>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Configuration</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm text-gray-600">Source</div>
            <div className="font-medium">
              {connection.sourceType} - {connection.ssTableId}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Target</div>
            <div className="font-medium">
              {connection.targetType} - {connection.wfCollectionId}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Rate Limit</div>
            <div className="font-medium">
              {connection.rateLimitPerMin} per minute
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Max Retries</div>
            <div className="font-medium">{connection.maxRetries}</div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Webhook</h2>
        <div className="space-y-2">
          <div>
            <div className="text-sm text-gray-600">URL</div>
            <div className="font-mono text-sm">{connection.webhookUrl}</div>
          </div>
        </div>
      </Card>

      {connection.mappings.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Field Mapping</h2>
          <p className="text-sm text-gray-600">
            {Object.keys(
              connection.mappings[0].fieldMap as Record<string, any>
            ).length}{' '}
            fields mapped
          </p>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Health Status</h2>
        <div className="space-y-2 text-sm">
          {connection.lastSuccessAt && (
            <div className="flex justify-between">
              <span className="text-gray-600">Last Success:</span>
              <span>{new Date(connection.lastSuccessAt).toLocaleString()}</span>
            </div>
          )}
          {connection.lastErrorAt && (
            <div className="flex justify-between">
              <span className="text-gray-600">Last Error:</span>
              <span>{new Date(connection.lastErrorAt).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Consecutive Errors:</span>
            <span
              className={
                connection.consecutiveErrors > 0 ? 'text-red-600' : ''
              }
            >
              {connection.consecutiveErrors}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
