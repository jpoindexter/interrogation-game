# Database and leaderboard storage

Local mode defaults to a real on-disk leaderboard at `.local/leaderboard/`. Set `INTERROGATION_DATA_DIR` to choose a different parent directory. Each completed game produces one immutable JSON file with directory permissions 0700 and file permissions 0600. An exclusive atomic link publishes a fully written, flushed record, so concurrent saves and retries return the same record. Keep this directory private: it contains private redemption hashes. Public responses omit hashes and session IDs. Local sessions, request receipts and win grants now persist across process restarts; see [LOCAL-DEMO.md](../docs/LOCAL-DEMO.md) for transaction and crash-recovery limits. Saved score receipts remain retryable using their original token.

For a Supabase leaderboard while retaining local gameplay, apply `migrations/001_private_leaderboard.sql` and then `migrations/004_leaderboard_play_mode.sql` in your project's SQL editor, then configure only the server:

```dotenv
LEADERBOARD_STORAGE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

`NEXT_PUBLIC_SUPABASE_URL` remains accepted as a URL fallback. Anonymous keys and `x-supabase-*` request headers never choose the database or grant writes. Do not put the service role key in browser settings or a `NEXT_PUBLIC_` variable. Vercel requires explicit Supabase mode and cannot use the local filesystem backend.

The migrations preserve legacy leaderboard rows, add unique `session_id` and private `redemption_hash`, enable RLS, remove the earlier documented public policies and revoke table access from `anon` and `authenticated`. The server's insert uses `ON CONFLICT (session_id) DO NOTHING`; retries read the original row instead of overwriting its player name or score. Token consumption occurs only after a confirmed durable record. Lost responses are recoverable with the same session/token. The public GET returns an explicit record `id` for highlighting, never a match on initials. Only rows with `play_mode=challenge` and `ranked=true` are listed or replayed as confirmed ranked receipts. The mode migration leaves old rows nullable: their ranking eligibility is unknown and is not fabricated through a backfill. Relaxed and endurance wins never receive a leaderboard token; client-supplied mode/ranking/score fields cannot override the canonical snapshot.

Optional historical retrieval remains disabled by default. For the current experimental path, apply `005_event_grounded_patterns.sql`, then configure `AI_RAG_ENABLED=true`, a server OpenAI API key, and `RAG_EMBEDDING_VERSION=openai-text-embedding-3-small-1536-events-v2`. This creates `interrogation_patterns_v3` and the server-only `match_patterns_v3` RPC. It stores one record per session/version, accepted turn stress/clue changes, execution-time model and prompt hashes when recorded, and questions associated with accepted clues or authored evidence challenges. A question appearing in a win alone does not qualify; association does not prove effectiveness. The runtime uses 1536-dimensional `text-embedding-3-small` vectors. The new version reflects a changed embedding input, so no previous vectors or inferred event histories are copied.

`002_optional_legacy_patterns.sql` and `003_versioned_patterns.sql` preserve historical schemas only; the current runtime does not query those tables. New installations do not need either for v3 retrieval. Do not change embedding model/version in place. Live retrieval quality and cross-session adaptation remain unevaluated; keep this experimental opt-in off for the portfolio demo.

In local session mode, completion exports default to durable private local records. Optional remote delivery requires `EXPORT_STORAGE=supabase`; failures retain a pending local outbox for an explicit evaluation/status retry. Shared session mode instead commits its canonical terminal export in the database transaction and does not use that local outbox.

No live Supabase project was contacted or migrated during this change. Local store and route regression tests execute without credentials; they do not prove live RLS or migration compatibility. Before hosted use, apply migrations in a disposable project and verify: anonymous read/write denied; service-role insert succeeds; concurrent same-session saves return one row; retry after an interrupted response returns its original receipt.

References: [Supabase upsert](https://supabase.com/docs/reference/javascript/upsert), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Opt-in shared text gameplay

The application can now select the shared text routes through explicit server configuration. Local Codex gameplay remains the default. Read [shared route integration](../docs/audit/HOSTED-ROUTE-INTEGRATION.md) for the executed scope and remaining live acceptance gates; selecting the implementation is not proof of deployment.

Apply these migrations **in this order** as a trusted database migration owner. They are additive migration files, not a repeatedly executable setup script. Use the existing applied-migration history when upgrading an installation.

| Migration | Boundary |
|---|---|
| `001_private_leaderboard.sql` | Private leaderboard and canonical export tables |
| `004_leaderboard_play_mode.sql` | Explicit ranked challenge eligibility; legacy rows remain unclassified |
| `006_hosted_sessions.sql` | Shared snapshots, action claims, revisions and fences |
| `007_hosted_budgets.sql` | Atomic session/deployment provider-work reservations |
| `008_hosted_terminal_export.sql` | Atomic terminal result/export and immutable hosted exports |
| `009_hosted_claimed_work.sql` | Provider reservations require current action authority |
| `010_hosted_redemption.sql` | Canonical win-token redemption and exact score receipt recovery |
| `011_hosted_generation.sql` | Private generation intent, bounded admission, progress and checkpoint |
| `012_hosted_generation_finish.sql` | Atomic checkpoint materialization and generation-bound AI reservations |
| `013_hosted_endpoint_limits.sql` | Shared endpoint admission, fixed minute windows and bounded hashed buckets |
| `014_hosted_reads.sql` | Provider-free read claims and canonical expiry/result commits |
| `015_hosted_request_identity.sql` | Original public retry IDs with hashed private lookup keys; internal read markers excluded |

Migrations 002, 003 and 005 are not prerequisites for shared text mode. They concern optional historical retrieval, which this mode requires to be disabled. Later migrations revoke service-role access to superseded unbound claim, completion and work-reservation RPCs; applying only an early subset does not satisfy the current adapters.

Required server configuration:

```dotenv
SESSION_STORAGE=supabase
HOSTED_TEXT_ENABLED=true
AI_PROVIDER=openai
AI_RAG_ENABLED=false
LEADERBOARD_STORAGE=supabase
EXPORT_STORAGE=supabase
HOSTED_DEPLOYMENT_ID=portfolio-preview
```

Also provide `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` and explicit `HOSTED_AI_CALLS_PER_WINDOW`, `HOSTED_AI_CHARACTERS_PER_WINDOW`, and `HOSTED_AI_WINDOW_SECONDS`. Credentials stay server-only. `.env.example` intentionally leaves caps unset: choose them before the first provider reservation. Valid call caps are 0–1,000,000, character caps 0–1,000,000,000,000 and windows 60–86,400 seconds. Zero caps deny new AI work. Session AI limits remain 120 calls and 2,000,000 input characters. These reservations bound work, not currency or measured token billing, and remain consumed on provider failure.

Use one stable deployment ID across instances. A different ID creates a different allowance namespace. The first reservation attempt fixes the deployment/provider policy; subsequent cap/window changes fail closed rather than refreshing allowance. Change a stored policy through a reviewed database migration. The operator can stop new AI calls with `AI_WORK_ENABLED=false` without altering that policy. Endpoint admission independently freezes its per-key capacity for the active minute; expired endpoint counters can be cleaned up safely.

Private shared tables are inaccessible to `anon`, `authenticated` and direct service-role table reads. The trusted server uses narrowly granted RPCs with fixed search paths. Database state establishes authority on each transaction; there is no process-cache or local-file fallback. When `VERCEL` is set, selecting local session storage is refused. Database unavailability remains distinct from quota exhaustion.

**Hosted voice is intentionally unavailable**, even when an ElevenLabs credential is present. Shared audio receipts, private objects and authorization still need integration. **Admin bulk export download is also unavailable** until byte-bounded pagination is implemented; canonical per-game exports still persist atomically. Retrieval stays off.

Session availability expires after one idle hour; generation receipts expire after 24 hours. Generation admission retains at most 1,000 rows including expired tombstones, and sessions admit at most 500 action receipts. Expiry is not data erasure. Do not delete paid-work or generation retry tombstones to reclaim capacity: an old ID could otherwise authorize new provider work. Retention and a safe namespace/archive procedure remain operational acceptance work before broader use.

Disposable PostgreSQL evidence covers the [storage foundation](../docs/audit/HOSTED-STORAGE-FOUNDATION.md), [action transactions](../docs/audit/HOSTED-ACTION-INTEGRATION.md), [generation and redemption](../docs/audit/HOSTED-GENERATION-REDEMPTION.md), and [route integration](../docs/audit/HOSTED-ROUTE-INTEGRATION.md). No actual Supabase project, live OpenAI path or Vercel deployment has been accepted by those checks. Apply the complete chain to a disposable target and verify its real roles, policies, runtime and protected end-to-end text playthrough before publication.
