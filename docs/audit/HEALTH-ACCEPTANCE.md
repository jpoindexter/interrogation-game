# Health/configuration acceptance — UX-08

3 October 2026. **Keep UX-08 in Verify.** The configuration endpoint is now consistent with actual session-storage restrictions, but it still does not distinguish invalid authentication from an authenticated or offline provider. Its response explicitly says live service use is unchecked. That honest limitation is not the complete operational-readiness acceptance criterion.

## Confirmed defects corrected

`/api/health` could report overall `configured` when OpenAI and Supabase leaderboard settings were present on Vercel, even though the actual session repository rejects hosted gameplay. It also ignored unsupported local `SESSION_STORAGE` settings. Storage readiness now follows the session repository's actual guard: hosted or non-local session storage is unavailable regardless of separate leaderboard database settings. The hosted marker uses the same nonempty-environment interpretation as the repository.

AI-provider default handling now matches runtime nullish defaults: an explicitly empty provider is unsupported rather than being reported as the default local provider. An explicitly empty custom CLI setting is missing rather than being confused with the bundled CLI. Unsupported AI/storage selection values are reported using a fixed `unsupported` label rather than echoing arbitrary operator environment strings in the public endpoint. Voice detail now explicitly distinguishes an ElevenLabs plugin/account connection from this application's server API-key configuration.

No frontend component, credential, provider adapter or account was changed. The local CLI remains a configuration/installation observation, **not sign-in, quota, model-access or successful-turn proof**. A custom CLI setting remains explicitly unverified for installation. API-key presence is unverified configuration, not authentication success.

## Executed route matrix

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

## Original acceptance, without substituting configuration for readiness

| Acceptance | Current evidence / remaining gap |
|---|---|
| No browser keys plus working local backend shows text-ready status | Server settings are independent of browser keys and real local-provider playthroughs exist elsewhere. The current home badge says “AI settings found,” and settings say “live use not checked.” No rendered browser check or explicit operational text-ready state was established here. |
| Invalid authentication, unavailable voice and offline text backend have distinct truthful states | Missing voice configuration and failure to fetch health are distinct. Present-but-invalid provider credentials and offline provider remain unchecked; they are not distinguished operational states. This is the concrete remaining implementation gap. |
| Optional voice failure does not block typed play | The matrix proves optional voice does not block text configuration. Existing voice fallback/input checks are separate retained evidence; actual browser typed-play behavior after a live voice failure was not executed in this follow-up. |

The next implementation decision is how to expose a bounded, timestamped observed status—through a non-inference authentication/status probe or sanitized results of actual requested operations—without silently spending inference/voice credits. Provider error classification must distinguish authentication from unavailable service rather than guessing from a generic failure string. Microphone availability/permission remains a browser concern, not something the server health endpoint can verify.

Skills applied: dec-quality-testing, dec-software-principles, dec-ai-native-patterns.
