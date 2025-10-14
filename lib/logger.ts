import pino from 'pino';
import { env } from './env';

// Create logger with appropriate configuration based on environment
export const logger = pino({
  level: env.LOG_LEVEL,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  redact: {
    paths: [
      'password',
      'token',
      'apiKey',
      'secret',
      'authorization',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.secret',
      '*.authorization',
      'ssApiKey',
      'wfToken',
      'webhookSecret',
    ],
    remove: true,
  },
  ...(env.PRETTY_LOGS && env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});

// Helper to create a child logger with context
export function createChildLogger(context: Record<string, any>) {
  return logger.child(context);
}
