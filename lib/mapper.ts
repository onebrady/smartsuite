import jsonata from 'jsonata';
import type { Connection, Mapping } from '@prisma/client';
import { applyTransform, renderTemplate, generateSlug } from './transforms';
import { prisma } from './db';
import { logger } from './logger';

export interface FieldMappingConfig {
  type: 'direct' | 'jsonata' | 'template' | 'constant' | 'reference';
  source?: string; // JSONPath for direct mapping
  expression?: string; // JSONata expression
  template?: string; // Template string
  value?: any; // Constant value
  transform?: string; // Transform function name
  transformArgs?: any[]; // Arguments for transform
  default?: any; // Default value if mapping fails
  refConnectionId?: string; // For reference type
  refTargetField?: string; // For reference type
}

export interface MappingContext {
  connection: Connection;
  externalId: string;
}

/**
 * Normalize SmartSuite webhook payload
 */
export function normalizeSmartSuitePayload(payload: any): any {
  // Extract record data from webhook payload
  const data = payload.data || payload;

  // If the data has a structure, use it
  if (data.record) {
    return data.record;
  }

  return data;
}

/**
 * Apply a single field mapping configuration
 */
export async function applyFieldMapping(
  config: FieldMappingConfig,
  data: any,
  context: MappingContext
): Promise<any> {
  try {
    let value: any;

    switch (config.type) {
      case 'direct': {
        // Direct mapping from source field
        if (!config.source) {
          throw new Error('Direct mapping requires source field');
        }

        // Simple dot notation access
        value = getNestedValue(data, config.source);
        break;
      }

      case 'jsonata': {
        // JSONata expression evaluation
        if (!config.expression) {
          throw new Error('JSONata mapping requires expression');
        }

        const expr = jsonata(config.expression);
        value = await expr.evaluate(data);
        break;
      }

      case 'template': {
        // Template rendering
        if (!config.template) {
          throw new Error('Template mapping requires template string');
        }

        value = renderTemplate(config.template, data);
        break;
      }

      case 'constant': {
        // Constant value
        value = config.value;
        break;
      }

      case 'reference': {
        // Reference field lookup
        value = await resolveReference(config, data, context);
        break;
      }

      default:
        throw new Error(`Unknown mapping type: ${config.type}`);
    }

    // Apply transform if specified
    if (config.transform && value !== undefined && value !== null) {
      value = applyTransform(
        config.transform,
        value,
        ...(config.transformArgs || [])
      );
    }

    // Apply default if value is null/undefined
    if ((value === undefined || value === null) && config.default !== undefined) {
      value = config.default;
    }

    return value;
  } catch (error: any) {
    logger.warn({ error: error.message, config }, 'Field mapping failed');

    // Return default if available
    if (config.default !== undefined) {
      return config.default;
    }

    throw error;
  }
}

/**
 * Build Webflow field data from mapping configuration
 */
export async function buildWebflowBody(
  mapping: Mapping,
  ssData: any,
  connection: Connection,
  externalId: string
): Promise<{ fieldData: Record<string, any>; warnings: string[] }> {
  const fieldData: Record<string, any> = {};
  const warnings: string[] = [];

  const context: MappingContext = {
    connection,
    externalId,
  };

  // Apply each field mapping
  const fieldMap = mapping.fieldMap as unknown as Record<
    string,
    FieldMappingConfig
  >;

  for (const [wfField, config] of Object.entries(fieldMap)) {
    try {
      const value = await applyFieldMapping(config, ssData, context);

      if (value !== undefined && value !== null) {
        fieldData[wfField] = value;
      } else if (config.default !== undefined) {
        fieldData[wfField] = config.default;
      }
    } catch (err: any) {
      warnings.push(`Field '${wfField}': ${err.message}`);
    }
  }

  // Generate slug if template provided
  if (mapping.slugTemplate) {
    try {
      fieldData.slug = generateSlug(mapping.slugTemplate, ssData);
    } catch (err: any) {
      warnings.push(`Slug generation failed: ${err.message}`);
    }
  }

  return { fieldData, warnings };
}

/**
 * Get nested value from object using dot notation or JSONPath-like syntax
 */
function getNestedValue(obj: any, path: string): any {
  // Remove JSONPath prefix if present ($.field -> field)
  const cleanPath = path.startsWith('$.') ? path.substring(2) : path;

  // Split by dots and brackets
  const keys = cleanPath.split(/\.|\[|\]/).filter(Boolean);

  return keys.reduce((current, key) => {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array index
    if (/^\d+$/.test(key)) {
      const index = parseInt(key, 10);
      return Array.isArray(current) ? current[index] : undefined;
    }

    return current[key];
  }, obj);
}

/**
 * Resolve a reference field by looking up in IdMap
 */
async function resolveReference(
  config: FieldMappingConfig,
  data: any,
  context: MappingContext
): Promise<string | string[] | null> {
  if (!config.source) {
    throw new Error('Reference mapping requires source field');
  }

  // Get the external ID(s) from source data
  const externalIds = getNestedValue(data, config.source);

  if (!externalIds) {
    return null;
  }

  // Handle single or multiple references
  const ids = Array.isArray(externalIds) ? externalIds : [externalIds];

  // Look up in IdMap
  const idMaps = await prisma.idMap.findMany({
    where: {
      connectionId: config.refConnectionId || context.connection.id,
      externalSource: 'smartsuite',
      externalId: {
        in: ids.map((id) => (typeof id === 'object' ? id.id : id)),
      },
    },
  });

  const wfItemIds = idMaps.map((map) => map.wfItemId);

  // Return single or array based on input
  if (Array.isArray(externalIds)) {
    return wfItemIds;
  } else {
    return wfItemIds.length > 0 ? wfItemIds[0] : null;
  }
}
