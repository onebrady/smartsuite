/**
 * Validate field type and coerce if possible
 */
export function validateFieldType(value: any, expectedType: string): any {
  switch (expectedType) {
    case 'PlainText':
    case 'RichText':
      // String types - reject null/undefined
      if (value === null || value === undefined) {
        throw new Error('Text field cannot be null or undefined');
      }
      if (typeof value === 'string') return value;
      return String(value);

    case 'Email':
      // Email - validate format
      if (value === null || value === undefined) {
        throw new Error('Email field cannot be null or undefined');
      }
      const email = String(value);
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
      return email;

    case 'Phone':
      // Phone - basic string
      if (typeof value === 'string') return value;
      if (value === null || value === undefined) return null;
      return String(value);

    case 'Link':
      // URL - validate format
      if (value === null || value === undefined) {
        throw new Error('URL field cannot be null or undefined');
      }
      const url = String(value);
      try {
        const parsedUrl = new URL(url);
        if (!parsedUrl.protocol.match(/^https?:$/)) {
          throw new Error('URL must use http or https protocol');
        }
        return url;
      } catch {
        throw new Error(`Invalid URL: ${url}. Expected a valid http:// or https:// URL.`);
      }

    case 'Number':
      // Numeric type - reject empty strings
      if (value === '' || value === null || value === undefined) {
        throw new Error(`Invalid number value: ${value}. Expected a numeric value.`);
      }
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Invalid number value: ${value}. Expected a numeric value.`);
        }
        return num;
      }
      throw new Error(`Expected number, got ${typeof value}`);

    case 'Switch':
      // Boolean type
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === 1) return true;
      if (value === 'false' || value === 0) return false;
      if (value === null || value === undefined) return null;
      throw new Error(`Expected boolean, got ${typeof value}`);

    case 'DateTime':
      // Date/time type
      if (typeof value === 'string') {
        // Validate ISO date format
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return value;
        }
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (value === null || value === undefined) return null;
      throw new Error(`Expected valid date string, got ${typeof value}`);

    case 'Option':
      // Single select
      if (typeof value === 'string') return value;
      if (value === null || value === undefined) return null;
      throw new Error(`Expected string for Option field, got ${typeof value}`);

    case 'MultiOption':
      // Multi select
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return [value];
      if (value === null || value === undefined) return null;
      throw new Error(`Expected array for MultiOption field, got ${typeof value}`);

    case 'Reference':
      // Single reference
      if (typeof value === 'string') return value;
      if (value === null || value === undefined) return null;
      throw new Error(`Expected string for Reference field, got ${typeof value}`);

    case 'MultiReference':
      // Multi reference
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return [value];
      if (value === null || value === undefined) return null;
      throw new Error(`Expected array for MultiReference field, got ${typeof value}`);

    case 'Image':
    case 'File':
    case 'Video':
    case 'FileRef':
      // File/media types
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && value.url) return value.url;
      if (value === null || value === undefined) return null;
      throw new Error(`Expected string or file object, got ${typeof value}`);

    case 'MultiImage':
      // Multiple images
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return [value];
      if (value === null || value === undefined) return null;
      throw new Error(`Expected array for MultiImage field, got ${typeof value}`);

    default:
      // Unknown type - return as-is
      return value;
  }
}

/**
 * Validate that all required fields are present
 */
export function validateRequiredFields(
  fieldData: Record<string, any>,
  requiredFields: string[]
): void {
  const missing = requiredFields.filter(
    (field) => fieldData[field] === undefined || fieldData[field] === null
  );

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Validate slug format
 */
export function validateSlug(slug: string): boolean {
  // Webflow slug requirements:
  // - Must be lowercase alphanumeric with hyphens
  // - No spaces or special characters
  // - Max 100 characters
  // - Cannot start or end with hyphen
  if (!slug || slug.length === 0 || slug.length > 100) {
    return false;
  }
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return false;
  }
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format
 */
export function validatePhone(phone: string): boolean {
  // Basic phone validation - digits, spaces, dashes, parentheses, plus sign
  const phoneRegex = /^[+]?[(]?[0-9\s\-()]+$/;
  return phoneRegex.test(phone);
}

/**
 * Sanitize HTML for rich text fields
 */
export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - remove script tags and dangerous attributes
  let sanitized = html;

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  return sanitized;
}

/**
 * Validate entire field data object
 */
export function validateFieldData(
  fieldData: Record<string, any>,
  schema?: Record<string, { type: string; required?: boolean }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!schema) {
    return { valid: true, errors: [] };
  }

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const value = fieldData[fieldName];

    // Check required
    if (fieldSchema.required && (value === undefined || value === null)) {
      errors.push(`Field '${fieldName}' is required`);
      continue;
    }

    // Skip validation if value is null/undefined and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Validate type
    try {
      validateFieldType(value, fieldSchema.type);
    } catch (err: any) {
      errors.push(`Field '${fieldName}': ${err.message}`);
    }

    // Type-specific validation
    if (fieldSchema.type === 'Email' && !validateEmail(String(value))) {
      errors.push(`Field '${fieldName}': Invalid email format`);
    }

    if (fieldSchema.type === 'Link' && !validateUrl(String(value))) {
      errors.push(`Field '${fieldName}': Invalid URL format`);
    }

    if (fieldSchema.type === 'Phone' && !validatePhone(String(value))) {
      errors.push(`Field '${fieldName}': Invalid phone format`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
