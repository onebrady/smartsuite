import { nanoid } from 'nanoid';
import { prisma } from './db';
import { logger } from './logger';

/**
 * Acquire a distributed lock
 * Returns processId if successful, null if lock is held by another process
 */
export async function acquireLock(
  lockId: string,
  expiresInMs: number = 300_000 // 5 minutes default
): Promise<string | null> {
  const processId = nanoid();
  const expiresAt = new Date(Date.now() + expiresInMs);

  const log = logger.child({ lockId, processId });

  try {
    // Try to create lock
    await prisma.distributedLock.create({
      data: {
        id: lockId,
        acquiredBy: processId,
        expiresAt: expiresAt,
      },
    });

    log.debug({ expiresAt }, 'Lock acquired');
    return processId;
  } catch (err: any) {
    // Lock already exists - check if it's expired
    try {
      const existing = await prisma.distributedLock.findUnique({
        where: { id: lockId },
      });

      if (!existing) {
        // Lock was deleted between attempts - try again
        log.debug('Lock disappeared, retrying');
        return acquireLock(lockId, expiresInMs);
      }

      if (existing.expiresAt < new Date()) {
        // Lock is expired - take it over
        await prisma.distributedLock.update({
          where: { id: lockId },
          data: {
            acquiredBy: processId,
            acquiredAt: new Date(),
            expiresAt: expiresAt,
          },
        });

        log.info(
          { previousOwner: existing.acquiredBy },
          'Took over expired lock'
        );
        return processId;
      }

      // Lock is held by another process and not expired
      log.debug(
        {
          acquiredBy: existing.acquiredBy,
          expiresAt: existing.expiresAt,
        },
        'Lock held by another process'
      );
      return null;
    } catch (innerErr) {
      log.error({ err: innerErr }, 'Error checking existing lock');
      return null;
    }
  }
}

/**
 * Release a distributed lock
 */
export async function releaseLock(
  lockId: string,
  processId: string
): Promise<void> {
  const log = logger.child({ lockId, processId });

  try {
    const result = await prisma.distributedLock.deleteMany({
      where: {
        id: lockId,
        acquiredBy: processId,
      },
    });

    if (result.count > 0) {
      log.debug('Lock released');
    } else {
      log.warn('Lock was not held by this process');
    }
  } catch (err) {
    log.error({ err }, 'Error releasing lock');
  }
}

/**
 * Extend a lock's expiration time
 */
export async function extendLock(
  lockId: string,
  processId: string,
  additionalMs: number
): Promise<boolean> {
  const log = logger.child({ lockId, processId });

  try {
    const lock = await prisma.distributedLock.findUnique({
      where: { id: lockId },
    });

    if (!lock || lock.acquiredBy !== processId) {
      log.warn('Cannot extend lock - not owned by this process');
      return false;
    }

    const newExpiresAt = new Date(Date.now() + additionalMs);

    await prisma.distributedLock.update({
      where: { id: lockId },
      data: { expiresAt: newExpiresAt },
    });

    log.debug({ newExpiresAt }, 'Lock extended');
    return true;
  } catch (err) {
    log.error({ err }, 'Error extending lock');
    return false;
  }
}

/**
 * Clean up expired locks
 */
export async function cleanupExpiredLocks(): Promise<number> {
  try {
    const result = await prisma.distributedLock.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      logger.info({ count: result.count }, 'Cleaned up expired locks');
    }

    return result.count;
  } catch (err) {
    logger.error({ err }, 'Error cleaning up expired locks');
    return 0;
  }
}
