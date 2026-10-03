# UI baseline implementation evidence

2026-10-03. Scope: cases, settings, shared UI, game presentation components, avatar, help/home/error; initial leaderboard recovery subsequently handed to the results agent.

## Executed

- Scoped ordinary ESLint passed with zero errors or warnings across the owned UI areas.
- Strict size/complexity ESLint passed for all settings modules, avatar modules, new storage/progress helpers, AssetImage, and ModalSurface.
- `node --import tsx --test tests/ui*.test.ts`: six tests passed. They exercise corrupt storage recovery, valid preference preservation, case-stat aggregation, animation stress recovery, speech advancement, and stale sweat removal.
- `tsc --noEmit` passed after the concurrent server changes settled.

## Changes

- Storage hydration uses external-store snapshots, avoiding synchronous effect updates and SSR mismatch. Settings parsing validates stored types/ranges/enums; case progress rejects malformed history shapes.
- Settings now have separate presentation, preference validation, provider-check, and export concerns. Provider checks are explicit and labeled credential acceptance rather than gameplay readiness. Privacy copy describes credential transmission.
- Avatar state, effects, lifecycle, and frame have separate modules; refs synchronize after commit. Canvas animation stops for the OS reduced-motion preference. Waveform resize cleanup disposes the currently active instance.
- Local artwork uses Next Image with an intrinsic-dimension manifest generated from PNG headers and SVG view boxes. Artwork files were not regenerated or changed.
- Case browsing no longer intercepts global Enter/arrow keys. Carousel controls, fields, switches, selections, and microphone actions have accessible names/states.
- Briefing, accusation, exit, and surrender use a native dialog surface with modal focus handling, Escape, and trigger-focus restoration. Briefing height is viewport-bounded.
- Question drafts survive closing the text-input panel. Submission still requires the orchestration change to retain drafts through rejected requests.
- Leaderboard now distinguishes retrieval failure and empty real results instead of silently inserting fictional records. The results agent owns receipt-ID highlighting and further leaderboard modularization.

## Not established

Browser access was previously explicitly denied, so no browser automation, visual comparison, keyboard traversal, screen-reader test, live provider check, or game completion was run for this batch. Native-dialog behavior and image layout require actual browser verification. No accessibility conformance or successful demo claim is made.

Existing oversized JSX functions remain in home/help/about, case cards/selector, and several game panels. Their ordinary lint baseline is clean, but the full strict size gate is not yet satisfied. These require further cohesive component extraction; no size-rule suppression was added.

Skills applied: enforcing-code-size, dec-accessibility, dec-software-principles.

## Continuation: complete owned size scope and audio lifecycle

All owned UI directories now pass the strict size gate without suppressions, including the previously oversized home/help/about screens, case cards, game panels, music hook and SFX hook. Presentation was split along navigation, instructions, source rows, forms, briefing and evidence concerns; the shared audio resource owns timers/listeners and releases media on disposal. Four additional audio tests pass, covering teardown, cancelled fades, late playback resolution and transition disposal. The question composer now clears only after the parent returns true acceptance and preserves a newer edited draft. Historical transcript entries retain readable opacity. The case Play action is a separate native button, and dock actions have accessible labels.

Executed after this batch: scoped strict ESLint zero errors/warnings, `tsc --noEmit` successful, ten UI helper/audio tests passed. These remain deterministic/local checks, not browser or actual audio-output verification.

## Gameplay workbench increment

`app/game/playbook/EvidenceWorkbench.tsx` exports `EvidenceWorkbenchProps` and `PublicGameplayProjection`. It consumes only browser-safe gameplay exports and public projection data. Parent integration owns actual routes/controller/session persistence.

The workbench provides exact full-turn pinning through `onPin({turnId, quote})`, three editable approaches, disclosed-exhibit selection, explicit submission through `onAction(DialogueAction)`, unchanged-request retry IDs, preserved error drafts, a source-turn view, and source-cited authoritative challenge feedback. No option auto-submits; no client-generated stress/progress reward exists. Freeform game text/voice controls are not replaced. Selection resets for a new case/session's first stable turn.

