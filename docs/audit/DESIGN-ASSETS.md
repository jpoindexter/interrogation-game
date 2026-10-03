# Interrogation design, accessibility, content and asset audit

Date: 2026-10-03. Scope: audit only, current local source and existing local artwork.

## Evidence boundary

The browser was unavailable by explicit access denial. No browser workaround was attempted. Live layout, keyboard traversal, focus, screen-reader behavior, actual contrast pixels, media permission behavior, voice output, network latency, screen sharing and complete gameplay remain **unverified**. Code-path findings below describe the implementation, not observed live bugs. Asset inspection and byte inventory were executed. The contact sheet is derived solely from existing assets; no game image was generated or edited.

## Assessment

The strongest existing design asset is the coherent noir pixel-art world: warm desk lights, cool rooms, cassette briefing, tactile files, and varied amber-background portraits. Keep that identity. The most valuable modernization is reliable turn feedback, readable evidence, controllable voice, truthful outcomes and a rehearsable demonstration. A wholesale visual regeneration would spend effort before establishing those improvements.

For interview use, the strongest story is a player navigating uncertain model output with visible rules and grounded evidence. Do not promise Superhuman-specific fit until role/interview format is known. Distinguish the original hackathon implementation from the later audit and improvements, and ground personal contribution claims in the actual history.

## Screen coverage

| Surface | What was inspected | Principal findings |
|---|---|---|
| Home | app/page.tsx | Decorative identity works in inspected assets; status is inferred from key presence, icon nav unnamed, sponsor/provider framing historical, many decorative loops. |
| Case selection | app/cases/page.tsx, PolaroidCard.tsx | Strong physical-card metaphor; global keyboard interception, nested click action, fixed geometry and rotating small copy. |
| Generation | LoadingScreen.tsx, game/page loadCase | Spinner and teaching copy; no visible cancel or persistent final error, bounded retry eventually returns home. |
| Briefing | BriefingScreen, BriefingDialog, TapePlayer, LeadStickies | Full story below secondary tape action, fixed notes, serial text reveal, leads hidden under lg. |
| Gameplay | game/page, SuspectZone, avatar, waveform, TopBar, Dock | Split suspect/file composition is worth preserving; older response hides next turn processing, microphone default, no transcription correction, misleading mute scope. |
| Case / evidence / log | CaseFile and three page components | Useful compact grouping; faded older evidence, vertical tabs, no source-turn clue links, automatic tab/scroll changes. |
| Text / accusation | TextInputPanel, AccuseConfirmDialog | Draft loss, one-line entry, placeholder-only label; voice accusation commits directly. |
| Notes / settings / help | NotesPanel, SettingsPanel, HelpPanel | Reusable concepts but inconsistent preferences, unconstrained mouse dragging, semantics/focus gaps. |
| Onboarding / permissions / confirmations | OnboardingOverlay, MicPermissionBanner, Exit/GiveUp confirmations | Timing must be unified with pre-play onboarding; explicit modal behavior and focus needed. Permission banner already has named Dismiss control. |
| Win / score / initials | win/page, ScoreBreakdown, CaseDetails, InitialsEntry | Playful reveals; generated evaluation not grounded by links, auto initials interruption, keyboard trap, optimistic false Recorded. |
| Loss | lose/page | Distinct ending states; invented Almost and fallback rating; retry generates fresh case, controls depend on evaluator. |
| Transcript / share | TranscriptViewer, ShareModal | Transcript readability better than in-game faded log, explicit close name/Escape already in TranscriptViewer; modal focus still absent. Local sharing copies local origin, should be hidden in demo. |
| Leaderboard | leaderboard/page, seeds | Unlabelled sample scores, fixed-width pseudo-table, new row matched by initials. |
| Help | help/page | Useful concrete accusation example; broad claims about human deception need fictional framing, duplicated scoring/rule copy can drift. |
| Settings | settings/page | Many controls lack accessible association; key transmission copy contradicted by direct tests, unrelated bulk-export/admin controls. |
| About / architecture | about/page, about-game/page | Biography/metrics need evidence ledger, absolute security and Live claims need current proof, provider and chronology need update after verified changes. |
| Error / not found | error.tsx, not-found.tsx | Clear return/retry actions exist; use accessible focus/landmark treatment, avoid exposing raw internal errors in deployed environment. |
| Global design | globals.css, motion.tsx, FontProvider, layout | Some color tokens, CSS reduced-motion and font preference groundwork exist. Hardcoded sizes/colors and JS animation bypass a unified accessibility contract. |

