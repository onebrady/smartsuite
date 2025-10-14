import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { logger } from '@/lib/logger';

// GET /api/mappings/[connectionId] - Get active mapping for connection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    await requireAuth();

    const { connectionId } = await params;

    const mapping = await prisma.mapping.findFirst({
      where: { connectionId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!mapping) {
      return Response.json({ error: 'Mapping not found' }, { status: 404 });
    }

    return Response.json(mapping);
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ err }, 'Get mapping error');
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/mappings/[connectionId] - Create/update mapping
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    await requireAuth();

    const { connectionId } = await params;
    const body = await request.json();

    // Deactivate old mappings
    await prisma.mapping.updateMany({
      where: { connectionId },
      data: { isActive: false },
    });

    // Create new mapping
    const mapping = await prisma.mapping.create({
      data: {
        connectionId,
        fieldMap: body.fieldMap,
        slugTemplate: body.slugTemplate || null,
        statusBehavior: body.statusBehavior || null,
        imageFieldMap: body.imageFieldMap || null,
        referenceMap: body.referenceMap || null,
        requiredFields: body.requiredFields || [],
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        connectionId,
        action: 'mapping.created',
        actor: 'admin',
      },
    });

    logger.info(
      { connectionId, mappingId: mapping.id },
      'Mapping created'
    );

    return Response.json(mapping, { status: 201 });
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error({ err }, 'Create mapping error');
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
