export { generateCase } from './generate-case';
export { interrogate } from './interrogate';
export { evaluateAccusation, evaluateWin, generateLossSummary } from './evaluate';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number; // game timer seconds when message was created
}
