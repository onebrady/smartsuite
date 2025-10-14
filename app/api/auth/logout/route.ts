import { destroySession } from '@/lib/session';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    await destroySession();
    logger.info('Admin logged out');
    return Response.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'Logout error');
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
