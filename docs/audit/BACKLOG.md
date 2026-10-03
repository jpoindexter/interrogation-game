# Trello backlog index

Audit: 3 October 2026. Baseline: `f8d4c3c`.

Board: [https://trello.com/b/Ww5bceNb/interrogation-superhuman-demo-upgrade](https://trello.com/b/Ww5bceNb/interrogation-superhuman-demo-upgrade)

62 cards were read back from Trello. Product implementation has not started. Lists: Start here (1), Next — demo essentials (3), Backlog — upgrades (57), In progress (0), Verify (1), Done (0).

Full descriptions and remote IDs are preserved in [trello-board.json](evidence/trello-board.json). Detailed source findings are in [audit](AUDIT.md), [game logic](LOGIC-SECURITY.md), [design/assets](DESIGN-ASSETS.md), and [architecture](ARCHITECTURE.md).

## Cards

| ID | Card | List |
|---|---|---|
| START | [[P1] Read first — scope, evidence, priorities and audit baseline](https://trello.com/c/n3PEAdvA/1-p1-read-first-scope-evidence-priorities-and-audit-baseline) | Start here |
| DEMO | [[P1] Define and rehearse one excellent local interview demo](https://trello.com/c/fgMNuLGO/2-p1-define-and-rehearse-one-excellent-local-interview-demo) | Next — demo essentials |
| PROOF | [[P2] Build the interview story from real Git decisions and visible behavior](https://trello.com/c/IiflEceO/3-p2-build-the-interview-story-from-real-git-decisions-and-visible-behavior) | Backlog — upgrades |
| EVAL | [[P1] Add a case-solvability and judge-fairness evaluation set](https://trello.com/c/2rwo9eCT/4-p1-add-a-case-solvability-and-judge-fairness-evaluation-set) | Next — demo essentials |
| VERIFY | [[P1] Run the real desktop, keyboard, audio and screen-share acceptance pass](https://trello.com/c/jMMDT4OO/5-p1-run-the-real-desktop-keyboard-audio-and-screen-share-acceptance-pass) | Verify |
| CLAIMS | [[P1] Correct setup, learning, privacy and fallback claims throughout the project](https://trello.com/c/kDnAM1tN/6-p1-correct-setup-learning-privacy-and-fallback-claims-throughout-the-project) | Next — demo essentials |
| ASSET-RIGHTS | [[P2] Record asset provenance and style rules before targeted regeneration](https://trello.com/c/G4foSNG3/7-p2-record-asset-provenance-and-style-rules-before-targeted-regeneration) | Backlog — upgrades |
| DEMO-MEASURE | [[P2] Measure interaction quality and latency before adding new features](https://trello.com/c/4wLcaqYI/8-p2-measure-interaction-quality-and-latency-before-adding-new-features) | Backlog — upgrades |
| LOGIC-01 | [[P1 · LOGIC-01] Make clues unique, durable and consistent between client and server](https://trello.com/c/99XWEgXr/9-p1-logic-01-make-clues-unique-durable-and-consistent-between-client-and-server) | Backlog — upgrades |
| LOGIC-02 | [[P1 · LOGIC-02] Repair countdown callback capturing the initial empty game](https://trello.com/c/oZ8eCfpC/10-p1-logic-02-repair-countdown-callback-capturing-the-initial-empty-game) | Backlog — upgrades |
| LOGIC-03 | [[P1 · LOGIC-03] Give each session an explicit terminal state and authoritative outcome](https://trello.com/c/U2IeZiKD/11-p1-logic-03-give-each-session-an-explicit-terminal-state-and-authoritative-outcome) | Backlog — upgrades |
| LOGIC-04 | [[P1 · LOGIC-04] Return the same score and time semantics everywhere](https://trello.com/c/yXJRliEu/12-p1-logic-04-return-the-same-score-and-time-semantics-everywhere) | Backlog — upgrades |
| LOGIC-05 | [[P1 · LOGIC-05] Respect Unlimited mode and define one timer policy](https://trello.com/c/IS7nUKSj/13-p1-logic-05-respect-unlimited-mode-and-define-one-timer-policy) | Backlog — upgrades |
| LOGIC-06 | [[P1 · LOGIC-06] Treat malformed AI judgments and provider failure as retryable errors](https://trello.com/c/lkT3NkCr/14-p1-logic-06-treat-malformed-ai-judgments-and-provider-failure-as-retryable-errors) | Backlog — upgrades |
| LOGIC-07 | [[P1 · LOGIC-07] Make win redemption atomic, idempotent and retryable](https://trello.com/c/Kg6KTqLL/15-p1-logic-07-make-win-redemption-atomic-idempotent-and-retryable) | Backlog — upgrades |
| LOGIC-08 | [[P1 · LOGIC-08] Make leaderboard submission status and retry visible](https://trello.com/c/z9vdpT72/16-p1-logic-08-make-leaderboard-submission-status-and-retry-visible) | Backlog — upgrades |
| LOGIC-09 | [[P1 · LOGIC-09] Replace keyword secret blocking with tested disclosure rules](https://trello.com/c/Ib1LFWHk/17-p1-logic-09-replace-keyword-secret-blocking-with-tested-disclosure-rules) | Backlog — upgrades |
| LOGIC-10 | [[P1 · LOGIC-10] Keep learned patterns authoritative and versioned](https://trello.com/c/eAVVr6Dz/18-p1-logic-10-keep-learned-patterns-authoritative-and-versioned) | Backlog — upgrades |
| LOGIC-11 | [[P2 · LOGIC-11] Persist correct loss reasons and stop labeling all losses as timeout](https://trello.com/c/DDvju61o/19-p2-logic-11-persist-correct-loss-reasons-and-stop-labeling-all-losses-as-timeout) | Backlog — upgrades |
| LOGIC-12 | [[P1 · LOGIC-12] Add session checkpoint and result recovery suitable for local demo and Vercel](https://trello.com/c/3I4l9RsV/20-p1-logic-12-add-session-checkpoint-and-result-recovery-suitable-for-local-demo-and-vercel) | Backlog — upgrades |
| LOGIC-13 | [[P1 · LOGIC-13] Give every expensive action a deadline, cancellation and idempotency key](https://trello.com/c/EG7qbDYi/21-p1-logic-13-give-every-expensive-action-a-deadline-cancellation-and-idempotency-key) | Backlog — upgrades |
| LOGIC-14 | [[P2 · LOGIC-14] Validate and authorize the entire text sent to ElevenLabs](https://trello.com/c/F05X4iaL/22-p2-logic-14-validate-and-authorize-the-entire-text-sent-to-elevenlabs) | Backlog — upgrades |
| LOGIC-15 | [[P2 · LOGIC-15] Fix rate-limit keys and add separate per-session spend budgets](https://trello.com/c/CqMZHiuR/23-p2-logic-15-fix-rate-limit-keys-and-add-separate-per-session-spend-budgets) | Backlog — upgrades |
| LOGIC-16 | [[P1 · LOGIC-16] Close public database write bypasses and version the schema](https://trello.com/c/1FiOCMVY/24-p1-logic-16-close-public-database-write-bypasses-and-version-the-schema) | Backlog — upgrades |
| LOGIC-17 | [[P2 · LOGIC-17] Remove request-controlled database destinations from hosted routes](https://trello.com/c/IjTzBIHW/25-p2-logic-17-remove-request-controlled-database-destinations-from-hosted-routes) | Backlog — upgrades |
| LOGIC-18 | [[P1 · LOGIC-18] Validate generated cases as playable content rather than string shapes](https://trello.com/c/YjxXqMBm/26-p1-logic-18-validate-generated-cases-as-playable-content-rather-than-string-shapes) | Backlog — upgrades |
| LOGIC-19 | [[P2 · LOGIC-19] Stop rejudging a won case and ground the debrief in immutable evidence](https://trello.com/c/ilH2JQLQ/27-p2-logic-19-stop-rejudging-a-won-case-and-ground-the-debrief-in-immutable-evidence) | Backlog — upgrades |
| LOGIC-20 | [[P2 · LOGIC-20] Make completion exports reliable and observable](https://trello.com/c/ig7RCDyv/28-p2-logic-20-make-completion-exports-reliable-and-observable) | Backlog — upgrades |
| UX-01 | [[P1 · UX-01] Make every AI turn show its current state and recover in place](https://trello.com/c/JGqfP6hO/29-p1-ux-01-make-every-ai-turn-show-its-current-state-and-recover-in-place) | Backlog — upgrades |
| UX-02 | [[P1 · UX-02] Preserve drafts and let players correct speech before accusations](https://trello.com/c/0ShKQHgk/30-p1-ux-02-preserve-drafts-and-let-players-correct-speech-before-accusations) | Backlog — upgrades |
| UX-03 | [[P1 · UX-03] Repair dialog focus and the initials keyboard trap](https://trello.com/c/wjTJmpHx/31-p1-ux-03-repair-dialog-focus-and-the-initials-keyboard-trap) | Backlog — upgrades |
| UX-04 | [[P1 · UX-04] Label controls and expose settings selection to assistive technology](https://trello.com/c/dOvvRcDK/32-p1-ux-04-label-controls-and-expose-settings-selection-to-assistive-technology) | Backlog — upgrades |
| UX-05 | [[P1 · UX-05] Create a legible video-demo layout and make text-size settings effective](https://trello.com/c/gXepcoCL/33-p1-ux-05-create-a-legible-video-demo-layout-and-make-text-size-settings-effective) | Backlog — upgrades |
| UX-06 | [[P1 · UX-06] Keep historic statements readable and link evidence to conversation](https://trello.com/c/nGqHNV7u/34-p1-ux-06-keep-historic-statements-readable-and-link-evidence-to-conversation) | Backlog — upgrades |
| UX-07 | [[P1 · UX-07] Show the actual case briefing before the timer starts](https://trello.com/c/FUoAUiIM/35-p1-ux-07-show-the-actual-case-briefing-before-the-timer-starts) | Backlog — upgrades |
| UX-08 | [[P1 · UX-08] Make status and connection checks truthful for the local demo](https://trello.com/c/0kRxyvpA/36-p1-ux-08-make-status-and-connection-checks-truthful-for-the-local-demo) | Backlog — upgrades |
| UX-10 | [[P1 · UX-10] Unify accessibility preferences across the entire application](https://trello.com/c/GNomhWYw/37-p1-ux-10-unify-accessibility-preferences-across-the-entire-application) | Backlog — upgrades |
| UX-11 | [[P2 · UX-11] Replace global case-selector keyboard interception with scoped controls](https://trello.com/c/CwsJEGg8/38-p2-ux-11-replace-global-case-selector-keyboard-interception-with-scoped-controls) | Backlog — upgrades |
| UX-12 | [[P2 · UX-12] Remove false evidence-object semantics and explain stress as game state](https://trello.com/c/cjMeTtbx/39-p2-ux-12-remove-false-evidence-object-semantics-and-explain-stress-as-game-state) | Backlog — upgrades |
| UX-13 | [[P1 · UX-13] Make audio controls explicit and tune a screen-share preset](https://trello.com/c/k6PXk9s9/40-p1-ux-13-make-audio-controls-explicit-and-tune-a-screen-share-preset) | Backlog — upgrades |
| UX-14 | [[P1 · UX-14] Give every end-of-game result a grounded, recoverable explanation](https://trello.com/c/Na4MWjbe/41-p1-ux-14-give-every-end-of-game-result-a-grounded-recoverable-explanation) | Backlog — upgrades |
| UX-16 | [[P1 · UX-16] Audit all biography and hackathon claims before interview use](https://trello.com/c/fhzV3Yps/42-p1-ux-16-audit-all-biography-and-hackathon-claims-before-interview-use) | Backlog — upgrades |
| UX-19 | [[P2 · UX-19] Define and preserve the existing art direction before regeneration](https://trello.com/c/QWEbsUY0/43-p2-ux-19-define-and-preserve-the-existing-art-direction-before-regeneration) | Backlog — upgrades |
| UX-20 | [[P2 · UX-20] Normalize outcome artwork with one style and separate text](https://trello.com/c/mrD7FpK0/44-p2-ux-20-normalize-outcome-artwork-with-one-style-and-separate-text) | Backlog — upgrades |
| UX-21 | [[P2 · UX-21] Select portraits using case identity rather than name hashing](https://trello.com/c/DAsK5cBn/45-p2-ux-21-select-portraits-using-case-identity-rather-than-name-hashing) | Backlog — upgrades |
| UX-23 | [[P2 · UX-23] Make restrained motion reinforce game events instead of competing for attention](https://trello.com/c/lnNqbmOi/46-p2-ux-23-make-restrained-motion-reinforce-game-events-instead-of-competing-for-attention) | Backlog — upgrades |
| UX-24 | [[P2 · UX-24] Handle small windows and movable panels without offscreen loss](https://trello.com/c/H7LpaHdX/47-p2-ux-24-handle-small-windows-and-movable-panels-without-offscreen-loss) | Backlog — upgrades |
| UX-26 | [[P2 · UX-26] Separate challenge mode from a genuinely relaxed accessibility mode](https://trello.com/c/UMy6DlzN/48-p2-ux-26-separate-challenge-mode-from-a-genuinely-relaxed-accessibility-mode) | Backlog — upgrades |
| UX-27 | [[P2 · UX-27] Turn the reveal into a clear, evidence-based interview moment](https://trello.com/c/8ujdaAa5/49-p2-ux-27-turn-the-reveal-into-a-clear-evidence-based-interview-moment) | Backlog — upgrades |
| ARCH-01 | [[P1 · ARCH-01] Fix export CLI auth regression and secret logging](https://trello.com/c/BFL5uEUP/50-p1-arch-01-fix-export-cli-auth-regression-and-secret-logging) | Backlog — upgrades |
| ARCH-02 | [[P1 · ARCH-02] Upgrade security baseline with paired Next and ESLint config](https://trello.com/c/KrIn92iw/51-p1-arch-02-upgrade-security-baseline-with-paired-next-and-eslint-config) | Backlog — upgrades |
| ARCH-03 | [[P2 · ARCH-03] Pin a reproducible Node24 and package-manager baseline](https://trello.com/c/WdaHGW0K/52-p2-arch-03-pin-a-reproducible-node24-and-package-manager-baseline) | Backlog — upgrades |
| ARCH-04 | [[P1 · ARCH-04] Separate game AI contracts from Mistral implementation](https://trello.com/c/XFhqC8b1/53-p1-arch-04-separate-game-ai-contracts-from-mistral-implementation) | Backlog — upgrades |
| ARCH-05 | [[P1 · ARCH-05] Prove local Codex subscription adapter for interview](https://trello.com/c/DyvVTbeR/54-p1-arch-05-prove-local-codex-subscription-adapter-for-interview) | Backlog — upgrades |
| ARCH-06 | [[P3 · ARCH-06] Add future hosted OpenAI adapter without subscription token reuse](https://trello.com/c/hlurjUhZ/55-p3-arch-06-add-future-hosted-openai-adapter-without-subscription-token-reuse) | Backlog — upgrades |
| ARCH-07 | [[P1 · ARCH-07] Migrate STT to ElevenLabs and update deprecated speech model](https://trello.com/c/twOu11ZB/56-p1-arch-07-migrate-stt-to-elevenlabs-and-update-deprecated-speech-model) | Backlog — upgrades |
| ARCH-08 | [[P1 · ARCH-08] Unify cancellable voice and microphone lifecycle](https://trello.com/c/qqq7lx4W/57-p1-arch-08-unify-cancellable-voice-and-microphone-lifecycle) | Backlog — upgrades |
| ARCH-09 | [[P2 · ARCH-09] Make retrieval optional and version embedding migration](https://trello.com/c/OwPtLddx/58-p2-arch-09-make-retrieval-optional-and-version-embedding-migration) | Backlog — upgrades |
| ARCH-10 | [[P2 · ARCH-10] Split game orchestration and enforce readable module limits](https://trello.com/c/LrN9LMel/59-p2-arch-10-split-game-orchestration-and-enforce-readable-module-limits) | Backlog — upgrades |
| ARCH-11 | [[P1 · ARCH-11] Return validated service errors instead of corrupt game state](https://trello.com/c/0NmI2h1k/60-p1-arch-11-return-validated-service-errors-instead-of-corrupt-game-state) | Backlog — upgrades |
| ARCH-14 | [[P2 · ARCH-14] Remove stale dependencies and stage low-risk library updates](https://trello.com/c/WmMdtKzr/61-p2-arch-14-remove-stale-dependencies-and-stage-low-risk-library-updates) | Backlog — upgrades |
| ARCH-18 | [[P2 · ARCH-18] Restore concise versioned architecture and rehearsal docs](https://trello.com/c/LsD5s6Rd/62-p2-arch-18-restore-concise-versioned-architecture-and-rehearsal-docs) | Backlog — upgrades |

## Consolidation map

Related findings were merged without losing their original evidence. The original specialist JSON files and reports retain every detailed finding.

| Finding | Canonical card |
|---|---|
| LOGIC-21 | [EVAL](https://trello.com/c/2rwo9eCT/4-p1-add-a-case-solvability-and-judge-fairness-evaluation-set) |
| LOGIC-22 | [CLAIMS](https://trello.com/c/kDnAM1tN/6-p1-correct-setup-learning-privacy-and-fallback-claims-throughout-the-project) |
| UX-09 | [LOGIC-08](https://trello.com/c/z9vdpT72/16-p1-logic-08-make-leaderboard-submission-status-and-retry-visible) |
| UX-15 | [DEMO](https://trello.com/c/fgMNuLGO/2-p1-define-and-rehearse-one-excellent-local-interview-demo) |
| UX-17 | [CLAIMS](https://trello.com/c/kDnAM1tN/6-p1-correct-setup-learning-privacy-and-fallback-claims-throughout-the-project) |
| UX-18 | [CLAIMS](https://trello.com/c/kDnAM1tN/6-p1-correct-setup-learning-privacy-and-fallback-claims-throughout-the-project) |
| UX-22 | [ASSET-RIGHTS](https://trello.com/c/G4foSNG3/7-p2-record-asset-provenance-and-style-rules-before-targeted-regeneration) |
| UX-25 | [VERIFY](https://trello.com/c/jMMDT4OO/5-p1-run-the-real-desktop-keyboard-audio-and-screen-share-acceptance-pass) |
| ARCH-12 | [LOGIC-13](https://trello.com/c/EG7qbDYi/21-p1-logic-13-give-every-expensive-action-a-deadline-cancellation-and-idempotency-key) |
| ARCH-13 | [LOGIC-04](https://trello.com/c/yXJRliEu/12-p1-logic-04-return-the-same-score-and-time-semantics-everywhere) |
| ARCH-15 | [LOGIC-20](https://trello.com/c/ig7RCDyv/28-p2-logic-20-make-completion-exports-reliable-and-observable) |
| ARCH-16 | [LOGIC-12](https://trello.com/c/3I4l9RsV/20-p1-logic-12-add-session-checkpoint-and-result-recovery-suitable-for-local-demo-and-vercel) |
| ARCH-17 | [EVAL](https://trello.com/c/2rwo9eCT/4-p1-add-a-case-solvability-and-judge-fairness-evaluation-set) |

## Re-entry

Read AUDIT.md and the three demo essentials. Choose the first implementation package; create a branch, retain the audit baseline, and execute the card's acceptance test before moving it to Done. Resolve browser access for the real interaction test; do not bypass the denied browser action.
