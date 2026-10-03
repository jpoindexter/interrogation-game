# Case selection and first-play rules

Three source gaps remained after removing the original global keyboard listener: the selector had no scoped arrow-key behavior or active-case announcement, onboarding still described a clue-count accusation gate, and case cards still advertised the obsolete 2–5 clue quotas.

## Changes

- A named case-selector region owns ArrowLeft/ArrowRight only when the event comes from a marked native browsing button: Previous, Next, a selection dot or the active photo. Enter, Space, modified arrows, composition events, previously handled events, links, editors and unmarked buttons keep their native behavior. There is no document/window listener. Back is outside the region; Play is a separate native Next link with the specific case in its accessible name.
- A polite status names the active case, difficulty and position. The photo exposes expanded state and, when open, its description ID. Inactive stacked photos leave sequential tab order; all cases remain reachable with named dots and Previous/Next. Arrow selection from the photo schedules focus on the new active photo; arrows from persistent controls leave their focus there. Selecting a dot now collapses the prior detail consistently with other navigation.
- Generated case cards derive the 3/5/7/9-question threshold from the existing shared disclosure policy. They explain that distinct questions need at least 15 letters and that accusation is available after the interview begins, before the record arrives. First-play onboarding distinguishes that generated rule from the established-contradiction requirement in authored evidence practice.

The existing noir surfaces and case layout are retained. The extra selector wrapper supplies the same full-width, centered flex layout. Its actual visual equivalence remains to be checked in the browser.

## Executed evidence

[Focused output](evidence/case-selection-focused.txt): three checks passed in `tests/ui-case-selector.test.tsx`. These invoke the actual exported keyboard handler with controlled event objects and render actual components using React server rendering. They cover accepted left/right events, native/unrelated/modifier/composition exclusions, status text, expanded-state linkage, separate Play link, inactive tab order, all four policy thresholds and both onboarding rules. They are behavior/markup checks, not source-string tests.

Scoped strict lint and size/complexity checks passed, as did TypeScript and `git diff --check`. The first size pass caught excess branching in the photo component; its accessibility attributes were extracted before the passing recheck. The first TypeScript pass caught the click-sound helper's numeric parameter being assigned directly as a link mouse handler; an explicit callback corrected it before the passing recheck. No application test failure was hidden or retried against changed acceptance criteria.

## Remaining acceptance

No browser, DOM automation, screen reader, provider call, voice call, full suite or production build was run for this scoped change. Root owns integration. Server-rendered semantics do not execute focus effects, real event bubbling, navigation, announcements or layout. UX-11 still needs the user's actual Back/Enter, scoped arrow, Play discovery and focus check; visual and assistive-technology acceptance remains open.

Skills applied: dec-accessibility, dec-nielsen-heuristics, dec-quality-testing.
