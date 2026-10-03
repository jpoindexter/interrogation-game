# Durable local demo state

The default local repository stores one versioned private session snapshot per game in `.local/sessions/`, using `INTERROGATION_DATA_DIR` as an optional parent directory. Snapshots include the case's hidden facts, accepted transcript, progress, terminal result, canonical win-token grant and request ledger. Files are created with mode 0600 and directories with 0700; keep the directory private and out of version control. Session snapshots expire from gameplay after one hour of inactivity; expiration does not automatically delete files or completed exports.

Writes use a flushed temporary file, atomic replacement, and a flushed parent directory. Session actions take an exclusive filesystem lock, so another local process cannot mutate the same session concurrently. A lock owned by a dead process can be recovered. Recovery itself uses a separate exclusive guard; if the process dies during that short recovery step, it fails closed instead of risking two writers. An operator must verify the recorded process is dead before clearing a leftover `.lock.recovery` file. Do not remove locks belonging to a running process.

`SESSION_STORAGE=local` is the supported backend. Vercel and non-local session backend values return an explicit unsupported-storage error. The repository interface is prepared for a shared transactional backend; these files do not establish hosted persistence.

## Request protocol

- `POST /api/interrogate`, `POST /api/accuse`, and `POST /api/hint` require a stable `requestId` (8–128 letters, digits, underscores or hyphens). Missing IDs fail before any action is performed. `POST /api/session/end` accepts `{sessionId, requestId, reason: "giveup" | "time"}`. The server verifies time expiry itself.
- Each request ID is scoped to its session and bound to its operation/body fingerprint. Matching retries replay the exact persisted status and JSON response. Reusing the ID for another action returns `REQUEST_CONFLICT`.
- `ACTION_IN_PROGRESS` means retry the same ID later. `STORAGE_UNAVAILABLE` means the response is uncertain: retain the ID. A completed `ACTION_FAILED` is a known failed attempt; a deliberate new attempt needs a new ID.
- A pending provider attempt is persisted before calling the model. After a process crash it returns `REQUEST_INTERRUPTED`; it cannot safely infer whether the external provider completed. It does not automatically replay the model call. Recover the session and let the player choose a new action.
- The request ledger and resulting state commit together before a successful HTTP response. A failed final commit cannot report success; a retry returns the durable pending state instead of silently duplicating the provider action.
- Missing request IDs are rejected. A session is bounded to 500 ledger entries.

`GET /api/session?sessionId=…` returns an explicit public-case allowlist, accepted transcript, progress, hint text, timer anchors and pending request IDs. Only terminal games include their grounded result, and only won games include their win token. Responses use `Cache-Control: no-store`. The unguessable session ID is the local session capability; keep it private.

## Case generation receipts

`POST /api/generate-case` requires a stable request ID and case options. The local generation service saves a private pending intent and reserves a random session ID under `.local/generation-requests/` before invoking generation. The callback saves a checkpoint containing the validated private case and initialization options before materializing that reserved session. The service then saves its completed public response before returning it. Matching retries replay the original case/session ID; changing the options under the same ID returns `REQUEST_CONFLICT`. A crash before the checkpoint leaves `REQUEST_INTERRUPTED`, requiring an explicit new attempt rather than automatically calling the provider again. A crash after the checkpoint resumes the saved case without calling the model or retrieval provider: `createSessionAt` creates the reserved ID once or preserves its already-created state. Post-checkpoint storage failures retain the same request ID for recovery. Checkpoints contain private case facts and must never be returned in public responses; the callback returns only the sanitized public case.

Receipts expire after 24 hours and return `GENERATION_EXPIRED` without rerunning generation. A maximum of 1,000 receipts is retained, including expired receipts: expired records remain tombstones so retry protection is not silently discarded. At capacity, `GENERATION_LIMIT` requires an operator to review and archive the old local demo data while the server is stopped. Archived request IDs must not be retried against a fresh store. Completed provider failures replay `ACTION_FAILED`; ambiguous storage failures retain the same request ID. This storage has the same local-only backend restriction and private file permissions as sessions.

Executed service verification includes separate child processes for restart, concurrency, a pre-checkpoint crash, a crash after checkpoint but before session creation, and a crash after session creation but before its public receipt; a dropped HTTP response; final receipt write failure with checkpoint recovery; preservation of existing session progress; and expiry/cap enforcement. Browser retry and the actual case-generation route are separate integration gates.

## Play modes and scoring

Timed challenge uses the chosen difficulty's countdown and is the only ranked mode. Relaxed keeps the chosen difficulty and clue requirements, removes the countdown, and never escalates to a lawyer. Endurance is also untimed and unranked; only hard/expert endurance retains the sustained-stress lawyer rule. Both untimed modes retain actual elapsed time in stats but use zero elapsed time as the score calculation input, so waiting does not penalize the score.

Canonical stats and token snapshots record `playMode` and `ranked`. Legacy server sessions resolve countdown to challenge and unlimited to relaxed. Old result caches without mode fields remain labelled “Mode not recorded” and cannot offer a ranked submission; old leaderboard rows without verified mode fields are excluded instead of backfilled. Difficulty, clue progress, hint penalties and accusation penalties remain independent of mode.

## Completion exports

Every requested completion export first writes a durable record under `.local/exports/`. Local mode returns a saved receipt after that write. `EXPORT_STORAGE=supabase` uses the trusted server database configuration and stores a pending outbox record before attempting the upsert. Failure leaves the pending record intact; repeating evaluation/status retries delivery. Confirmed delivery is cached, and duplicate calls do not resend it. This is an on-demand retry path, not a background worker.

The authenticated `GET /api/export` endpoint and `scripts/export-data.ts` read the local records by default. `EXPORT_STORAGE=supabase` selects the hosted database path. Pagination and filters are validated; the admin secret is accepted only in the Bearer header. The exports contain hidden case facts and the complete transcript; they are not public leaderboard data.

Executed verification includes real child-process restart replay, crash recovery, concurrent requests, failed final persistence, token-grant restart, safe session status, explicit end actions, and the actual export CLI through a local HTTP server into the real route and durable record. Remote delivery uses injected transport tests. Live Supabase, browser refresh and real provider completion remain separate verification gates.
