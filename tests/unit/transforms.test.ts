import { describe, it, expect } from 'vitest';
import { TRANSFORMS, applyTransform, generateSlug } from '@/lib/transforms';

describe('Transforms', () => {
  describe('case transformations', () => {
    it('should transform case', () => {
      expect(TRANSFORMS.uppercase('hello')).toBe('HELLO');
      expect(TRANSFORMS.lowercase('HELLO')).toBe('hello');
      expect(TRANSFORMS.title('hello world')).toBe('Hello World');
      expect(TRANSFORMS.kebab('Hello World')).toBe('hello-world');
      expect(TRANSFORMS.camel('hello world')).toBe('helloWorld');
      expect(TRANSFORMS.pascal('hello world')).toBe('HelloWorld');
      expect(TRANSFORMS.snake('Hello World')).toBe('hello_world');
      expect(TRANSFORMS.capital('hello world')).toBe('Hello World');
    });
  });

  describe('string manipulation', () => {
    it('should manipulate strings', () => {
      expect(TRANSFORMS.trim('  hello  ')).toBe('hello');
      expect(TRANSFORMS.truncate('hello world', 5)).toBe('hello');
      expect(TRANSFORMS.substring('hello world', 0, 5)).toBe('hello');
      expect(TRANSFORMS.replace('hello world', 'world', 'there')).toBe(
        'hello there'
      );
    });

    it('should split and join', () => {
      expect(TRANSFORMS.split('a,b,c', ',')).toEqual(['a', 'b', 'c']);
      expect(TRANSFORMS.join(['a', 'b', 'c'], ', ')).toBe('a, b, c');
    });

    it('should pad strings', () => {
      expect(TRANSFORMS.padStart('5', 3, '0')).toBe('005');
      expect(TRANSFORMS.padEnd('5', 3, '0')).toBe('500');
    });
  });

  describe('numeric transformations', () => {
    it('should transform numbers', () => {
      expect(TRANSFORMS.round(3.14159, 2)).toBe(3.14);
      expect(TRANSFORMS.floor(3.9)).toBe(3);
      expect(TRANSFORMS.ceil(3.1)).toBe(4);
      expect(TRANSFORMS.abs(-5)).toBe(5);
      expect(TRANSFORMS.toFixed(3.14159, 2)).toBe('3.14');
    });
  });

  describe('date transformations', () => {
    it('should format dates', () => {
      const date = new Date('2024-01-15T12:30:00Z');
      expect(TRANSFORMS.formatDate(date, 'yyyy-MM-dd')).toBe('2024-01-15');
    });

    it('should convert to ISO', () => {
      const date = new Date('2024-01-15T12:30:00Z');
      expect(TRANSFORMS.isoDate(date)).toBe('2024-01-15T12:30:00.000Z');
    });

    it('should get timestamp', () => {
      const date = new Date('2024-01-15T12:30:00Z');
      expect(TRANSFORMS.timestamp(date)).toBe(date.getTime());
    });
  });

  describe('array transformations', () => {
    it('should get first and last elements', () => {
      expect(TRANSFORMS.first([1, 2, 3])).toBe(1);
      expect(TRANSFORMS.last([1, 2, 3])).toBe(3);
    });

    it('should get array length', () => {
      expect(TRANSFORMS.length([1, 2, 3])).toBe(3);
    });

    it('should get unique elements', () => {
      expect(TRANSFORMS.unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('type conversions', () => {
    it('should convert types', () => {
      expect(TRANSFORMS.toString(123)).toBe('123');
      expect(TRANSFORMS.toNumber('123')).toBe(123);
      expect(TRANSFORMS.toBoolean(1)).toBe(true);
      expect(TRANSFORMS.toArray('single')).toEqual(['single']);
    });
  });

  describe('special transformations', () => {
    it('should use default value', () => {
      expect(TRANSFORMS.default(null, 'fallback')).toBe('fallback');
      expect(TRANSFORMS.default(undefined, 'fallback')).toBe('fallback');
      expect(TRANSFORMS.default('value', 'fallback')).toBe('value');
    });
  });

  describe('applyTransform', () => {
    it('should apply transform by name', () => {
      expect(applyTransform('uppercase', 'hello')).toBe('HELLO');
      expect(applyTransform('round', 3.14159, 2)).toBe(3.14);
    });

    it('should throw on unknown transform', () => {
      expect(() => applyTransform('unknown', 'value')).toThrow(
        'Unknown transform: unknown'
      );
    });
  });

  describe('generateSlug', () => {
    it('should generate slug from template', () => {
      const template = '{{category}}-{{name}}';
      const data = { category: 'Electronics', name: 'Widget Pro' };

      const slug = generateSlug(template, data);
      expect(slug).toBe('electronics-widget-pro');
    });

    it('should remove invalid characters', () => {
      const template = '{{name}}';
      const data = { name: 'Test @ Product #123!' };

      const slug = generateSlug(template, data);
      expect(slug).toBe('test-product-123');
    });

    it('should truncate long slugs', () => {
      const template = '{{name}}';
      const data = { name: 'a'.repeat(150) };

      const slug = generateSlug(template, data);
      expect(slug.length).toBeLessThanOrEqual(100);
    });

    it('should handle empty result', () => {
      const template = '{{missing}}';
      const data = {};

      const slug = generateSlug(template, data);
      expect(slug).toBe('item');
    });
  });
});
