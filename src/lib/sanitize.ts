// Input sanitization and validation for API routes

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts)/i,
  /forget\s+(all\s+)?(your|the)\s+(instructions|rules|prompts)/i,
  /you\s+are\s+now\s+a/i,
  /system\s*:/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<<SYS>>/i,
  /<<\/SYS>>/i,
  /\bprompt\s*inject/i,
  /\bjailbreak/i,
  /\bDAN\s+mode/i,
  /do\s+anything\s+now/i,
  /override\s+(your|all)\s+(instructions|rules)/i,
  /pretend\s+(you|to\s+be)/i,
  /act\s+as\s+(if|a|an)/i,
  /roleplay\s+as/i,
  /new\s+instructions?\s*:/i,
  /disregard\s+(all|your|the)/i,
];

/** Strip known prompt injection patterns from user input */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let clean = input.trim();
  for (const pattern of INJECTION_PATTERNS) {
    clean = clean.replace(pattern, '[REDACTED]');
  }
  return clean;
}

/** Check if input contains suspected injection attempt */
export function isInjectionAttempt(input: string): boolean {
  if (!input) return false;
  return INJECTION_PATTERNS.some((p) => p.test(input));
}

/** Validate a string field: non-empty, within length, returns trimmed or null */
export function validateString(val: unknown, maxLen: number): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (trimmed.length === 0 || trimmed.length > maxLen) return null;
  return trimmed;
}

/** Validate a number: finite, within range */
export function validateNumber(val: unknown, min: number, max: number): number | null {
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  if (val < min || val > max) return null;
  return val;
}

/** Validate difficulty is one of the allowed values */
export function validateDifficulty(val: unknown): string | null {
  const allowed = ['easy', 'medium', 'hard', 'expert'];
  if (typeof val !== 'string' || !allowed.includes(val)) return null;
  return val;
}

/** Validate conversation history is a well-formed array */
export function validateConversationHistory(val: unknown): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(val)) return [];
  return val.filter(
    (msg): msg is { role: 'user' | 'assistant'; content: string } =>
      msg &&
      typeof msg === 'object' &&
      (msg.role === 'user' || msg.role === 'assistant') &&
      typeof msg.content === 'string' &&
      msg.content.length < 5000
  ).slice(-50); // cap at last 50 messages to prevent token overflow
}
