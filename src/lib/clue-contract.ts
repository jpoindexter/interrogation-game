/** Public clue origins contain only an exchange already accepted into the transcript. */
export interface ClueSource {
  turnId: string;
  messageIndex: number;
  question: string;
  answer: string;
}
export interface PublicClue { id: string; text: string; source?: ClueSource | null }

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid clue.');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid clue text.');
  return value;
}
function parseSource(value: unknown): ClueSource {
  const source = record(value);
  if (typeof source.messageIndex !== 'number' || !Number.isSafeInteger(source.messageIndex) || source.messageIndex < 0
    || source.turnId !== `accepted-turn:${source.messageIndex}`) throw new Error('Invalid clue source.');
  return { turnId: source.turnId, messageIndex: source.messageIndex,
    question: text(source.question), answer: text(source.answer) };
}
export function parsePublicClue(value: unknown): PublicClue {
  const item = record(value);
  const clue = { id: text(item.id), text: text(item.text) };
  if (item.source === undefined) return clue;
  return { ...clue, source: item.source === null ? null : parseSource(item.source) };
}