## Asset observations

Contact sheet: `docs/audit/evidence/design-contact-sheet.jpg`. Original artwork remains unchanged.

- Keep the nine room backgrounds as reference masters. Police, law firm and CEO office scenes have particularly clear practical lighting and room identity; they are small enough in number to normalize via manifests rather than rerender indiscriminately. Actual in-UI crop/readability still needs verification.
- Keep the eleven portraits as an established family. Their varied wardrobe is useful, but name hashing cannot ensure role coherence. Choose a stable portrait ID for a fixed demo suspect.
- Keep desk, tape player and paper props as accents. Avoid forcing essential narrative into baked image text or tiny rotated sticky notes.
- Highest-value optional image work: outcome set normalization. Handcuff titles, full scenes and flat stamps currently form three distinct vocabularies. User approval should follow side-by-side candidates before replacing anything.
- Evidence icons should indicate clue type or remain explicitly decorative. Random cup, badge, key or handcuff icons titled Physical Evidence create false semantics.
- Asset inventory: 134 files, 33,413,148 bytes (~31.87 MiB), including 82 raster images; music 18.12 MiB dominates repository media. These are disk bytes, **not measured initial transfer or runtime memory**. Backgrounds 4.05 MiB, portraits 2.39 MiB, outcomes 2.12 MiB. Largest reviewed outcomes: timesup.png 845 KiB and accusations.png 773 KiB. Format optimization must preserve pixel edges and be measured in actual delivery.
- Provenance references in the repository mention PixelLab, Suno AI, OpenAI Sora and FFmpeg, but this audit did not verify generation rights, source prompts, audio normalization, or licenses for individual assets. Capture known provenance and mark unknowns honestly.

## Proposed demo acceptance sequence

A clean local launch uses a reviewed case, shows readable crime/cover story/leads, allows one question by keyboard and one by voice, exposes generating/speaking states, reveals a clue linked to the contradiction, accepts an editable accusation once, and ends with the actual reasoning. Reset and repeat without setup on screen. Run at least three rehearsals in the intended call application and record a fallback explicitly labelled as recorded. Choose a 3–5 minute target only as a proposal until interview format is known.

## Prioritized task cards

Priority P1 = needed before credible local interview demo or high-impact accessibility/trust failure; P2 = strong improvement after core reliability; P3 = optional polish (none needed here). Status is evidence type: executed means local asset/inventory check ran; code-path means source evidence; proposal means future design direction. Acceptance conditions below have not been run.

### UX-01 [P1] Make every AI turn show its current state and recover in place

Evidence status: **code-path**. app/game/components/SuspectZone.tsx:102-108 prioritizes lastResponse over processing; app/game/page.tsx:117-128 retries generation then navigates home; LoadingScreen.tsx:26-39 has only a spinner.

Change: Model idle, recording, transcribing, generating, synthesizing, speaking, failed and cancelled separately. Retain prior dialogue but show the new operation next to its question. Offer bounded retry/cancel and preserved case selection on generation failure. Do not display invented percent progress.

Acceptance: Ask a second question with a delayed response: visible generating state appears immediately. Exercise generation timeout, transcription error, text-generation error and TTS error; each has a usable action and retains relevant input.

### UX-02 [P1] Preserve drafts and let players correct speech before accusations

Evidence status: **code-path**. app/game/components/TextInputPanel.tsx:18 clears on close and :59 clears before request completion; app/game/page.tsx:248-257 submits transcripts directly; :289 clears accusation immediately.

Change: Keep question and accusation drafts until accepted, retain failed input, and show editable transcription with Send/Cancel before committing an accusation. Offer optional auto-send for ordinary questions after proven accuracy. Support longer multiline accusations.

Acceptance: Type a draft, close/reopen, simulate timeout, retry: exact draft survives. Deliberately misrecognize a name in a voice accusation, correct it, and verify only corrected text consumes one attempt.

