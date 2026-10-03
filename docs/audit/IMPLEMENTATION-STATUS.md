# Implementation status — 3 October 2026

This is the current implementation ledger. The original audit documents preserve the historical baseline. Work is active and the complete goal is not achieved.

## Outcome and authority

Build a reliable local interview demo and portfolio project, with a modern modular stack, Codex subscription dialogue, ElevenLabs voice, richer evidence-led play and truthful documentation. The private Trello board now contains 70 cards: 62 original tasks and eight accepted expansions. The latest expansion is the win/loss conversation map. Website and case study integration into https://jason.theft.studio follow game acceptance.

Local implementation, necessary regression checks, parallel agent work and Trello updates are authorized. The user directs Git commits/pushes as work is completed. The prior checkpoint `e84f614` was pushed to `origin/codex/portfolio-upgrade` and verified against the remote. The follow-up below has recorded its actual execution evidence; Git history records the corresponding implementation checkpoint. Deployment remains unperformed. The user will perform the live check later and explicitly requested continued implementation meanwhile. That live check is user-owned, not a pending approval question. Browser automation remains disabled unless explicitly reauthorized; do not bypass that restriction through another interface.

## Latest acceptance and interview capture

LOGIC-03, LOGIC-06, LOGIC-17 and LOGIC-19 now join ARCH-01 in Done. Their original criteria were executed through actual route/result modules and filesystem persistence with controlled provider transport; see [BACKEND-ACCEPTANCE.md](BACKEND-ACCEPTANCE.md). This closes those bounded rules, not browser, voice or hosted acceptance.

[CLUE-SOURCES.md](CLUE-SOURCES.md) records exact source exchanges, draft quote actions and neutral numbered clue markers. Focused checks, lint, size and production build passed; UX-06/12 stay in Verify for user-owned browser/comprehension review. [FRESH-CHECKOUT.md](FRESH-CHECKOUT.md) records an actual clean remote clone at `8779a9b`, installation, build, authored CLI/HTTP path and process-restart recovery; it does not cover later source changes or browser presentation.

The user's interview framing is captured in [INTERVIEW-BRIEF.md](../INTERVIEW-BRIEF.md) and the existing story, portfolio and gameplay-evaluation cards: adversarial conversational design, bounded adaptation claims, the four-app breadth overview, two 15-minute stories and a real collaboration example. These are preparation tasks, not completed presentation evidence.

## Executed evidence

- A clean `npm ci` in a separate temporary directory succeeds with Node 24.21.0 / npm 11.21.0. Its ESLint deprecation warning and development advisories remain explicit.
- The last full automated gate, before the generation and progression follow-ups, ran 297 tests successfully, zero-warning ESLint, module/function-size checks, TypeScript and a warning-free production build. See evidence/current-verify.txt; these are local automated checks, not browser or voice acceptance.
- `evidence/local-http-gameplay.json` records a real localhost HTTP/Codex subscription playthrough: authored opening, pinned statement, unrelated exhibit, supported contradiction, wrong accusation, correct accusation, canonical debrief and recovered win. Model responses took about 7–9 seconds. It does not establish browser or voice behavior. The earlier evidence file preserves the false-positive disclosure filter that this run corrected.
- `evidence/judge-fairness.expected.json` fixed expectations before execution. `judge-fairness.json` records 10/10 live checks: two valid paraphrases, wrong evidence/person, unrelated assertion, unsupported theft inference, instruction attacks, public alibi and metadata extraction. One case/one sample per item is a limited sample, not a reliability guarantee.
- Durable sessions, atomic score redemption, completion export, actual process restart/crash, dropped HTTP responses, provider cancellation and request replay have regression evidence. The provider cancellation test starts a real parent/child process group and verifies both stop with no delayed side effect.
- The conversation path is integrated into win and loss results. It classifies canonical accusation attempts and saved evidence challenges; ordinary dialogue remains neutral. Exact statements and disclosed exhibits are inspectable. A typed fake accusation marker cannot manufacture a verdict.
- Asset identity is explicit and persisted, outcome decoration uses an existing text-free motif, and CSS was split with equivalent compiled rule trees. The asset manifest records 134 media files and unknown rights rather than inventing provenance. No media was regenerated.

