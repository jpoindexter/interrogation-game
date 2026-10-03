# Architecture, stack, AI migration, voice, and Git-history audit

Audit date: 2026-10-03. Scope: audit only. No application edits, upgrades, credentials changes, or model calls made by this audit. Repository HEAD f8d4c3c. Skills applied: enforcing-code-size, dec-software-principles, dec-quality-testing, OpenAI Docs.

## Recommendation

Keep Next.js App Router, React, TypeScript, Tailwind, and the existing game presentation. The foundation is already modern: Next 16.1.6, React 19.2.3, Tailwind 4.2.1, TypeScript 5.9.3. Its most valuable upgrades are dependable game state, provider separation, measured voice latency, and regression coverage. Rebuilding the framework would add risk without solving the demo's actual failures.

For the interview, build one reliable local path: validated case → questions → clues → accusation → outcome, with ElevenLabs speech and text fallback. Use a local-only Codex adapter as a feasibility spike with Jason's existing signed-in CLI; a separate API adapter later supports Vercel when an API key exists. Maintain a clearly labelled, deterministic rehearsal/replay mode for provider/network failure. A replay is not a live AI demonstration.

## What was actually established

- Root audit executed install/build/lint/audit: build succeeds; ESLint reports 21 errors and 49 warnings; audit reports 18 affected packages (1 critical, 14 high, 2 moderate, 1 low). This does not establish live gameplay, provider availability, or exploitable reachability of every advisory.
- This audit read all 98 commit subjects, inspected critical historical diffs, current implementations, lockfile audit and package registry peer/runtime metadata. There are 96 commits dated Feb 28–Mar 1 2026 and 2 on May 8; available history indicates about seven months, not a year, as of the audit. Earlier work outside this history is unknown.
- Executed the existing export CLI body with a synthetic secret and mocked fetch/filesystem: URL and console log include the secret; fetch has no Authorization header. No network request, real credential, or data write was involved. This proves request construction, not the real export service.
- Root verified Codex CLI 0.144.1 and ChatGPT login status. Neither root nor this audit has verified inference latency or a full subscription-backed game turn.
- Browser path was blocked by the automation environment. No workaround attempted; interactive microphone, voice, accessibility and visual findings still require actual browser execution.

## Git history: retain intent, close incomplete follow-through

| Change | Evidence and implication |
|---|---|
| 468a983 → db74626 | Initial voice interrogation gained case selection and an explicit accusation mechanic. Preserve the central detective loop; many future tasks should strengthen it rather than introduce unrelated modes. |
| 356bd71 | Voxtral STT, settings and accessibility added. The requested OpenAI migration must include transcription, not just text generation. Current ElevenLabs code only handles speech output. |
| 9520481 → 221722f | Neon leaderboard replaced by Supabase. `@neondatabase/serverless` remains installed with zero source imports: remove after a full import/build check. |
| 325c2d7, 221722f, cfc72e6, af730ca | Repeated modularization/line-limit work. This is a design intention worth retaining, but no current lint gate enforces it and large functions remain. |
| 43934f0 → 8e7d5b8 | Server sessions strip secrets from client; later globalThis fixes dev hot-reload session loss. Good separation of trust. globalThis does not provide cross-process/serverless persistence. |
| 49f5cf2, 400a800, 772fbf5 | Voice/music lifecycle fixes were repeatedly needed. Add explicit lifecycle ownership and behavioral regression tests, not another scattered cleanup patch. |
| 0570cac | RAG introduced to adapt suspects using prior games. Adds embedding/provider/database dependencies to case creation. Make optional in local demo and never claim learned improvement without comparison evidence. |
| ac1b171 | Completed-game exports added. Persistence is currently fire-and-forget through the default Supabase client, independent of user-supplied per-request database settings. |
| 42aa67a, c132c95, a4bcc5b | BYOK setup expanded and restored for hackathon judges. Current accuse/evaluate intentionally use server credentials, so browser-key-only onboarding does not configure the full loop. Local demo should use server-side config plus health state. |
| 54b264a | CLAUDE.md removed and ignored. Architectural history survives in Git but current contributor guidance/decisions need a small versioned replacement. |
| f8d4c3c | Export endpoint migrated secret to Authorization. CLI was missed: `scripts/export-data.ts:22–29` still sends and logs the secret in URL, and cannot satisfy new auth. Executed synthetic reproduction above. |

