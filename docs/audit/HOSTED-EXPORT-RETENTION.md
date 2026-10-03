# Export retention with compact score replay

3 October 2026. Migration 020 and an operator-only command remove eligible old hosted exports and private session payloads while preserving the original public score receipt. No live project migration or data cleanup has run.

## Retention boundary

The default threshold is **30 days after session expiry**, with an explicit operator range of 1–3,650 days. Each invocation previews or applies at most 100 eligible sessions (default 25). Locked rows and live session/voice leases are skipped. This is not a scheduler.

For a session with a recorded score, the transaction first verifies its private win-token hash against the existing leaderboard entry. It saves only the hashed session identity, token hash, initials and original public score receipt in a private immutable table. It then clears the private session snapshot and removes the canonical export. Sessions without a score need no replay receipt. Invalid or conflicting bindings remain untouched and appear in a capped `deferred` count; they do not prevent later valid candidates from being selected.

The original session identity, creation hash, expiry, provider allowances and public leaderboard entry remain. Correct score retries return the original receipt through the same public API; wrong tokens and initials are rejected. The old redemption helper is no longer directly callable by the service role. Parent locks serialize cleanup with redemption and late inserts; archived exports and scores cannot be recreated through guarded inserts or retargeted legacy updates.

The separate payload-retention command handles expired action/generation/STT receipts. The separate audio-retention command handles known-bucket objects. Removing the export is not a claim that all related data, backups or published scores have been erased.

## Operator command

Use an explicitly approved target with migrations **001, 004, then 006–020** installed. Preview before deciding whether to apply, and preserve any transcripts needed for the portfolio review.

```sh
node --env-file=.env.local --import tsx scripts/retention-exports.ts --days=30 --limit=25

# Substitute the configured project hostname shown by preview.
node --env-file=.env.local --import tsx scripts/retention-exports.ts --days=30 --limit=25 --apply --confirm-project=YOUR-PROJECT.supabase.co
```

Output contains aggregate counts only: `sessions`, `exports`, `scoreReceipts`, and `deferred`. The command does not retry an uncertain result. Preview current state before another explicit batch. Local demo files are unaffected.

## Acceptance evidence

[Command checks](evidence/hosted-export-retention-command.txt) cover default age/preview, bounded inputs, exact project confirmation, aggregate-only output and no automatic retry. [Full-chain PostgreSQL execution](evidence/hosted-export-retention-postgres.txt) covers atomic cleanup, exact score replay, credential rejection, concurrency, rollback, leases, late writes and role restrictions. [Public HTTP execution](evidence/export-retention-http.txt) ran three production Next workers with isolated PostgreSQL and controlled provider transport: a complete game and score were followed by expiry/cleanup, then the original public score retry returned the same receipt while the transcript/export stayed removed. Strict lint, sizes and integrated TypeScript passed. The existing production build was reused because this increment adds SQL and operator code without changing application runtime modules. No live Supabase, provider, browser, voice, migration or deletion ran.

The existing 1,000-generation-identity ceiling remains a disclosed hosted operational limit. Preserving old identities is intentional retry protection. Namespace rotation is a future broad-use design decision, not a newly added local-demo acceptance gate. Live hosted acceptance, app voice and user-owned browser/audio rehearsal remain separate requirements.

Skills applied: use, agent-fanout, dec-software-principles, dec-quality-testing, enforcing-code-size, agent-reliability-and-guardrails.
