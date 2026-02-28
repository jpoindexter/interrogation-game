// Input sanitization and validation for API routes
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts)/i,
  /forget\s+(all\s+)?(your|the)\s+(instructions|rules|prompts)/i,
  /you\s+are\s+now\s+a/i, /system\s*:/i, /\[INST\]/i, /\[\/INST\]/i,
  /<<SYS>>/i, /<<\/SYS>>/i, /\bprompt\s*inject/i, /\bjailbreak/i,
  /\bDAN\s+mode/i, /do\s+anything\s+now/i,
  /override\s+(your|all)\s+(instructions|rules)/i,
  /pretend\s+(you|to\s+be)/i, /act\s+as\s+(if|a|an)/i, /roleplay\s+as/i,
  /new\s+instructions?\s*:/i, /disregard\s+(all|your|the)/i,
  /<\s*\/?\s*(system|prompt|instructions?|context)\s*>/i,
  /^#+\s*(system|new\s+instructions?)\s*:/im,
  /1gnore\s+(all|previous)/i, /ignor3/i, /1nstructions/i, /syst3m/i,
];

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let clean = input.trim();
  for (const pattern of INJECTION_PATTERNS) clean = clean.replace(pattern, '[REDACTED]');
  return clean;
}

export function isInjectionAttempt(input: string): boolean {
  return !!input && INJECTION_PATTERNS.some((p) => p.test(input));
}

export function validateString(val: unknown, maxLen: number): string | null {
  if (!val || typeof val !== 'string') return null;
  const t = val.trim();
  return t.length > 0 && t.length <= maxLen ? t : null;
}

export function validateNumber(val: unknown, min: number, max: number): number | null {
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  return val >= min && val <= max ? val : null;
}

export function validateDifficulty(val: unknown): string | null {
  const allowed = ['easy', 'medium', 'hard', 'expert'];
  return typeof val === 'string' && allowed.includes(val) ? val : null;
}

const CASE_FIELDS: Record<string, number> = {
  suspect_name: 100, suspect_role: 200, setting: 200, crime: 500,
  suspect_true_story: 1000, suspect_cover_story: 1000,
  the_lie: 500, the_truth: 500, the_contradiction: 500, difficulty: 20,
};

export function validateCaseData(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>, clean: Record<string, unknown> = {};
  for (const [key, max] of Object.entries(CASE_FIELDS)) {
    if (typeof d[key] !== 'string') return null;
    clean[key] = sanitizeInput((d[key] as string).slice(0, max));
  }
  for (const key of ['stress_triggers', 'deflection_tactics'] as const) {
    if (!Array.isArray(d[key])) return null;
    clean[key] = (d[key] as string[]).slice(0, 10).map((s) =>
      typeof s === 'string' ? sanitizeInput(s.slice(0, 300)) : '');
  }
  return clean;
}

export function validateConversationHistory(val: unknown): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(val)) return [];
  return val.filter(
    (msg): msg is { role: 'user' | 'assistant'; content: string } =>
      msg && typeof msg === 'object' &&
      (msg.role === 'user' || msg.role === 'assistant') &&
      typeof msg.content === 'string' && msg.content.length < 5000
  ).slice(-50);
}
