import { describe, it, expect } from 'vitest';
import {
  validateFieldType,
  validateRequiredFields,
  validateSlug,
} from '@/lib/validator';

describe('Validator', () => {
  describe('validateFieldType', () => {
    describe('Number type', () => {
      it('should validate numbers', () => {
        expect(validateFieldType(123, 'Number')).toBe(123);
        expect(validateFieldType('123', 'Number')).toBe(123);
        expect(validateFieldType('123.45', 'Number')).toBe(123.45);
      });

      it('should reject invalid numbers', () => {
        expect(() => validateFieldType('abc', 'Number')).toThrow();
        expect(() => validateFieldType('', 'Number')).toThrow();
      });
    });

    describe('Switch type', () => {
      it('should validate booleans', () => {
        expect(validateFieldType(true, 'Switch')).toBe(true);
        expect(validateFieldType(false, 'Switch')).toBe(false);
        expect(validateFieldType('true', 'Switch')).toBe(true);
        expect(validateFieldType('false', 'Switch')).toBe(false);
      });
    });

    describe('PlainText type', () => {
      it('should validate plain text', () => {
        expect(validateFieldType('hello', 'PlainText')).toBe('hello');
        expect(validateFieldType(123, 'PlainText')).toBe('123');
      });

      it('should reject null/undefined', () => {
        expect(() => validateFieldType(null, 'PlainText')).toThrow();
        expect(() => validateFieldType(undefined, 'PlainText')).toThrow();
      });
    });

    describe('Email type', () => {
      it('should validate emails', () => {
        expect(validateFieldType('user@example.com', 'Email')).toBe(
          'user@example.com'
        );
      });

      it('should reject invalid emails', () => {
        expect(() => validateFieldType('invalid', 'Email')).toThrow();
        expect(() => validateFieldType('user@', 'Email')).toThrow();
      });
    });

    describe('Link type', () => {
      it('should validate URLs', () => {
        expect(validateFieldType('https://example.com', 'Link')).toBe(
          'https://example.com'
        );
      });

      it('should reject invalid URLs', () => {
        expect(() => validateFieldType('not-a-url', 'Link')).toThrow();
      });
    });

    describe('DateTime type', () => {
      it('should validate dates', () => {
        const date = '2024-01-15T12:30:00Z';
        expect(validateFieldType(date, 'DateTime')).toBe(date);
      });

      it('should reject invalid dates', () => {
        expect(() => validateFieldType('not-a-date', 'DateTime')).toThrow();
      });
    });
  });

  describe('validateRequiredFields', () => {
    it('should pass when all required fields present', () => {
      const data = { name: 'Test', slug: 'test', price: 100 };
      const required = ['name', 'slug'];

      expect(() => validateRequiredFields(data, required)).not.toThrow();
    });

    it('should fail when required field missing', () => {
      const data = { name: 'Test' };
      const required = ['name', 'slug'];

      expect(() => validateRequiredFields(data, required)).toThrow(
        'Missing required fields: slug'
      );
    });

    it('should fail when multiple required fields missing', () => {
      const data = { name: 'Test' };
      const required = ['name', 'slug', 'price'];

      expect(() => validateRequiredFields(data, required)).toThrow(
        'Missing required fields: slug, price'
      );
    });

    it('should reject null values', () => {
      const data = { name: 'Test', slug: null };
      const required = ['name', 'slug'];

      expect(() => validateRequiredFields(data, required)).toThrow(
        'Missing required fields: slug'
      );
    });

    it('should reject undefined values', () => {
      const data = { name: 'Test', slug: undefined };
      const required = ['name', 'slug'];

      expect(() => validateRequiredFields(data, required)).toThrow(
        'Missing required fields: slug'
      );
    });

    it('should accept empty arrays', () => {
      const data = { name: 'Test', tags: [] };
      const required = ['name', 'tags'];

      expect(() => validateRequiredFields(data, required)).not.toThrow();
    });
  });

  describe('validateSlug', () => {
    it('should validate valid slugs', () => {
      expect(validateSlug('valid-slug')).toBe(true);
      expect(validateSlug('valid-slug-123')).toBe(true);
      expect(validateSlug('a')).toBe(true);
      expect(validateSlug('a-b-c-d-e-f')).toBe(true);
    });

    it('should reject uppercase', () => {
      expect(validateSlug('Valid-Slug')).toBe(false);
      expect(validateSlug('SLUG')).toBe(false);
    });

    it('should reject underscores', () => {
      expect(validateSlug('invalid_slug')).toBe(false);
    });

    it('should reject spaces', () => {
      expect(validateSlug('invalid slug')).toBe(false);
    });

    it('should reject special characters', () => {
      expect(validateSlug('invalid@slug')).toBe(false);
      expect(validateSlug('invalid#slug')).toBe(false);
      expect(validateSlug('invalid!slug')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateSlug('')).toBe(false);
    });

    it('should reject slugs that are too long', () => {
      expect(validateSlug('a'.repeat(101))).toBe(false);
    });

    it('should accept maximum length slug', () => {
      expect(validateSlug('a'.repeat(100))).toBe(true);
    });

    it('should reject starting with hyphen', () => {
      expect(validateSlug('-invalid')).toBe(false);
    });

    it('should reject ending with hyphen', () => {
      expect(validateSlug('invalid-')).toBe(false);
    });
  });
});
