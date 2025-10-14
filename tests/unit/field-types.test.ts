import { describe, it, expect } from 'vitest';
import {
  isCompatible,
  getCompatibleTypes,
  getRecommendedType,
} from '@/lib/field-types';

describe('Field Types', () => {
  describe('isCompatible', () => {
    it('should check text field compatibility', () => {
      expect(isCompatible('textfield', 'PlainText')).toBe(true);
      expect(isCompatible('textfield', 'Link')).toBe(true);
      expect(isCompatible('textfield', 'Email')).toBe(true);
      expect(isCompatible('textfield', 'Phone')).toBe(true);
      expect(isCompatible('textfield', 'Number')).toBe(false);
    });

    it('should check numeric field compatibility', () => {
      expect(isCompatible('numberfield', 'Number')).toBe(true);
      expect(isCompatible('numberfield', 'PlainText')).toBe(false);
      expect(isCompatible('currencyfield', 'Number')).toBe(true);
      expect(isCompatible('percentfield', 'Number')).toBe(true);
    });

    it('should check date field compatibility', () => {
      expect(isCompatible('datefield', 'DateTime')).toBe(true);
      expect(isCompatible('duedatefield', 'DateTime')).toBe(true);
      expect(isCompatible('datefield', 'PlainText')).toBe(false);
    });

    it('should check selection field compatibility', () => {
      expect(isCompatible('singleselectfield', 'Option')).toBe(true);
      expect(isCompatible('singleselectfield', 'PlainText')).toBe(true);
      expect(isCompatible('multipleselectfield', 'MultiOption')).toBe(true);
    });

    it('should check boolean field compatibility', () => {
      expect(isCompatible('singlecheckbox', 'Switch')).toBe(true);
      expect(isCompatible('singlecheckbox', 'PlainText')).toBe(false);
    });

    it('should check reference field compatibility', () => {
      expect(isCompatible('linkedrecord', 'Reference')).toBe(true);
      expect(isCompatible('linkedrecord', 'MultiReference')).toBe(true);
    });

    it('should check file field compatibility', () => {
      expect(isCompatible('files', 'File')).toBe(true);
      expect(isCompatible('files', 'Image')).toBe(true);
      expect(isCompatible('files', 'MultiImage')).toBe(true);
      expect(isCompatible('files', 'Video')).toBe(true);
      expect(isCompatible('files', 'FileRef')).toBe(true);
    });

    it('should handle case insensitive field types', () => {
      expect(isCompatible('TextField', 'PlainText')).toBe(true);
      expect(isCompatible('TEXTFIELD', 'PlainText')).toBe(true);
    });

    it('should return false for unknown field types', () => {
      expect(isCompatible('unknown', 'PlainText')).toBe(false);
    });
  });

  describe('getCompatibleTypes', () => {
    it('should get all compatible types for text field', () => {
      const types = getCompatibleTypes('textfield');
      expect(types).toEqual(['PlainText', 'Link', 'Email', 'Phone']);
    });

    it('should get all compatible types for number field', () => {
      const types = getCompatibleTypes('numberfield');
      expect(types).toEqual(['Number']);
    });

    it('should get all compatible types for select field', () => {
      const types = getCompatibleTypes('singleselectfield');
      expect(types).toEqual(['Option', 'PlainText']);
    });

    it('should return empty array for unknown field type', () => {
      const types = getCompatibleTypes('unknown');
      expect(types).toEqual([]);
    });
  });

  describe('getRecommendedType', () => {
    it('should get recommended type for text field', () => {
      expect(getRecommendedType('textfield')).toBe('PlainText');
    });

    it('should get recommended type for number field', () => {
      expect(getRecommendedType('numberfield')).toBe('Number');
    });

    it('should get recommended type for date field', () => {
      expect(getRecommendedType('datefield')).toBe('DateTime');
    });

    it('should get recommended type for select field', () => {
      expect(getRecommendedType('singleselectfield')).toBe('Option');
    });

    it('should return null for unknown field type', () => {
      expect(getRecommendedType('unknown')).toBeNull();
    });
  });
});
