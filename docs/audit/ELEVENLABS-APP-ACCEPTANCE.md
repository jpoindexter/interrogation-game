# Live app voice checkpoint — 4 October 2026

The local app now has its owner-provided ElevenLabs key in ignored `.env.local`, mode `0600`. The file is not tracked. A read-only account request returned HTTP 200 during configuration; the key and account response are not retained in evidence.

## Executed through the running application

Source: `89c1058`, production build `Lj7AS1WFEHXbB2RZczI6l`, loopback port 3187. The prior preview handle was absent and the port refused connections. After confirming that state, the preview was restarted. The agent client's pending authored start was retried with its original request ID, then its opening was accepted through the public game routes. No private server case/session files were read or modified.

The accepted suspect statement was “I left at six and did not return to the building that evening.” One synthesis and one transcription were requested through `/api/tts` and `/api/transcribe`, using the real configured ElevenLabs service. Request identities were saved privately before delivery. The synthesized clip was the transcription input; this was not microphone capture.

| Operation | Observed result |
| --- | --- |
| Speech, default `eleven_flash_v2_5` | HTTP 200, 1,455 ms, 59,395 audio bytes |
| Same speech request replay | HTTP 200, 32 ms, byte-identical audio |
| Transcription, default `scribe_v2` | HTTP 200, 667 ms; exact original sentence |
| Same transcription request replay | HTTP 200, 35 ms, byte-identical response |
| Audio validation | MP3, mono, 44.1 kHz, 3.709375 seconds; FFmpeg decoded the full clip with no reported errors |
| Provider observation | Health recorded successful speech, then successful transcription; replay did not change either observation timestamp |

[Sanitized receipt](evidence/elevenlabs-app-acceptance.json) retains latency, response hashes, transcript and bounded health observations. The replay result and unchanged observation align with the existing durable-receipt path; no ElevenLabs billing-ledger audit was performed. Exact credit consumption was not measured. No batch, live AI turn or further voice sample ran.

The generated clip and client request capabilities remain under ignored `.local/voice-live-20261004/`. Neither capabilities nor audio are committed. The retained clip can be heard locally without another provider request.

## Acceptance still open

This executes real app synthesis, real app transcription, decoding, successful health observation and saved-response replay. It does **not** establish audible browser playback, microphone/device permissions or release, stop/skip/navigation cleanup, date/currency pronunciation, every suspect voice, or intelligible video-call audio. Browser automation remains unauthorized, and those live checks remain user-owned. Hosted storage and deployment acceptance remain separate.

ARCH-07, ARCH-08, UX-08 and UX-13 remain Verify. The missing local voice key is resolved; microphone, playback and rehearsal are now the next voice checks. No application source changed, so settled lint/build/regression suites were not repeated.
