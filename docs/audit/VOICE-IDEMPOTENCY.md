# Voice request receipts and explicit recovery

2026-10-03. Cards LOGIC-13 / LOGIC-15. Local demo implementation; no live ElevenLabs credentials or browser microphone/output verification performed.

## Contract

Both voice endpoints require a stable request ID. Authorization still runs before reading a cached result: speech must match the complete briefing or an accepted suspect response; recordings require an active session and an accepted media type, with a 25 MB audio limit. The transcription route also bounds its complete multipart body to 26 MB.

The local server keys each private receipt by a SHA-256 of session ID, operation and request ID. TTS input identity includes session, authorized text, role, server model and selected voice. STT identity includes session, SHA-256 of recording bytes, actual MIME type and server model. A different payload for an existing ID returns `REQUEST_CONFLICT` without provider work. Stress-derived synthesis settings are selected for the original attempt; replay returns the saved audio rather than generating a changed performance.

A cross-process file lock protects the attempt. The server writes a pending receipt before reserving voice usage and calling ElevenLabs. A completed receipt stores the audio or transcription/error response. Retry returns that response without another provider call or voice-budget reservation. Endpoint request-rate budgets still apply to HTTP retries.

An accepted operation finishes independently of a lost client connection, under a 30-second deadline. TTS now buffers and durably saves complete audio before delivery. The browser previously awaited a full audio blob too; any playback-latency change remains unmeasured. The deadline covers headers and body consumption. Client speech/transcription cancellation deadlines remain 30 seconds, so a server-completed response may need a same-ID retry after client timeout.

Concurrent requests return `VOICE_IN_PROGRESS`. A pending receipt left after process interruption returns `VOICE_INTERRUPTED`; it never automatically calls the provider again. A provider failure is also a completed receipt. A new attempt requires an explicit new ID because the earlier attempt may have consumed usage.

## Bounded private storage

Receipts live under `.local/voice-requests` or `INTERROGATION_DATA_DIR/voice-requests`, using hashed filenames, 0700 directories and 0600 atomically written files. They contain cached audio or transcript/error output, plus input fingerprints and timestamps. HTTP responses use `Cache-Control: private, no-store`. This is local private storage, not a promise that no audio or transcript is stored.

Limits: 8 MB synthesized audio, 12 MB serialized receipt, 64 MB aggregate receipt allocation including pending reservations, 256 receipts, 24-hour replay lifetime. Provider transcription JSON is capped at 256 KB before extracting at most 2,000 transcript characters. The recorder caps its retained clip at 25 MB.

Expired receipts remain as bounded records and return `VOICE_EXPIRED`; automatic deletion would allow the same old ID to regenerate paid work. Reaching the count/byte cap fails closed with a text fallback. Archiving or clearing local demo data is an explicit maintenance action outside this slice. Hosted durable voice storage remains unavailable, matching the local-only session repository boundary.

## Client behavior

Only hashed request identity and a UUID go into sessionStorage, never raw audio or transcripts. If browser storage is unavailable, same-view retries use bounded memory; recovery across reload is not guaranteed. Raw failed recordings stay only in the mounted recorder's memory.

A failed transcription exposes **Retry transcription** and **Discard recording**. A known interrupted/failed/expired/conflicting receipt changes the action to **Start new transcription attempt** and explains that the prior attempt may have consumed provider usage. No automatic retry occurs. Starting another recording, discarding or leaving the case releases the retained clip. Cancellation during retry prevents late transcript delivery. Refresh discards the in-memory clip.

TTS errors continue through the existing text fallback. Replaying a line reuses its receipt; it does not silently create a paid attempt after a cached terminal failure. This slice does not add a separate paid TTS new-attempt UI.

UI integration changes: `app/game/hooks/useVoiceRecorder.ts`, `app/game/view/GameControls.tsx`, and new `app/game/components/RecordingRecovery.tsx`. Existing recording/playback controls and cancellation remain available.

## Executed evidence and remaining acceptance

Sixteen focused `voice-idempotency-*` tests pass under Node 24. They exercise actual TTS/transcription route handlers through a loopback HTTP adapter with mocked ElevenLabs responses, including dropped client responses, concurrent requests, one provider call, exact replayed content, input/model conflicts, separately spawned process recovery, orphan pending receipts and expiry. Additional tests cover byte/count limits, body cancellation after headers, persistent-ID fallback, retained-clip retry/discard and late-delivery prevention. Existing recording and voice-adapter tests also pass (28 combined tests after this increment).

Strict scoped size/complexity lint and full project TypeScript checking pass. These checks do not prove deployed Next connection lifecycle behavior, real ElevenLabs synthesis/transcription, actual audio output, microphone permission UI, screen-reader behavior or video-call audio routing. Real-browser and live voice rehearsal remain required before calling the voice demo accepted.

Skills applied: dec-ai-native-patterns, dec-software-principles, dec-quality-testing, dec-accessibility, enforcing-code-size.