Do not describe historical security-hardening commit messages as evidence that the current application is secure. They establish attempted fixes and review intent, not executed present-day guarantees.

## Stack upgrade plan

Versions below were observed in the registry on this audit date; refresh immediately before implementation. Package peer compatibility is not runtime proof.

1. **Runtime and security baseline.** Pin local Node 24 LTS (current official LTS 24.21.0), declare `engines.node: 24.x`, align @types/node to 24, and pin package-manager major. The current shell is Node 22.23.2 and the repo has no runtime pin. Vercel supports 24.x; latest Supabase requires Node >=22. Next >=20.9 is only its minimum, not the recommended runtime. Avoid Node 26 Current for interview stability.
2. **Coordinated framework update.** Next 16.1.6 → registry candidate 16.3.8 and eslint-config-next → same version. React/react-dom stay paired; 19.3.0 is a candidate, not a requirement to fix Next. Next peer metadata accepts React ^19. Existing Next audit includes critical entries; actual applicability varies by hosting/configuration. Current next.config.ts enables AVIF and the advisory graph includes image/sharp issues: prioritize before any external deployment.
3. **Same-major upkeep.** Supabase 2.98 → 2.117.2, Tailwind and @tailwindcss/postcss 4.2.1 → 4.3.3 together, font package 5.2.5 → 5.3.0, Framer Motion 12.34.3 → 12.43.0, ESLint 9.39.3 → 9.39.5. Recompute lockfile and audit production/tooling separately.
4. **Provider migration.** Replace Mistral runtime after all five capability groups move: case generation, suspect response, accusation judging/outcome summaries, STT, and embeddings (or explicitly disable embeddings). Remove Mistral SDK only when scripts and type imports are migrated. Remove dead Neon immediately once import scan/build verify.
5. **Defer major jumps until isolated checks.** Registry reports TypeScript 7.0.2, ESLint 10.12, Framer Motion 14, and Mistral 2.7. They are not collectively an upgrade plan. Keep TS5.9 while establishing type/schema/tests, then separately evaluate compiler/deprecation differences; keep ESLint9 while baseline errors are fixed; Motion14 only if a needed feature justifies regression cost. No need to upgrade a provider being removed.

Never run `npm audit fix --force` blindly: the captured graph proposes DOWNGRADING eslint-config-next to 14.2.35 for some transitive fixes, incompatible with the intended coordinated Next16 stack. Inspect/refresh transitive resolutions, then rerun audit. Some vulnerabilities are build tooling, not public-request runtime; distinguish rather than reporting 18 remotely exploitable holes.

## Local Codex adapter and future OpenAI API

Official docs establish subscription sign-in for local Codex, saved authentication reuse by `codex exec`, and JSON Schema output. They do not prove this game adapter's latency, reliability, or available quota. API-key access uses separate API billing. Never upload the user's auth store to Vercel, expose a generic Codex execution endpoint, or treat subscription login as an API key.

Proposed seams:

- `domain/case.ts`, `domain/turn.ts`, `domain/outcome.ts`: provider-neutral validated input/output types.
- `server/ai/game-provider.ts`: small capability interface for generateCase/respond/judge/summarize. Embeddings separately optional; avoid a giant generic provider framework.
- `server/ai/codex-local.ts`: local adapter with a bounded queue, explicit timeout, cancellation, strict response schema, and narrow error mapping. Use argument arrays/stdin, not shell interpolation of user text. Isolated working directory; no project files, plugins, shell execution or other unrelated tools exposed to player input. Verify available CLI flags/config against the installed version before construction; do not assume read-only sandbox means no read access.
- `server/ai/openai-api.ts`: future server-only OpenAI Responses API adapter, configured by future `OPENAI_API_KEY`, not browser settings or copied Codex tokens. Keep public route contracts unchanged.
- `server/ai/replay.ts`: fixed, clearly labelled rehearsal scenario for cold-start/rate-limit/network failure.

