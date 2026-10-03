# Turn feedback and dictated-question recovery

**Executed 3 October 2026:** 15 focused local checks and scoped strict ESLint passed. Three remaining source gaps in UX-01/02/04 were addressed. Browser, microphone, provider and screen-reader acceptance remain unexecuted.

## Changed behavior

- The suspect response shows an independent, polite request-status region while preparing a response, even when previous dialogue is present. Previous question/answer text remains visible. The preparing message clears when active again or speech is playing; it does not claim measured progress.
- Ordinary dictation now opens the existing question composer for review and explicit **Ask question**. It does not submit automatically. Transcript delivery appends using the current functional draft value, preserving notes or edits made while recording/transcription was pending. The transcribed-ready notice is informational, not an error.
- A failed submission retains the editable draft. The existing request ledger/transport is unchanged: retrying the same unconfirmed request reuses its ID; no automatic retry was added. After acceptance, the form clears only the exact submitted draft, preserving a newer edit.
- Dictation can exceed the input's normal typing limit. Such text is retained without truncation; the form reports the number of excess characters, explains how to continue, and disables submission above the existing 500-character limit. The submission helper independently enforces that limit.
- Action/TTS failures now remain until dismissal or a confirmed question response. Errors use an alert; informational notices use a polite status and do not play the error sound. Native **Review question** and **Dismiss message** buttons provide recovery without programmatic global focus changes.
- Question feedback renders inside the open composer. Accusation feedback renders inside its native dialog. The floating copy is suppressed in either location, so it does not cover Send controls, duplicate an announcement, or remain behind the modal. Existing motion wrappers preserve the application's reduced-motion behavior.
- Existing server-saved result recovery-link notices were classified as informational. No win/result behavior was otherwise changed.

## Focused evidence

[tests/turn-feedback-recovery.test.tsx](../../tests/turn-feedback-recovery.test.tsx) adds six scenarios:

1. Render the actual suspect response with a previous answer and a delayed next turn: both dialogue and independent polite preparing status are present; active/speaking states omit the preparing text.
2. Execute the actual feedback-hook callbacks through a server-rendered probe: an error remains after the controlled clock advances beyond four seconds, dismissal clears it, and informational feedback uses status semantics without the error sound.
3. Execute the actual recording action callback, composer submission helper, question controller, response parser, transport and request ledger. A later typed edit survives transcript delivery; dictation sends nothing automatically; only corrected text is submitted. A malformed successful response produces the actual `Invalid clue.` controller error in both the floating and composer feedback paths, preserves the exact draft, and a manually submitted valid retry uses the same request ID before clearing the accepted draft/error.
4. A newer draft survives completion of a previously submitted question.
5. Oversized dictation remains intact, displays an actionable length message, and does not reach submission.
6. Accusation feedback is inside the labelled native dialog with the preserved accusation and native submit/dismiss controls, without a duplicate floating alert.

The same bounded command also ran the nine existing action-response-controller tests covering malformed turn/accusation/hint responses, unchanged retry identity, terminal recovery, and cancellation/end ordering. It did not run the full suite or a build.

```sh
npm exec --offline --yes --package=node@24.21.0 --package=npm@11.21.0 -- node --import tsx --test tests/turn-feedback-recovery.test.tsx tests/action-response-controller.test.ts
```

- [Focused execution receipt](evidence/turn-feedback-recovery.txt): 15 passed, zero failed.
- [Scoped strict lint receipt](evidence/turn-feedback-lint.txt): zero diagnostics across changed UI/controller modules and affected tests.

## Limits and remaining criteria

These are executed controller/helper, controlled transport, and actual-component server-rendering checks. They are not a mounted React browser lifecycle, DOM accessibility-tree inspection, real microphone/transcription, provider request, or audible playback test.

User-owned browser checks remain: delayed second-turn visibility, dictation correction and retry with actual microphone input, Tab/Shift-Tab and focus return, announcement timing/duplication under VoiceOver, and 390px/200% zoom reachability. No broader UX-03/10/24 completion follows from this increment.

For ARCH-11, the new connected evidence specifically covers a malformed successful turn response reaching a retained-draft recovery UI. It does not execute the complete HTTP 500/429/invalid-JSON/missing-field/refusal matrix through every visible screen or establish blanket failure recovery.

Skills applied: use, dec-accessibility, dec-nielsen-heuristics, flow-errors, dec-quality-testing. The installed Next.js client-boundary guide was read before implementation.
