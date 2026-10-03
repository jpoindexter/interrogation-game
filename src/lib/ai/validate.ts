import { AiError } from './contracts';

type Schema = Record<string, unknown>;
function invalid(): never { throw new AiError('INVALID_RESPONSE', 'The AI response did not match the required format. Retry the request.'); }
function matchesType(value: unknown, type: unknown): boolean {
  if (Array.isArray(type)) return type.some(option => matchesType(value, option));
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  if (type === 'integer') return Number.isInteger(value);
  return typeof value === type;
}
function validateStringBounds(value: string, schema: Schema): void {
  if (value.length < Number(schema.minLength ?? 0) || value.length > Number(schema.maxLength ?? Infinity)) invalid();
}
function validateNumberBounds(value: number, schema: Schema): void {
  if (!Number.isFinite(value) || value < Number(schema.minimum ?? -Infinity) || value > Number(schema.maximum ?? Infinity)) invalid();
}
function validateObject(value: Record<string, unknown>, schema: Schema): void {
  const properties = schema.properties as Record<string, Schema>;
  for (const key of schema.required as string[] ?? []) if (!(key in value)) invalid();
  for (const key of Object.keys(value)) {
    if (!properties[key]) { if (schema.additionalProperties === false) invalid(); continue; }
    validateStructured(value[key], properties[key]);
  }
}

function validateArray(value: unknown[], schema: Schema): void {
  if (value.length < Number(schema.minItems ?? 0) || value.length > Number(schema.maxItems ?? Infinity)) invalid();
  value.forEach(item => validateStructured(item, schema.items as Schema));
}

/** Runtime gate for the intentionally small JSON Schema subset defined in schemas.ts. */
export function validateStructured(value: unknown, schema: Schema): void {
  if (!matchesType(value, schema.type)) invalid();
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) invalid();
  if (typeof value === 'string') validateStringBounds(value, schema);
  if (typeof value === 'number') validateNumberBounds(value, schema);
  if (Array.isArray(value)) validateArray(value, schema);
  else if (schema.type === 'object') validateObject(value as Record<string, unknown>, schema);
}
