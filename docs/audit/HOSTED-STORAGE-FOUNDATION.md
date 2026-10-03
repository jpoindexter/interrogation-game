# Shared storage foundation — executed local PostgreSQL evidence

3 October 2026. The first implementation stage of [the hosted design](HOSTED-STORAGE-DESIGN.md) now exists. **The application still runs the local adapter and refuses hosted session mode.** This checkpoint establishes database transactions and asynchronous storage adapters; it does not establish a Vercel game or live Supabase compatibility.

## Implemented boundaries

[Migration006](../../database/migrations/006_hosted_sessions.sql) creates private session/action tables and four service-role-only RPCs. A hashed capability selects a session. The database owns activity time, one-hour expiry, lease ownership and monotonically increasing fencing tokens. Claims record pending work before an external effect. Concurrent work is busy; a completed request replays its original status/body; changed fingerprints conflict. Expired pending work becomes interrupted and never regains permission to run. Completion checks owner, revision, fence and lease before atomically saving the next snapshot and exact response. Case facts, creation time and timer mode cannot change. Terminal session facts, outcome, evaluation and token cannot be rewritten through these functions.

[Migration007](../../database/migrations/007_hosted_budgets.sql) reserves work against lifetime session allowances and a deployment window in one short transaction. AI, TTS and STT use separate units/scopes; this is not exact currency accounting or a single combined money ceiling. Concurrent reservations cannot independently spend the same remaining allowance. Stable operation replay returns `already_reserved`, which means recover the earlier work, not invoke a provider again. There is no refund operation. First-use policy is frozen; changing configured limits requires an explicit migration rather than silently resetting usage.

[Asynchronous session storage](../../src/lib/storage/hosted/session.ts) and [work storage](../../src/lib/storage/hosted/budget.ts) call those RPCs through the existing trusted Supabase client. They hash lookup identifiers, validate discriminated responses and capability/revision binding, and preserve replay/interrupted/busy/exhausted distinctions. Transport failure becomes a sanitized uncertain-storage error. The installed SDK retries by default; this adapter explicitly disables retries for these calls, because an absent response does not prove a database effect failed. No credentials or RPC payloads are logged.

The adapter's `HostedSnapshot` is deliberately a storage envelope with opaque session fields. It is not proof of a valid `GameSession`; full domain validation is still required when integrating routes. Do not cast an arbitrary stored envelope into authoritative gameplay state.

## Executed evidence

- [Real PostgreSQL14.18 receipt](evidence/hosted-storage-postgres.txt): both migrations applied in a newly initialized, Unix-socket-only disposable cluster. Concurrent create/claim, exact response replay, changed fingerprints, stale revisions/owners, real lease expiry, interrupted request protection, frozen facts, terminal immutability and expiry rejection executed. Injected trigger failures proved snapshot/receipt and counters/reservation rollback. Concurrent quota reservations exercised session and deployment boundaries. Anonymous/authenticated/unprivileged roles could not call the RPCs or read private tables; PUBLIC grants were absent.
- [Two adapter checks](evidence/hosted-storage-adapter.txt): the real Supabase SDK with controlled HTTP transport checked RPC paths, hashed keys, claims, commits, replay, mismatched session rejection and one-attempt503 behavior. A bounded work-adapter check distinguishes a new reservation from a replay and rejects mismatched units. These checks use controlled transport, not a live Supabase project.
- The SQL runner stopped and removed only its own temporary cluster. No live database, project credential, provider call, browser automation or deployment was used.

Reproduce only when these boundaries change:

```sh
POSTGRES_BIN=/opt/homebrew/bin node tests/hosted-storage-postgres.mjs
node --import tsx --test tests/hosted-storage-adapter.test.ts
```

The PostgreSQL runner is explicit opt-in; it is not included in the ordinary test discovery and requires local PostgreSQL binaries. SQL files remain below300 lines; the atomic transaction functions exceed the preferred TypeScript function length because their checks/writes must commit together. They perform no provider or network calls while holding database locks.

## Remaining integration, in dependency order

1. Introduce request-scoped asynchronous session orchestration with domain validation. Preserve stable create payloads, request fingerprints and public response contracts; remove process-global authority only for the explicitly selected shared adapter.
2. Add shared generation receipts/checkpoints, endpoint admission, and binding between claimed actions and work reservations. A successful work reservation alone does not prove an action claim is still current. Persist terminal exports and score grants/redemption atomically; existing local outbox and token operations are not replaced by these migrations.
3. Integrate all mandatory text-path stores and run a provider-controlled authored game across independent processes. Only then consider changing the hosted configuration guard. Test actual Supabase/PostgREST migrations, privileges and hosted OpenAI behavior when a disposable target/key is supplied.
4. Implement bounded hosted voice receipt/object handling, admission/retention cleanup and explicit deployment/cost configuration before its separate live acceptance. Current pending requests/usage tombstones are retained indefinitely; no production cleanup guarantee is claimed. Historical request responses remain private and contain game data.

Load is a snapshot read and does not extend session activity. Create retries must use the exact original record, including initial timestamps; its digest permits recovery without resetting later progress. Completing a pending call after lease expiry is rejected even if the provider eventually succeeded. The client must surface uncertain completion and recover by stable request ID, never silently authorize another effect.

Sources used for transaction/privilege design: [PostgreSQL14 explicit locking](https://www.postgresql.org/docs/14/explicit-locking.html) and [Supabase database function privileges/search paths](https://supabase.com/docs/guides/database/functions). Local PostgreSQL role checks do not establish the settings of an uninspected Supabase project.

Skills applied: use, agent-fanout, dec-software-principles, agent-reliability-and-guardrails, dec-quality-testing, enforcing-code-size.
