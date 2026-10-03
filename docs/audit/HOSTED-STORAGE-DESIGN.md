# Minimum hosted storage design

3 October 2026. Source review at `8eadbab`; **target design; staged implementation now has [local PostgreSQL/adapter evidence](HOSTED-STORAGE-FOUNDATION.md), but remains unintegrated and undeployed**. Preserve the working local/Codex demo. The smallest coherent hosted path uses the existing Supabase dependency for transactional Postgres state; private object storage is needed only when hosted voice is enabled. A Redis layer, background generation worker and account system are not prerequisites for a protected portfolio preview.

## Current boundaries and specific gaps

| Lifecycle | Current implementation | Required hosted change |
|---|---|---|
| Sessions, accepted actions, results and win grants | [SessionRepository](../../src/lib/session/repository-types.ts) is synchronous. [Store](../../src/lib/session/store.ts) caches mutable snapshots in process, uses revisions and PID/file locks; sessions become unavailable after one hour idle. | Async repository plus request-scoped working snapshots. Every authoritative read must consult shared storage; a process cache cannot establish current state. Distributed claims need owner/fence checks, not PID checks. |
| Action retries | [Request ledger](../../src/lib/session/request-ledger.ts) persists pending before model work and completion with mutated session on unlock. Maximum 500 actions/session; matching completion replays; interrupted work is not rerun. | Atomic claim/complete transactions preserve exact HTTP status/body and fingerprints. Losing a worker must not turn pending work back into permission to call a provider. |
| Generated case | [Generation receipt](../../src/lib/session/generation-requests.ts) reserves a session ID before work; validated checkpoint precedes session creation. Phases are persisted. 24-hour receipts; maximum 1,000 including expired tombstones. | Shared generation claim/checkpoint/materialization. A post-checkpoint retry can materialize the same case without another provider call. A pre-checkpoint interrupted request remains interrupted. |
| Limits | [Budget repository](../../src/lib/limits/repository.ts) serializes one local ledger. Endpoint buckets are path/IP scoped; AI and voice reservations remain spent after failures. | Atomic shared conditional reservations, server time and admission caps. Preserve 429 exhausted versus 503 unavailable. Per-session AI work units are not measured billing or a deployment-wide spend ceiling. |
| Completion exports | [Export service](../../src/lib/session/export.ts) always saves a local envelope before optional Supabase upsert. Existing `game_exports` table already holds canonical export data. | Persist terminal snapshot/export atomically in the same database. Remove filesystem outbox from hosted path. `EXPORT_STORAGE=supabase` alone is insufficient today. |
| Leaderboard | Existing [Supabase store](../../src/lib/leaderboard/supabase-store.ts) inserts once by session; [redemption](../../src/lib/leaderboard/redemption.ts) verifies the original token hash on retry. Token authority is still local. | Shared immutable win grant and transactional redemption; preserve first initials/score and retry receipt, including after token consumption. |
| Voice | [Voice receipt service](../../src/lib/voice/receipt-service.ts) persists pending then caches audio as base64 or STT JSON; 24-hour expiry, 256 receipts, 64 MiB total reservation cap. A 30-second operation may finish after caller disconnect. | Shared receipt/usage transaction; private immutable audio object referenced by a complete receipt. Request termination is not a durable worker guarantee. Do not repeat ambiguous provider work. |
| Optional retrieval | Migration 005 and current v3 table/RPC are independent of session persistence. | Keep `AI_RAG_ENABLED=false` for first hosted slice. Existing retrieval does not replace transactional game storage. |

The [repository selector](../../src/lib/session/repository.ts) deliberately refuses Vercel today. Keeping that guard until all mandatory stores are selected prevents a misleading partially hosted game. No live credentials or project configuration were inspected in this review.

## Proposed interfaces and ownership

Introduce async application storage ports, implemented locally first and then through Supabase RPCs. Keep the game rules in TypeScript; the database owns atomicity and authority. Do not translate arbitrary `mutate(ledger)` callbacks to remote operations or hold a SQL transaction open during an AI call.

```ts
// Proposed contract shape, not current exports.
loadSession(capability): Promise<PrivateSessionSnapshot | null>
claimAction(session, requestId, fingerprint): Promise<Replay | Busy | Interrupted | Claim>
completeAction(claim, expectedRevision, nextSession, response): Promise<Committed | Stale>
claimGeneration(requestId, fingerprint): Promise<Replay | Busy | Interrupted | GenerationClaim>
saveGenerationCheckpoint(claim, validatedCase): Promise<void>
materializeGeneration(claim): Promise<PublicCaseResponse>
reserveProviderWork(claim, operationId, units): Promise<Allowed | Exhausted>
claimVoice(session, kind, requestId, fingerprint, reservedBytes): Promise<Replay | Busy | Claim>
completeVoice(claim, responseOrObjectReference): Promise<void>
redeemWin(session, token, initials): Promise<OriginalLeaderboardReceipt>
```

