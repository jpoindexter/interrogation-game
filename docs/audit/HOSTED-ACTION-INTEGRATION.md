# Shared action orchestration and terminal persistence

3 October 2026. This implements the next part of [the shared-storage foundation](HOSTED-STORAGE-FOUNDATION.md). The public application still selects local storage: shared generation/admission/redemption and route selection remain unfinished. No Vercel-ready claim follows from this checkpoint.

## Implemented behavior

- **Claimed working state:** [runHostedSessionRequest](../../src/lib/storage/hosted/action.ts) claims the request, validates its domain snapshot, restores prior receipts and executes existing domain functions in an async [session workspace](../../src/lib/session/workspace.ts). Store reads resolve only that session; attempts to fall back to local persistence inside the workspace fail. There is no hosted process-global session cache. The next snapshot is validated again before commit.
- **Full domain boundary:** small validation modules check case structure, session lifecycle, counters, chronology, conversation kinds, accepted events, authored evidence references and frozen result/token scores. They preserve optional legacy metadata without inventing it. This is structural and cross-field validation, not a generated-story fairness judgment.
- **Awaited provider admission:** the AI gateway and embeddings now await the reservation boundary. Local mode retains the existing durable limits. A hosted workspace uses a stable action/operation identity and [claim-bound work RPC](../../database/migrations/009_hosted_claimed_work.sql). Owner, request fingerprint, revision, fence and lease must remain current before quota is spent. Lease validity is checked after waiting on the deployment lock. A replayed reservation cannot authorize another provider invocation.
- **Atomic completion:** [migration008](../../database/migrations/008_hosted_terminal_export.sql) commits the session, exact response, terminal export and any win grant together. Invalid exports or insertion failures roll the entire completion back. Hosted exports are immutable; ordinary local-mode export upserts remain supported. Score calculation stays in the validated TypeScript domain; SQL checks canonical field/counter/result bindings rather than duplicating the scoring algorithm.
- **Recovered conversation map:** private receipts restore prior accusation verdicts to the scoped domain record. They are not duplicated into the hosted snapshot. Result projection can distinguish unsupported and supported accusations after reload. Old unfenced completion and unbound reservation RPC permissions are revoked for the service role once 008/009 are applied.

A staged export receipt is returned from the domain helper while inside a workspace, but orchestration does not expose the response until the database confirms the atomic commit. Uncertain transport returns a storage error and preserves the stable request for recovery.

## Executed evidence

[Orchestration receipt](evidence/hosted-action-postgres.txt) runs the real async adapters, domain transitions and PostgreSQL through independent `psql` connections. It creates a fixed generated-case-shaped fixture, begins play, commits a question, evaluates one wrong and one correct accusation through the actual AI gateway with controlled OpenAI HTTP, and confirms canonical win/token/export. Replaying the accepted accusation makes no extra provider call. A fresh adapter reloads the result and prior verdicts; the map reports unsupported then supported. Exactly one export exists. After two allowed controlled calls, a third request returns 429 before provider fetch.

The fixture sets local storage to an unsupported mode during shared orchestration; domain reads still use the claimed snapshot and a different session ID cannot fall back to local state. This is an actual storage/domain integration path, not the public HTTP route-selection path or a full authored evidence-challenge playthrough.

[Combined PostgreSQL receipt](evidence/hosted-integration-postgres.txt) applies migrations001/004/006/007/008/009 in an isolated Unix-socket-only cluster. Existing concurrency/replay checks plus new terminal rollback/immutability, private receipt grants and claim-bound quota checks passed. A real lock wait crossed the lease deadline and denied spending afterward. No live project or credentials were used; both temporary clusters were stopped and removed.

[21 focused regression checks](evidence/hosted-integration-regression.txt) passed across affected local persistence, local AI budgets, adapters and domain validation. The broad full suite was not rerun. [Strict lint](evidence/hosted-integration-lint.txt), [size](evidence/hosted-integration-size.txt) and [production build](evidence/hosted-integration-build.txt) passed.

A parallel read-only review found no blocking transaction-boundary defect. Its recovery-copy finding was corrected: a committed action failure now asks the player to review the recovered session before starting a new attempt, rather than imply replay will execute it again. This review adds no live-provider or browser evidence.

The final production build and scoped lint passed after that wording change. The owned localhost preview was restarted; [HTTP checks](evidence/hosted-integration-http-smoke.json) returned 200 for health, case selection and About. All 316 relative links in the changed documentation resolved. Trello descriptions for ARCH-06, LOGIC-12 and LOGIC-15 were updated and read back; the board remains 70 cards with 15 Done. These checks do not establish browser rendering or a hosted game.

## Remaining work and re-entry

The subsequent [generation/redemption checkpoint](HOSTED-GENERATION-REDEMPTION.md) implements shared generation materialization and atomic score redemption. The numbered list below records the prior handoff; endpoint admission, public route selection, hosted voice and live acceptance remain open.

1. Add shared generation request/phase/checkpoint materialization and endpoint admission. Maintain the current stable generated-request recovery semantics and apply the same awaited work protection before generation/review calls.
2. Implement transactional score redemption from the stored grant, then route normal session reads/actions/results through the appropriate async backend. Hosted action snapshots already retain grants; leaderboard redemption has not moved from the local-token path.
3. Exercise the complete public text HTTP path across independent workers with controlled provider transport before enabling hosted configuration. Then verify a disposable Supabase/PostgREST target, actual OpenAI key and protected Vercel preview when available.
4. Integrate hosted voice receipts/private audio objects, payload limits and retention cleanup. No live voice, browser or screen-share acceptance occurred here.

Generation selection and hosted guards deliberately remain as before. The current local demo stays available. Database policy configuration, request tombstone retention and remote migrations still require their documented operational decisions; the new functions alone do not establish a public deployment.

Reproduce the bounded changed paths when needed:

```sh
node --import tsx tests/hosted-action-postgres.ts
node tests/hosted-storage-postgres.mjs
```

Both runners use their own disposable PostgreSQL cluster, with the existing `POSTGRES_BIN` override; neither belongs to ordinary automatic test discovery.

Skills applied: use, agent-fanout, dec-software-principles, dec-quality-testing, enforcing-code-size, agent-reliability-and-guardrails.
