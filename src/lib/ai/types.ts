export interface SuspectCase extends Record<string, unknown> {
  suspect_name: string;
  suspect_role: string;
  setting: string;
  suspect_true_story: string;
  suspect_cover_story: string;
  the_lie: string;
  the_truth: string;
  the_contradiction: string;
  stress_triggers: string[];
  deflection_tactics: string[];
  verbal_tics?: string;
  difficulty?: string;
}
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  kind?: 'question' | 'accusation' | 'terminal';
  accusationAttempt?: number;
}
