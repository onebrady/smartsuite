import crypto from 'crypto';
import { env } from './env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes for GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes authentication tag

export interface EncryptedData {
  ciphertext: string; // base64
  iv: string; // base64
  authTag?: string; // base64 (for GCM)
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 */
export async function encryptSecret(plaintext: string): Promise<EncryptedData> {
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Convert hex key to buffer
  const key = Buffer.from(env.DATA_ENCRYPTION_KEY, 'hex');

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 */
export async function decryptSecret(
  encrypted: EncryptedData
): Promise<string> {
  // Convert base64 to buffers
  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = encrypted.authTag
    ? Buffer.from(encrypted.authTag, 'base64')
    : undefined;
  const key = Buffer.from(env.DATA_ENCRYPTION_KEY, 'hex');

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  // Set authentication tag if provided
  if (authTag) {
    decipher.setAuthTag(authTag);
  }

  // Decrypt
  let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Generate a random secret of specified length
 */
export function generateSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Generate a random hex string
 */
export function generateHexSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
