# Shared generation recovery and score redemption

3 October 2026. This extends [shared action integration](HOSTED-ACTION-INTEGRATION.md). Public routes still select the local backend; shared endpoint admission, route selection and cross-worker HTTP acceptance remain unfinished. No remote migration or deployment occurred.

## Implemented

- [Generation intents](../../database/migrations/011_hosted_generation.sql) reserve one session identity before inference, expose only progress state, bind options by fingerprint and retain exact completion responses. A live lease excludes concurrent generation. After a lost worker, a saved checkpoint can be materialized under a new fence; absence of a checkpoint requires an explicit new attempt. Expired IDs cannot silently regenerate. The 1,000-record bound includes retained tombstones; cleanup/namespace policy remains an operational dependency.
- [Generation completion and work admission](../../database/migrations/012_hosted_generation_finish.sql) save initial session and public response in one transaction. The checkpoint's canonical case and original creation time bind materialization. Draft/review work requires a live generation claim and shares the eventual session's lifetime allowance. Checkpoint recovery cannot authorize more inference. Lease validity is checked after waiting on locks.
- [Awaited orchestration](../../src/lib/storage/hosted/generate-case.ts) uses the existing case generator, independent review, portrait assignment and public projection. Progress and checkpoint writes finish before dependent work. Shared preparation uses one signal for draft, review and optional retrieval, capped at 150 seconds and shortened to preserve 15 seconds of lease headroom; individual provider limits may stop it earlier. This deadline bound was added after review; the fixture does not claim a real 150-second timeout run. Uncertain checkpoint or completion delivery returns a recoverable storage failure, preserving the original request identity.
- [Pure initial state](../../src/lib/session/create-record.ts) and [validated checkpoints](../../src/lib/session/case-checkpoint.ts) let local and shared storage use the same case preparation. Authored gameplay and provenance are assembled before initial persistence. Local recovery retains accepted progress and supports older checkpoints already bound by their receipt fingerprint.
- [Score redemption](../../database/migrations/010_hosted_redemption.sql) verifies the stored ranked win grant against the immutable terminal export, inserts its canonical score and consumes the grant atomically. Concurrent matching submissions return one public receipt. Token/name conflicts, expired grants and active action leases are rejected; stale writers cannot undo consumption. Submitted capability/token are hashed before the RPC, and public receipts omit both.

## Executed evidence

[Connected integration](evidence/hosted-generation-integration.txt) ran the actual TypeScript adapters and domain rules against disposable PostgreSQL, with controlled OpenAI HTTP. Draft and review observed their already-persisted phases. A deliberately lost completion response returned 503; a fresh request recovered the same generated briefing with exactly two provider calls. That session began, received a controlled winning judgment, saved one terminal export and redeemed one score. A later action hit the shared generation/gameplay allowance before another provider call, and the consumed grant survived the subsequent result commit. An uncertain authored checkpoint recovered without inference or a duplicate session. Public projection omitted private answers.

This is a connected storage/domain path, **not** the public HTTP route selection, a complete human playthrough, an actual model judgment, or deployed Supabase/PostgREST verification. The first integration attempt stopped at a misspelled fixture table name; correcting the harness let the recovery check execute. No application workaround was added.

[Generation SQL checks](evidence/hosted-generation-postgres.txt) cover concurrent claim/replay, changed options, immutable checkpoints, stale leases, pre-checkpoint interruption, atomic materialization rollback, role restrictions and bounded admission. [Redemption SQL checks](evidence/hosted-redemption-postgres.txt) cover concurrent one-row save, insert/consumption rollback, expired/future grants, name/token binding, stale writers and anonymous rejection. Each runner creates, stops and removes its own Unix-socket-only cluster.

[Nineteen existing regression checks](evidence/generation-seams-regression.txt) cover the affected local generation/recovery and authored route behavior with controlled transport. No broad full-suite or paid provider batch ran. [Strict lint](evidence/hosted-generation-lint.txt), [module sizes](evidence/hosted-generation-size.txt) and [production build](evidence/hosted-generation-build.txt) are recorded separately.

The rebuilt local preview returned 200 with expected health, case-selection and About content; [HTTP receipt](evidence/hosted-generation-http-smoke.json). This is not browser rendering or interaction proof. All 339 checked relative documentation links resolved. ARCH-06, LOGIC-12, LOGIC-07 and LOGIC-15 descriptions were updated and read back from Trello; the board remains 70 cards, 15 Done, with no acceptance closure from this increment.

## Next dependency

Implement shared endpoint admission, then select the asynchronous backend consistently for generation/status, session reads/actions/results and leaderboard submission. Preserve local mode, existing public response contracts, stable request IDs and explicit interrupted/expired recovery. Exercise those public HTTP paths across independent workers before enabling hosted configuration.

Hosted voice receipts/private objects, payload limits and retention remain separate source work. Live OpenAI/Supabase/Vercel acceptance requires the actual configured target; local ElevenLabs needs the app's server credential. User-owned browser and audio/video review remain pending. Trello acceptance is not closed by this checkpoint.

Explicit bounded runners, outside ordinary automatic test discovery:

```sh
node --import tsx tests/hosted-generation-integration.ts
node tests/hosted-generation-postgres.mjs
node --import tsx tests/hosted-redemption-postgres.ts
```

Skills applied: use, agent-fanout, dec-software-principles, dec-quality-testing, enforcing-code-size, agent-reliability-and-guardrails.
