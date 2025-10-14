import { describe, it, expect } from 'vitest';
import {
  verifyWebhookSignature,
  verifyTimestamp,
} from '@/lib/webhook-security';
import crypto from 'crypto';

describe('Webhook Security', () => {
  describe('verifyWebhookSignature', () => {
    it('should verify valid signature', () => {
      const secret = 'test-secret';
      const body = JSON.stringify({ test: 'data' });
      const signature =
        'sha256=' +
        crypto.createHmac('sha256', secret).update(body).digest('hex');

      expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const body = JSON.stringify({ test: 'data' });
      const signature = 'sha256=invalid';
      const secret = 'test-secret';

      expect(verifyWebhookSignature(body, signature, secret)).toBe(false);
    });

    it('should reject signature without sha256 prefix', () => {
      const secret = 'test-secret';
      const body = JSON.stringify({ test: 'data' });
      const signature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      expect(verifyWebhookSignature(body, signature, secret)).toBe(false);
    });

    it('should reject empty signature', () => {
      const body = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';

      expect(verifyWebhookSignature(body, '', secret)).toBe(false);
    });

    it('should verify signature with complex payload', () => {
      const secret = 'test-secret';
      const body = JSON.stringify({
        id: '123',
        data: {
          nested: { value: 'test' },
          array: [1, 2, 3],
        },
        special: '!@#$%^&*()',
      });
      const signature =
        'sha256=' +
        crypto.createHmac('sha256', secret).update(body).digest('hex');

      expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
    });
  });

  describe('verifyTimestamp', () => {
    it('should verify recent timestamp', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(verifyTimestamp(now.toString())).toBe(true);
    });

    it('should reject old timestamp', () => {
      const old = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      expect(verifyTimestamp(old.toString())).toBe(false);
    });

    it('should reject future timestamp', () => {
      const future = Math.floor(Date.now() / 1000) + 600;
      expect(verifyTimestamp(future.toString())).toBe(false);
    });

    it('should accept timestamp within 5 minute window', () => {
      const fiveMinAgo = Math.floor(Date.now() / 1000) - 299; // 4:59 ago
      expect(verifyTimestamp(fiveMinAgo.toString())).toBe(true);
    });

    it('should reject invalid timestamp format', () => {
      expect(verifyTimestamp('invalid')).toBe(false);
      expect(verifyTimestamp('')).toBe(false);
    });
  });
});
