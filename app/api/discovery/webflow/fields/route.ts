import { NextRequest } from 'next/server';
import { webflowClient } from '@/lib/webflow';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const collectionId = searchParams.get('collectionId');

    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 400 });
    }

    if (!collectionId) {
      return Response.json(
        { error: 'Collection ID required' },
        { status: 400 }
      );
    }

    const schema = await webflowClient.getCollectionSchema(token, collectionId);

    return Response.json({ fields: schema.fields });
  } catch (err: any) {
    logger.error({ err }, 'Webflow fields discovery error');
    return Response.json(
      { error: 'Failed to fetch fields', message: err.message },
      { status: err.status || 500 }
    );
  }
}
