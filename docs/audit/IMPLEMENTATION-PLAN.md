# Interrogation implementation plan

Created: 2026-10-03. Baseline: `f8d4c3c00e229bf0dfc8427e1c5593cc98edb7fc`.

## Authority and stopping boundary

Jason authorized implementing the audit findings, fixing errors, warnings and defects, and modularizing throughout. His final instruction for this turn is to set a plan and goal, then stop. This document and the persistent goal are the current deliverables; application implementation begins on continuation. The audit documents remain the historical baseline, not current implementation status.

## Outcome and constraint ledger

- **Outcome:** a dependable, polished local interrogation demo suitable for a live interview video, with OpenAI-backed dialogue, ElevenLabs voice, and a maintainable path to Vercel.
- **Target:** this repository and the 62 canonical tasks on the [private Trello board](https://trello.com/b/Ww5bceNb/interrogation-superhuman-demo-upgrade).
- **Must:** resolve known defects, inspect new regressions, upgrade compatible dependencies, preserve the noir identity, modularize as each area changes, and prove behavior with repeatable checks.
- **Must not:** hide warnings with blanket disables; suppress security reports to obtain a green result; compress code to meet size limits; copy Codex authentication to a hosted deployment; label replay as live inference; claim an unexecuted check passed.
- **Authority:** local implementation, tests, documentation, and backlog updates are authorized. No production deployment, destructive database operation, or external messaging is implied.
- **Done evidence:** every applicable acceptance criterion executed, no unresolved lint/type/build errors or warnings, meaningful regression tests passing, dependency advisories remediated or explicitly unresolved, and the real demo path observed. A remaining credential, access, or infrastructure blocker remains open and prevents claiming the affected item complete.

## Now, next, later and re-entry

- **Now:** implementation resumed after the original planning-only turn. Read `IMPLEMENTATION-STATUS.md` for the current integration work and proof boundaries.
- **Next:** finish current integration, rerun the full automated gate and execute the remaining authorized behavioral acceptance paths.
- **Later:** work through the dependency phases, validate the local demo first, then verify the hosted path when credentials and target infrastructure are available.
- **Re-entry:** open this file and `evidence/trello-board.json`, refresh the real Trello state, inspect local changes, and resume the earliest unverified dependency. Never reset unrelated edits.

## Working method

Use up to three parallel agents plus the primary agent when implementation resumes. Give agents disjoint owned areas and integration contracts: game/domain, providers/voice, and UI/accessibility; the primary owns shared configuration, persistence integration, verification and Trello reconciliation. Establish shared schemas before parallel edits to their consumers. Agents must not concurrently edit the same files without explicit coordination.

For each task: reproduce or characterize the failure; add a behavioral regression where it carries value; implement the smallest coherent fix; modularize that area; execute its acceptance criteria; inspect the integrated result; update Trello with evidence and residual gaps. Move cards to Done only after their actual acceptance criteria pass. Use Verify for implementation awaiting real provider/browser/hosted proof. Preserve all original card descriptions and consolidated aliases.

The 18 baseline defect reproductions assert that bugs exist. Convert them to desired-behavior regression tests; their original success is not evidence that a fix works. Avoid tests that merely restate implementation. Exercise concurrency, retry, malformed outputs, time boundaries and cleanup where the audit identifies those risks.

## Modularization contract — every phase

Prefer cohesive modules around 150–200 readable lines; review modules at 200–250; enforce a ceiling of 300 executable lines for handwritten application modules, excluding blank lines/comments and documented generated data/fixtures. Prefer functions around 30 lines and cap at 50, complexity 10, nesting 4, and four parameters before using a named options object. Apply sensible documented exceptions to declarative content rather than deforming the design to pass a counter.

Enforce limits through automated checks. Split responsibilities, not arbitrary line ranges. No minified JSX, giant functions moved into hooks, circular feature imports, or generic frameworks without multiple real uses. Thin route adapters call domain services; provider types do not leak into UI; server credentials remain in server-only modules.

Target boundaries: domain schemas and score policy; explicit session transitions; session repository and terminal-result store; turn/accusation services; provider adapters and prompt sections; cancellable audio/recording lifecycle; game UI and result views; accessible shared controls; preferences; design tokens and asset manifest. Document state ownership and error contracts as these seams are established.

## Phase acceptance gates

### 01 — Baseline, regression harness and safe upgrades

Capture current build, lint, type checking, dependency audit and file/function sizes. Add meaningful regression tooling and a warning-free lint gate. Fix the export CLI authentication and secret logging regression. Remove destructive port-killing from development startup. Refresh official compatibility/security guidance before selecting versions; pin a supported runtime/package manager, pair framework/config dependencies, remove unused packages, and stage upgrades in reviewable groups. Do not blindly force dependency resolutions or freeze the audit's candidate versions as current truth.

Exit: reproducible install and verification commands; targeted CLI proof; compatible dependency changes tested; advisories compared against the baseline with unresolved items explicit. Later-phase source defects may still fail the overall gate until addressed.

### 02 — Domain boundaries and authoritative game behavior

Define validated case, turn, session and result contracts before dividing implementation. Establish one timer, clue, score and terminal-outcome policy. Commit only the response actually shown to the player; clue events are unique and durable. Reject invalid actions and malformed cases. Treat malformed/provider-failed judgments as retryable service errors without charging attempts or scores. Derive debriefs from immutable outcome evidence. Remove the stale countdown closure and validate all HTTP responses before state mutation.

Exit: deterministic tests for normal win/loss, timeout, Unlimited/relaxed mode, duplicate clues, filtered disclosure, invalid/late actions, malformed judgments, stable score and result reload; no application module over the agreed limit without a documented justified exception.

### 03 — OpenAI provider migration and local Codex proof

Move all Mistral-dependent capabilities behind narrow provider-neutral contracts. Inspect installed Codex commands and current official docs, then prove one structured local call using existing subscription authentication. Isolate the invocation from repository files, unrelated tools and shell interpretation of player input; bind the demo locally and enforce deadlines/cancellation. Measure startup and full-turn latency before committing to this transport. No subscription credentials in browser code or deployment artifacts.

Implement a separate server-side OpenAI API adapter and configuration path for future Vercel use; absent API credentials means live hosted inference remains unverified. Make retrieval optional locally and version any future embedding migration. Establish a small solvability/judge-fairness dataset and transparent rehearsal replay mode. Remove Mistral only after each capability has a replacement or explicit disabled state.

Exit: real local case → question → judgment → summary exercised through the adapter, schema/error/cancellation tests, recorded latency and fairness results, and clearly distinguished replay/live modes. If subscription transport is unsuitable, preserve the working app and report the concrete blocker without inventing API access.

### 04 — Persistence, trust boundaries and recoverable transactions

Add request IDs, cancellation/deadlines and idempotent transitions for expensive operations. Ensure retries do not consume turns twice. Make win redemption and leaderboard recording retryable and atomic. Recover session/result state appropriately for the local demo; put hosted shared storage behind the same repository contract. Version database schema/RLS, eliminate request-controlled server database destinations, and keep learned patterns authoritative. Fix rate-limit identity, separate budgets and reliable completion exports. Label seed data and report real save status.

Exit: concurrent/replayed requests produce one committed result; recovery and retry paths execute; database policy tests pass against an authorized test database when available. Local persistence proof does not count as hosted multi-instance proof; untested hosted policies remain open.

### 05 — ElevenLabs voice and coherent interaction states

Implement documented transcription and synthesis adapters with server-held settings. Validate the entire authorized speech text. Unify microphone, stream, AudioContext, request and object-URL ownership; stopping, navigating or changing cases cancels pending and playing work. Preserve drafts, expose thinking/listening/speaking/error states and allow speech review before accusation. Present briefing before timed play and show truthful provider health and voice availability.

Exit: actual transcription and playback with configured ElevenLabs credentials; exact-once completion; no stale audio after cancel/navigation; microphone release observed; typed input recovers from provider failure. Missing credentials remain a live-integration blocker rather than a simulated pass.

### 06 — Accessibility, responsive presentation and art direction

Repair dialog focus, keyboard traps, accessible names, selected states and scoped shortcuts. Make text scaling, reduced motion and audio preferences consistent across React, motion and canvas code. Improve transcript/evidence legibility for screen sharing; keep panels usable in small windows. Clarify relaxed mode, stress and evidence semantics. Ground every result and reveal in actual case facts.

Preserve the existing portraits, rooms and noir style. Record asset provenance and selection rules; regenerate only assets with identified quality/consistency gaps, inspecting current references before generation. Separate image text from artwork and compare the result in the real layout. Regeneration is a targeted task, not permission to replace the visual identity wholesale.

Exit: keyboard, zoom/text size, reduced motion, responsive layouts and result states exercised in the actual browser; contrast/accessible-name checks supported by rendered evidence; any changed artwork inspected in context.

### 07 — Documentation, interview story and end-to-end acceptance

Update setup/configuration, privacy/fallback claims, architecture and rehearsal instructions to match observed behavior. Preserve the original Git-history record and describe ownership/outcomes only where supported. Prepare a short live narrative with a deterministic labeled fallback and record actual latency/interaction quality. Run integrated acceptance and reconcile all 62 cards against evidence.

Exit: fresh-start local demo runs case selection → briefing → typed and spoken interrogation → evidence → accusation → correct result → save/recovery; wrong accusation, timeout, relaxed mode, network/provider failure, retry, restart and navigation cleanup also pass. Rehearse audio/video sharing in the intended call environment. Verify the future deployment path separately when credentials/infrastructure exist; no deployment is authorized by this plan alone.

## Verification and honest stopping conditions

- Automated final gate: clean reproducible install; lint with zero warnings; type check; production build; module-size checks; unit/integration/route regressions; dependency audit with no concealed findings; secret/config and asset-reference checks.
- Behavioral final gate: execute the real local provider and voice paths, keyboard/accessibility flows, session recovery and integrated video-demo rehearsal. A build or mocked provider test cannot substitute for these paths.
- Audit browser automation was explicitly denied. Do not bypass that refusal through another browser surface, CDP or hidden automation. Obtain renewed authorization before using browser automation; otherwise report that verification gap and continue independent implementation.
- No OpenAI API key, ElevenLabs configuration or live database access was established by the audit. Request only the missing configuration when its concrete integration is ready, never expose authentication contents, and keep dependent live checks visibly pending.
- If a defect cannot be resolved within available access, document the exact reproduction, mitigation, owner dependency and next check. Do not silently downgrade it or declare the complete goal achieved.

## Canonical backlog coverage

Every one of the 62 canonical cards belongs to exactly one primary phase below. Cross-phase dependencies are handled through the contracts and acceptance gates above. Individual card descriptions in `evidence/trello-board.json` and the live board remain the detailed acceptance criteria; the phase assignment does not replace them.

### Phase 01 — Baseline, regression harness and safe upgrades

- [START: [P1] Read first — scope, evidence, priorities and audit baseline](https://trello.com/c/n3PEAdvA/1-p1-read-first-scope-evidence-priorities-and-audit-baseline)
- [ARCH-01: [P1 · ARCH-01] Fix export CLI auth regression and secret logging](https://trello.com/c/BFL5uEUP/50-p1-arch-01-fix-export-cli-auth-regression-and-secret-logging)
- [ARCH-02: [P1 · ARCH-02] Upgrade security baseline with paired Next and ESLint config](https://trello.com/c/KrIn92iw/51-p1-arch-02-upgrade-security-baseline-with-paired-next-and-eslint-config)
- [ARCH-03: [P2 · ARCH-03] Pin a reproducible Node24 and package-manager baseline](https://trello.com/c/WdaHGW0K/52-p2-arch-03-pin-a-reproducible-node24-and-package-manager-baseline)
- [ARCH-14: [P2 · ARCH-14] Remove stale dependencies and stage low-risk library updates](https://trello.com/c/WmMdtKzr/61-p2-arch-14-remove-stale-dependencies-and-stage-low-risk-library-updates)

### Phase 02 — Domain boundaries and authoritative game behavior

- [ARCH-10: [P2 · ARCH-10] Split game orchestration and enforce readable module limits](https://trello.com/c/LrN9LMel/59-p2-arch-10-split-game-orchestration-and-enforce-readable-module-limits)
- [ARCH-11: [P1 · ARCH-11] Return validated service errors instead of corrupt game state](https://trello.com/c/0NmI2h1k/60-p1-arch-11-return-validated-service-errors-instead-of-corrupt-game-state)
- [LOGIC-01: [P1 · LOGIC-01] Make clues unique, durable and consistent between client and server](https://trello.com/c/99XWEgXr/9-p1-logic-01-make-clues-unique-durable-and-consistent-between-client-and-server)
- [LOGIC-02: [P1 · LOGIC-02] Repair countdown callback capturing the initial empty game](https://trello.com/c/oZ8eCfpC/10-p1-logic-02-repair-countdown-callback-capturing-the-initial-empty-game)
- [LOGIC-03: [P1 · LOGIC-03] Give each session an explicit terminal state and authoritative outcome](https://trello.com/c/U2IeZiKD/11-p1-logic-03-give-each-session-an-explicit-terminal-state-and-authoritative-outcome)
- [LOGIC-04: [P1 · LOGIC-04] Return the same score and time semantics everywhere](https://trello.com/c/yXJRliEu/12-p1-logic-04-return-the-same-score-and-time-semantics-everywhere)
- [LOGIC-05: [P1 · LOGIC-05] Respect Unlimited mode and define one timer policy](https://trello.com/c/IS7nUKSj/13-p1-logic-05-respect-unlimited-mode-and-define-one-timer-policy)
- [LOGIC-06: [P1 · LOGIC-06] Treat malformed AI judgments and provider failure as retryable errors](https://trello.com/c/lkT3NkCr/14-p1-logic-06-treat-malformed-ai-judgments-and-provider-failure-as-retryable-errors)
- [LOGIC-09: [P1 · LOGIC-09] Replace keyword secret blocking with tested disclosure rules](https://trello.com/c/Ib1LFWHk/17-p1-logic-09-replace-keyword-secret-blocking-with-tested-disclosure-rules)
- [LOGIC-11: [P2 · LOGIC-11] Persist correct loss reasons and stop labeling all losses as timeout](https://trello.com/c/DDvju61o/19-p2-logic-11-persist-correct-loss-reasons-and-stop-labeling-all-losses-as-timeout)
- [LOGIC-18: [P1 · LOGIC-18] Validate generated cases as playable content rather than string shapes](https://trello.com/c/YjxXqMBm/26-p1-logic-18-validate-generated-cases-as-playable-content-rather-than-string-shapes)
- [LOGIC-19: [P2 · LOGIC-19] Stop rejudging a won case and ground the debrief in immutable evidence](https://trello.com/c/ilH2JQLQ/27-p2-logic-19-stop-rejudging-a-won-case-and-ground-the-debrief-in-immutable-evidence)

### Phase 03 — OpenAI provider migration and local Codex proof

- [ARCH-04: [P1 · ARCH-04] Separate game AI contracts from Mistral implementation](https://trello.com/c/XFhqC8b1/53-p1-arch-04-separate-game-ai-contracts-from-mistral-implementation)
- [ARCH-05: [P1 · ARCH-05] Prove local Codex subscription adapter for interview](https://trello.com/c/DyvVTbeR/54-p1-arch-05-prove-local-codex-subscription-adapter-for-interview)
- [ARCH-06: [P3 · ARCH-06] Add future hosted OpenAI adapter without subscription token reuse](https://trello.com/c/hlurjUhZ/55-p3-arch-06-add-future-hosted-openai-adapter-without-subscription-token-reuse)
- [ARCH-09: [P2 · ARCH-09] Make retrieval optional and version embedding migration](https://trello.com/c/OwPtLddx/58-p2-arch-09-make-retrieval-optional-and-version-embedding-migration)
- [EVAL: [P1] Add a case-solvability and judge-fairness evaluation set](https://trello.com/c/2rwo9eCT/4-p1-add-a-case-solvability-and-judge-fairness-evaluation-set)

### Phase 04 — Persistence, trust boundaries and recoverable transactions

- [LOGIC-07: [P1 · LOGIC-07] Make win redemption atomic, idempotent and retryable](https://trello.com/c/Kg6KTqLL/15-p1-logic-07-make-win-redemption-atomic-idempotent-and-retryable)
- [LOGIC-08: [P1 · LOGIC-08] Make leaderboard submission status and retry visible](https://trello.com/c/z9vdpT72/16-p1-logic-08-make-leaderboard-submission-status-and-retry-visible)
- [LOGIC-10: [P1 · LOGIC-10] Keep learned patterns authoritative and versioned](https://trello.com/c/eAVVr6Dz/18-p1-logic-10-keep-learned-patterns-authoritative-and-versioned)
- [LOGIC-12: [P1 · LOGIC-12] Add session checkpoint and result recovery suitable for local demo and Vercel](https://trello.com/c/3I4l9RsV/20-p1-logic-12-add-session-checkpoint-and-result-recovery-suitable-for-local-demo-and-vercel)
- [LOGIC-13: [P1 · LOGIC-13] Give every expensive action a deadline, cancellation and idempotency key](https://trello.com/c/EG7qbDYi/21-p1-logic-13-give-every-expensive-action-a-deadline-cancellation-and-idempotency-key)
- [LOGIC-15: [P2 · LOGIC-15] Fix rate-limit keys and add separate per-session spend budgets](https://trello.com/c/CqMZHiuR/23-p2-logic-15-fix-rate-limit-keys-and-add-separate-per-session-spend-budgets)
- [LOGIC-16: [P1 · LOGIC-16] Close public database write bypasses and version the schema](https://trello.com/c/1FiOCMVY/24-p1-logic-16-close-public-database-write-bypasses-and-version-the-schema)
- [LOGIC-17: [P2 · LOGIC-17] Remove request-controlled database destinations from hosted routes](https://trello.com/c/IjTzBIHW/25-p2-logic-17-remove-request-controlled-database-destinations-from-hosted-routes)
- [LOGIC-20: [P2 · LOGIC-20] Make completion exports reliable and observable](https://trello.com/c/ig7RCDyv/28-p2-logic-20-make-completion-exports-reliable-and-observable)

### Phase 05 — ElevenLabs voice and coherent interaction states

- [ARCH-07: [P1 · ARCH-07] Migrate STT to ElevenLabs and update deprecated speech model](https://trello.com/c/twOu11ZB/56-p1-arch-07-migrate-stt-to-elevenlabs-and-update-deprecated-speech-model)
- [ARCH-08: [P1 · ARCH-08] Unify cancellable voice and microphone lifecycle](https://trello.com/c/qqq7lx4W/57-p1-arch-08-unify-cancellable-voice-and-microphone-lifecycle)
- [LOGIC-14: [P2 · LOGIC-14] Validate and authorize the entire text sent to ElevenLabs](https://trello.com/c/F05X4iaL/22-p2-logic-14-validate-and-authorize-the-entire-text-sent-to-elevenlabs)
- [UX-01: [P1 · UX-01] Make every AI turn show its current state and recover in place](https://trello.com/c/JGqfP6hO/29-p1-ux-01-make-every-ai-turn-show-its-current-state-and-recover-in-place)
- [UX-02: [P1 · UX-02] Preserve drafts and let players correct speech before accusations](https://trello.com/c/0ShKQHgk/30-p1-ux-02-preserve-drafts-and-let-players-correct-speech-before-accusations)
- [UX-07: [P1 · UX-07] Show the actual case briefing before the timer starts](https://trello.com/c/FUoAUiIM/35-p1-ux-07-show-the-actual-case-briefing-before-the-timer-starts)
- [UX-08: [P1 · UX-08] Make status and connection checks truthful for the local demo](https://trello.com/c/0kRxyvpA/36-p1-ux-08-make-status-and-connection-checks-truthful-for-the-local-demo)
- [UX-13: [P1 · UX-13] Make audio controls explicit and tune a screen-share preset](https://trello.com/c/k6PXk9s9/40-p1-ux-13-make-audio-controls-explicit-and-tune-a-screen-share-preset)

### Phase 06 — Accessibility, responsive presentation and art direction

- [UX-03: [P1 · UX-03] Repair dialog focus and the initials keyboard trap](https://trello.com/c/wjTJmpHx/31-p1-ux-03-repair-dialog-focus-and-the-initials-keyboard-trap)
- [UX-04: [P1 · UX-04] Label controls and expose settings selection to assistive technology](https://trello.com/c/dOvvRcDK/32-p1-ux-04-label-controls-and-expose-settings-selection-to-assistive-technology)
- [UX-05: [P1 · UX-05] Create a legible video-demo layout and make text-size settings effective](https://trello.com/c/gXepcoCL/33-p1-ux-05-create-a-legible-video-demo-layout-and-make-text-size-settings-effective)
- [UX-06: [P1 · UX-06] Keep historic statements readable and link evidence to conversation](https://trello.com/c/nGqHNV7u/34-p1-ux-06-keep-historic-statements-readable-and-link-evidence-to-conversation)
- [UX-10: [P1 · UX-10] Unify accessibility preferences across the entire application](https://trello.com/c/GNomhWYw/37-p1-ux-10-unify-accessibility-preferences-across-the-entire-application)
- [UX-11: [P2 · UX-11] Replace global case-selector keyboard interception with scoped controls](https://trello.com/c/CwsJEGg8/38-p2-ux-11-replace-global-case-selector-keyboard-interception-with-scoped-controls)
- [UX-12: [P2 · UX-12] Remove false evidence-object semantics and explain stress as game state](https://trello.com/c/cjMeTtbx/39-p2-ux-12-remove-false-evidence-object-semantics-and-explain-stress-as-game-state)
- [UX-14: [P1 · UX-14] Give every end-of-game result a grounded, recoverable explanation](https://trello.com/c/Na4MWjbe/41-p1-ux-14-give-every-end-of-game-result-a-grounded-recoverable-explanation)
- [UX-19: [P2 · UX-19] Define and preserve the existing art direction before regeneration](https://trello.com/c/QWEbsUY0/43-p2-ux-19-define-and-preserve-the-existing-art-direction-before-regeneration)
- [UX-20: [P2 · UX-20] Normalize outcome artwork with one style and separate text](https://trello.com/c/mrD7FpK0/44-p2-ux-20-normalize-outcome-artwork-with-one-style-and-separate-text)
- [UX-21: [P2 · UX-21] Select portraits using case identity rather than name hashing](https://trello.com/c/DAsK5cBn/45-p2-ux-21-select-portraits-using-case-identity-rather-than-name-hashing)
- [UX-23: [P2 · UX-23] Make restrained motion reinforce game events instead of competing for attention](https://trello.com/c/lnNqbmOi/46-p2-ux-23-make-restrained-motion-reinforce-game-events-instead-of-competing-for-attention)
- [UX-24: [P2 · UX-24] Handle small windows and movable panels without offscreen loss](https://trello.com/c/H7LpaHdX/47-p2-ux-24-handle-small-windows-and-movable-panels-without-offscreen-loss)
- [UX-26: [P2 · UX-26] Separate challenge mode from a genuinely relaxed accessibility mode](https://trello.com/c/UMy6DlzN/48-p2-ux-26-separate-challenge-mode-from-a-genuinely-relaxed-accessibility-mode)
- [UX-27: [P2 · UX-27] Turn the reveal into a clear, evidence-based interview moment](https://trello.com/c/8ujdaAa5/49-p2-ux-27-turn-the-reveal-into-a-clear-evidence-based-interview-moment)
- [ASSET-RIGHTS: [P2] Record asset provenance and style rules before targeted regeneration](https://trello.com/c/G4foSNG3/7-p2-record-asset-provenance-and-style-rules-before-targeted-regeneration)

### Phase 07 — Truthful documentation, interview story and end-to-end acceptance

- [DEMO: [P1] Define and rehearse one excellent local interview demo](https://trello.com/c/fgMNuLGO/2-p1-define-and-rehearse-one-excellent-local-interview-demo)
- [PROOF: [P2] Build the interview story from real Git decisions and visible behavior](https://trello.com/c/IiflEceO/3-p2-build-the-interview-story-from-real-git-decisions-and-visible-behavior)
- [VERIFY: [P1] Run the real desktop, keyboard, audio and screen-share acceptance pass](https://trello.com/c/jMMDT4OO/5-p1-run-the-real-desktop-keyboard-audio-and-screen-share-acceptance-pass)
- [CLAIMS: [P1] Correct setup, learning, privacy and fallback claims throughout the project](https://trello.com/c/kDnAM1tN/6-p1-correct-setup-learning-privacy-and-fallback-claims-throughout-the-project)
- [DEMO-MEASURE: [P2] Measure interaction quality and latency before adding new features](https://trello.com/c/4wLcaqYI/8-p2-measure-interaction-quality-and-latency-before-adding-new-features)
- [UX-16: [P1 · UX-16] Audit all biography and hackathon claims before interview use](https://trello.com/c/fhzV3Yps/42-p1-ux-16-audit-all-biography-and-hackathon-claims-before-interview-use)
- [ARCH-18: [P2 · ARCH-18] Restore concise versioned architecture and rehearsal docs](https://trello.com/c/LsD5s6Rd/62-p2-arch-18-restore-concise-versioned-architecture-and-rehearsal-docs)

## Skills applied

Enforcing-code-size, dec-software-principles, dec-quality-testing, and openai-docs.

## Accepted scope additions during implementation

- Jason requests current stable technology throughout, including compatible major upgrades. Evaluate new releases against real tooling/API compatibility; document genuine blockers rather than assuming older major versions must remain.
- Jason requests substantially richer, more interactive and enjoyable red-team gameplay, grounded in the complete Git history and original mechanics. Add an evidence-led gameplay track: test the fictional suspect's claims, probe contradictions, make tactical choices meaningful, and explain outcomes fairly. Capture the detailed design and acceptance criteria in `GAMEPLAY-UPGRADE.md` and Trello before implementing its vertical slices. This expands the original 62-item baseline; do not discard or silently replace earlier tasks.
- Update all project documentation incrementally and verify it against the final implementation.
- After game acceptance, build its project website and integrate an evidence-backed case study into **https://jason.theft.studio**. The user's correction supersedes the earlier misheard Depth name. Inspect the existing portfolio source/layout before producing or integrating the case study.
- Eight expansion cards are saved in `evidence/expansion-cards.json` (70 total cards including the original 62). Website and portfolio work depend on completed game acceptance; they remain part of the full objective.

- Jason added a compact conversation flowchart to both win and loss results. Show the actual path, supported evidence challenges and correct/incorrect accusations in the existing noir style; keep unevaluated questions neutral. Track as [GAMEPLAY-MAP](https://trello.com/c/LHeOgx1c). The board now contains 70 cards (62 original + 8 expansions).

## Scope revision — portfolio in parallel, 3 October 2026

Jason expects the interview possibly next week and now authorizes building the full Interrogation case study in the existing local source for jason.theft.studio **in parallel with game fixes**. This supersedes the earlier game-acceptance dependency for case-study implementation. Update its evidence as fixes land; preserve explicit unfinished verification. The separate game website is deferred for now. Find and verify the current portfolio repository/design before editing, preserve other work and track its changes in Git. Publication is distinct from building the local case-study artifact.
