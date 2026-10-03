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
