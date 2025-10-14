import { NextRequest } from 'next/server';
import { webflowClient } from '@/lib/webflow';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const siteId = searchParams.get('siteId');

    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 400 });
    }

    if (!siteId) {
      return Response.json({ error: 'Site ID required' }, { status: 400 });
    }

    const collections = await webflowClient.getCollections(token, siteId);

    return Response.json({ collections });
  } catch (err: any) {
    logger.error({ err }, 'Webflow collections discovery error');
    return Response.json(
      { error: 'Failed to fetch collections', message: err.message },
      { status: err.status || 500 }
    );
  }
}