Initial local success criterion: ten complete turns through actual browser → local route → authenticated Codex → validated game state → visible response, then correct and incorrect accusations; measure first-response and total turn latency; exercise timeout, cancellation, malformed output and quota failure. Existing 30-second case timeout and automatic retries are not proven suitable for Codex startup. Start with short structured output, no tools, one in-flight turn; do not impose an elaborate agent orchestration system on a conversational game.

Model selection remains an implementation decision after testing account access and latency. Do not mechanically carry Mistral temperature 1.3 or parameter names to another provider. Keep prompts and model IDs versioned/configurable so interview replay and later API behavior can be compared.

Mistral embeddings currently generate 1024-dimensional vectors and README defines vector(1024). OpenAI embeddings are a separate API capability, not something obtained from Codex text inference. For local demo, disable RAG or use a small curated tactic set with transparent labeling. Before later RAG migration, create a new embedding column/index or versioned table, re-embed all examples, and compare retrieval quality; matching dimensions alone does not make different embedding spaces compatible.

## Concrete modularity work

Raw line counts are screening measures, not exact lint violations: globals.css407, mistral/interrogate357, game/page313, game-session307, about-game/page301; settings287 and lose286 look below300 but contain multiple responsibilities. AST raw function spans: interrogate289, GameContent266, LoseContent243, SettingsPage234, avatar181, API interrogate POST150. Many short lines cram branches; target cognitive clarity, not compression.

Adopt preferred 150–200-line cohesive modules, review at200/250, hard300 executable lines; functions30 preferred/50 hard, complexity10, parameters4 via options objects, nesting4. Exclude generated assets/fixtures. Add an accurate ESLint gate counting no blanks/comments. Do not fix a limit by minifying JSX or scattering one concern arbitrarily.

| Existing seam | Proposed decomposition |
|---|---|
| app/game/page.tsx | thin route + GameScreen; useGameSession/loadCase; useQuestionTurn; useAccusation; gameReducer for phases; UI overlays/ambient effects separated from turn transactions |
| src/lib/game-session.ts | session types; repository interface; local-memory repository; game transition service; terminal outcome persistence; win-token store. Keep in one feature folder, avoid microservices. |
| src/lib/mistral/interrogate.ts | provider-independent prompt builder; difficulty rules; adaptive behavior; response schema/parser; provider call. Move prompt text to named prompt sections with tests for logical consistency. |
| src/lib/mistral/evaluate.ts | accusation judge vs outcome summary; typed success/error union. Parse failures must be service errors, not incorrect accusation judgments. |
| app/api/interrogate/route.ts | thin validation/HTTP adapter; execute-turn service; validate proposed outcome before mutating session; one committed result with request ID |
| useTTS/useBriefingTTS/useVoiceRecorder | shared cancellable audio player, recording lifecycle, provider routes. Own AudioContext/MediaStream/blob URL in one lifecycle and dispose on manual stop/navigation/failure. |
| settings/page + hooks + home status | single validated preferences schema, separate server provider health/config; persisted local preferences exclude provider secrets |
| game/win and lose | shared ResultScreen, result retrieval, debrief, share and leaderboard capabilities; terminal result independent of mounted page effect |
| globals.css | tokens/theme, base/type, motion/effects, utility sections with explicit layer/import ordering |

Add server-only boundaries to credential/session/provider modules; move ConversationMessage out of `mistral` so UI types do not depend on a retired vendor name. Pick one alias convention (`@` currently means src while app mixes relatives). `SuspectAvatarPixi.tsx` is canvas-based code, not a Pixi dependency: rename to reflect implementation rather than installing Pixi because of its filename.

## Critical behavior to protect while refactoring

