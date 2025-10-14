import { describe, it, expect } from 'vitest';
import { applyFieldMapping } from '@/lib/mapper';
import type { FieldMappingConfig } from '@/lib/mapper';

describe('Mapper', () => {
  describe('direct mapping', () => {
    it('should apply direct mapping', async () => {
      const config: FieldMappingConfig = {
        type: 'direct',
        source: '$.title',
      };
      const data = { title: 'Widget Pro' };

      const result = await applyFieldMapping(config, data, {});
      expect(result).toBe('Widget Pro');
    });

    it('should handle nested paths', async () => {
      const config: FieldMappingConfig = {
        type: 'direct',
        source: '$.user.name',
      };
      const data = { user: { name: 'John' } };

      const result = await applyFieldMapping(config, data, {});
      expect(result).toBe('John');
    });

    it('should use default value if source is null', async () => {
      const config: FieldMappingConfig = {
        type: 'direct',
        source: '$.missing',
        default: 'fallback',
      };
      const data = {};

      const result = await applyFieldMapping(config, data, {});
      expect(result).toBe('fallback');
    });
  });

  describe('jsonata mapping', () => {
    it('should apply JSONata expression', async () => {
      const config: FieldMappingConfig = {
        type: 'jsonata',
        expression: 'price * 0.9',
      };
      const data = { price: 100 };

      const result = await applyFieldMapping(config, data, {});
      expect(result).toBe(90);
    });

    it('should handle complex JSONata expressions', async () => {
      const config: FieldMappingConfig = {
        type: 'jsonata',
        expression: '$sum(items.price)',
      };
      const data = {
        items: [{ price: 10 }, { price: 20 }, { price: 30 }],
      };

      const result = await applyFieldMapping(config, data, {});
      expect(result).toBe(60);
    });
  });

  describe('template mapping', () => {
    it('should apply template', async () => {
      const config: FieldMappingConfig = {
        type: 'template',
        template: '{{sku}}-{{name}}',
      };
      const data = { sku: 'ABC', name: 'Widget' };

      const result = await applyFieldMapping(config, data, {});
      expect(result).toBe('ABC-Widget');
    });

    it('should handle nested template variables', async () => {
      const config: FieldMappingConfig = {
        type: 'template',
        template: '{{user.name}} - {{user.email}}',
      };
      const data = { user: { name: 'John', email: 'john@example.com' } };

      const result = await applyFieldMapping(config, data, {});
      expect(result).toBe('John - john@example.com');
    });

    it('should handle missing template variables', async () => {
      const config: FieldMappingConfig = {
        type: 'template',
        template: '{{existing}}-{{missing}}',
      };
      const data = { existing: 'value' };

      const result = await applyFieldMapping(config, data, {});
      expect(result).toBe('value-');
    });
  });

  describe('constant mapping', () => {
    it('should apply constant', async () => {
      const config: FieldMappingConfig = {
        type: 'constant',
        value: 'active',
      };

      const result = await applyFieldMapping(config, {}, {});
      expect(result).toBe('active');
    });

    it('should handle numeric constants', async () => {
      const config: FieldMappingConfig = {
        type: 'constant',
        value: 42,
      };

      const result = await applyFieldMapping(config, {}, {});
      expect(result).toBe(42);
    });
  });

  describe('transforms', () => {
    it('should apply transforms', async () => {
      const config: FieldMappingConfig = {
        type: 'direct',
        source: '$.name',
        transform: 'uppercase',
      };
      const data = { name: 'widget' };

      const result = await applyFieldMapping(config, data, {});
      expect(result).toBe('WIDGET');
    });

    it('should apply multiple transforms', async () => {
      const config: FieldMappingConfig = {
        type: 'direct',
        source: '$.name',
        transform: 'uppercase',
      };
      const data = { name: '  hello world  ' };

      const result = await applyFieldMapping(config, data, {});
      expect(result).toBe('  HELLO WORLD  ');
    });
  });

  describe('reference mapping', () => {
    it('should apply reference mapping', async () => {
      const config: FieldMappingConfig = {
        type: 'reference',
        source: '$.categoryId',
        refConnection: 'conn_123',
      };
      const data = { categoryId: 'cat_001' };
      const context = {
        resolveReference: async () => 'wf_cat_123',
      };

      const result = await applyFieldMapping(config, data, context);
      expect(result).toBe('wf_cat_123');
    });
  });
});
