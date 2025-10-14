import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { encryptSecret, generateSecret } from '@/lib/crypto';
import bcrypt from 'bcryptjs';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// GET /api/connections - List all connections
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (status) where.status = status;
    if (search)
      where.name = { contains: search, mode: 'insensitive' as const };

    const [connections, total] = await Promise.all([
      prisma.connection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          sourceType: true,
          targetType: true,
          lastSuccessAt: true,
          lastErrorAt: true,
          lastErrorMessage: true,
          consecutiveErrors: true,
          createdAt: true,
          updatedAt: true,
          rateLimitPerMin: true,
          maxRetries: true,
          // Don't include encrypted credentials
        },
      }),
      prisma.connection.count({ where }),
    ]);

    return Response.json({
      connections,
      total,
      limit,
      offset,
    });
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ err }, 'List connections error');
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/connections - Create new connection
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();

    // Encrypt credentials
    const ssApiKey = await encryptSecret(body.ssApiKey);
    const wfToken = await encryptSecret(body.wfToken);

    // Generate webhook secret and hash it
    const webhookSecret = generateSecret(32);
    const webhookSecretHash = await bcrypt.hash(webhookSecret, 10);

    // Create connection first to get ID
    const connection = await prisma.connection.create({
      data: {
        name: body.name,
        description: body.description || null,
        sourceType: body.sourceType || 'smartsuite',
        ssBaseId: body.ssBaseId,
        ssTableId: body.ssTableId,
        ssApiKeyEnc: ssApiKey.ciphertext,
        ssApiKeyIv: ssApiKey.iv,
        targetType: body.targetType || 'webflow',
        wfSiteId: body.wfSiteId,
        wfCollectionId: body.wfCollectionId,
        wfTokenEnc: wfToken.ciphertext,
        wfTokenIv: wfToken.iv,
        webhookSecretHash,
        webhookUrl: '', // Will update below
        rateLimitPerMin: body.rateLimitPerMin || 50,
        maxRetries: body.maxRetries || 5,
        retryBackoffMs: body.retryBackoffMs || 1000,
        status: 'paused', // Start paused until mapping configured
      },
    });

    // Update with webhook URL now that we have the ID
    await prisma.connection.update({
      where: { id: connection.id },
      data: {
        webhookUrl: `${env.APP_URL}/api/hooks/${connection.id}`,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        connectionId: connection.id,
        action: 'connection.created',
        actor: 'admin',
        metadata: { connectionName: body.name },
      },
    });

    logger.info({ connectionId: connection.id }, 'Connection created');

    return Response.json(
      {
        id: connection.id,
        webhookUrl: `${env.APP_URL}/api/hooks/${connection.id}`,
        webhookSecret, // Return plaintext secret ONCE
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ err }, 'Create connection error');
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
