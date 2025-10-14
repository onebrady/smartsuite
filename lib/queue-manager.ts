import PQueue from 'p-queue';
import pRetry from 'p-retry';
import { logger } from './logger';
import { env } from './env';

// Map of connection-specific queues
const queues = new Map<string, PQueue>();

/**
 * Get or create a queue for a specific connection
 */
export function getConnectionQueue(
  connectionId: string,
  rateLimitPerMin: number
): PQueue {
  if (!queues.has(connectionId)) {
    const queue = new PQueue({
      interval: 60_000, // 1 minute
      intervalCap: rateLimitPerMin, // Max requests per minute
      carryoverConcurrencyCount: true,
      timeout: 30_000, // 30 second timeout per task
    });

    queue.on('active', () => {
      logger.debug(
        {
          connectionId,
          size: queue.size,
          pending: queue.pending,
        },
        'Queue active'
      );
    });

    queue.on('idle', () => {
      logger.debug({ connectionId }, 'Queue idle');
    });

    queue.on('error', (error) => {
      logger.error({ connectionId, error }, 'Queue error');
    });

    queues.set(connectionId, queue);
  }

  return queues.get(connectionId)!;
}

/**
 * Clear a queue (useful for testing or cleanup)
 */
export function clearQueue(connectionId: string): void {
  const queue = queues.get(connectionId);
  if (queue) {
    queue.clear();
    queues.delete(connectionId);
  }
}

/**
 * Check if an error is retriable
 */
export function isRetriableError(error: any): boolean {
  const status = error.status || error.statusCode;

  // Rate limit
  if (status === 429) return true;

  // Server errors
  if (status >= 500) return true;

  // Request timeout
  if (status === 408) return true;

  // Network errors
  if (error.code === 'ETIMEDOUT') return true;
  if (error.code === 'ECONNREFUSED') return true;
  if (error.code === 'ECONNRESET') return true;
  if (error.code === 'ENOTFOUND') return true;

  // Not retriable: 400, 401, 403, 404, 422
  return false;
}

/**
 * Wrap a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    connectionId: string;
    maxRetries: number;
    retryBackoffMs: number;
    context?: string;
  }
): Promise<T> {
  const log = logger.child({
    connectionId: options.connectionId,
    context: options.context,
  });

  return pRetry(
    async () => {
      return await fn();
    },
    {
      retries: options.maxRetries,
      minTimeout: options.retryBackoffMs,
      maxTimeout: env.MAX_RETRY_BACKOFF_MS,
      factor: 2,
      randomize: true,
      onFailedAttempt: (error) => {
        // Only retry if error is retriable
        if (!isRetriableError(error)) {
          log.warn({ error }, 'Non-retriable error, aborting');
          throw error;
        }

        log.warn(
          {
            attempt: error.attemptNumber,
            retriesLeft: error.retriesLeft,
            error: error.message,
          },
          'Retry attempt failed'
        );
      },
    }
  );
}

/**
 * Execute a function with rate limiting and retry logic
 */
export async function executeWithQueueAndRetry<T>(
  fn: () => Promise<T>,
  options: {
    connectionId: string;
    rateLimitPerMin: number;
    maxRetries: number;
    retryBackoffMs: number;
    context?: string;
  }
): Promise<T> {
  const queue = getConnectionQueue(
    options.connectionId,
    options.rateLimitPerMin
  );

  const result = await queue.add(() =>
    withRetry(fn, {
      connectionId: options.connectionId,
      maxRetries: options.maxRetries,
      retryBackoffMs: options.retryBackoffMs,
      context: options.context,
    })
  );

  return result as T;
}
