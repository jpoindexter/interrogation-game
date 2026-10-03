# Actor access and canonical evidence release

3 October 2026. This supersedes the prior unrestricted actor context and model-authored clue policy; it does not turn the literal output filter into a semantic detector.

## What changed

The actor previously received the full true story, private truth and contradiction, while its prompt simultaneously asked it to leak inconsistencies. The output filter could withhold complete copied facts but missed paraphrases and translations. The [earlier labeled sample](RULE-ACCEPTANCE.md) preserves those observations instead of rewriting them as successes.

The actor now receives an explicit public projection: identity, cover story, briefing, observed incident, public leads, already disclosed case evidence and current authored exhibits. Private true story, truth, contradiction, stress triggers, deflection tactics and biography are excluded from its initial prompt. The prompt builder independently allowlists fields, so direct evaluation callers passing a full case object cannot accidentally serialize private fields. Actual outgoing provider requests—not only an intermediate helper—were inspected in the focused route checks.

The actor improvises delivery and reactions. Instructions to manufacture factual inconsistencies have been removed. Model-supplied `clue_unlocked` text is ignored for progress. Arbitrary player questions remain intact, including instruction attacks; fiction does not change server rules. The accusation judge and terminal debrief still receive the private canonical case.

## Evidence becomes available predictably

Generated cases release their decisive **case evidence note** on the third distinct substantive accepted question on Easy, fifth on Medium, seventh on Hard and ninth on Expert. A substantive question has at least 15 letters; opening actions, explicit accusation events and normalized repeats do not count. The shared policy drives server release and the visible case-file progress explanation. Stress is not part of this decision: the focused path uses an actor reporting zero stress throughout and still reaches the evidence and verdict.

The first release is the exact canonical `the_contradiction` text from the case. It can include an explanation, so the UI labels it a case-file evidence summary—not a verbatim witness statement, original document, suspect quote or player-authored fact. It is persisted with `origin: case-record`; the accepted-turn event records exactly when it became public. Its source link is explicitly the **accompanying exchange**, not a claim that the suspect supplied the record. This release event is not evidence that the question was an effective tactic; any optional retrieval attribution remains an event association, not causality. A retry returns the original receipt without advancing questions, disclosures or provider work.

On the next actor turn, the disclosed note is part of the public projection. The literal guard then permits discussion of its contradiction and conclusion while continuing to withhold undisclosed true-story text and internal field labels. Authored cases retain their existing public-exhibit and accepted-contradiction mechanics. Generated accusations remain available from the beginning of the interview; no clue quota or evidence-note gate was added to accusation eligibility.

Legacy saved clues and transcripts remain intact. A legacy session already at its old clue quota can append one canonical evidence note without deleting earlier notes. Its unmarked historical clues remain visibly distinguishable from the new case-file evidence. New generated cases no longer need to collect 2–5 model-generated clue markers. Hints remain optional.

## Executed evidence

[Focused output](evidence/disclosure-focused.txt): **33 checks passed** across six affected test files; [scoped ESLint](evidence/disclosure-scoped-lint.txt) exited zero without warnings. The integrated size review then required extracting the note renderer and a public string-array helper; [the scoped size recheck](evidence/disclosure-size-fix.txt) exited zero. Root owns the final integrated lint/build after that refactor. Three new tests in [case-disclosure.test.ts](../../tests/case-disclosure.test.ts) exercise:

- Actual interrogation routes, real isolated filesystem receipts and controlled provider transport across all four difficulties. Before release, outgoing actor prompts exclude private facts; after release they include the case evidence note. Zero reported stress never blocks release. The actual accusation route accepts the evidence-based verdict through controlled judgment transport.
- Stable request replay makes no additional provider call and releases one note. Accepted-turn ledger and public clue carry its exact text/origin; the recovery parser retains the origin and authentic accompanying exchange.
- Opening actions, short questions, duplicate questions and explicit accusations do not manufacture progress. A withheld private response does not release evidence. Authored actor context includes disclosed exhibits but excludes the sealed note. Direct prompt callers cannot bypass the public allowlist. Legacy full-quota notes are preserved.

The existing relevant foundation, disclosure, retrieval attribution, ending and snapshot checks were updated only where the old model-clue assumptions changed. No full suite was run. An initial subset invocation omitted the repository's per-worker test-directory setup and encountered two 503s in unrelated export/retrieval paths; repeating that subset with the standard isolated-worker setup passed all 33 checks. The new route test's initial transport assertion looked for a nonexistent top-level `instructions` field; it was corrected to inspect the real Responses payload's system input before accepting the final evidence.

To reproduce the selected checks with Node 24, use `scripts/test-worker-env.mjs` and a fresh `INTERROGATION_TEST_ROOT` directory, then run:

```sh
node --import ./scripts/test-worker-env.mjs --import tsx --test tests/case-disclosure.test.ts tests/session-foundation.test.ts tests/session-snapshot.test.ts tests/disclosure-policy.test.ts tests/ai-retrieval.test.ts tests/integration-ending.test.ts
```

## Limits and next evidence

No live provider, ElevenLabs call, browser interaction or paid work was performed for this patch. Root owns the integrated build and a bounded actual-provider playthrough. Controlled transport proves factual access boundaries and deterministic gameplay, not the quality of improvisation or fun. The changed pacing needs human playtesting.

A language model can still guess, infer from public clues, echo a player's suggestion or hallucinate an answer. The literal filter still cannot classify arbitrary semantic output, and prior public conversation cannot be made unknown to the actor. This change removes privileged access to unearned private answers and adds an explicit fair evidence path; it does not claim zero semantic leaks, universally faithful dialogue, or successful live voice/browser behavior.

Skills applied: dec-quality-testing, dec-software-principles.
