import type { ConversationPathNode } from '../../../app/game/result/conversation-path';
import { LEDGER_DEMO_CASE } from '../gameplay/demo-case';
import type { GameSession } from './types';
import type { RequestRecord } from './repository-types';
import { getSessionRecord } from './store';

function accusationVerdicts(requests: Record<string, RequestRecord>, attempts: number) {
  const verdicts = new Map<number, { correct: boolean; explanation?: string }>();
  for (const entry of Object.values(requests)) {
    const body = entry.response?.body;
    if (entry.state !== 'complete' || entry.response?.status !== 200 || !body) continue;
    if (typeof body.correct !== 'boolean' || typeof body.accusationsLeft !== 'number') continue;
    verdicts.set(attempts - body.accusationsLeft, { correct: body.correct,
      explanation: typeof body.explanation === 'string' ? body.explanation : undefined });
  }
  return verdicts;
}
function applyChallenge(node: ConversationPathNode, session: GameSession, turnId: string) {
  const receipt = Object.values(session.gameplay?.receipts ?? {}).find(item => item.result.turnId === turnId);
  if (!receipt || receipt.result.status === 'dialogue_only') return;
  node.kind = 'challenge';
  node.status = receipt.result.status === 'unreviewed_statement' ? 'unverified'
    : receipt.result.status === 'contradiction_established' ? 'supported' : 'unsupported';
  node.explanation = receipt.result.explanation;
  node.evidence = challengeEvidence(session, receipt.result);
}
function challengeEvidence(session: GameSession, result: { statementId: string; exhibitId?: string }) {
  const gameplay = session.gameplay;
  if (!gameplay || gameplay.caseId !== LEDGER_DEMO_CASE.id) return;
  const statement = gameplay.statements.find(item => item.id === result.statementId);
  const exhibit = LEDGER_DEMO_CASE.exhibits.find(item => item.id === result.exhibitId);
  if (!statement || !exhibit || !gameplay.disclosedExhibitIds.includes(exhibit.id)) return;
  return { statement: statement.quote, exhibitTitle: exhibit.title, exhibitText: exhibit.text };
}
function applyAccusation(node: ConversationPathNode, verdict?: { correct: boolean; explanation?: string }) {
  node.kind = 'accusation';
  node.question = node.question.slice('[ACCUSATION] '.length);
  node.status = verdict ? (verdict.correct ? 'supported' : 'unsupported') : 'unverified';
  node.explanation = verdict?.explanation;
}

function dialogueNode(session: GameSession, index: number): ConversationPathNode {
  const next = session.conversationHistory[index + 1];
  return { id: `conversation-${index}`, kind: 'dialogue', question: session.conversationHistory[index].content,
    answer: next?.role === 'assistant' ? next.content : '', status: 'neutral' };
}
function matchGameplay(node: ConversationPathNode, session: GameSession, turnIndex: number): boolean {
  const turn = session.gameplay?.turns[turnIndex];
  if (!turn || turn.question !== node.question || turn.answer !== node.answer) return false;
  applyChallenge(node, session, turn.id);
  return true;
}

/** Classify only recorded server verdicts. Suspect tone and stress are not correctness evidence. */
export function projectConversationPath(session: GameSession): ConversationPathNode[] {
  const verdicts = accusationVerdicts(getSessionRecord(session.id)?.requests ?? {}, session.accusationsUsed + session.accusationsLeft);
  const nodes: ConversationPathNode[] = [];
  let gameplayTurn = 0;
  for (let index = 0; index < session.conversationHistory.length; index++) {
    const message = session.conversationHistory[index];
    if (message.role !== 'user') continue;
    const node = dialogueNode(session, index);
    if (message.kind === 'accusation') applyAccusation(node, verdicts.get(message.accusationAttempt ?? -1));
    else if (!message.kind && message.content.startsWith('[ACCUSATION] ')) applyAccusation(node);
    if (matchGameplay(node, session, gameplayTurn)) gameplayTurn++;
    nodes.push(node);
  }
  return nodes;
}
