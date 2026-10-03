# Optional pattern database acceptance

**Executed 3 October 2026:** checked-in migrations 002/003/005, real pgvector matching, role restrictions, and versioned pattern uniqueness passed in a new disposable local PostgreSQL container. This closes the missing optional SQL execution evidence; it does not establish deployed Supabase permissions or useful semantic retrieval.

## Runtime and isolation

- Node 24.21.0; PostgreSQL 17.6; pgvector 0.8.2.
- Already-installed image pinned by immutable ID: `sha256:ce01659027cd1ce958ebfc8c1547aee3a42f68b50e332308cc6958f469f5e2fc` (`public.ecr.aws/supabase/postgres:17.6.1.131`). No pull, installation, compilation, or download.
- New uniquely named container; `--network none`, no published ports, no TCP database listener, no host mounts or named volumes, read-only root filesystem, all capabilities dropped, and no-new-privileges. A fresh cluster is initialized in container-only tmpfs; the image's normal Supabase entrypoint is bypassed.
- Explicit synthetic roles: ordinary `anon` and `authenticated`; non-superuser `service_role` with `BYPASSRLS`, matching the platform role assumption. The fixture creates the `extensions` schema and grants its usage to all three roles so RPC denial is tested at the function boundary rather than masked by schema denial.
- Only synthetic rows and vectors are used. The acceptance run does not query or modify any existing container/database. Its owned container was removed and its tmpfs data discarded. The runner also attempts owned-container cleanup on SIGINT/SIGTERM.

## Executed behavior

| Criterion | Observed result |
| --- | --- |
| Fresh optional schema | Unmodified `002_optional_legacy_patterns.sql`, `003_versioned_patterns.sql`, and `005_event_grounded_patterns.sql` applied to a fresh database with real pgvector; all three tables began empty and have RLS enabled. |
| Public direct access | Actual `anon` and `authenticated` role attempts to insert, retry with conflict-ignore, update, read, delete, and invoke each legacy/v2/v3 matching RPC were denied. `PUBLIC` has no matching-RPC execute privilege. |
| Trusted persistence | Actual `service_role` insert, read, and matching RPC calls succeeded for all three schemas. Versioned tables denied trusted updates/deletes, consistent with their insert-only grants. |
| Duplicate/session behavior | Repeated insert rejected with a unique-constraint violation. The production adapter's SQL conflict target, `(session_id, embedding_version)`, with `DO NOTHING` retained one byte-identical v3 row even when the retry carried changed questions. Concurrent same-session inserts admitted exactly one row. |
| Embedding/schema separation | Wrong model, embedding version, declared dimension, actual vector dimension, and non-observed source were rejected for v2/v3. v3 also rejected wrong schema version, invalid case hash, and non-array question/provenance/event/evidence fields. Wrong-dimensional matching queries failed. |
| Real vector matching | Synthetic identical, orthogonal, and opposite vectors produced the expected cosine matches and distance ordering. Difficulty/model/version filters and strict threshold behaved as defined. Zero/negative limits returned no results, limit one returned one, and an oversized v3 request was capped at 20. |
| Legacy isolation | Legacy 1024-dimensional, v2 1536-dimensional, and v3 event-version data remained in separate tables. v2 did not match the v3 embedding version. No legacy data was copied or inferred. |

The first execution passed every SQL assertion but its post-removal assertion expected Docker's missing-object message with different capitalization. The container had already been removed. The harness was corrected to match case-insensitively, then the same focused acceptance script passed through cleanup with exit code 0. This was a fixture assertion issue, not a migration or application defect.

## Reproduction and evidence

```sh
npm exec --offline --yes --package=node@24.21.0 --package=npm@11.21.0 -- node tests/pattern-privilege-acceptance.mjs
```

The runner requires the exact image already installed and a running local Docker engine. `--pull never` prevents image fetching. It does not start or reuse an existing application database. It initializes a new cluster on each invocation and removes only the container carrying that invocation's ownership label.

- [Runner](../../tests/pattern-privilege-acceptance.mjs)
- [Actual execution receipt](evidence/pattern-database-acceptance.txt)
- [Scoped ESLint receipt](evidence/pattern-database-lint.txt)

## Claim boundaries

- **LOGIC-16 — executed SQL evidence:** complements the earlier [core database permission acceptance](DATABASE-PRIVILEGE-ACCEPTANCE.md) with the formerly blocked optional vector/pattern schema, role, and uniqueness criteria. No deployed Supabase/PostgREST authentication, JWT mapping, configuration, or migration application is established.
- **LOGIC-10 — executed SQL evidence:** actual v3 persistence, duplicate handling, and schema restrictions now have database execution evidence. Canonical accepted-event eligibility and attribution remain covered by the separate [pattern acceptance](PATTERN-ACCEPTANCE.md). This script does not re-execute that application route or establish causal question effectiveness.
- **ARCH-09 — executed structural evidence:** legacy/model/version/dimension isolation and known synthetic vector matching are established. Synthetic vectors are mathematical fixtures, not provider embeddings. No live embedding migration, known natural-language query relevance comparison, learning benefit, or progressively harder gameplay is established.

No application or migration source change was needed. No provider/embedding calls, live database access, browser activity, production cleanup, or deployment occurred in this acceptance run.
