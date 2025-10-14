import { NextRequest } from 'next/server';
import { smartsuiteClient } from '@/lib/smartsuite';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return Response.json({ error: 'API key required' }, { status: 400 });
    }

    const bases = await smartsuiteClient.getBases(apiKey);

    return Response.json({ bases });
  } catch (err: any) {
    logger.error({ err }, 'SmartSuite bases discovery error');
    return Response.json(
      { error: 'Failed to fetch bases', message: err.message },
      { status: err.status || 500 }
    );
  }
}
