# Leaderboard storage

Local mode defaults to a real on-disk leaderboard at `.local/leaderboard/`. Set `INTERROGATION_DATA_DIR` to choose a different parent directory. Each completed game produces one immutable JSON file with directory permissions 0700 and file permissions 0600. An exclusive atomic link publishes a fully written, flushed record, so concurrent saves and retries return the same record. Keep this directory private: it contains private redemption hashes. Public responses omit hashes and session IDs. Local sessions, request receipts and win grants now persist across process restarts; see [LOCAL-DEMO.md](LOCAL-DEMO.md) for transaction and crash-recovery limits. Saved score receipts remain retryable using their original token.

For hosted Supabase storage, apply `migrations/001_private_leaderboard.sql` and then `migrations/004_leaderboard_play_mode.sql` in your project's SQL editor, then configure only the server:

```dotenv
LEADERBOARD_STORAGE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

`NEXT_PUBLIC_SUPABASE_URL` remains accepted as a URL fallback. Anonymous keys and `x-supabase-*` request headers never choose the database or grant writes. Do not put the service role key in browser settings or a `NEXT_PUBLIC_` variable. Vercel requires explicit Supabase mode and cannot use the local filesystem backend.

The migrations preserve legacy leaderboard rows, adds unique `session_id` and private `redemption_hash`, enables RLS, removes the earlier documented public policies and revokes table access from `anon` and `authenticated`. The server's insert uses `ON CONFLICT (session_id) DO NOTHING`; retries read the original row instead of overwriting its player name or score. Token consumption occurs only after a confirmed durable record. Lost responses are recoverable with the same session/token. The public GET returns an explicit record `id` for highlighting, never a match on initials. Only rows with `play_mode=challenge` and `ranked=true` are listed or replayed as confirmed ranked receipts. The mode migration leaves old rows nullable: their ranking eligibility is unknown and is not fabricated through a backfill. Relaxed and endurance wins never receive a leaderboard token; client-supplied mode/ranking/score fields cannot override the canonical snapshot.

Optional historical-pattern storage is isolated in `002_optional_legacy_patterns.sql`. It describes the existing 1024-dimensional format and supplies the missing `match_patterns` function with server-only execution. Apply it only if using the matching legacy embedding model. Migrating embeddings requires a new versioned schema and re-embedding; changing models in place is unsupported. Completion exports default to durable private local records. Optional remote delivery requires `EXPORT_STORAGE=supabase`; failures retain a pending local outbox for an explicit evaluation/status retry.

No live Supabase project was contacted or migrated during this change. Local store and route regression tests execute without credentials; they do not prove live RLS or migration compatibility. Before hosted use, apply migrations in a disposable project and verify: anonymous read/write denied; service-role insert succeeds; concurrent same-session saves return one row; retry after an interrupted response returns its original receipt.

References: [Supabase upsert](https://supabase.com/docs/reference/javascript/upsert), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