### UX-03 [P1] Repair dialog focus and the initials keyboard trap

Evidence status: **code-path**. app/game/win/InitialsEntry.tsx:30-42 preventDefault on every key; :47 focuses generic div; app/game/components/AccuseConfirmDialog.tsx:32-98 and BriefingDialog.tsx:60-115 omit dialog semantics/focus contracts.

Change: Use one accessible dialog primitive with initial focus, labelled title, contained Tab traversal, Escape and focus restoration. Handle only explicit shortcut keys in InitialsEntry; allow leaving or skipping initials. Audit exit, give-up, settings, notes, help, briefing, transcript, share and onboarding consistently.

Acceptance: Keyboard-only run through every overlay: Tab/Shift-Tab remain within modal, Escape closes safe overlays, focus returns to trigger. Initials screen can be submitted, skipped and exited without a mouse; VoiceOver announces title and controls.

### UX-04 [P1] Label controls and expose settings selection to assistive technology

Evidence status: **code-path**. app/page.tsx:108-175 icon-only buttons use data-tooltip; app/game/components/Dock.tsx:61-138 same; SettingsPanel.tsx:20-48 switches/sliders/group buttons lack names/checked state; TextInputPanel.tsx:63-70 input has placeholder only; app/settings/page.tsx:233-245 label lacks association.

Change: Add accessible names to every icon control, explicit input labels, real switch/radio/slider semantics and visible focus. Add aria-live status for errors, transcript completion and new clues without announcing every timer tick. Preserve labels on focus as well as hover.

Acceptance: Accessibility-tree check finds names for every control. Keyboard and VoiceOver identify selected settings and recording state; changing a setting announces its value; new clue is announced once.

### UX-05 [P1] Create a legible video-demo layout and make text-size settings effective

Evidence status: **code-path**. app/game/page.tsx:266 changes container font size while SuspectZone.tsx:83-110 hardcodes text-sm; CaseFile.tsx:63 uses 11px vertical tabs; BriefingScreen.tsx:92-105 shrinks long content to 11px; global fixed-height h-screen/overflow-hidden in page:266-280.

Change: Use semantic typography tokens with a readable dialogue/document scale and actual user scaling. Add a demo layout preset for 1280x720 and 1440x900 shared windows; prioritize suspect dialogue, evidence and Ask/Accuse. Replace vertical tab labels with horizontal labels when space allows. Let overflow remain reachable.

Acceptance: At 1280x720, 1440x900 and 200% zoom, long dialogue, core controls and case evidence are readable/reachable without clipped content. Small/medium/large visibly alter dialogue and report text; record a screen-share sample and review at recipient size.

### UX-06 [P1] Keep historic statements readable and link evidence to conversation

Evidence status: **code-path**. app/game/components/LogPage.tsx:56 adds opacity-50 to old exchanges and :69/:75 adds text-black/60; CaseFile.tsx:32-43 auto-scrolls and forces Evidence on new clues; EvidencePage.tsx:31-40 renders plain clues with no source turn.

Change: Remove faded evidence text; use a subtle latest-turn marker. Give each clue a source-turn link and pin/reference action. Respect the player reading older material: do not force navigation or scroll when away from latest; offer a new-items indicator.

Acceptance: Revisit an early contradictory answer after ten turns; it remains fully readable and stable while new answers arrive. A clue opens the correct originating exchange and can be referenced in a composed question.

### UX-07 [P1] Show the actual case briefing before the timer starts

Evidence status: **code-path**. app/game/components/BriefingScreen.tsx:111-123 places Begin Interrogation above Play Briefing; BriefingDialog.tsx:19-38 hides unspoken text; LeadStickies.tsx:9 hides leads below lg; app/game/page.tsx:152 launches onboarding only in active phase.

Change: Present crime, cover story and initial leads as readable briefing content first. Make narration optional and transcript immediately available; preserve tape art as an enhancement. Complete onboarding before active play and provide a named start action. Reuse authoritative timer pause rules.

Acceptance: Fresh profile can read all leads without audio or desktop-width requirement. Timer remains unchanged through briefing/onboarding. Starting play begins one session with known goal and visible input.

