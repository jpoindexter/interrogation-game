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
  // Anti-extraction patterns
  /what\s+(are\s+)?your\s+(system\s+)?instructions/i,
  /repeat\s+(your|the)\s+(system\s+)?prompt/i,
  /show\s+(me\s+)?(your|the)\s+(system\s+)?prompt/i,
  /reveal\s+(your|the)\s+(hidden|secret|system)/i,
  /what\s+is\s+the[_\s]lie/i, /what\s+is\s+the[_\s]truth/i,
  /the_lie|the_truth|the_contradiction|suspect_true_story/i,
  /stress_triggers|deflection_tactics/i,
  // Unicode evasion
  /[\u200B-\u200F\u2028-\u202F\uFEFF]/,
  // Base64 encoded common injections
  /aWdub3Jl|c3lzdGVt|cHJvbXB0/i,
];

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let clean = input.trim();
  // Remove (not replace) any injection pattern matches — don't leave [REDACTED] artifacts
  // that could be used as signals by the model
  for (const pattern of INJECTION_PATTERNS) {
    const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    clean = clean.replace(global, '');
  }
  // Collapse excessive whitespace left by removals
  clean = clean.replace(/\s{2,}/g, ' ').trim();
  return clean;
}

export function isInjectionAttempt(input: string): boolean {
  return !!input && INJECTION_PATTERNS.some((p) => p.test(input));
}

/** Detect gibberish / repetitive spam that shouldn't be treated as a real question */
export function isGibberish(input: string): boolean {
  const s = input.trim().toLowerCase();
  if (s.length < 3) return true;
  // Check for excessive repetition: split into words, check unique ratio
  const words = s.split(/\s+/);
  if (words.length >= 6) {
    const unique = new Set(words).size;
    if (unique / words.length < 0.25) return true; // <25% unique words = spam
  }
  // Check if input is mostly non-alphabetic
  const alpha = s.replace(/[^a-z]/g, '');
  if (alpha.length < s.length * 0.3) return true;
  return false;
}

/** Detect non-English input — blocks language-switching attacks that bypass English regex filters */
export function isNonEnglish(input: string): boolean {
  const s = input.trim();
  if (s.length < 5) return false;
  // Count ASCII letters vs non-ASCII letters
  const asciiAlpha = s.replace(/[^a-zA-Z]/g, '').length;
  const allAlpha = s.replace(/[^a-zA-Z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u3000-\u9FFF\uAC00-\uD7AF]/g, '').length;
  // If >30% of alphabetic chars are non-ASCII, it's likely non-English
  if (allAlpha > 0 && (allAlpha - asciiAlpha) / allAlpha > 0.3) return true;
  return false;
}

/** Check if AI response leaks case secrets (fuzzy keyword matching) */
export function containsSecretLeak(response: string, secrets: string[]): boolean {
  const lower = response.toLowerCase();
  for (const secret of secrets) {
    if (!secret) continue;
    // Extract significant words (4+ chars) from the secret
    const words = secret.toLowerCase().split(/\s+/).filter(w => w.length >= 4);
    if (words.length === 0) continue;
    const matched = words.filter(w => lower.includes(w)).length;
    // If 60%+ of significant words appear in the response, it's a leak
    if (matched >= Math.ceil(words.length * 0.6)) return true;
  }
  return false;
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
  case_number: 20, setting: 200, crime: 500, briefing: 1000,
  suspect_name: 100, suspect_gender: 10, suspect_role: 200,
  suspect_true_story: 1000, suspect_cover_story: 1000,
  the_lie: 500, the_truth: 500, the_contradiction: 500, difficulty: 20,
};
const OPTIONAL_CASE_FIELDS: Record<string, number> = { objective: 100 };

export function validateCaseData(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>, clean: Record<string, unknown> = {};
  for (const [key, max] of Object.entries(CASE_FIELDS)) {
    if (typeof d[key] !== 'string') return null;
    clean[key] = sanitizeInput((d[key] as string).slice(0, max));
  }
  for (const [key, max] of Object.entries(OPTIONAL_CASE_FIELDS)) {
    if (typeof d[key] === 'string') clean[key] = sanitizeInput((d[key] as string).slice(0, max));
  }
  for (const key of ['stress_triggers', 'deflection_tactics'] as const) {
    if (!Array.isArray(d[key])) return null;
    clean[key] = (d[key] as string[]).slice(0, 10).map((s) =>
      typeof s === 'string' ? sanitizeInput(s.slice(0, 300)) : '');
  }
  // Optional arrays
  if (Array.isArray(d.detective_leads)) {
    clean.detective_leads = (d.detective_leads as string[]).slice(0, 5).map((s) =>
      typeof s === 'string' ? sanitizeInput(s.slice(0, 500)) : '');
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
