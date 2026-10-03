export interface RecordedEvidence {
  statement: string;
  exhibitTitle: string;
  exhibitText: string;
}
export interface RecordedStep {
  title: string;
  kind: 'opening' | 'challenge' | 'accusation' | 'result';
  status: 'neutral' | 'unsupported' | 'supported';
  question: string;
  answer: string;
  explanation: string | null;
  evidence: RecordedEvidence | null;
  reveal: { lie: string; truth: string; contradiction: string } | null;
  sourcePointer: string;
}
export interface RecordedWalkthrough {
  title: string;
  briefing: string;
  capturedAt: string;
  sourceFile: string;
  sourceSha256: string;
  provider: string;
  scope: string;
  steps: RecordedStep[];
}