### UX-08 [P1] Make status and connection checks truthful for the local demo

Evidence status: **code-path**. app/page.tsx:25-38 treats key presence as status; :56 requires Mistral and ElevenLabs for System Online; :89-98 can say Keys Required despite server configuration.

Change: Replace key-presence claims with local demo readiness checks: game engine, text generation, microphone, optional voice, and selected fixture/live mode. Keep technical provider details in presenter diagnostics; describe degraded text-only mode honestly. Align with the chosen Codex/local architecture.

Acceptance: With no browser keys and a working local backend, text-ready status appears. Invalid auth, unavailable voice and offline text backend have distinct truthful states; optional voice failure does not block typed play.

### UX-09 [P1] Confirm leaderboard writes before saying Recorded

Evidence status: **code-path**. app/game/win/InitialsEntry.tsx:28/:86 immediately marks submitted/Recorded; app/game/win/page.tsx:173-179 sets submitted before fetch and swallows failure; app/leaderboard/page.tsx:35-44 merges seed entries without distinction.

Change: Expose pending/saved/failed state from persistence; provide Retry and Continue Without Saving. Keep local-demo records local and labelled. Label or remove seeded entries; match a new row by record ID, not initials. Do not auto-open score entry over the reveal.

Acceptance: Fail leaderboard POST: UI never says Recorded and retry does not duplicate. Fresh demo labels sample rows. Two players with identical initials do not highlight the wrong record.

### UX-10 [P1] Unify accessibility preferences across the entire application

Evidence status: **code-path**. app/game/page.tsx:266 applies high-contrast only to active game; globals.css:239-260 overrides gray classes but not text-black/opacity paper labels; app/settings/page.tsx:30-43 differs from game/hooks/useSettings.ts:4-11; globals.css:265-274 only controls CSS durations.

Change: One typed settings source and preferences provider should govern home, cases, briefing, game, overlays and results. Add reduced-motion controls governing Framer, requestAnimationFrame canvas and SiriWave. Replace hardcoded low-emphasis colors with tested semantic text tokens on both paper and dark surfaces.

Acceptance: Set preferences once and traverse every screen: choices persist and affect all relevant text/surfaces. Reduced-motion run has no indefinite decorative canvas/waveform movement. Measure actual rendered contrast in both themes and resolve AA failures.

### UX-11 [P2] Replace global case-selector keyboard interception with scoped controls

Evidence status: **code-path**. app/cases/page.tsx:31-39 global ArrowLeft/ArrowRight/Enter listener routes on Enter regardless of focus; PolaroidCard.tsx:49 wraps content in button while :117-119 nests a click-only Play span.

Change: Implement semantic case selection and a separate Play button. Scope keyboard carousel controls to its focus region; never override unrelated focused buttons. Announce active case, difficulty and selected state; keep selected detail stable.

Acceptance: Tab to Back and press Enter: returns home rather than starting a case. Arrow controls work only within selector. Play is separately discoverable by keyboard and screen reader.

### UX-12 [P2] Remove false evidence-object semantics and explain stress as game state

Evidence status: **code-path**. app/game/components/utils.ts:1-12 randomly assigns icon assets; EvidencePage.tsx:17 labels them Physical Evidence; help/page.tsx:17-23 presents broad lie-detection maxims; OnboardingOverlay.tsx:18 says higher stress means getting close.

Change: Associate clue type with a stable meaningful icon, or call these discovered clues rather than physical evidence. Clearly frame stress as a fictional game mechanic. Replace broad assertions about human lying with tactics verified against the game rules. Make progress gates understandable beside Accuse.

Acceptance: A digital-log clue never appears as coffee or handcuffs unless those are part of the clue. Help examples map to executable rules. Player can explain what unlocks Accuse without assuming stress proves real-world guilt.

### UX-13 [P1] Make audio controls explicit and tune a screen-share preset

Evidence status: **code-path**. app/game/components/TopBar.tsx:16/:52 uses music-only state/label while app/game/page.tsx:269-277 mutes music, SFX and voice; useVoiceRecorder.ts:42 stops after two seconds silence; settings defaults differ by NODE_ENV.

