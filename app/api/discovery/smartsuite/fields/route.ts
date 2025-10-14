import { NextRequest } from 'next/server';
import { smartsuiteClient } from '@/lib/smartsuite';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');
    const baseId = searchParams.get('baseId');
    const tableId = searchParams.get('tableId');

    if (!apiKey) {
      return Response.json({ error: 'API key required' }, { status: 400 });
    }

    if (!baseId) {
      return Response.json({ error: 'Base ID required' }, { status: 400 });
    }

    if (!tableId) {
      return Response.json({ error: 'Table ID required' }, { status: 400 });
    }

    const schema = await smartsuiteClient.getSchema(apiKey, baseId, tableId);

    return Response.json({ fields: schema.structure });
  } catch (err: any) {
    logger.error({ err }, 'SmartSuite fields discovery error');
    return Response.json(
      { error: 'Failed to fetch fields', message: err.message },
      { status: err.status || 500 }
    );
  }
}