Use narrow modules for session transactions, generation receipts, limits, exports and voice. `getSessionStats`/result projection currently re-enter the store by ID; refactor them to accept the loaded working snapshot where necessary. Async conversion reaches routes, voice authorization, result/export and token consumers, not just one adapter file. Preserve public response shapes and stable client request IDs. Generation progress callbacks/checkpoint saves must become awaited persistence operations.

Suggested additive migration after 005:

| Object | Minimum contents / invariant |
|---|---|
| `game_sessions` | Capability lookup hash, version, revision, private JSON snapshot, expiry/activity, lease owner/deadline and monotonically increasing fence. One canonical terminal outcome. |
| `game_requests` | Unique `(session_key, request_id_hash)`, fingerprint, pending/complete/interrupted, exact response, timestamps/fence. At most 500 admitted actions. |
| `game_generation_requests` | Unique capability hash, fingerprint, reserved session ID, phase, private checkpoint, exact completion response and expiry/tombstone. |
| `game_usage` plus work reservations | Endpoint/AI/voice/global scope counters; unique reservation `(request, operation)` prevents charging a persistence retry twice. Draft and review are distinct operations. Counters and reservations change in one transaction. |
| `game_voice_requests` | Session/kind/request key, fingerprint, reservation, status, response JSON or private audio key/size/hash, expiry/tombstone. |
| Existing `game_exports`, `leaderboard` | Retain table formats and unique session constraints. Save immutable terminal export and canonical redemption; preserve existing legacy rows without invented ranking metadata. |
| Private voice bucket, only for voice stage | Immutable receipt-owned audio; no public bucket and no browser service key. STT uploads need not be stored for the bounded-upload version. |

