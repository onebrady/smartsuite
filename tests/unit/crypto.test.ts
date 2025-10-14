import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret } from '@/lib/crypto';

describe('Crypto', () => {
  it('should encrypt and decrypt successfully', async () => {
    const plaintext = 'my-secret-api-key';
    const encrypted = await encryptSecret(plaintext);

    expect(encrypted.ciphertext).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();

    const decrypted = await decryptSecret(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should generate unique IVs', async () => {
    const plaintext = 'test';
    const enc1 = await encryptSecret(plaintext);
    const enc2 = await encryptSecret(plaintext);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
  });

  it('should handle various input sizes', async () => {
    const tests = ['a', 'short', 'a'.repeat(1000), 'special!@#$%'];

    for (const test of tests) {
      const encrypted = await encryptSecret(test);
      const decrypted = await decryptSecret(encrypted);
      expect(decrypted).toBe(test);
    }
  });

  it('should handle empty string', async () => {
    const encrypted = await encryptSecret('');
    const decrypted = await decryptSecret(encrypted);
    expect(decrypted).toBe('');
  });

  it('should handle Unicode characters', async () => {
    const unicode = '你好世界 🌍 مرحبا العالم';
    const encrypted = await encryptSecret(unicode);
    const decrypted = await decryptSecret(encrypted);
    expect(decrypted).toBe(unicode);
  });
});
