import {
  camelCase,
  kebabCase,
  snakeCase,
  pascalCase,
  capitalCase,
} from 'change-case';
import { format, parseISO } from 'date-fns';

export type TransformFunction = (value: any, ...args: any[]) => any;

/**
 * Available transform functions
 */
export const TRANSFORMS: Record<string, TransformFunction> = {
  // ============================================================================
  // String Case Transformations
  // ============================================================================

  uppercase: (str: string) => String(str).toUpperCase(),
  lowercase: (str: string) => String(str).toLowerCase(),
  title: (str: string) =>
    String(str).replace(/\w\S*/g, (t) =>
      t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
    ),
  camel: (str: string) => camelCase(String(str)),
  pascal: (str: string) => pascalCase(String(str)),
  snake: (str: string) => snakeCase(String(str)),
  kebab: (str: string) => kebabCase(String(str)),
  capital: (str: string) => capitalCase(String(str)),

  // ============================================================================
  // String Manipulation
  // ============================================================================

  trim: (str: string) => String(str).trim(),
  truncate: (str: string, len: number = 100) =>
    String(str).substring(0, len),
  substring: (str: string, start: number, end?: number) =>
    String(str).substring(start, end),
  replace: (str: string, search: string, replace: string) =>
    String(str).replace(new RegExp(search, 'g'), replace),
  split: (str: string, delimiter: string) => String(str).split(delimiter),
  join: (arr: string[], delimiter: string = ', ') => arr.join(delimiter),
  padStart: (str: string, length: number, pad: string = ' ') =>
    String(str).padStart(length, pad),
  padEnd: (str: string, length: number, pad: string = ' ') =>
    String(str).padEnd(length, pad),

  // ============================================================================
  // Numeric Transformations
  // ============================================================================

  round: (num: number, decimals: number = 0) => {
    const factor = Math.pow(10, decimals);
    return Math.round(Number(num) * factor) / factor;
  },
  floor: (num: number) => Math.floor(Number(num)),
  ceil: (num: number) => Math.ceil(Number(num)),
  abs: (num: number) => Math.abs(Number(num)),
  toFixed: (num: number, decimals: number = 2) =>
    Number(num).toFixed(decimals),

  // ============================================================================
  // Date Transformations
  // ============================================================================

  formatDate: (date: string | Date, formatStr: string = 'yyyy-MM-dd') => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, formatStr);
  },
  isoDate: (date: string | Date) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return d.toISOString();
  },
  timestamp: (date: string | Date) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return d.getTime();
  },

  // ============================================================================
  // Array Transformations
  // ============================================================================

  first: (arr: any[]) => (Array.isArray(arr) ? arr[0] : arr),
  last: (arr: any[]) => (Array.isArray(arr) ? arr[arr.length - 1] : arr),
  length: (arr: any[]) => (Array.isArray(arr) ? arr.length : 0),
  unique: (arr: any[]) => (Array.isArray(arr) ? [...new Set(arr)] : [arr]),

  // ============================================================================
  // Type Conversions
  // ============================================================================

  toString: (value: any) => String(value),
  toNumber: (value: any) => Number(value),
  toBoolean: (value: any) => Boolean(value),
  toArray: (value: any) => (Array.isArray(value) ? value : [value]),

  // ============================================================================
  // Special Transformations
  // ============================================================================

  default: (value: any, defaultValue: any) =>
    value !== undefined && value !== null ? value : defaultValue,
};

/**
 * Apply a transform to a value
 */
export function applyTransform(
  transformName: string,
  value: any,
  ...args: any[]
): any {
  const transform = TRANSFORMS[transformName];

  if (!transform) {
    throw new Error(`Unknown transform: ${transformName}`);
  }

  return transform(value, ...args);
}

/**
 * Generate a slug from a template and data
 */
export function generateSlug(template: string, data: any): string {
  // Render template
  let slug = renderTemplate(template, data);

  // Apply slug transformations
  slug = kebabCase(slug);
  slug = slug.replace(/[^a-z0-9-]/g, '');
  slug = slug.substring(0, 100);

  // Ensure slug is not empty
  if (!slug) {
    slug = 'item';
  }

  return slug;
}

/**
 * Render a template string with data
 * Supports {{variable}} syntax
 */
export function renderTemplate(template: string, data: any): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();

    // Support nested keys like "user.name"
    const value = trimmedKey.split('.').reduce((obj: any, k: string) => {
      return obj && obj[k] !== undefined ? obj[k] : '';
    }, data);

    return value !== undefined && value !== null ? String(value) : '';
  });
}
