import type { ConversationMessage } from './ai/types';

const REQUIRED_QUESTIONS: Record<string, number> = { easy: 3, medium: 5, hard: 7, expert: 9 };
export const questionKey = (text: string) => text.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function isSubstantiveQuestion(text: string): boolean {
  return !text.startsWith('*') && text.replace(/[^\p{L}]/gu, '').length >= 15;
}
export function recordReleaseProgress(history: ConversationMessage[], difficulty: string) {
  const questions = new Set(history.filter(message => message.role === 'user'
    && message.kind !== 'accusation' && isSubstantiveQuestion(message.content)).map(message => questionKey(message.content)));
  const required = REQUIRED_QUESTIONS[difficulty] ?? REQUIRED_QUESTIONS.medium;
  return { asked: questions.size, required, remaining: Math.max(0, required - questions.size) };
}
