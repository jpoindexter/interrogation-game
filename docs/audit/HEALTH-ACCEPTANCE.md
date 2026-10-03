# Health/configuration acceptance — UX-08

3 October 2026. **Keep UX-08 in Verify for the remaining browser/live-account acceptance.** The implementation now separates configuration from the timestamped result of the last requested AI or voice operation. Controlled actual gateway and voice-route checks distinguish authentication rejection, unavailable service, upstream throttling, unclassified failure and validated success. A rendered settings check proves the resulting labels and expiry behavior. No new real-account, microphone or browser playthrough was executed in this follow-up.

## Configuration defects corrected

`/api/health` could report overall `configured` when OpenAI and Supabase leaderboard settings were present on Vercel, even though the actual session repository rejects hosted gameplay. It also ignored unsupported local `SESSION_STORAGE` settings. Storage readiness now follows the session repository's actual guard: hosted or non-local session storage is unavailable regardless of separate leaderboard database settings. The hosted marker uses the same nonempty-environment interpretation as the repository.

AI-provider default handling now matches runtime nullish defaults: an explicitly empty provider is unsupported rather than being reported as the default local provider. An explicitly empty custom CLI setting is missing rather than being confused with the bundled CLI. Unsupported AI/storage selection values are reported using a fixed `unsupported` label rather than echoing arbitrary operator environment strings in the public endpoint. Voice detail now explicitly distinguishes an ElevenLabs plugin/account connection from this application's server API-key configuration.

The first configuration-only correction did not change frontend components or provider adapters. Its installation/key-presence flags remain **configuration, not sign-in, quota, model-access or successful-turn proof**. The subsequent observed-status implementation below adds request outcomes without changing credentials or accounts.

## Executed configuration route matrix (retained earlier evidence)

One bounded test in [health-readiness.test.ts](../../tests/health-readiness.test.ts) invokes the actual health GET handler and passes every response through the production client parser. External fetch is forbidden. It restores all modified environment settings afterward. The 14 scenarios are:

| Configuration | Observed response |
|---|---|
| Local bundled CLI installed, no browser or server voice keys | AI configured/unchecked, voice missing, local storage configured/unchecked |
| Operator AI stop switch | AI not configured; detail states operator stop |
| OpenAI selected without server key | AI missing |
| Synthetic OpenAI and ElevenLabs keys present | Both configured/unchecked; no authentication or playback claim |
| OpenAI settings present, voice key absent | Overall configuration remains configured; optional voice does not veto text settings |
| Explicit empty AI provider | Unsupported/missing, matching runtime rejection |
| Unknown AI provider value | Unsupported/missing; supplied environment string not echoed |
| Explicit empty custom CLI executable | Missing, with corrective detail |
| Custom CLI executable string | Configured/unchecked; installation and sign-in explicitly unverified; path not exposed |
| Local unsupported session storage | Storage missing and overall configuration required |
| Hosted OpenAI plus complete Supabase leaderboard settings | AI settings found, but session storage unavailable and overall configuration required |
| Hosted Codex selection | AI and session storage unavailable |
| Nonstandard nonempty hosted marker | Same hosted restriction as the actual session repository |
| Unknown leaderboard storage value | Storage missing; supplied environment string not echoed |

Every response returned `Cache-Control: no-store`. Synthetic keys, project URL, custom executable path and arbitrary provider strings were absent from public JSON. Configured services remained `unchecked`, never `ready`, `verified` or `authenticated`. Unsupported-session scenarios also executed the actual `sessionRepositoryKey` rejection as a cross-check.

[Route matrix output](evidence/health-readiness-checks.txt): one test passed. [Scoped strict ESLint](evidence/health-readiness-lint.txt), [size checks](evidence/health-readiness-size.txt), and [TypeScript](evidence/health-readiness-typecheck.txt) exited zero. An initial size check required splitting CLI configuration handling from provider selection; the final matrix ran after that refactor. No provider calls, CLI sign-in checks, microphone access, voice calls, browser automation or full test suite were performed.

## Observed status implementation

`service.status` stays `unchecked` or `missing` for configuration. AI and voice now add `observation: null | { status, observedAt, operation, stale }`; storage has no provider observation. The status is one of `succeeded`, `authentication_failed`, `unavailable`, `rate_limited` or `failed`. Operations are a fixed public enum: case, case-review, suspect, judge, debrief, speech and transcription. The shared pure contract defines a five-minute maximum age. This is a **past requested operation**, not a promise that another operation will work, and not evidence of end-to-end gameplay quality.

