export class GameplayError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'GameplayError';
  }
}

export function requireCondition(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new GameplayError(code, message);
}
