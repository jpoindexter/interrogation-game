export interface AiProvenance {
  provider: string; model: string; capability: AiCapability; promptHash: string;
}
export type AiCapability = 'case' | 'case-review' | 'suspect' | 'judge' | 'debrief';
export interface StructuredTask {
  capability: AiCapability;
  instructions: string;
  input: string;
  schema: Record<string, unknown>;
  signal?: AbortSignal;
  onProvenance?: (provenance: AiProvenance) => void;
}
export interface AiProvider {
  generate(task: StructuredTask): Promise<Record<string, unknown>>;
}
export class AiError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'AiError';
  }
}
