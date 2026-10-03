# Hosted voice and bounded export delivery

3 October 2026. Optional shared voice and authenticated export pagination are implemented. The public voice path ran across two actual Next production processes with isolated PostgreSQL and controlled provider/storage transport. No live ElevenLabs credits, Supabase project, Vercel deployment, microphone or browser playback were used.

## Voice behavior

Speech still requires the complete accepted suspect statement or exact briefing. Transcription requires an active session and supported recording type. Shared authorization loads a validated current session; the claim transaction checks its revision, expiry and game deadline before reserving provider work. It does not mutate the game or use local fallback files.

Migration 017 owns private voice receipts, atomic work admission and a 90-second fenced lease. Only a new `claimed` receipt can invoke ElevenLabs. A completed receipt replays; a lost TTS result can recover its deterministic immutable private object. Missing saved audio is an interruption, not permission to synthesize again. Interrupted transcription requires an explicit new attempt. Changed content, bucket or model cannot reuse the same identity as fresh work.

The worker checks remaining lease time before starting and leaves 20 seconds for persistence. Provider execution is bounded to 30 seconds; object work shares the remaining deadline. Supabase upload has no SDK AbortSignal option, so its write is awaited under the existing 20-second transport deadline with cancellation checks before and after it. An uncertain upload/commit leaves recovery possible; it is never reported as an ordinary provider failure and overwritten.

Hosted speech returns a small JSON delivery record containing a 60-second private signed URL, size, hash and expiry. The browser validates the URL shape, bounded audio bytes and hash, then uses the existing Blob/Audio lifecycle. The service confirms the configured bucket is private before every storage operation. It never creates a bucket, publishes objects or sends service credentials to the browser. Signing follows the [Supabase signed URL API](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl); uploads use [immutable upload](https://supabase.com/docs/reference/javascript/storage-from-upload) with `upsert:false`.

Hosted recordings are limited to 3 MiB plus a bounded multipart envelope; local recordings retain 25 MiB. The recorder obtains the current limit and announces it before capture, then stops oversized audio before transcription. A recorded provider connection failure now requires an explicit new attempt rather than indefinitely replaying the cached failure. Unknown network delivery still retains its original retry ID.

Voice remains off unless the operator supplies all required settings in [.env.example](../../.env.example). Work caps are conservative calls/characters/bytes, not measured currency. The shared window and policy freeze match existing AI admission. Voice cache reservations shrink only after a confirmed successful object; failed/uncertain attempts retain their reservations and provider budgets are never refunded.

## Export behavior

Migration 016 exposes service-only keyset pages ordered by timestamp and ID. The database limits row payload to 1 MiB before transport; the route separately bounds its final NDJSON bytes. Signed continuation cursors bind the filters, source and requested page limit. Initial offset compatibility remains; continuation uses the last returned key.

A single oversized record returns 413 with an explicit explanation. It is not truncated or skipped. Local downloads scan one file at a time for metadata, then load selected page payloads, preserving existing ordering without keeping the full transcript corpus in memory.

The CLI follows server cursors only to its original trusted origin and preserves the requested total limit. It writes a private temporary file, flushes it, and replaces the destination only after all selected pages succeed. Invalid/repeated cursors, page errors, oversized records and quota/deadline failures leave prior output intact. Existing 10-per-minute endpoint limits remain; a very large download may fail with 429 and require an operator to use smaller batches. No automated retries or credential-bearing redirect following were introduced.

## Executed checks

| Boundary | Evidence |
| --- | --- |
| Actual production HTTP voice | [Two independent Next processes](evidence/hosted-voice-http.txt), build `qI-is2q0hdQ-F81AsI5pw`, with PostgreSQL 017. Invalid capability rejected before reservation/provider; TTS signed delivery and replay; STT exact replay; oversized recording rejection; saved-object recovery after dropped SQL finish and worker shutdown. Exactly 2 controlled TTS, 1 STT, 2 uploads, 1 recovery download; no OpenAI call or local fallback file. |
| Voice database authority | [PostgreSQL14.18](evidence/hosted-voice-postgres.txt): claim races, fingerprint/revision conflicts, private roles, lease fencing, all four difficulty deadlines including expiry during actual lock wait, cache/count caps, rollback and no extra reservation on recovery. |
| Delayed worker and recovery dispatch | [Three focused service checks](evidence/hosted-voice-service.txt): expired claim makes no provider/storage/completion call; missing object records interruption; existing object completes and signs without synthesis. |
| Private storage and browser delivery modules | [Ten focused SDK/client/playback checks](evidence/hosted-voice-objects.txt): immutable upload, bucket privacy rejection, bounded recovery, signed URL validation, bytes/hash verification and existing playback resource disposal. These are controlled transport/lifecycle checks, not actual audio decoding. |
| Export pagination | [Actual route/SDK/PostgreSQL](evidence/export-pagination-postgres.txt), [CLI recovery](evidence/export-pagination-cli.txt), and [CLI→HTTP→route](evidence/export-pagination-local.txt): bounded Unicode pages, equal timestamp ordering, no duplicates, filters/offset/cursor binding, oversized record failure, atomic destination preservation. |
| Affected local contracts | [25 selected checks](evidence/hosted-voice-export-regression.txt) passed for recording, retry, health, configuration and local voice routes. |
| Static integration | [Lint](evidence/hosted-voice-export-lint.txt), [size](evidence/hosted-voice-export-size.txt), [types](evidence/hosted-voice-export-types.txt), [production build](evidence/hosted-voice-export-build.txt) passed. |

The production HTTP fixture bridges the actual SDK's synthetic RPC/storage endpoints to PostgreSQL and an in-memory object fixture. It simulates ElevenLabs responses. The interrupted voice lease is advanced in SQL rather than waiting90 seconds. All fixture processes/clusters were stopped and removed. No application test hook or deployment was added.

Reproduce narrowly under pinned Node24.21.0/npm11.21.0: build, then `node tests/hosted-voice-http.mjs`; PostgreSQL binaries are required. For the targeted database boundary, run `node --import tsx tests/hosted-voice-postgres.ts`. These commands use disposable fixtures, not environment-configured live projects.

## Remaining acceptance

The full goal remains active. ARCH-06 and ARCH-07 do not meet their live acceptance criteria yet. The local app still needs its own ElevenLabs credential; plugin account access is not application configuration. Actual microphone→transcript→question→suspect speech, audio decoding/voice quality, screen-share audio and browser review remain unexecuted.

Safe retention/cleanup remains source work: expiry stops access but does not erase transcripts, receipt tombstones or private objects. No cleanup job is claimed or configured. Keep retry tombstones until a deliberate bounded namespace policy prevents expired IDs becoming new paid work. Live Supabase roles/private bucket behavior, provider credentials and protected Vercel timeout/payload behavior require separate authorized deployment acceptance. No new Trello card is marked Done from these controlled checks.

Skills applied: use, agent-fanout, dec-software-principles, dec-quality-testing, enforcing-code-size, agent-reliability-and-guardrails, dec-ai-native-patterns, dec-accessibility.

Local preview restarted on port 3187 with build `qI-is2q0hdQ-F81AsI5pw`. [HTTP smoke evidence](evidence/hosted-voice-export-local-smoke.json) records 200 responses for cases, game and health. Health reports local Codex/local storage and a missing app voice key. This is route availability, not a new live playthrough.