Change: Separate master mute from music and voice. Provide reliable text fallback, microphone/device test and voice sample before demo. Use an optional screen-share preset with intelligible speech, low music, subdued foley; make auto-stop behavior visible and allow manual finish.

Acceptance: Music muted with voice on shows correct state. Master mute silences all channels and restores intended volumes. Record a complete spoken turn over the intended call setup; transcript and speech remain intelligible and pause in thought does not accidentally spend an accusation.

### UX-14 [P1] Give every end-of-game result a grounded, recoverable explanation

Evidence status: **code-path**. app/game/lose/page.tsx:164-167 hardcodes Closest moment Almost; :42/:83-94 substitutes fabricated Rookie fallback on evaluator failure; win/page.tsx:84 defaults Sharp; lose/page.tsx:220-235 hides recovery actions until summary and Retry Case creates a new generated case.

Change: Show authoritative outcome immediately; distinguish failed coaching from a player rating. Present exact lie, truth and supporting exchange with source links. Retry must either replay the same case or be renamed New case in this setting. Keep retry/home/transcript accessible during evaluator delay.

Acceptance: Evaluator offline: result remains usable, no invented rating/Almost appears, transcript opens immediately. Retry behavior matches its label. Every claimed closest moment links to the actual turn or says no decisive contradiction found.

### UX-15 [P1] Add a deterministic presenter route and rehearsable demo reset

Evidence status: **proposal**. app/game/page.tsx:105-125 always generates a new case with timestamp; app/data/cases.ts configures setting/difficulty but no fixed case route; win/page.tsx:138-171 enforces multi-second reveals and automatic initials.

Change: Create explicitly labelled Demo mode with a reviewed fixed case, clean reset, checkpoint restart, predictable reveal and deliberate live/fallback indicator. Keep a text-only path and recorded fallback clearly identified. Treat the 3-5 minute sequence as a separate acceptance scenario; avoid unnecessary accounts/leaderboard/share detours.

Acceptance: Cold-start local demo, reset, present briefing → question → evidence → accusation → justified outcome in the allotted window. Repeat at least three times and recover from voice/text outage without losing the narrative. Live versus prepared content is unmistakable.

Dependencies: UX-01, UX-02, UX-07, UX-08, UX-13, UX-14.

### UX-16 [P1] Audit all biography and hackathon claims before interview use

Evidence status: **code-path**. app/about/page.tsx:65-73 career summary; :97-101 named historical titles and dollar/user metrics; :131-141 AI Systems Launched; app/page.tsx:285 and about/page.tsx:41 say Hackathon 2026 despite user remembering about a year ago.

Change: Create a claim ledger tied to source evidence. Confirm historical titles, client relationships, dates, adoption and financial metrics; remove or soften unsupported statements. Separate original hackathon contribution from modernization work. Do not silently substitute claims based on memory.

Acceptance: Every interview-visible title/date/metric has an identified user-approved evidence source or is omitted. Original project and new work are distinguished, and the user confirms disputed chronology.

### UX-17 [P1] Replace provider marketing and unverified architecture claims with observed behavior

Evidence status: **code-path**. app/about-game/page.tsx:96-119 claims cross-session learning/persistence; :170-214 describes defenses categorically; :245-286 labels features Live/Ready; app/layout.tsx:26-38 hardcodes Mistral marketing; app/page.tsx:248-286 presents sponsor strip.

Change: Preserve historical hackathon credits on a history page. Update runtime identity only once implementation exists. Describe actual capabilities, limits and contribution without claims such as poisoned embeddings cannot inject instructions. Move detailed architecture out of the play path, with evidence links in an optional presenter view.

Acceptance: Search all user-facing copy/metadata for stale provider names and absolute proof claims. Each Live status is backed by an executed current scenario; historical credits remain attributed rather than replaced with implied new sponsorship.

### UX-18 [P1] Correct the key/privacy copy and separate presenter configuration

Evidence status: **code-path**. app/settings/page.tsx:223 says keys never sent to third parties; :67-69 sends credentials to provider test endpoints; :261-275 exposes bulk training-data export in ordinary settings.

