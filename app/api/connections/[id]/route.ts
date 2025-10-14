import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { encryptSecret } from '@/lib/crypto';
import { logger } from '@/lib/logger';

// GET /api/connections/[id] - Get single connection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;

    const connection = await prisma.connection.findUnique({
      where: { id },
      include: { mappings: true },
      // Note: Prisma will include encrypted credentials
      // In production, you might want to exclude them or only include when needed
    });

    if (!connection) {
      return Response.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    return Response.json(connection);
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ err }, 'Get connection error');
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/connections/[id] - Update connection
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;
    const body = await request.json();
    const updates: any = {};

    // Handle regular fields
    if (body.name) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status) updates.status = body.status;
    if (body.rateLimitPerMin) updates.rateLimitPerMin = body.rateLimitPerMin;
    if (body.maxRetries) updates.maxRetries = body.maxRetries;
    if (body.retryBackoffMs) updates.retryBackoffMs = body.retryBackoffMs;
    if (body.wfPublishOnSync !== undefined)
      updates.wfPublishOnSync = body.wfPublishOnSync;
    if (body.wfDefaultLocale) updates.wfDefaultLocale = body.wfDefaultLocale;
    if (body.wfDefaultTimezone)
      updates.wfDefaultTimezone = body.wfDefaultTimezone;

    // Handle credential updates (re-encrypt)
    if (body.ssApiKey) {
      const encrypted = await encryptSecret(body.ssApiKey);
      updates.ssApiKeyEnc = encrypted.ciphertext;
      updates.ssApiKeyIv = encrypted.iv;
    }

    if (body.wfToken) {
      const encrypted = await encryptSecret(body.wfToken);
      updates.wfTokenEnc = encrypted.ciphertext;
      updates.wfTokenIv = encrypted.iv;
    }

    const connection = await prisma.connection.update({
      where: { id },
      data: updates,
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        connectionId: id,
        action: 'connection.updated',
        actor: 'admin',
        metadata: { updates: Object.keys(updates) },
      },
    });

    logger.info({ connectionId: id }, 'Connection updated');

    return Response.json(connection);
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ err }, 'Update connection error');
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/connections/[id] - Soft delete connection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;

    await prisma.connection.update({
      where: { id },
      data: { status: 'archived' },
    });

    await prisma.auditLog.create({
      data: {
        connectionId: id,
        action: 'connection.deleted',
        actor: 'admin',
      },
    });

    logger.info({ connectionId: id }, 'Connection archived');

    return new Response(null, { status: 204 });
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ err }, 'Delete connection error');
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
