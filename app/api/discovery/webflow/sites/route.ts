import { NextRequest } from 'next/server';
import { webflowClient } from '@/lib/webflow';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 400 });
    }

    const sites = await webflowClient.getSites(token);

    return Response.json({ sites });
  } catch (err: any) {
    logger.error({ err }, 'Webflow sites discovery error');
    return Response.json(
      { error: 'Failed to fetch sites', message: err.message },
      { status: err.status || 500 }
    );
  }
}
