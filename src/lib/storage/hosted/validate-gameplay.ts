import type { GameSession } from '../../session/types';
import type { DialogueAction, GameplayState } from '../../gameplay/types';
import { LEDGER_DEMO_CASE as authored } from '../../gameplay/demo-case';
import { parseDialogueAction } from '../../gameplay/dialogue';
import { invalidResponse } from './rpc';
import { check, count, list, record, strings, text, unique } from './validation';

function validateTurns(value: unknown, sessionId: string): void {
  const turns = list(value).map(record);
  turns.forEach((turn, index) => {
    check(turn.id === `${sessionId}:turn:${index + 1}`);
    check(text(turn.question) && text(turn.answer, 2000) && count(turn.timestamp));
    check(turn.reviewed === undefined || typeof turn.reviewed === 'boolean');
  });
}

function validateStatements(value: unknown, state: GameplayState): void {
  list(value).map(record).forEach((statement, index) => {
    check(statement.id === `${state.sessionId}:statement:${index + 1}` && text(statement.quote, 2000));
    const turn = state.turns.find(item => item.id === statement.turnId);
    check(turn && turn.answer.includes(statement.quote));
    if (statement.claimId === null) return;
    const claim = authored.claims.find(item => item.id === statement.claimId);
    check(claim && statement.quote === turn.answer);
    check([claim.assertion, ...claim.alternateAssertions].includes(statement.quote));
  });
}

function validateAction(value: unknown, state: GameplayState): DialogueAction {
  let action: DialogueAction;
  try { action = parseDialogueAction(value); } catch { return invalidResponse(); }
  check(state.statements.some(statement => statement.id === action.statementId));
  if (action.kind === 'present_evidence') check(state.disclosedExhibitIds.includes(action.exhibitId!));
  return action;
}

function fingerprintAction(value: unknown, state: GameplayState): DialogueAction {
  check(text(value, 10000));
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { return invalidResponse(); }
  const action = validateAction(parsed, state);
  check(JSON.stringify(action) === value);
  return action;
}

function validateReceipt(key: string, value: unknown, state: GameplayState): void {
  const receipt = record(value);
  const action = fingerprintAction(receipt.fingerprint, state);
  check(action.id === key);
  const result = record(receipt.result);
  check(result.actionId === key && result.statementId === action.statementId && result.exhibitId === action.exhibitId);
  const turn = state.turns.find(item => item.id === result.turnId);
  check(turn && turn.answer === result.answer && turn.question === action.question);
  check(typeof result.progressAdded === 'boolean' && text(result.explanation));
  check(count(result.establishedCount, state.establishedContradictionIds.length));
  validateReceiptVerdict(action, result, state);
}

function validateReceiptVerdict(action: DialogueAction, result: Record<string, unknown>, state: GameplayState): void {
  const statement = state.statements.find(item => item.id === action.statementId)!;
  const link = authored.contradictions.find(item => item.claimId === statement.claimId && item.exhibitId === action.exhibitId);
  const expected = action.kind !== 'present_evidence' ? 'dialogue_only'
    : statement.claimId === null ? 'unreviewed_statement' : link ? 'contradiction_established' : 'not_established';
  check(result.status === expected);
  if (result.progressAdded) check(Number(result.establishedCount) > 0);
  if (link) check(state.establishedContradictionIds.includes(link.id));
  if (result.progressAdded) check(link && state.establishedChallenges.some(item => item.actionId === action.id));
}

function validateEstablished(state: GameplayState): void {
  const ids = strings(state.establishedContradictionIds);
  unique(ids);
  check(ids.every(id => authored.contradictions.some(link => link.id === id)));
  const challenges = list(state.establishedChallenges).map(record);
  check(challenges.length === ids.length);
  unique(challenges.map(challenge => { check(text(challenge.contradictionId)); return challenge.contradictionId; }));
  for (const challenge of challenges) {
    const link = authored.contradictions.find(item => item.id === challenge.contradictionId);
    check(link && ids.includes(link.id) && link.exhibitId === challenge.exhibitId);
    const statement = state.statements.find(item => item.id === challenge.statementId);
    check(statement && statement.claimId === link.claimId && state.disclosedExhibitIds.includes(link.exhibitId));
    check(typeof challenge.actionId === 'string' && Object.hasOwn(state.receipts, challenge.actionId));
    const result = record(record(state.receipts[challenge.actionId]).result);
    check(result.progressAdded === true && result.statementId === statement.id && result.exhibitId === link.exhibitId);
  }
}

function validatePending(value: unknown, state: GameplayState): void {
  if (value === null) return;
  const pending = record(value);
  check(state.status === 'active' && count(pending.attempt) && pending.attempt > 0 && pending.attempt < state.nextAttempt);
  const action = validateAction(pending.action, state);
  check(pending.fingerprint === JSON.stringify(action) && !Object.hasOwn(state.receipts, action.id));
}

export function validateHostedGameplay(session: GameSession): void {
  if (session.gameplay === undefined) return;
  const value = record(session.gameplay);
  check(session.caseData.mode === 'redteam' && value.caseId === authored.id && value.sessionId === session.id);
  check(value.status === (session.outcome ? 'ended' : 'active'));
  check(count(value.nextAttempt) && value.nextAttempt > 0);
  validateTurns(value.turns, session.id);
  const exhibits = strings(value.disclosedExhibitIds);
  unique(exhibits);
  check(exhibits.every(id => authored.exhibits.some(exhibit => exhibit.id === id)));
  check(authored.exhibits.filter(item => item.initiallyDisclosed).every(item => exhibits.includes(item.id)));
  const state = value as unknown as GameplayState;
  validateStatements(value.statements, state);
  const receipts = record(value.receipts);
  validateEstablished(state);
  Object.entries(receipts).forEach(([key, receipt]) => validateReceipt(key, receipt, state));
  validatePending(value.pending, state);
  if (session.outcome === 'win') check(state.establishedContradictionIds.length > 0);
}