## Progression and modularity follow-up

A real generated-case follow-up exposed a specific evidence-based accusation blocked by the stress-based clue counter. Generated-case clues are now optional investigation hints; the authored evidence requirement and server judge/attempt rules remain. The CLI supports explicitly selected generated cases and validated picker settings. One real startup/easy relaxed case completed generation → question → accepted accusation with zero clues → saved local export → matching result recovery, including its conversation path. See [GENERATED-ACCUSATION-ACCESS.md](GENERATED-ACCUSATION-ACCESS.md). This is actual CLI/HTTP/provider evidence, not browser or audio acceptance.

Live orchestration is now under `src/lib/game-ai`, with old unused Mistral facades removed. Pattern storage records accepted per-turn changes and execution-time provenance, and selects example questions only from accepted clue or authored evidence events. Migration005 separates the new embedding input; live DB/retrieval quality remains open. Lint, size and production build passed, with limited affected checks instead of a full-suite repeat. The latest dependency check still reports five high development findings and zero production findings; a tested replacement changed Next lint behavior and was rejected. Reports: [PROVIDER-NAMESPACE.md](PROVIDER-NAMESPACE.md), [EVENT-GROUNDED-PATTERNS.md](EVENT-GROUNDED-PATTERNS.md), [DEPENDENCY-FOLLOWUP.md](DEPENDENCY-FOLLOWUP.md).

## User playthrough correction

The user observed a failed startup/easy generation after a long spinner. Its saved receipt completed at 90.02 seconds with the old generic 502, matching the original shared deadline. Case preparation now reports durable server stages and elapsed wait through a noir progress panel; failure recovery includes a direct authored-case option. Specific timeout/provider/review errors are preserved. Drafting uses the faster local Luna model; independent review/dialogue/judging retain Sol, with a separate 120-second overall generation deadline.

The first real check after the timing change reached review but was rejected after 84.078 seconds. The next revision constrained generated stories to two true background statements, one denial and directly attributed evidence, preserving the reviewer. One real startup/easy case then reached HTTP 200/ready after 64.069 seconds and recovered the same unstarted briefing. The server-rendered response contains the progress strip. This is one observed success, not a generated-case reliability guarantee or a browser visual pass. See `GENERATION-RECOVERY.md` and `evidence/generation-v4-live.json`.

The accompanying changes add editable evidence-question starters and clearer action consequences, correct outdated Relaxed-mode guidance, restrict optional Supabase traffic to configured managed project origins without redirects, and add an evidence-grounded interview narrative. Targeted checks and the latest production build passed; the full 297-test suite was not repeated. Jason continues the actual visual/audio review.

## Latest portfolio checkpoint

The local JSON agent-control CLI now supports one action at a time through the canonical HTTP routes. Its actual authored start/state/opening/pin/give-up/result/recovery path ran with AI disabled. One additional real `gpt-6.1-sol` question succeeded through the signed-in Codex adapter in 10.197 seconds including CLI startup; the result retained both turns. See [agent control](../AGENT-CONTROL.md) and `evidence/agent-control-live.json`. The local model default is now `gpt-6.1-sol`; the future API adapter default remains `gpt-6-luna`. Earlier Luna evaluation evidence is not reattributed to Sol.

The bounded design pass improves home entry/setup wording, multiline question and accusation review, visible input limits, larger controls, authored-case replay and expert-case labels. Scoped lint/size and type checks passed; the combined production build passed (`evidence/demo-checkpoint-build.txt`). No new test suite was added and the earlier 297-test suite was not rerun for these changes. Actual visual/browser acceptance remains a user-owned live check for later.

Exactly one live ElevenLabs plugin sample completed at a reported 12.5 credits. The game server still has no configured ElevenLabs API key. See [connector check](ELEVENLABS-LIVE-CHECK.md). Plugin generation does not prove in-game voice.

## Current work

