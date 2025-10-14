import { NextRequest } from 'next/server';
import { smartsuiteClient } from '@/lib/smartsuite';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');
    const baseId = searchParams.get('baseId');

    if (!apiKey) {
      return Response.json({ error: 'API key required' }, { status: 400 });
    }

    if (!baseId) {
      return Response.json({ error: 'Base ID required' }, { status: 400 });
    }

    const tables = await smartsuiteClient.getTables(apiKey, baseId);

    return Response.json({ tables });
  } catch (err: any) {
    logger.error({ err }, 'SmartSuite tables discovery error');
    return Response.json(
      { error: 'Failed to fetch tables', message: err.message },
      { status: err.status || 500 }
    );
  }
}
