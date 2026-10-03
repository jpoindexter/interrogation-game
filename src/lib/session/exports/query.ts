export interface ExportQuery { limit: number; offset: number; outcome?: string; difficulty?: string; setting?: string }
function integer(params: URLSearchParams, name: string, options: { fallback: number; minimum: number; maximum: number }): number {
  const { fallback, minimum, maximum } = options;
  const value = params.get(name);
  if (value === null) return fallback;
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new Error(`Invalid ${name}`);
  }
  return number;
}
export function parseExportQuery(params: URLSearchParams): ExportQuery {
  const outcome = params.get('outcome') || undefined;
  const difficulty = params.get('difficulty') || undefined;
  const setting = params.get('setting') || undefined;
  if (outcome && !['win', 'lose_accusations', 'lose_time', 'lose_giveup', 'lose_lawyer'].includes(outcome)) throw new Error('Invalid outcome');
  if (difficulty && !['easy', 'medium', 'hard', 'expert'].includes(difficulty)) throw new Error('Invalid difficulty');
  if (setting && setting.length > 100) throw new Error('Invalid setting');
  return { limit: integer(params, 'limit', { fallback: 100, minimum: 1, maximum: 1000 }), offset: integer(params, 'offset', { fallback: 0, minimum: 0, maximum: 1_000_000 }), outcome, difficulty, setting };
}
