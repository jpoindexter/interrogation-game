# Bounded hosted payload retention

3 October 2026. Migration 018 adds an operator-invoked payload cleanup batch. It does not install a scheduler or erase all game data. No live project migration or cleanup has been run.

## Operator contract

The command defaults to a preview, takes a batch limit of 1–100 (default 25), and performs exactly one service-role RPC. It never loops or automatically retries an uncertain result. `--apply` also requires the exact configured project hostname, so a command copied from another project fails before network access. Credentials come only from the existing trusted Supabase server environment; output contains the project hostname and aggregate counts, not transcripts, capabilities, tokens or provider error bodies.

With an operator-approved target and migrations through 018 already installed:

```sh
# Node 24; use the existing local environment file only if it targets the intended project.
node --env-file=.env.local --import tsx scripts/retention-data.ts --limit=25

# Irreversible payload removal. Substitute the hostname printed by the preview.
node --env-file=.env.local --import tsx scripts/retention-data.ts --limit=25 --apply --confirm-project=YOUR-PROJECT.supabase.co
```

Do not paste credentials into command arguments or chat. Check the preview and preserve any exports needed for review before an operator chooses to apply. A failed response does not establish rollback; preview current state before deciding whether another batch is appropriate.

## What a batch changes

The database uses its own clock, row locks and bounded candidate sets. Live leases and locked candidates are skipped. Preview counts are observations, not a reservation or a promise that a later apply will select the same rows.

| Data | Expired payload treatment | Preserved protection |
| --- | --- | --- |
| Session without an export or score | Clear private snapshot; remove its transient read marker | Session identity, original creation hash and expiry remain; it cannot be recreated |
| Game action receipts | Delete up to the batch limit after parent expiry | Expired parent still rejects action execution |
| Generation receipts | Clear checkpoint/response and mark interrupted | Request identity, fingerprint and expiry remain |
| STT receipts | Clear transcript response and mark interrupted | Receipt identity and usage reservations remain |
| TTS receipts/objects | Deferred | Saved-object identity/metadata remain for a future safe erasure workflow |
| Exports, score-backed sessions and scores | Deferred | Export immutability and score redemption replay remain intact |

Each candidate category is bounded independently. Deferred counts are also capped at the supplied limit; they are not a full database census. Work budgets are never refunded. Generation admission's existing 1,000-row lifetime cap remains: clearing payloads does not reclaim identity capacity.

## Verification and remaining scope

[Command contract checks](evidence/hosted-retention-command.txt) exercise default preview, exact project confirmation, argument bounds, aggregate-only output and no automatic retry. [Actual PostgreSQL acceptance](evidence/hosted-retention-postgres.txt) ran the production adapter against an isolated PostgreSQL 14.18 cluster with migrations 001, 004 and 006–018. It verified unchanged dry-run snapshots, actual payload removal, repeated batches with zero further mutations, per-category bounds, live/locked row preservation, retry protection, late-finish rejection, score replay and role denial. No network, provider or storage-object request ran. This does not establish live Supabase execution or complete erasure.

Scoped lint, module-size checks and typechecking cover the added operator modules; no application build rerun was needed because the new command is not in the game runtime. The prior production build remains the voice/export checkpoint.

Remaining work includes bucket provenance and retryable private-object deletion, export retention, preserving score redemption with smaller tombstones, and a safe namespace/archive procedure. Local `.local` files are unaffected. This command is not a claim of complete data erasure or full hosted readiness.

Skills applied: use, agent-fanout, dec-software-principles, dec-quality-testing, enforcing-code-size, agent-reliability-and-guardrails.
