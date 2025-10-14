import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { createSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return Response.json({ error: 'Password required' }, { status: 400 });
    }

    // Create session (verifies password internally)
    const success = await createSession(password);

    if (!success) {
      logger.warn('Failed login attempt');
      return Response.json({ error: 'Invalid password' }, { status: 401 });
    }

    logger.info('Admin logged in');

    return Response.json({
      success: true,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  } catch (err: any) {
    logger.error({ err }, 'Login error');
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
