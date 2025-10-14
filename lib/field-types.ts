/**
 * Field type compatibility matrix between SmartSuite and Webflow
 */
export const FIELD_TYPE_COMPATIBILITY = {
  // Text fields
  textfield: ['PlainText', 'Link', 'Email', 'Phone'],
  textarea: ['RichText', 'PlainText'],

  // Numeric fields
  numberfield: ['Number'],
  currencyfield: ['Number'],
  percentfield: ['Number'],

  // Date/Time fields
  duedatefield: ['DateTime'],
  datefield: ['DateTime'],

  // Selection fields
  singleselectfield: ['Option', 'PlainText'],
  multipleselectfield: ['MultiOption', 'PlainText'],

  // Boolean fields
  singlecheckbox: ['Switch'],

  // Reference fields
  linkedrecord: ['Reference', 'MultiReference'],

  // File fields
  files: ['File', 'Image', 'MultiImage', 'Video', 'FileRef'],

  // Contact fields
  emailfield: ['Email', 'PlainText'],
  phonefield: ['Phone', 'PlainText'],
  urlfield: ['Link', 'PlainText'],

  // Location
  addressfield: ['PlainText', 'RichText'],

  // Special
  autoautonumber: ['Number', 'PlainText'],
  formulafield: ['Number', 'PlainText'],
  lookupfield: ['PlainText', 'Number'],
} as const;

export type SmartSuiteFieldType = keyof typeof FIELD_TYPE_COMPATIBILITY;
export type WebflowFieldType =
  (typeof FIELD_TYPE_COMPATIBILITY)[SmartSuiteFieldType][number];

/**
 * Check if a SmartSuite field type is compatible with a Webflow field type
 */
export function isCompatible(ssType: string, wfType: string): boolean {
  const compatibility = FIELD_TYPE_COMPATIBILITY[
    ssType.toLowerCase() as SmartSuiteFieldType
  ];

  if (!compatibility) {
    return false;
  }

  return (compatibility as readonly string[]).includes(wfType);
}

/**
 * Get all compatible Webflow field types for a SmartSuite field type
 */
export function getCompatibleTypes(
  ssType: string
): readonly string[] {
  return FIELD_TYPE_COMPATIBILITY[
    ssType.toLowerCase() as SmartSuiteFieldType
  ] || [];
}

/**
 * Get the recommended Webflow field type for a SmartSuite field type
 */
export function getRecommendedType(ssType: string): string | null {
  const compatible = getCompatibleTypes(ssType);
  return compatible.length > 0 ? compatible[0] : null;
}
