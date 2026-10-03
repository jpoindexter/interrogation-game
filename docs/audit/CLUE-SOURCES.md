# Clue source and marker checkpoint

Implemented 3 October 2026 after `8779a9b`. UX-06 and UX-12 remain in Verify: browser interaction and player comprehension have not been observed.

## Implementation

Public clue records now project the exact accepted question and answer from the server turn ledger. The source must match its recorded transcript index; missing legacy provenance remains unavailable rather than inferred. Recovery checks source text against the saved transcript before updating client state.

Each sourced clue opens its exchange in the Log. An explicit Add quote action appends to the existing question draft and opens the question panel; it does not send. Long answers are labelled as excerpts, and adding a quote is disabled with an explanation when the combined draft exceeds 500 characters. Source association is explicitly not independent proof.

The Log follows incoming replies only when the reader is already near its bottom. Selected sources stay in view, and incoming clues do not force navigation away from the Log. Numbered document markers replace random coffee, keys or handcuffs in clue rows and notifications. Unrelated decorative objects were removed from in-game help; original artwork remains in the repository.

## Executed evidence

- [Focused source/recovery checks](evidence/clue-source-checks.txt): 26 existing affected checks passed with the new source assertions.
- [Final recovery checks](evidence/clue-recovery-checks.txt): three affected checks passed after source validation tightened.
- [Strict lint](evidence/clue-integrated-lint.txt), [size gate](evidence/clue-integrated-size.txt) and [production build](evidence/clue-integrated-build.txt) passed for the integrated changes.

These checks establish exercised server projection, parser/recovery behavior and compilation. They do not establish actual browser scrolling, focus, quote composition, visual layout or comprehension. The real ten-turn rereading/quote path and stress/accusation explanation remain user-owned live review. No provider or voice calls were needed for this checkpoint.

## Reading-position follow-up

New replies and leads now have explicit unread controls in the paper panel. Incoming leads no longer force a tab change. Opening Leads explicitly acknowledges its current notes; newly arriving notes retain their notice even while that tab is open. View latest returns to the transcript end and supplies a keyboard focus target. Returning from a source exchange focuses the persistent paper panel. A source selection scrolls to the source only when its turn ID changes, preserving position when the same source object is refreshed. Tab and transcript metadata text was darkened for legibility.

A parallel source review identified and corrected premature lead-read acknowledgement and missing focus after Back to clues. This is source review, not observed browser behavior. Integrated validation for this follow-up is recorded in the implementation ledger; user-owned browser/keyboard review remains open.
