import { prisma } from './db';
import { logger } from './logger';
import { decryptSecret } from './crypto';
import { normalizeSmartSuitePayload, buildWebflowBody } from './mapper';
import { validateRequiredFields } from './validator';
import { webflowClient } from './webflow';
import { executeWithQueueAndRetry, isRetriableError } from './queue-manager';
import { env } from './env';
import type { Event } from '@prisma/client';

export interface ProcessResult {
  success: boolean;
  duration?: number;
  willRetry?: boolean;
  error?: string;
}

export class EventProcessor {
  /**
   * Process a single event
   */
  async processEvent(eventId: string): Promise<ProcessResult> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        connection: {
          include: { mappings: true },
        },
      },
    });

    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const log = logger.child({
      eventId: event.id,
      connectionId: event.connectionId,
      externalId: event.externalId,
    });

    try {
      // Update to processing
      await prisma.event.update({
        where: { id: eventId },
        data: {
          status: 'processing',
          attempts: { increment: 1 },
        },
      });

      log.info({ attempt: event.attempts + 1 }, 'Processing event');

      const { connection } = event;
      const mapping = connection.mappings[0];

      if (!mapping) {
        throw new Error('No mapping configured for connection');
      }

      // Decrypt credentials
      const wfToken = await decryptSecret({
        ciphertext: connection.wfTokenEnc,
        iv: connection.wfTokenIv,
      });

      // Normalize SmartSuite payload
      const normalizedData = normalizeSmartSuitePayload(event.payload);

      // Build Webflow body
      const { fieldData, warnings } = await buildWebflowBody(
        mapping,
        normalizedData,
        connection,
        event.externalId
      );

      log.debug({ fieldData, warnings }, 'Built Webflow field data');

      // Validate required fields
      if (mapping.requiredFields && Array.isArray(mapping.requiredFields)) {
        validateRequiredFields(fieldData, mapping.requiredFields);
      }

      // Upsert to Webflow with rate limiting and retry
      const result = await executeWithQueueAndRetry(
        () =>
          webflowClient.upsertWebflowItem(
            connection,
            event.externalId,
            fieldData,
            wfToken
          ),
        {
          connectionId: connection.id,
          rateLimitPerMin: connection.rateLimitPerMin,
          maxRetries: connection.maxRetries,
          retryBackoffMs: connection.retryBackoffMs,
          context: `event:${event.id}`,
        }
      );

      // Merge warnings
      const allWarnings = [...warnings, ...result.warnings];

      // Update event as success
      const duration = Date.now() - event.queuedAt.getTime();

      await prisma.event.update({
        where: { id: eventId },
        data: {
          status: 'success',
          processedAt: new Date(),
          durationMs: duration,
          wfItemId: result.wfItemId,
          wfResponse: result.response as any,
          warnings: allWarnings.length > 0 ? allWarnings : undefined,
          partialSuccess: allWarnings.length > 0,
        },
      });

      // Update connection health
      await prisma.connection.update({
        where: { id: connection.id },
        data: {
          lastSuccessAt: new Date(),
          consecutiveErrors: 0,
        },
      });

      log.info(
        {
          wfItemId: result.wfItemId,
          duration,
          warnings: allWarnings.length,
        },
        'Event processed successfully'
      );

      return { success: true, duration };
    } catch (err: any) {
      log.error({ err }, 'Event processing failed');
      return await this.handleError(event, err);
    }
  }

  /**
   * Handle processing error
   */
  private async handleError(event: Event, err: any): Promise<ProcessResult> {
    const log = logger.child({ eventId: event.id });

    const retriable = isRetriableError(err);
    const connection = await prisma.connection.findUnique({
      where: { id: event.connectionId },
    });
    const maxAttemptsReached =
      event.attempts + 1 >= (connection?.maxRetries || env.MAX_RETRY_ATTEMPTS);

    if (retriable && !maxAttemptsReached) {
      // Calculate exponential backoff with jitter
      const baseBackoff = connection?.retryBackoffMs || env.RETRY_BACKOFF_MS;
      const backoffMs = Math.min(
        baseBackoff * Math.pow(2, event.attempts),
        env.MAX_RETRY_BACKOFF_MS
      );
      const jitter = Math.random() * 0.3 * backoffMs;
      const retryAfter = new Date(Date.now() + backoffMs + jitter);

      await prisma.event.update({
        where: { id: event.id },
        data: {
          status: 'failed',
          error: err.message,
          errorStack: err.stack,
          retryAfter: retryAfter,
        },
      });

      log.warn(
        {
          attempt: event.attempts + 1,
          retryAfter,
          error: err.message,
        },
        'Event failed, will retry'
      );

      return { success: false, willRetry: true, error: err.message };
    } else {
      // Move to dead letter
      await prisma.event.update({
        where: { id: event.id },
        data: {
          status: 'dead_letter',
          error: err.message,
          errorStack: err.stack,
        },
      });

      // Increment connection errors
      await prisma.connection.update({
        where: { id: event.connectionId },
        data: {
          consecutiveErrors: { increment: 1 },
          lastErrorAt: new Date(),
          lastErrorMessage: err.message,
        },
      });

      log.error(
        {
          reason: retriable ? 'max_attempts' : 'non_retriable',
          error: err.message,
        },
        'Event moved to dead letter'
      );

      return { success: false, willRetry: false, error: err.message };
    }
  }
}
