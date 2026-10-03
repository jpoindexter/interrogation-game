# Database privilege acceptance — 3 October 2026

**Core leaderboard/export SQL criteria executed.** The initial PostgreSQL 14 environment lacked pgvector; the subsequent [isolated PostgreSQL 17 pattern check](PATTERN-DATABASE-ACCEPTANCE.md) executed the optional migrations, roles, duplicate handling and real vector RPC. Together these provide actual local SQL evidence for the original database criteria. Live Supabase/PostgREST and semantic retrieval quality remain separate, unverified paths.

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

## Initial optional-path blocker — resolved in a separate runtime

`pg_available_extensions` reported no `vector` extension. After creating an actual `extensions` schema, applying002 failed at its first extension statement:

```text
psql:database/migrations/002_optional_legacy_patterns.sql:3: ERROR:  could not open extension control file "/opt/homebrew/share/postgresql@14/extension/vector.control": No such file or directory
```

The failed transaction left no legacy pattern table. Migrations003/005 require the same unavailable extension and were not attempted. No fake vector type or SQL replacement was used. The current v3 path needs005;002/003 are historical optional schemas, not prerequisites for the local demo or shared text path.

Those optional criteria were subsequently executed in a new disposable, network-disabled container from an already installed PostgreSQL 17.6/pgvector 0.8.2 image. [Pattern database acceptance](PATTERN-DATABASE-ACCEPTANCE.md) records actual migrations, table/RPC privileges, trusted inserts, duplicate enforcement and synthetic-vector matching. The original PostgreSQL 14 failure remains intact above; no extension was installed into that environment or into the existing running database.

## Existing evidence reused and card disposition

- **LOGIC-16:** original table-permission and unique core-session criteria now have actual SQL evidence. The later optional pattern/vector report supplies the remaining local SQL portion. Separately, no real Supabase/PostgREST role/JWT boundary was exercised.
- **LOGIC-10:** [current-schema pattern acceptance](PATTERN-ACCEPTANCE.md) already executes unfinished/spoofed rejection, canonical accepted-event association and one byte-identical local export. This increment does not rerun it or imply that optional pattern persistence passed. The later pattern database report executes v3 duplicate handling without claiming remote delivery or embedding quality.
- Existing [redemption SQL receipt](evidence/hosted-redemption-postgres.txt) executes the production adapters' concurrent one-record redemption, rollback, exact receipt replay and anonymous RPC denial. It was not rerun. This new test targets the earlier direct table-write contract, not the later shared-action RPC path or its immutable export triggers.

Reproduce this bounded check, without project configuration:

```sh
npm exec --yes --package=node@24.21.0 --package=npm@11.21.0 -- node tests/database-privilege-acceptance.mjs
```

No real Supabase data, remote migration, provider, browser, deployment or Git push was touched. Passing these local SQL assertions does not establish live authentication, application UI, semantic case quality or retrieval relevance.

Skills applied: use, gap-analysis, dec-quality-testing.