- Game loading currently calls res.json without checking HTTP status and sets error payloads as caseData (`app/game/page.tsx:117–125`). Return a typed loading/error/success result; invalid cases never enter briefing.
- Automatic retry of POST interrogate (`page.tsx:172`) has no idempotency key. A client timeout can occur after server commit; retry may consume a second turn. Request IDs + server result cache/transaction prevent double advancement.
- Server stores raw response messages and increments clue count before secret filtering (`api/interrogate:109–151`). Persist the finalized visible response and clue event atomically so client, TTS, evidence and server agree.
- `evaluateAccusation` treats JSON parse failure as incorrect (evaluate.ts:85–89). Accuse route restores on thrown failure only; malformed model output can unfairly consume an accusation. Return service failure and restore all counters.
- Current timer uses localStorage live and counts active/non-speaking client seconds; server stores timer mode at creation but derives elapsed from creation wall-clock. Define start/pause policy once and drive UI from session state before benchmarking voice latency.
- Export side effect uses global default Supabase (game-session:251) while other calls can use per-request database settings. Fire-and-forget persistence is not completion evidence. Local mode can save locally or visibly skip exports; hosted mode needs awaited durable write/retry, with clear privacy/retention intent.
- globalThis maps/locks are valid only within one process. Retain them for a controlled local demo with reset/recovery; future Vercel requires shared session store, atomic turn updates, token consumption and rate limiting. Do not add hosted infrastructure as a blocker to local rehearsal.

## ElevenLabs upgrade

Current STT is Mistral Voxtral; current ElevenLabs route is TTS only. Restore voice by implementing explicit ElevenLabs transcription and synthesis adapters behind the same game contracts, with server-held configuration and a preflight status that actually checks readiness. Retain text input as immediate recovery.

Official ElevenLabs models page deprecates `eleven_turbo_v2_5` in favor of `eleven_flash_v2_5` for lower average latency. Trial Flash2.5 for live suspect turns; audition expressive newer models for pre-generated briefing/cinematic lines only if they improve this art direction. Do not assume newest model means better turn experience. Their ~75ms figure is model latency, not browser→STT→Codex→TTS end-to-end latency.

Current route buffers `response.arrayBuffer()` and browser then buffers `res.blob()`, so it is not streaming voice even though a latency option appears in JSON. The streaming endpoint exists; `optimize_streaming_latency` is deprecated and documented as a query parameter, whereas current code sends it in body. Replace with documented model settings, measure first audible sample, and implement real browser-compatible streaming only after baseline audio is reliable.

`useVoiceRecorder` lacks unmount disposal and manually stopping does not close the local AudioContext; file name is always recording.webm even for MP4. `useTTS` does not abort pending requests, revoke URLs on skip/unmount, or prevent a resolved pending fetch playing after navigation. Set one request/generation ID, AbortController, exact once completion callback, and deterministic cleanup. TTS is disabled by default in development (`useSettings.ts:5`), so the local interview run must set the mode deliberately rather than look silently broken.

Voice acceptance: recorded speech becomes editable text/question; same selected suspect voice remains stable across turns; stop/skip/navigation cancel pending and playing audio; mic indicator turns off; no stale response after switching cases; dates/currency/case numbers intelligible; unavailable provider visibly falls back to text; test audio share in the actual video-call app.

## Sources read

- https://learn.chatgpt.com/docs/auth — local subscription vs API authentication and billing; do not expose Codex publicly.
- https://learn.chatgpt.com/docs/non-interactive-mode — saved auth, structured output, invocation controls; current docs may exceed installed CLI capabilities, so verify flags before implementation.
- https://nextjs.org/docs/app/guides/upgrading/version-16 — runtime and upgrade requirements.
- https://nodejs.org/en/about/previous-releases — LTS release status.
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions — Node24 deployment support.
- https://elevenlabs.io/docs/overview/models — deprecated Turbo and Flash model guidance.
- https://elevenlabs.io/docs/overview/capabilities/speech-to-text — transcription capability.
- https://elevenlabs.io/docs/api-reference/text-to-speech/stream — streaming contract/deprecated latency parameter.
- Package registry metadata executed for Next16.3.8, eslint-config-next16.3.8, Supabase2.117.2, Motion12.43/14, TypeScript7, Tailwind and Neon; observed versions are candidates, not tested upgrade results.
