# Shared text routes and worker recovery — 3 October 2026

The public text API can now select shared storage through explicit, validated server configuration. Local Codex remains the default. This is an implemented opt-in path with controlled HTTP/PostgreSQL acceptance, not a deployed or live-provider acceptance claim.

## Changes

- Migrations013–015 add atomic endpoint admission, transient read leases and original public retry IDs. Apply001/004/006–015 in order; optional historical retrieval migrations are separate.
- Generation/status, game actions, session/result recovery and score submission select the same shared backend. Missing configuration or unavailable storage returns a service failure; it cannot silently select local files. Vercel refuses local session storage.
- Shared configuration requires OpenAI, explicit call/character/window caps, a deployment namespace, shared leaderboard/export storage, and disabled retrieval. Keys remain server-only. Configuration readiness does not verify credentials or migrations.
- Read projections can atomically expire a game and save its result/export. Their temporary transaction receipt is removed before commit, so polling does not consume the 500-action allowance. Provider work is forbidden in this read workspace.
- Private action records retain their original retry ID alongside the hashed lookup key. Pending recovery returns that original ID; older records lacking it never expose a hash as a retry ID. Database constraints and adapter validation enforce the binding.
- Long-running generation, interrogation, gameplay and accusation routes declare Node runtime and a 180-second duration. Actual hosted timeout behavior remains unverified.
- Hosted voice returns an explicit unavailable response and leaves text play available. Hosted admin bulk export remains unavailable until response pages are byte bounded. These are unfinished requirements, not silently substituted local implementations.

Endpoint identity accepts a syntactically valid `x-real-ip` only when `VERCEL=1`; otherwise local requests share the local bucket. Missing/invalid hosted addresses share an unknown bucket. Vercel documents its overwritten proxy headers in [request headers](https://vercel.com/docs/headers/request-headers). The controlled fixture tests application behavior, not the actual Vercel proxy.

## Executed evidence

| Criterion | Execution and limit |
| --- | --- |
| Public flow across independent workers | [Three actual Next production processes](evidence/hosted-http.txt), build `Nd5D_4oxCCoNUdcub3hHz`, backed by isolated PostgreSQL 14.18. Authored generation → opening → evidence challenges → wrong/right accusations → result/map → export → leaderboard. A third process recovers identical responses, transcript, score and result with one export and one score. |
| Worker interruption | The HTTP fixture kills a worker during a held provider response. Another process recovers the original pending ID and refuses repeat inference for it. The abandoned lease is advanced in SQL to avoid a three-minute sleep; this particular check does not measure natural lease expiry. |
| Shared endpoint limit | Ten invalid submissions alternate between workers; the eleventh receives429. Database checks cover concurrent final-slot admission, endpoint/deployment isolation, policy consistency, unavailable storage, key capacity and private roles. [Admission receipt](evidence/hosted-admission-postgres.txt). |
| Polling and terminal persistence | [Actual database/read orchestration](evidence/hosted-read-postgres.txt) checks a full 500-action ledger remains readable, repeated reads leave no permanent receipt, late writers are fenced, and export failure rolls back. HTTP polling also leaves the action count unchanged. |
| Original retry identity | [Actual adapter/database/public projection](evidence/hosted-request-identity-postgres.txt) checks original ID recovery, hash binding, exact replay, legacy null IDs, reserved read filtering and revoked old claim permissions. |
| Score compatibility after migration015 | [Redemption adapter/PostgreSQL check](evidence/hosted-redemption-current.txt) executes concurrent save/replay, grant/name binding, failure rollback and stale-writer rejection using the new claim RPC. |
| Local behavior | [24 affected existing/configuration checks](evidence/hosted-routes-regression.txt) pass: generation, session/gameplay, leaderboard, voice, budgets and explicit hosted configuration. No full-suite repeat or paid provider batch. |
| Static integration | [Strict lint](evidence/hosted-routes-lint.txt), [size/complexity](evidence/hosted-routes-size.txt), [types](evidence/hosted-routes-types.txt) and [production build](evidence/hosted-routes-build.txt) pass. Two initially oversized-complexity functions were split; no suppression was added. |

The HTTP fixture intercepts only its child servers' synthetic Supabase/OpenAI fetch destinations. SDK RPC requests travel over test IPC to real isolated PostgreSQL transactions; provider responses are controlled. Five controlled provider invocations occur, including the interrupted request. No test hook was added to application code, no external provider was called, and no local fallback state files were written. Workers, clusters and temporary files were removed. The rebuilt local preview returned200 for health, case selection and game routes, with local Codex/storage selected and voice unconfigured; [HTTP-only smoke](evidence/hosted-routes-local-smoke.json).

## Reproduce narrowly

Use the pinned Node 24.21.0/npm 11.21.0 environment. Build first, then run `node tests/hosted-http.mjs`; PostgreSQL binaries must be available locally. The standalone SQL checks are `node tests/hosted-admission-postgres.mjs` and `node --import tsx tests/hosted-{read,request-identity,redemption}-postgres.ts`. These fixtures create and remove their own temporary clusters; they do not target a configured project.

## Remaining scope

ARCH-06 remains In progress; LOGIC-12 remains Verify. LOGIC-15's already accepted local criteria remain Done. This increment adds hosted-route evidence without closing live-provider, deployed infrastructure, browser or voice gates.

Next source work is bounded hosted audio authorization/storage/receipts, byte-bounded admin export and retention that preserves retry protection. Live Supabase/PostgREST access, actual OpenAI credentials, protected Vercel deployment, microphone/playback and user-owned browser/rehearsal checks remain unexecuted. No remote migration or deployment was performed. The full goal stays active.

Skills applied: use, agent-fanout, dec-software-principles, dec-quality-testing, enforcing-code-size, agent-reliability-and-guardrails.
