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
  /assistant\s*:/i, /\buser\s*:/i,
  // Anti-extraction paraphrases
  /what\s+(were\s+you|have\s+you\s+been)\s+told/i,
  /character\s+sheet/i, /your\s+briefing/i, /rules\s+you\s+follow/i,
  // Judge manipulation
  /note\s+to\s+(the\s+)?judge/i, /return\s+correct\s*:\s*true/i,
  // Unicode evasion
  /[\u200B-\u200F\u2028-\u202F\uFEFF]/,
  // Full-width character range
  /[\uFF01-\uFF5E]/,
  // Base64 encoded common injections
  /aWdub3Jl|c3lzdGVt|cHJvbXB0/i,
];

/** Preserve player intent, including adversarial questions; structured provider boundaries
 * treat this text as untrusted game input. Pattern removal is not a security boundary. */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input.normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

/** Normalize unicode confusables (homoglyphs, full-width chars) to ASCII for regex matching */
function normalizeToAscii(input: string): string {
  return input.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
}

export function isInjectionAttempt(input: string): boolean {
  if (!input) return false;
  // Check both raw and ASCII-normalized forms to catch homoglyph attacks
  return INJECTION_PATTERNS.some((p) => p.test(input) || p.test(normalizeToAscii(input)));
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

export { validateCaseData } from './session/case-validation';

export function validateConversationHistory(val: unknown): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(val)) return [];
  return val.filter(
    (msg): msg is { role: 'user' | 'assistant'; content: string } =>
      msg && typeof msg === 'object' &&
      (msg.role === 'user' || msg.role === 'assistant') &&
      typeof msg.content === 'string' && msg.content.length < 5000
  ).slice(-50);
}
