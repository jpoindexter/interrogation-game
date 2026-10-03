/** A dropped response must reuse its request ID; a known response permits a new attempt. */
export class RequestLedger {
  private readonly attempts = new Map<string, string>();
  constructor(private readonly nextId: () => string = () => crypto.randomUUID()) {}

  begin(path: string, body: Record<string, unknown>) {
    const fingerprint = JSON.stringify([path, Object.entries(body).sort(([a], [b]) => a.localeCompare(b))]);
    const id = this.attempts.get(fingerprint) ?? this.nextId();
    this.attempts.set(fingerprint, id);
    return { id, acknowledge: () => { this.attempts.delete(fingerprint); } };
  }
}