Use a dedicated private schema for new internal tables where practical; expose only narrowly granted RPCs. Revoke table/function access from PUBLIC, anon and authenticated; grant trusted server access. RPCs must set a safe search path and qualified names if elevated privileges are necessary. Supabase documents function privilege configuration and recommends invoker security by default. [Database functions](https://supabase.com/docs/guides/database/functions)

## Transaction and crash contracts

1. **Claim before effects:** atomically validate capability/expiry, compare existing fingerprint, replay a completion, or claim an idle session and write pending request. Return a loaded snapshot, expected revision and fencing token. Concurrent other work returns busy. Use database time. Never extend an expired session from an untrusted cached snapshot.
2. **Reserve before each provider call:** commit a uniquely identified reservation and check session plus deployment allowance. Ambiguous reservation delivery is resolved by reading the reservation, not refunding or reissuing a provider call. Reservations remain consumed on provider error. Endpoint admission remains independent from provider charges.
3. **Commit once:** a short transaction checks ownership, revision and fence; writes session, accepted-event evidence, request response, terminal result/grant/export when applicable. Only confirmed commit permits success. A lost response replays exactly. An old worker cannot overwrite a newer action after lease expiry.
4. **Worker loss:** use a bounded lease beyond the configured operation deadline, with fenced heartbeat if required. Expiry invalidates authority; it does not prove the external call never occurred. Mark the abandoned request interrupted and release its session for an explicit new action. Do not re-execute the old request. If a late worker returns, reject its stale commit.
5. **Generation recovery:** save the validated checkpoint under the generation fence, then atomically create-or-confirm its reserved session and complete the public receipt. Existing matching session progress is preserved. An expired worker with no checkpoint cannot be restarted automatically. Phases remain observable without exposing checkpoint facts.
6. **Voice completion:** atomically claim the request and reserve work/cache allowance before ElevenLabs. Save returned audio to a deterministic immutable private object key, then complete its receipt with size/hash. A crash after object save can finalize from that verified object without re-synthesis; no object means uncertain/interrupted. Cleanup removes only orphaned objects after a grace period. An expired signed URL can be reissued after capability authorization without calling ElevenLabs. Object storage and SQL are not one atomic transaction.
7. **Score redemption:** a transaction checks the durable grant/ranked snapshot, inserts the first score once and marks consumed. An existing score is returned only for its matching redemption hash; consumption does not erase the ability to recover that receipt. No browser-supplied score fields become authoritative.

## Minimum Vercel delivery sequence

**First: protected text-only preview.** Use the OpenAI adapter and Supabase session/request/generation/budget/export/leaderboard ports. Keep local Codex as the local path; this repository has no subscription-based hosted adapter. Host with voice explicitly unavailable until the voice stage is accepted, preserving text play. Do not silently substitute local files or memory when shared storage fails.

Set explicit Node runtime and a function deadline greater than the app's 120-second generation deadline plus persistence time; 180 seconds is a starting proposal to verify in the actual project. Current Fluid Compute documentation allows 300 seconds on Hobby, but the account's actual configuration is unverified. No queue is required merely because the demonstrated generation took about 71 seconds. The current route does not declare `maxDuration`. [Vercel duration configuration](https://vercel.com/docs/functions/configuring-functions/duration)

**Then: bounded hosted voice.** Keep the existing 30-second provider deadline and receipt behavior. For the minimum transport, reduce hosted microphone uploads to 3 MiB and show that limit before recording/upload; preserve the local 25 MiB limit. Return a short-lived, capability-authorized private audio download URL for TTS rather than proxying an up-to-8 MiB result through the function; adapt the playback resource owner to this response. A signed URL is a temporary bearer capability and must not enter logs or public exports. Supabase service credentials bypass Storage RLS and belong only on the server. [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)

Vercel currently documents a 4.5 MB function request/response payload limit. Existing 25 MiB STT uploads and up-to-8 MiB buffered TTS are incompatible with that advertised envelope. The admin export's current 1,000-row maximum can also exceed it: use byte-bounded pages with an explicit continuation cursor, and verify unusually large single-session records. Retaining 25 MiB hosted uploads would require direct private uploads and additional upload-authorization/cleanup work, so defer that rather than imply parity. [Vercel function limits](https://vercel.com/docs/functions/limitations)

## Decisions and genuine blockers

| Missing input | Concrete default / decision needed | What it blocks |
|---|---|---|
| Hosted database target | Supabase project/environment and region; server URL/service-role credential; disposable migration target and authority to apply SQL. Existing local env values were not examined. | Live migrations, privileges and cross-instance acceptance. SQL/interface implementation can proceed without credentials. |
| Hosted AI credential | User said no API key yet. Configure server-only `OPENAI_API_KEY`, approved models and allowance when available. | Live hosted generation/dialogue/judgment, not controlled adapter testing. Do not copy Codex login material. |
| Vercel target | Project/team, protected preview access, region near DB, Node 24 compatibility and actual duration setting. | Deployment/runtime proof. Existing local pin is not proof of hosted selection. |
| Cost scope | Start protected, with an explicit deployment-wide call/character allowance plus existing session limits and operator stop. Choose its size before opening to public traffic. | Public paid-provider exposure. Work-unit caps are conservative limits, not exact currency metering. |
| Retention | Proposed preview: preserve current 1-hour session availability and 24-hour generation/voice replay; keep compact request tombstones after payload/audio deletion. Select transcript/export retention and cleanup owner before storing real visitors' data. | Operational cleanup acceptance. Deleting tombstones must not turn old IDs into fresh paid work; indefinite tombstone retention needs a bounded namespace/epoch strategy before broad use. |
| Hosted voice | Server ElevenLabs credential, private bucket and acceptance of 3 MiB upload limit versus later direct upload. Plugin account access alone does not configure deployed route credentials. | Voice stage only; text preview can ship first. |

There is no source-level design blocker to starting the async ports/additive migration next. It is a multi-boundary change, so implementing only `SupabaseSessionRepository` would be incomplete. Preserve the current local mode and its receipts while integrating one protected hosted vertical slice.

## Bounded acceptance plan

Reuse existing critical-route fixtures with injected provider transport; add only storage-specific cases. No paid batches or broad UI test expansion.

- **Shared-state route:** two independent processes use the same disposable DB. Authored start → accepted question/evidence → wrong/right accusation → canonical result/export → third-process recovery must retain exact transcript, counters and response. A generated fixture separately proves draft/review checkpoint materialization without replaying provider work.
- **Race/crash contract:** same-ID concurrent replay and changed-body conflict; different-ID same-session exclusion; kill after provider reservation and reject repeat work; kill after generation checkpoint and resume the same case; late stale-fence writer rejected; lost completion response replays. Assert provider transport invocation counts and one export/score.
- **Limits/privacy/retention:** concurrent quota-boundary reservations never overspend; unavailable DB produces 503, exhausted quota 429; anonymous table/RPC/object access denied; public projections omit private facts and grants except intended capability responses; expired receipt cannot regenerate; payload cleanup retains retry protection.
- **Voice stage only:** one controlled TTS object survives worker loss and refresh without another provider call; one STT receipt replays; unauthorized text rejected; hosted upload boundary and private URL authorization enforced; orphan cleanup cannot remove completed audio still within retention.
- **Hosted acceptance after credentials:** one protected preview playthrough using the actual OpenAI adapter, restart/cross-instance recovery and one narrowly authorized voice round trip if enabled. Verify function timeout and payload behavior at the deployed boundary, not solely in local fixtures. Migration rollback keeps local demo available; it does not delete canonical hosted records to make tests pass.

This design report originally recorded source/official-documentation review only. The subsequent [foundation checkpoint](HOSTED-STORAGE-FOUNDATION.md) implements and tests additive migrations006/007 in an isolated local PostgreSQL fixture. No remote migration, live credential read, provider call, deployment or hosted acceptance is established.

Skills applied: use, dec-software-principles, agent-reliability-and-guardrails, dec-quality-testing.
