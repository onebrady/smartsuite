import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { decryptSecret } from '@/lib/crypto';
import { webflowClient } from '@/lib/webflow';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const externalId = searchParams.get('externalId');

    if (!connectionId || !externalId) {
      return Response.json(
        { error: 'connectionId and externalId required' },
        { status: 400 }
      );
    }

    const idMap = await prisma.idMap.findUnique({
      where: {
        connectionId_externalSource_externalId: {
          connectionId,
          externalSource: 'smartsuite',
          externalId,
        },
      },
      include: { connection: true },
    });

    if (!idMap) {
      return Response.json({ error: 'Item not found' }, { status: 404 });
    }

    // Fetch current Webflow data
    const wfToken = await decryptSecret({
      ciphertext: idMap.connection.wfTokenEnc,
      iv: idMap.connection.wfTokenIv,
    });

    // Note: We need to add getItem method to webflowClient
    // For now, return without webflow data
    return Response.json({
      ...idMap,
      connection: {
        id: idMap.connection.id,
        name: idMap.connection.name,
        wfCollectionId: idMap.connection.wfCollectionId,
      },
    });
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ err }, 'Lookup item error');
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
