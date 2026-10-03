# Database privilege acceptance — 3 October 2026

**Core leaderboard/export SQL criteria executed; optional pattern/vector criteria remain blocked.** This supplies missing actual-role evidence for LOGIC-16 without requiring a remote database. It does not close the full card, LOGIC-10's optional database path, or live Supabase/PostgREST acceptance.

## Executed path

The [focused runner](../../tests/database-privilege-acceptance.mjs) uses the existing isolated PostgreSQL harness: a fresh temporary cluster, Unix socket only, no TCP listener, no project environment or credentials. Migrations001/004 are applied unchanged to empty tables. Every row and private value is synthetic. The cluster is stopped and deleted in `finally`.

The fixture explicitly gives its synthetic `service_role` PostgreSQL's `BYPASSRLS` attribute to model the trusted Supabase platform role; `anon` and `authenticated` have neither that attribute nor superuser privileges. The migrations grant table permissions, not the platform role attributes. This is a declared fixture prerequisite, not evidence that a real project's roles are configured correctly.

Observed with Node24.21.0 and PostgreSQL14.18:

| Original requirement | Executed result |
|---|---|
| Anonymous forged leaderboard insertion denied | Both `anon` and `authenticated` denied direct insert, conflict-ignore retry, update and delete on `leaderboard`. |
| Trusted server write succeeds | Actual service-role insert/read succeeds on leaderboard and exports. Export conflict-update succeeds. |
| Unique session records | A second plain insert raises a duplicate-key error on both tables. Leaderboard conflict-ignore and export upsert each retain one row. |
| Exports private | Both public roles denied direct select as well as insert/retry/update/delete on `game_exports`. Leaderboard direct selects are also denied; public listing is an application projection. Both tables have RLS enabled. |
| Fresh schema setup | Unmodified migrations001/004 applied to the fresh cluster. Optional retrieval migrations did not complete, as detailed below. |

[Executed receipt](evidence/database-privilege-acceptance.txt) and [zero-warning scoped lint output](evidence/database-privilege-acceptance-lint.txt) are retained. No full test suite, production build, application source change or model/voice run was needed for this test-and-evidence increment.

The runner was executed twice: after the initial core run, explicit rejected conflict-retry/update assertions were added and executed. Both fresh runs encountered the same missing extension while attempting002; no extension installation, build, substitute type or further retry was performed. Only the final expanded receipt is the acceptance output.

## Exact optional-path blocker

`pg_available_extensions` reported no `vector` extension. After creating an actual `extensions` schema, applying002 failed at its first extension statement:

```text
psql:database/migrations/002_optional_legacy_patterns.sql:3: ERROR:  could not open extension control file "/opt/homebrew/share/postgresql@14/extension/vector.control": No such file or directory
```

The failed transaction left no legacy pattern table. Migrations003/005 require the same unavailable extension and were not attempted. No fake vector type or SQL replacement was used. The current v3 path needs005;002/003 are historical optional schemas, not prerequisites for the local demo or shared text path.

Still unexecuted: actual legacy/v2/v3 pattern migration, pattern table/RPC privileges, trusted pattern inserts, `(session_id, embedding_version)` duplicate enforcement, and vector match execution. The narrowly required re-entry environment is an authorized disposable PostgreSQL database with real pgvector already available. That does not require an embedding provider call to exercise synthetic vector/schema/permission behavior.

## Existing evidence reused and card disposition

- **LOGIC-16:** original table-permission and unique core-session criteria now have actual SQL evidence. The optional pattern/vector portion prevents claiming the complete criterion satisfied. Separately, no real Supabase/PostgREST role/JWT boundary was exercised.
- **LOGIC-10:** [current-schema pattern acceptance](PATTERN-ACCEPTANCE.md) already executes unfinished/spoofed rejection, canonical accepted-event association and one byte-identical local export. This increment does not rerun it or imply that optional pattern persistence passed. Actual v3 pattern duplicate handling remains unverified.
- Existing [redemption SQL receipt](evidence/hosted-redemption-postgres.txt) executes the production adapters' concurrent one-record redemption, rollback, exact receipt replay and anonymous RPC denial. It was not rerun. This new test targets the earlier direct table-write contract, not the later shared-action RPC path or its immutable export triggers.

Reproduce this bounded check, without project configuration:

```sh
npm exec --yes --package=node@24.21.0 --package=npm@11.21.0 -- node tests/database-privilege-acceptance.mjs
```

No real Supabase data, remote migration, provider, browser, deployment or Git push was touched. Passing these local SQL assertions does not establish live authentication, application UI, semantic case quality or retrieval relevance.

Skills applied: use, gap-analysis, dec-quality-testing.
