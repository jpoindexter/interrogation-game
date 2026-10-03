import type { DialogueAction, DialogueResult, PublicStatement, RecordedTurn } from '@/lib/gameplay/client';
import type { PublicExhibit, PublicGameplayProjection } from './types';

export interface PinUpdate { statement: PublicStatement; gameplay: PublicGameplayProjection }
export interface ActionUpdate {
  result: DialogueResult;
  gameplay: PublicGameplayProjection;
  response: string;
  clues: { id: string; text: string }[];
  stressLevel: number;
  startedAt: number;
}
export type GameplayUpdate = PinUpdate | ActionUpdate;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid server response.');
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid text in server response.');
  return value;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Invalid number in server response.');
  return value;
}
function unique<T extends { id: string }>(items: T[]): T[] {
  if (items.some(item => !item.id.trim()) || new Set(items.map(item => item.id)).size !== items.length) {
    throw new Error('Invalid or repeated source in server response.');
  }
  return items;
}
function list<T>(value: unknown, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new Error('Invalid list in server response.');
  return value.map(parse);
}
function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (!choices.includes(value as T)) throw new Error('Invalid status in server response.');
  return value as T;
}
function parseStatement(value: unknown): PublicStatement {
  const item = record(value);
  return { id: string(item.id), turnId: string(item.turnId), quote: string(item.quote), ...reviewed(item.reviewed) };
}
function parseTurn(value: unknown): RecordedTurn {
  const item = record(value);
  return { id: string(item.id), question: string(item.question), answer: string(item.answer), timestamp: number(item.timestamp), ...reviewed(item.reviewed) };
}
function parseExhibit(value: unknown): PublicExhibit {
  const item = record(value);
  return { id: string(item.id), title: string(item.title), text: string(item.text), kind: choice(item.kind, ['document', 'timeline', 'witness']) };
}
export function parseGameplayProjection(value: unknown): PublicGameplayProjection {
  const item = record(value);
  const parsed = {
    caseId: string(item.caseId), title: string(item.title), briefing: string(item.briefing),
    status: choice(item.status, ['active', 'ended']), establishedCount: number(item.establishedCount),
    turns: unique(list(item.turns, parseTurn)), statements: unique(list(item.statements, parseStatement)), exhibits: unique(list(item.exhibits, parseExhibit)),
  };
  for (const statement of parsed.statements) {
    const source = parsed.turns.find(turn => turn.id === statement.turnId);
    if (!statement.quote.trim() || !source?.answer.includes(statement.quote)) throw new Error('A statement does not match its recorded source.');
  }
  return parsed;
}
function parseResult(value: unknown): DialogueResult {
  const item = record(value);
  if (typeof item.progressAdded !== 'boolean') throw new Error('Invalid progress in server response.');
  return {
    actionId: string(item.actionId), turnId: string(item.turnId), answer: string(item.answer),
    statementId: string(item.statementId), exhibitId: item.exhibitId === undefined ? undefined : string(item.exhibitId),
    status: choice(item.status, ['contradiction_established', 'not_established', 'unreviewed_statement', 'dialogue_only']),
    explanation: string(item.explanation), progressAdded: item.progressAdded, establishedCount: number(item.establishedCount),
  };
}
export function parsePinUpdate(value: unknown, source: { turnId: string; quote: string }): PinUpdate {
  const item = record(value);
  const statement = parseStatement(item.statement);
  const gameplay = parseGameplayProjection(item.gameplay);
  const turn = gameplay.turns.find(turn => turn.id === source.turnId);
  if (statement.turnId !== source.turnId || statement.quote !== source.quote || !turn?.answer.includes(source.quote)) throw new Error('The pinned statement did not match its source.');
  if (!gameplay.statements.some(pin => pin.id === statement.id && pin.quote === statement.quote && pin.turnId === statement.turnId)) throw new Error('The pinned statement was not saved.');
  return { statement, gameplay };
}
export function parseActionUpdate(value: unknown, action: DialogueAction): ActionUpdate {
  const item = record(value);
  const parsed = {
    result: matchedResult(item.result, action), gameplay: parseGameplayProjection(item.gameplay),
    response: string(item.response), clues: unique(list(item.clues, parseClue)),
    stressLevel: number(item.stressLevel), startedAt: number(item.startedAt),
  };
  validateActionSources(parsed);
  return parsed;
}

function validateActionSources(update: ActionUpdate) {
  const { gameplay, result, response } = update;
  const turn = gameplay.turns.find(turn => turn.id === result.turnId);
  const statement = gameplay.statements.find(statement => statement.id === result.statementId);
  if (!turn || !statement || turn.answer !== response || result.answer !== response) throw new Error('The challenge does not match its recorded exchange.');
  if (result.exhibitId && !gameplay.exhibits.some(exhibit => exhibit.id === result.exhibitId)) throw new Error('The challenge exhibit was not disclosed.');
  validateActionProgress(update);
}
function validateActionProgress({ result, gameplay, stressLevel }: ActionUpdate) {
  if (result.establishedCount !== gameplay.establishedCount || stressLevel > 10) throw new Error('The challenge progress is invalid.');
  if (result.progressAdded && result.status !== 'contradiction_established') throw new Error('This challenge cannot award progress.');
}

function matchedResult(value: unknown, action: DialogueAction): DialogueResult {
  const result = parseResult(value);
  if (result.actionId !== action.id || result.statementId !== action.statementId || result.exhibitId !== action.exhibitId) throw new Error('The response did not match the submitted sources.');
  validateActionKind(result, action.kind);
  if (result.progressAdded && result.establishedCount === 0) throw new Error('Contradiction progress was not recorded.');
  return result;
}
function validateActionKind(result: DialogueResult, kind: DialogueAction['kind']) {
  if (kind !== 'present_evidence' && result.status !== 'dialogue_only') throw new Error('Ordinary dialogue cannot establish a contradiction.');
  if (kind === 'present_evidence' && (!result.exhibitId || result.status === 'dialogue_only')) throw new Error('An evidence challenge needs an exhibit and a recorded assessment.');
}

function parseClue(value: unknown): { id: string; text: string } {
  const item = record(value);
  return { id: string(item.id), text: string(item.text) };
}

function reviewed(value: unknown): { reviewed?: boolean } {
  if (value !== undefined && typeof value !== 'boolean') throw new Error('Invalid review status in server response.');
  return typeof value === 'boolean' ? { reviewed: value } : {};
}