The latest agent-control scope has executed its bounded local start/read/action/result path: authored start, state, opening, pin, give-up, result and recovery ran with AI disabled; one additional Sol question ran live. The scoped UI checks and combined build passed, while actual visual/browser inspection and a complete video demo remain pending. See the latest portfolio checkpoint above; the earlier 297-test gate was not rerun for this increment.

The latest integration adds durable local endpoint, voice and aggregate AI work budgets, an operator stop switch, replay-safe voice receipts, an independent structured preflight for generated cases, and response validation before gameplay state changes. `SHARED-BUDGETS.md` records real concurrent-process and restart evidence. Every rate-limited API now distinguishes exhausted allowance (429) from unavailable budget storage (503) before work starts. Independent test files use private roots; explicit cross-process fixtures continue sharing their chosen root.

Aggregate AI reservations cover candidate generation, review, suspect dialogue, judgment, debrief and optional embeddings before adapter/fetch entry. Session and direct-operator allowances survive concurrent processes and restart; `AI_WORK_ENABLED=false` stops new work but does not cancel already-running calls. These are conservative call/input-character limits, not token/currency billing. `ai-budget-integration.test.ts` covers the real route/provider gateway and embedding stop/exhaustion boundary. Hosted shared budgets remain unimplemented.

`VOICE-IDEMPOTENCY.md` records durable, byte-bound speech/transcription request receipts, private bounded audio replay, dropped-response/concurrent retry and process-restart tests. Completed replay does not repeat the provider or reserve usage twice. Interrupted or expired work requires an explicit new attempt; no universal one-charge guarantee is made. Client clip recovery, explicit retry/discard and cancellation have controlled tests, not real microphone/playback proof.

Case and evidence response parsers reject malformed public controls, forged progress, broken source references, inconsistent dialogue and unknown/private fields before state mutation. Their focused tests are included in the integrated gate; actual browser recovery is still unverified.

`GENERATED-REVIEW.md` preserves the first six live reviews (3/6 diagnostic matches, one authored false rejection). `GENERATED-REVIEW-V2.md` records eight further predeclared reviews: 6/8 full criteria and 7/8 admit/reject labels matched, with a material false acceptance of unsupported phone-to-person attribution and a missed recorded-time inference. All three authored controls were accepted. The exact saved phone case is separately rejected by the deterministic 500-character content guard; the semantic review itself remains fallible. No generated-case fairness or solvability guarantee is claimed. The approved post-capture deterministic comparison correction is versioned v2.1-guard; frozen live hashes and labels remain intact. A rejected new case never reaches its playable checkpoint; stable failure receipts and an explicit new-attempt flow are tested. Historical generation checkpoints retain their existing recovery contract. Gameplay response parsers validate complete turn, accusation and hint payloads before changing state. Malformed responses and transient 429/503 failures retain the same request ID; an executed recovery regression appends the accepted turn once. The final rejected accusation and cancelled-confession paths have controller regression coverage, not browser proof.


This continuation added a clearly labeled recorded fallback at `/rehearsal`, corrected onboarding stress guidance and storage-safe dismissal, and made finished-game recovery independent of browser result-cache writes. A strict session parser now rejects malformed recovery fields before client state updates. Its actual localhost give-up/recovery path passed (`evidence/recovery-parser-http.json`). Export delivery now remains pending if the final local confirmation write fails; actual filesystem failure/retry is covered. The export CLI card ARCH-01 is complete against its controlled CLI/HTTP acceptance, with 12 targeted checks in `evidence/export-acceptance.txt`.

Generated-case evaluation now preserves v1, v2 and a single v3 completeness check. Runtime objectives match the real win condition, and a narrow guard rejects the observed schema-ceiling fragments. Source inspection still finds multiple material false claims and ambiguous evidence; see `GENERATED-CASE-EVAL.md`. Generated-case fairness is open despite passing structural/verdict probes.

Current architecture, rehearsal instructions and all 70 card acceptance gaps are mapped in `docs/ARCHITECTURE.md`, `docs/LOCAL-DEMO.md` and `ACCEPTANCE-COVERAGE.md`. Recorded-route HTTP and markup checks passed; no browser interaction, voice or screen-share proof is claimed.

