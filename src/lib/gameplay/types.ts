/** Server-only authored case. Never serialize this object to the browser. */
export interface GameplayCase {
  id: string;
  title: string;
  briefing: string;
  opening: string;
  claims: CanonicalClaim[];
  exhibits: CaseExhibit[];
  contradictions: Contradiction[];
  accusationClaimId: string;
}
export interface CanonicalClaim {
  id: string;
  assertion: string;
  alternateAssertions: string[];
  truth: string;
}
export interface CaseExhibit {
  id: string;
  title: string;
  kind: 'document' | 'timeline' | 'witness';
  text: string;
  initiallyDisclosed: boolean;
}
export interface Contradiction {
  id: string;
  claimId: string;
  exhibitId: string;
  explanation: string;
}
export interface RecordedTurn {
  id: string;
  question: string;
  answer: string;
  timestamp: number;
  /** Public projection only: reviewed wording, never a claim of truth. */
  reviewed?: boolean;
}
export interface RecordedStatement {
  id: string;
  turnId: string;
  quote: string;
  /** Internal authored binding, never accepted from browser/model payloads. */
  claimId: string | null;
}
export type DialogueKind = 'clarify' | 'present_evidence' | 'leave_space';
export interface DialogueAction {
  id: string;
  kind: DialogueKind;
  statementId: string;
  question: string;
  exhibitId?: string;
}
export type ChallengeStatus = 'contradiction_established' | 'not_established' | 'unreviewed_statement' | 'dialogue_only';
export interface DialogueResult {
  actionId: string;
  turnId: string;
  answer: string;
  statementId: string;
  exhibitId?: string;
  status: ChallengeStatus;
  explanation: string;
  progressAdded: boolean;
  establishedCount: number;
}
export interface ActionReceipt {
  fingerprint: string;
  result: DialogueResult;
}
export interface GameplayState {
  sessionId: string;
  caseId: string;
  status: 'active' | 'ended';
  turns: RecordedTurn[];
  statements: RecordedStatement[];
  disclosedExhibitIds: string[];
  establishedContradictionIds: string[];
  establishedChallenges: { contradictionId: string; statementId: string; exhibitId: string; actionId: string }[];
  nextAttempt: number;
  receipts: Record<string, ActionReceipt>;
  pending: { action: DialogueAction; fingerprint: string; attempt: number } | null;
}
export interface PublicStatement {
  id: string;
  turnId: string;
  quote: string;
  reviewed?: boolean;
}

/** Browser-visible source records; legacy records may lack the review annotation. */
export interface PublicExhibit {
  id: string;
  title: string;
  kind: 'document' | 'timeline' | 'witness';
  text: string;
}
export interface PublicGameplayProjection {
  caseId: string;
  title: string;
  briefing: string;
  status: 'active' | 'ended';
  turns: RecordedTurn[];
  statements: PublicStatement[];
  exhibits: PublicExhibit[];
  establishedCount: number;
}
