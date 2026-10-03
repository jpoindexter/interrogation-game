/** Explicit generated identity aliases only; never infer identity from names, roles or artwork. */
export function normalizeGenderHint(value: unknown): 'female' | 'male' | 'nonbinary' | null {
  if (typeof value !== 'string') return null;
  switch (value.trim().toLocaleLowerCase('en')) {
    case 'woman': case 'female': return 'female';
    case 'man': case 'male': return 'male';
    case 'nonbinary': case 'non-binary': case 'non binary': return 'nonbinary';
    default: return null;
  }
}
