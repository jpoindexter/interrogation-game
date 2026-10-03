# Recoverable private-audio cleanup

3 October 2026. Migration 019 binds each new hosted speech request to its private bucket before provider work. An operator-only worker can remove eligible expired audio and recover interrupted deletion. No live database migration, object deletion or ElevenLabs request ran for this change.

## Authority and recovery

The new voice claim RPC records the bucket in the same transaction as its initial voice receipt and allowance. Existing bucket bindings cannot change. A mismatched bucket or a legacy TTS receipt without recorded provenance is rejected; the application never guesses from today's environment. STT claims have no audio bucket. The prior unbound voice claim RPC is revoked from the service role.

Audio cleanup requires an expired receipt or expired parent session, no live game lease, and at least five minutes after the voice lease ended. Selection skips locked candidates and is limited to 1–100 jobs. Preview changes no data. Apply creates or reclaims a durable deletion job, clears the expired voice response and prevents late voice completion from restoring it. Identity tombstones and usage allowances remain.

The worker receives only persisted bucket/key metadata. It checks that the exact bucket is private, checks the exact object, awaits removal, then confirms absence. The [Supabase remove API](https://supabase.com/docs/reference/javascript/storage-from-remove) accepts object paths; the worker supplies one complete validated path. The [exists API](https://supabase.com/docs/reference/javascript/storage-from-exists) supplies the existence check. In the installed SDK, a false result can accompany an error: this adapter accepts only a typed HTTP 404 as absence. Ambiguous 400/403 responses, missing/public buckets and uncertain removals remain pending.

Only confirmed absence permits a matching owner/fence to finish the job. A lost completion response leaves recovery safe: after the five-minute job lease, an explicit later batch checks the same object again and completes with a higher fence. A worker never synthesizes audio or refunds paid allowance. Point-in-time absence is not proof that an external administrator cannot recreate an object later.

## Operator command

Use only an explicitly approved target with migrations **001, 004, then 006–019** installed. The command defaults to preview and shares payload retention's exact configured-project confirmation. It does not run automatically.

```sh
node --env-file=.env.local --import tsx scripts/retention-audio.ts --limit=25

# Substitute the actual project hostname shown by the preview.
node --env-file=.env.local --import tsx scripts/retention-audio.ts --limit=25 --apply --confirm-project=YOUR-PROJECT.supabase.co
```

Output contains aggregate counts only. `pending` means deletion or completion was not confirmed; an applied batch with pending jobs exits nonzero. Wait for the five-minute claim lease and preview before choosing another batch. `deferred` counts eligible legacy receipts with unknown buckets, capped at the requested limit. It is not a full census. Batches use a two-minute scheduling budget and bounded in-flight SDK requests; unprocessed claimed jobs remain recoverable after lease expiry.

## Executed evidence

- [Actual PostgreSQL and production worker](evidence/hosted-audio-retention-postgres.txt): immutable binding and rollback; legacy/mismatch rejection; expiry, lease and grace boundaries; claim races; retry fences; unchanged budgets; role denial; object removal followed by lost completion and explicit recovery. Object removal in this check is controlled.
- [Actual Supabase SDK with controlled HTTP](evidence/hosted-object-erasure.txt): exact-object removal and 404 confirmation; idempotent absence; destination/privacy rejection; ambiguous errors, uncertainty and cancellation. Five focused checks passed.
- [Existing voice SQL acceptance](evidence/audio-retention-voice-postgres.txt) passed with the new claim adapter and migration. [Service-boundary checks](evidence/audio-retention-voice-service.txt) still reject expired claims and recover saved audio without provider work.
- [Production build](evidence/audio-retention-build.txt), lint, module-size checks and typechecking cover the integrated source. [Public HTTP voice integration](evidence/audio-retention-voice-http.txt) passed across two actual Next production workers using build `33AfbtvgKqE9p1PtczvPo`: authorization, speech/transcription replay and saved-object recovery survived the new bucket-bound claim path. Provider and Storage transport were controlled.

The local preview was restarted on this production build; [cases, game and health returned HTTP 200](evidence/audio-retention-local-smoke.json). Health still reports a missing app ElevenLabs key.

These are controlled local checks. Live Supabase/Storage credentials, actual object deletion, microphone/playback, hosted inference and Vercel remain unverified. Exports and score-backed session retention, legacy bucket reconciliation and safe namespace capacity remain separate unfinished work. Local demo files are unaffected.

Skills applied: use, agent-fanout, dec-software-principles, dec-quality-testing, enforcing-code-size, agent-reliability-and-guardrails.
