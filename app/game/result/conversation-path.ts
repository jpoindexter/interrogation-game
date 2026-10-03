export type PathStatus = 'neutral' | 'supported' | 'unsupported' | 'unverified';
export interface ConversationPathNode {
  id: string;
  kind: 'dialogue' | 'challenge' | 'accusation';
  question: string;
  answer: string;
  status: PathStatus;
  explanation?: string;
  evidence?: { statement: string; exhibitTitle: string; exhibitText: string };
}

export function pathLabel(node: ConversationPathNode): string {
  if (node.kind === 'accusation') {
    if (node.status === 'supported') return 'Accusation accepted';
    return node.status === 'unsupported' ? 'Accusation rejected' : 'Accusation · verdict unavailable';
  }
  if (node.kind === 'challenge') {
    if (node.status === 'unverified') return 'Statement not reviewed';
    return node.status === 'supported' ? 'Contradiction established' : 'Contradiction not established';
  }
  return 'Dialogue · no verdict';
}

function validEvidence(value: unknown): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object') return false;
  const evidence = value as Record<string, unknown>;
  return ['statement', 'exhibitTitle', 'exhibitText'].every(key => typeof evidence[key] === 'string');
}

export function validConversationPath(value: unknown): value is ConversationPathNode[] {
  return Array.isArray(value) && value.every(node => node && typeof node === 'object'
    && typeof node.id === 'string' && typeof node.question === 'string' && typeof node.answer === 'string'
    && ['dialogue', 'challenge', 'accusation'].includes(node.kind)
    && ['neutral', 'supported', 'unsupported', 'unverified'].includes(node.status)
    && (node.explanation === undefined || typeof node.explanation === 'string') && validEvidence(node.evidence));
}