Five checks in `tests/ui-playbook.test.tsx` passed: distinct drafts/context, request-ID retry behavior, unknown/foreign source rejection, native markup labels/controls, and stable source rendering after ten later turns. All workbench modules pass strict size/complexity ESLint; whole-project TypeScript passed when handed off. The `.tsx` test requires the root test command to include that extension. Source/markup tests do not establish actual keyboard behavior, live pin/challenge API integration, provider acting or end-to-end gameplay.

## Gameplay request integration increment

The client adapter `app/game/controller/useGameplayWorkbench.ts` now consumes the restored public projection from parent state and submits pin/action operations to `/api/gameplay`. Response parsing allowlists public fields, validates source identity before the parent update callback, and reads canonical `{id,text}` clues. Request ownership aborts on session disposal and rejects late successes. A successful request closes its retry operation; ambiguous failures retain its ID. `ACTION_FAILED` and `REQUEST_INTERRUPTED` preserve the draft but require a manually submitted new attempt with a fresh ID.

The case selector now links to `/game?mode=redteam&difficulty=easy` under “Authored practice case” while retaining all free-form case cards. This entry point is source-integrated; actual browser layout/navigation and completed gameplay have not been executed by this agent.

Executed for this increment: 20 focused tests across `ui-gameplay-request`, `ui-playbook`, and `audio-recording`; scoped strict size/complexity ESLint with zero findings; full `tsc --noEmit` passed at handoff. Transport tests use mocked fetch; they establish parsing, retry identity/error policy, cancellation, and SSR link semantics, not a real provider or browser session. Recorder result delivery was extracted to keep its transcription function within the complexity gate; existing teardown/stale-result tests passed.

## Case creation recovery increment

Case creation now uses POST with a stable per-intent request ID and timer mode in the body. The tab stores a receipt before sending any request, retains it through cancellation/ambiguous network outcomes, and records the confirmed session ID before handing it to the controller. A remount in the gap before URL replacement recovers the known session by GET. The receipt is removed only when the hook observes that matching session in the URL. Existing typed session URLs still recover when browser storage is unavailable; new generation fails visibly before network access if a durable tab receipt cannot be saved.

Known failed/interrupted/expired/conflicting requests offer a manually initiated new attempt with a new ID. In-progress/storage/network uncertainty keeps the existing ID. The client deadline is 120 seconds. Error handling retains server status/code, including non-JSON HTTP failures. No automatic retry loop was added.

Executed under Node 24: eleven focused case-loader/receipt tests and scoped strict ESLint passed. Tests exercise POST shape, cancellation/replay identity, network ambiguity, saved-session recovery, matching-URL acknowledgment, unavailable/silently dropped storage, status/code classification and timeout configuration. These are deterministic transport/helper checks, not mounted React StrictMode, real-browser reload or live provider recovery proof. Root owns route integration and end-to-end verification.

## Panel, accessibility preference and audio increment

Cards: UX-24, UX-05, UX-10, UX-13, and the client portion of UX-26.

- Notes, settings and help now share a native modal panel, viewport/element resize bounds, pointer capture, arrow-key movement (Shift for larger steps), Reset position, accessible close actions and scrollable content. Native textarea resizing remains available for notes. Transcript now uses the same modal focus/return mechanism with a bounded scrolling body. Browser drag, focus and keyboard outcomes remain unexecuted.
- Text size applies a root percentage, so existing rem-based dialogue and report text scales across screens. Briefing facts no longer shrink long text to 11px or hide it in a fixed-height sticky. Body-level high contrast is shared across screens, with explicit dark-ink rules on paper surfaces. Actual rendered contrast and complete 200% zoom coverage are not established; some decorative metadata still uses fixed pixel sizes.
- Reduced motion is a validated stored preference and combines with the OS setting. The common Motion export resolves keyframe arrays to their final values and removes repeats/delays when reduction is requested; it preserves handlers. Canvas portrait animation and SiriWave do not run under reduction; the waveform is also idle when no speech is playing. A visible playback status remains. CSS animation iteration count is limited under reduced motion. Actual animation cessation has helper/source proof, not a browser recording.
- In-game audio switches and sliders have names and values. TopBar explicitly controls all audio and derives mute state from all three volumes. Master unmute preserves channels intentionally set to zero. The settings page offers an optional 80% voice / 5% music / 15% effects preset and states that call routing still needs rehearsal. This does not claim intelligible screen-share audio or a completed device test.
- Play mode preferences now distinguish Timed challenge, Relaxed and Endurance. Legacy unlimited preferences migrate to Relaxed; countdown/no-countdown is normalized from playMode. Generation intent/body includes the mode. Settings and briefing explain rules before play; in-game help reads the actual case mode. Root owns server policy, scoring and ranking verification; the client alone does not establish those rules.
- GameControls and Dock now have semantic input/panel/progress/action groups rather than a giant flat JSX call. Button identities remain stable as labels change, and controls wrap in narrow space. Existing busy/recording availability has SSR coverage.

