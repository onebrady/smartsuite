import crypto from 'crypto';
import { generateSecret } from './crypto';

/**
 * Verify webhook signature using HMAC-SHA256
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Remove 'sha256=' prefix if present
    const sig = signature.startsWith('sha256=')
      ? signature.substring(7)
      : signature;

    // Compute HMAC
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    // Timing-safe comparison
    const sigBuffer = Buffer.from(sig, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    // Ensure buffers are the same length
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (error) {
    return false;
  }
}

/**
 * Verify timestamp is within acceptable window
 */
export function verifyTimestamp(
  timestamp: string | number,
  maxAgeSeconds: number = 300
): boolean {
  try {
    // Parse timestamp (can be in seconds or milliseconds)
    let ts: number;
    if (typeof timestamp === 'string') {
      ts = parseInt(timestamp, 10);
    } else {
      ts = timestamp;
    }

    // Convert to milliseconds if needed (assume seconds if < year 2100 in ms)
    if (ts < 4102444800000) {
      ts = ts * 1000;
    }

    const now = Date.now();
    const age = now - ts;

    // Reject if too old
    if (age > maxAgeSeconds * 1000) {
      return false;
    }

    // Reject if timestamp is in the future (allow 30 seconds clock skew)
    if (age < -30000) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a new webhook secret
 */
export function generateWebhookSecret(): string {
  return generateSecret(32);
}