Change: Use accurate data-flow copy and keep secrets out of the screen-share path. Provide environment/local bridge setup outside game controls; move export/admin tooling to deliberate developer utilities. Document what audio/text is sent and what is stored according to actual selected backend.

Acceptance: Walk the full demo without exposing credential fields or bulk data controls. Read network flow against copy; no never-sent claim contradicts actual provider/server requests. Verify that normal reset cannot inadvertently erase required connection configuration.

### UX-19 [P2] Define and preserve the existing art direction before regeneration

Evidence status: **executed**. Executed contact-sheet inspection of public/bg/*.png, public/suspects/*.png, public/logo/main3.png, public/detective/desk.png, public/ui/tape_player.png; docs/audit/evidence/design-contact-sheet.jpg.

Change: Keep the noir pixel-art identity: deep blue/green shadow, warm amber practical lights, black surrounds, square portrait crops, ochre portrait backgrounds, tactile paper/cassette props. Record palette, pixel density, framing, lighting and safe areas in an art bible. Separate decorative raster art from semantic UI text.

Acceptance: Approve side-by-side art bible/contact sheet before any new renders. New assets match palette, crop and pixel scale at actual usage size. Reuse current backgrounds/portraits unless a specific defect or mismatch is demonstrated.

### UX-20 [P2] Normalize outcome artwork with one style and separate text

Evidence status: **proposal**. Executed image inspection: public/solved/caught.png and escaped.png are handcuff/title compositions; accusations.png, timesup.png, lawyered_up.png are full scenes; case_closed.png/fail-stamp-3.png are flat stamps. lose/page.tsx:120-123 stretches same slot while imageRendering auto.

Change: Targeted candidate regeneration: public/solved/accusations.png, timesup.png, lawyered_up.png, caught.png, escaped.png. Brief: one noir pixel-art object or vignette per outcome, common canvas/crop/pixel scale, warm amber key light against transparent or consistently dark background, no generated lettering, restrained palette matched to existing rooms. Render outcome titles as accessible live text. Keep case_closed stamp for case cards if approved.

Acceptance: Compare all five outcomes together at their final display size; silhouette, contrast and visual weight are consistent. Titles remain crisp at 200% zoom and accessible in DOM. No outcome depends on image-only text. User approves set before replacing originals.

Dependencies: UX-19.

### UX-21 [P2] Select portraits using case identity rather than name hashing

Evidence status: **proposal**. app/game/SuspectAvatarPixi.tsx:5-21 hashes name into gender-only pool; current portrait art includes distinct doctor/business attire that can contradict generated suspect role.

Change: Add stable portraitId to approved case data with role/age-presentation/wardrobe metadata; retain varied existing portrait pool. Candidate new portraits only when a reviewed case needs missing attire: match existing 1:1 amber-background pixel portrait, same bust crop, facial detail scale and light direction. Avoid using stress/appearance as guilt evidence.

Acceptance: Reviewed doctor/office/technician cases use plausible stable portraits in briefing, game, results and transcript. Regeneration is limited to documented gaps and approved contact-sheet comparisons.

Dependencies: UX-19.

### UX-22 [P2] Build an asset manifest and optimize only measured payloads

Evidence status: **executed**. Executed inventory: 134 public files / 33,413,148 bytes; 82 raster images; music 18.12 MiB; backgrounds 4.05 MiB; suspects 2.39 MiB; solved 2.12 MiB. public/solved/timesup.png 845 KiB, accusations.png 773 KiB; mostly img/CSS url delivery.

Change: Create manifest with source, usage, license/provenance, dimensions, pixel-art scale and generated variants. Identify unused logo/note/scene exports before archive/removal. Compare lossless WebP/AVIF variants at nearest-neighbor display scale; preserve source masters. Load only chosen case/music assets and use explicit image dimensions/preload where appropriate.

Acceptance: Production asset/network report shows what is actually downloaded, rather than treating repository bytes as transfer. Perceptual side-by-side confirms no muddy pixel edges, halos or text artifacts. Unknown provenance is recorded, not fabricated.

Dependencies: UX-19.

### UX-23 [P2] Make restrained motion reinforce game events instead of competing for attention

Evidence status: **proposal**. app/page.tsx:63-79 particles, :178-218 scanline/flicker/interference; cases/page.tsx:49/:57-58 indefinite animations; PolaroidCard.tsx:48/:76-79/:117 repeated motion; VoiceWaveform.tsx:19-27 animated ios9 style.

Change: Define a motion budget: short event transitions for clue, turn and outcome; pause decorative loops during reading and screen-sharing. Match waveform treatment to noir art; if decorative, do not imply live audio amplitude. Add a presenter skip-reveal control and respect reduced motion across JS and CSS.

Acceptance: Record 30 seconds of each major scene: attention stays on dialogue/evidence; no persistent ornamental motion in demo/reduced-motion mode. Audio state is still understandable with animation removed.

Dependencies: UX-10, UX-19.

### UX-24 [P2] Handle small windows and movable panels without offscreen loss

Evidence status: **code-path**. BriefingDialog.tsx:70 fixes 32rem x 36rem; NotesPanel.tsx:29 fixes width 360 and :53-58 allows unconstrained drag; SettingsPanel.tsx:62/:72 same; leaderboard/page.tsx:84/:123 fixed 6-column grid.

Change: Constrain panels to viewport and offer Reset position; use pointer events and keyboard alternatives or eliminate drag where unnecessary. Briefing must fit small/shared windows and expose leads. Replace narrow leaderboard grid with semantic responsive table/card layout.

Acceptance: At 390px width, 720px height and 200% zoom, all panel actions are reachable. Drag to every edge and resize window; panel can always be recovered. Keyboard can accomplish all essential actions without dragging.

### UX-25 [P1] Add end-to-end UX evidence for the selected demo path

Evidence status: **proposal**. Audit is source/artwork only: live browser interaction was denied and no workaround was used. public/screenshots/hero.png is historical and not current UI evidence.

Change: Capture the real flow after changes with fixed data, keyboard-only operation, reduced motion, long text, audio denied, provider unavailable and 200% zoom. Add a small integration suite around dialog/input/state behavior and critical end-to-end run; visual snapshots for key scenes. Verify in the actual call/screen-share setup.

Acceptance: Attach dated run recording/screenshots and exact environment for Home → Case → Briefing → Typed/Voice question → Clue → Accusation → Outcome. Label all unavailable checks plainly. Passing build or unit tests cannot replace this criterion.

### UX-26 [P2] Separate challenge mode from a genuinely relaxed accessibility mode

Evidence status: **code-path**. app/settings/page.tsx:198 says Unlimited removes pressure but :217 warns AI is tougher; help/page.tsx:230-235 confirms harder/cryptic suspect and lawyer-up condition.

Change: Make time pressure and AI difficulty independent. Offer relaxed play with timer off and unchanged chosen difficulty; reserve tougher unlimited rules for an explicitly named challenge option. Explain score/leaderboard differences at selection.

Acceptance: Turning off timer leaves chosen difficulty, clues and suspect behavior unchanged in relaxed mode. A separate challenge option explains additional rules before start; result records the actual mode.

### UX-27 [P2] Turn the reveal into a clear, evidence-based interview moment

Evidence status: **proposal**. app/game/win/page.tsx:138-171 spends 4.2s before final score and auto-triggers initials; win/CaseDetails.tsx:39-49 presents generated Lie/Truth/How You Caught It without turn links.

Change: Lead the ending with accusation, conflicting statement, verified truth and judge rationale; put score celebration after reasoning. Provide one-click transcript evidence and an optional presenter explanation of model/game-rule separation. Keep the playful stamp as a brief flourish.

Acceptance: A viewer can identify the contradiction from one ending screen without reading the full transcript. Evidence links show real turn text, score animations can be skipped, and no modal interrupts the explanation.

Dependencies: UX-14, UX-15.

## Skills applied

Matched and applied: dec-accessibility (semantic controls/focus/keyboard), dec-ai-native-patterns (uncertainty and recoverable states), dec-cognitive-load (task hierarchy and reading continuity), dec-quality-testing (real behavior evidence), iconography-and-imagery (labelled visual meaning, coherent art and measured delivery). A design-review reference was inspected but its implementation/auto-commit workflow was not applied because the user explicitly selected audit first. No product code, credentials, assets or external messages were changed.