Executed under Node 24 at handoff: scoped strict ESLint with no findings, full TypeScript check successful, and 25 focused tests across panel/preferences/dock/settings/security/generation. These exercise bounds, movement arithmetic, named native markup, reduced-motion property handling, exact audio snapshots, preference/mode normalization and the existing generation recovery paths. They do not mount an actual browser, dispatch real pointer capture, inspect layout/contrast, exercise screen readers, or test audio output.

Known root-layout concern reported separately: authored workbench and suspect each spanned two columns inside a three-column grid, and narrow stacked content needs a scroll path inside the fixed-height game shell. Root owns that integration change. UX-05/10/13/24 final acceptance remains open until viewport/zoom/focus/audio behavior is observed in the real demo setup.

Skills applied: enforcing-code-size, dec-accessibility, dec-software-principles, dec-css-architecture, dec-motion-animation.

## Briefing introduction correction

The introduction is now a centered, named native modal containing three short instructions and a Return to briefing button. It no longer points arrows at gameplay controls that are absent during briefing or says stress is evidence of lying. Dismissal records completion on a best-effort basis and always closes even if reading or writing browser storage throws. Escape uses that same dismissal callback through ModalSurface.

Executed under Node 24: three focused onboarding tests passed (named modal/native control/evidence wording, completion persistence order, and dismissal through both storage access and write failures). Scoped strict ESLint passed. These SSR/helper checks do not prove real-browser focus containment, Escape behavior, viewport scrolling, or screen-reader announcements. Those remain part of the pending browser acceptance pass.

Skills applied: dec-accessibility, dec-ai-native-patterns, enforcing-code-size.

## Turn, accusation and hint response boundary

The action transport now receives a parser and acknowledges a successful request only after the entire consumed response validates. Malformed positive responses, invalid JSON envelopes, cancellation, in-progress responses and transient HTTP 429/503 responses retain the same request ID. Explicit known failures retain the existing new-attempt policy. Budget/rate-limit denials cannot erase a previously uncertain receipt.

Turn, accusation and hint parsers allowlist display fields and check text, integer stress/count ranges, finite nonnegative start time, booleans, clue shapes/unique IDs, lifecycle consistency and public gameplay projections. Unknown fields are excluded from returned DTOs. Accusation/hint counts must match one accepted action relative to the controller snapshot. No history, clues, attempts, hints or timer synchronization occurs before validation; rejected responses preserve drafts and show an in-place error.

The final incorrect accusation now invokes the loss handler after its response speech, without temporarily returning to the active phase and relying on a later effect. Cancelled final-rejection or confession playback does not trigger delayed navigation. Valid expired turns do not append the unaccepted question; already-terminal wins recover by session URL.

Executed under Node 24: 19 tests passed across `action-response-controller`, `action-response-validation`, and `win-recovery`; strict scoped ESLint had zero findings, and TypeScript checking passed. Tests execute actual action controller functions, parsers, transport and request ledger against fake fetch/speech/state boundaries. They cover malformed success → budget/rate denial → same-ID valid recovery, no partial game-state changes, retained drafts, final-attempt ordering, deferred confession cancellation and storage-quota win recovery. Saved HTTP judgment fields are checked separately from the intentionally redacted gameplay source links in that evidence artifact. These tests are not mounted React, browser, live provider, audio output or video-call acceptance proof.

Skills applied: dec-ai-native-patterns, dec-software-principles, dec-quality-testing, enforcing-code-size.