The server keeps at most one completed observation per service in a process-global registry shared by route modules. It is intentionally neither durable nor shared across server processes. A private SHA-256 configuration fingerprint includes relevant credentials/provider/model/executable/runtime settings; neither fingerprint nor values enter the public response. Reading after a configuration change invalidates the old observation, and a completion from the old configuration cannot record success under the new settings. No error text, upstream body, prompt, input, session identifier, key or private path is published.

Observations start after local usage admission. AI success requires the adapter response to parse and pass its structured schema. Speech success requires the bounded audio body to be fully read and nonempty; transcription success requires a nonempty parsed transcript. Receipt replay does not count as a new provider operation. Local authorization, input limits, budgets and user cancellation do not become provider failures. AI timeouts and typed transport/CLI availability failures are unavailable. Structured upstream HTTP 401 is authentication failure, 429 is rate limiting and 5xx is unavailable. HTTP 403 and generic CLI failures remain unclassified `failed`; arbitrary error prose is never parsed to infer authentication.

Health remains a no-store, read-only endpoint with **zero provider probes**. Root updated the production client parser, settings presentation and home status helper to honor missing configuration first, expire old observations, show timestamp/operation and preserve optional voice. Home says “AI responded recently” only for a fresh successful observation with usable game storage. This wording deliberately does not claim authenticated/ready forever. Health-fetch failure clears previous success from the UI.

## Executed observed-status checks

[provider-observations.test.ts](../../tests/provider-observations.test.ts) runs three bounded checks against controlled transports and an isolated temporary data root:

1. The actual AI gateway, OpenAI adapter, structured validator and health handler execute upstream 401/403/429/503, network rejection, invalid-schema HTTP 200 and valid success. The test checks ISO timestamp/operation, five-minute expiry, zero calls from health, absence of synthetic secrets, unchanged observation after local denial/cancellation, changed-config invalidation and ignored completion from replaced credentials.
2. The actual TTS/transcription handlers execute session authorization, durable voice receipts, provider adapters and body parsing before health is read. Successful speech and transcription become observations; upstream 401 becomes authentication failure; empty HTTP-200 audio is failed. Cached successful audio cannot erase a newer provider failure. Unauthorized text and exhausted local voice budget do not call the provider or replace its observation.
3. The actual AI gateway receives controlled typed Codex adapter outcomes. Generic CLI failure text mentioning sign-in stays `failed`; typed CLI unavailability is `unavailable`; timeout is unavailable; cancellation during execution preserves the previous observation. This does not run or authenticate the Codex CLI.

[Execution receipt](evidence/provider-observations.txt): **3 passed**. Scoped strict ESLint and size checks exited zero; [TypeScript](evidence/provider-observations-typecheck.txt) exited zero. The parent separately ran [ui-provider-status.test.tsx](../../tests/ui-provider-status.test.tsx): actual health shape → production parser with controlled observations → rendered production `ConfigurationList`, covering all five labels, request timestamps, expired success, malformed observation rejection, optional voice and game-storage veto. [Rendered UI receipt](evidence/ui-provider-status.txt): **1 passed**.

These executions establish same-process gateway/handler sharing and rendered markup. They do not establish browser interaction, independent Next worker sharing (which is intentionally unsupported), real account validity, device/microphone permissions, intelligible audio playback or next-turn success. The parent owns the integrated build; it is separate evidence.

## Original acceptance and remaining gap

| Acceptance | Current evidence / remaining gap |
|---|---|
| No browser keys plus working local backend shows text-ready status | The configuration matrix proves browser keys are unnecessary; controlled gateway → health and rendered helper prove fresh successful AI status. Current home uses “AI responded recently” and honors storage configuration. No browser check of this new state against the user's real local provider was executed here. |
| Invalid authentication, unavailable voice and offline text backend have distinct truthful states | Implemented and executed with structured upstream statuses and controlled network failure. Generic CLI failures remain unknown rather than falsely labeled authentication failure. No live credential rejection was deliberately induced. |
| Optional voice failure does not block typed play | Configuration and rendered UI checks prove voice does not veto AI status; existing fallback evidence is retained elsewhere. This follow-up did not execute browser typed play after a real voice failure. |

The earlier configuration-only operational gap has been implemented; the remaining verification is the live/browser acceptance path, not another requirement to poll providers or spend credits. Microphone availability/permission remains a browser concern, not something the health endpoint can verify.

Skills applied: dec-quality-testing, dec-software-principles, dec-ai-native-patterns.
