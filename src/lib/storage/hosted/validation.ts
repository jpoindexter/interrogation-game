import { integer, invalidResponse, object } from './rpc';

export function check(condition: unknown): asserts condition {
  if (!condition) invalidResponse();
}
export function record(value: unknown): Record<string, unknown> {
  check(object(value));
  return value;
}
export function list(value: unknown): unknown[] {
  check(Array.isArray(value));
  return value;
}
export function text(value: unknown, max = 5000): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}
export function count(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
  return integer(value) && value <= max;
}
export function strings(value: unknown): string[] {
  const items = list(value);
  check(items.every(item => text(item)));
  return items as string[];
}
export function unique(values: string[]): void {
  check(new Set(values).size === values.length);
}
export function provenance(value: unknown): void {
  const entry = record(value);
  check(text(entry.provider, 100) && text(entry.model, 200));
  check(['case', 'case-review', 'suspect', 'judge', 'debrief'].includes(String(entry.capability)));
  check(typeof entry.promptHash === 'string' && /^[a-f0-9]{64}$/.test(entry.promptHash));
}