Generation now uses POST, a reserved session ID and a private validated-case checkpoint. Real child-process crash tests cover recovery before and after session materialization without repeating inference. Client receipts retain the same request through remount/transport ambiguity and require an explicit new attempt after known failure; actual browser remount remains unverified.

The independent review fixes and their regression checks are recorded in `INTEGRATION-REVIEW.md`: authorized terminal speech, canonical result recovery, quoted metadata/private clue filtering, accepted timestamps and unreviewed live statement labels. Movable panels, global accessibility preferences and explicit Challenge/Relaxed/Endurance rules are implemented. Browser behavior remains pending.

`evidence/local-http-gameplay-map.json` records a subsequent real HTTP/Codex win and relaxed give-up loss. The win path is neutral dialogue → unsupported challenge → supported challenge → rejected accusation → accepted accusation. Both result paths survive server recovery; actual model calls took 8.6–9.8 seconds. The loss opening is authored rather than an inference call. This is server behavior evidence, not browser or microphone proof.

The literal disclosure guard now preserves public cover-story dialogue and exact player wording instead of stripping adversarial questions. It blocks internal metadata and verbatim undisclosed facts. It does not claim to detect all semantic paraphrases; authoritative evidence progress and outcome rules remain separate from actor prose.

## Remaining acceptance gaps

- Actual browser: start/resume, keyboard/dialog focus, small windows, text sizing, reduced motion, results/map, failure recovery and screen-share rehearsal. User-owned live check deferred by the user; continue independent implementation.
- ElevenLabs: one plugin Flash v2.5 sample completed (1.6254 seconds, reported 12.5 credits), without a paid retry; see `ELEVENLABS-LIVE-CHECK.md`. The 10,000-credit starting balance remains user-reported. The local game has no configured ELEVENLABS_API_KEY. Game TTS/STT, microphone capture, audible playback and screen-share routing remain unverified; use further credits sparingly.
- Hosted path: server OpenAI adapter exists, but no API key/live API proof. Shared durable session backend and live database migrations/RLS/delivery are incomplete. Vercel session requests fail explicitly until that dependency is implemented.
- Dependencies: production audit reports 0 advisories. Five high development-chain findings remain from braces 3.0.3 through the current Next ESLint configuration. Registry reports no newer braces release. ESLint 10 is outside the current React/import/accessibility plugin peer ranges. Do not hide these findings or force a framework downgrade.
- Wider generated-case solvability, broader fairness evaluation and real player feedback are not established by the authored sample.
- Website, portfolio publication and evidence-backed case study remain required after game acceptance. No invented outcomes, user research or metrics.

## Working constraints

- **Outcome:** finish a convincing, reliable local game demo, then portfolio/site work grounded in its executed behavior.
- **Target:** this repository and the existing 70-card Trello board; root coordinates Git checkpoints and pushes.
- **Must:** use parallel work where useful; keep the portfolio/interview outcome central; run only tests needed to verify meaningful behavior or a changed risk. The recorded 297-test full gate is existing evidence, not a reason to repeat it for documentation edits.
- **Must not:** claim browser, audio, hosted, billing or semantic reliability from fixtures; consume ElevenLabs credits with broad or redundant testing; claim a push before root confirms its commit and remote result.
- **Authority:** implementation, Trello updates, Git pushes and necessary sparing voice checks are user-authorized. The user owns the later live check; browser automation remains restricted unless explicitly reauthorized.
- **Done evidence:** actual required game paths and demo rehearsal, truthful residual limits, followed by the authorized portfolio/site deliverable. The overall goal remains active.

## Re-entry

Inspect Git status and active agent ownership; read this ledger and the plan; refresh Trello; read the latest integrated evidence, then continue independent implementation while the user retains the later live check. Local production preview is running at `http://127.0.0.1:3187`; starting it did not invoke a provider. Capture actual check output under `evidence/` without replacing audit-baseline files. Continue the earliest unverified acceptance path. Never mark the entire goal complete from a build or mock test.

Skills applied: agent-fanout, enforcing-code-size, dec-software-principles, dec-quality-testing, dec-ai-native-patterns; specialist skills are listed in the corresponding reports.
