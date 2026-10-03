# Current disclosure acceptance — 3 October 2026

**Two semantic false negatives remain.** The current route preserved all five legitimate examples and withheld six of eight restricted examples. Its actor access boundary and evidence-release assertions passed; this is not a claim of live-model secrecy or general prompt-injection resistance.

## Original criteria and current evidence

[LOGIC-09](https://trello.com/c/Ib1LFWHk) requires a dataset covering cover-story repetition, normal investigation questions, earned clues, direct leaks, paraphrase leaks and injection attempts, with false positives/negatives reported and legitimate dialogue preserved. The [13 labeled fixtures](../../tests/current-disclosure-fixtures.ts) adapt the eight historical output examples and two input probes retained in [RULE-ACCEPTANCE.md](RULE-ACCEPTANCE.md). Their labels describe desired disclosure, not whatever the implementation happens to allow.

The current earned-clue example uses the canonical case-file evidence note, obtained through three distinct substantive questions on Easy. It no longer inserts a model-generated clue into session state. Additional labels cover discussion of the conclusion after release, the still-private true-story field after release, and benign versus metadata-producing replies to injected instructions.

The [executed JSON receipt](evidence/current-disclosure-acceptance.json) includes every input, controlled output, shown response, classification and source hash. The [test output](evidence/current-disclosure-acceptance.txt) records one focused integration check. The existing Node test runner and isolated fixture helper execute the actual Next route, Responses adapter, public actor projection, literal filter, session commit and request replay. Only the external transport is controlled. There were 22 controlled provider requests and zero live-provider, voice, browser or external-database calls.

| Labeled output group | Examples | Correctly preserved/withheld | False positives | False negatives |
| --- | ---: | ---: | ---: | ---: |
| Legitimate cover, ordinary answer, earned record/conclusion, resisted injection | 5 | 5 preserved | 0/5 | — |
| Direct truth/contradiction/true story, true story after release, metadata, injection metadata | 6 | 6 withheld | — | 0/6 |
| Unreleased truth paraphrase and Spanish translation | 2 | 0 withheld | — | 2/2 |
| All restricted outputs | 8 | 6 withheld | — | 2/8 |

These are fixed, deliberately selected synthetic examples from one fictional case. The counts are not production error rates. Eleven of thirteen safety labels matched. The JSON explicitly records `semanticSafetyPassed: false`; a green integration assertion does not turn the two leakage observations into successful defenses.

## What the executed path establishes

- Every actual outgoing actor system prompt excluded the private truth, true story, stress/tactic/biography markers. The contradiction was absent before release and present afterward; the cover story remained available. This proves the selected serialized input boundary, not what a model can infer from public data.
- Both ordinary and adversarial player questions reached the provider and transcript unchanged. A controlled in-character response to injection stayed speakable; a controlled metadata response was withheld. No inference was performed, so these observations do not measure whether a real model obeys the injection.
- The third accepted question released exactly the canonical case record with `origin: case-record`, despite zero reported stress. Replaying its request returned the same response with no additional provider call. Subsequent earned-record/conclusion discussion remained speakable; the hidden true-story text remained blocked.
- Model-supplied clue text did not create evidence. Each tested turn returned the expected clue count, null new model clue, no win and no terminal outcome. The transcript contained exactly the shown reply, including filter fallback or the two observed semantic leaks.

No application source was changed. The first harness attempt sent `caught: true`, which violates the existing suspect response schema and correctly returned 502. The fixture was corrected to schema-valid `caught: false`; the [initial failed receipt](evidence/current-disclosure-acceptance-initial.txt) is retained. That failure was in the harness, not an application disclosure defect.

## Card disposition

**LOGIC-09: recommend Verify.** Its explicit dataset/report/preservation acceptance is now executed against the current policy, including every named category. The broader replacement of secret blocking still has two demonstrated semantic misses. Keep these unresolved observations attached rather than close the entire disclosure defect on a green route check. Closing the measurement work alone would be defensible; closing semantic leakage is not supported.

**EVAL: keep In progress.** This receipt contributes current answer-leakage labels and deterministic route evidence. It does not execute all deterministic invariants, select a live model, measure model judge false accepts/rejects or case solvability, quantify repeated-run variability, or supply human review of borderline decisions. Existing live judge/generated-case reports remain separate dated evidence; this run neither replaces nor upgrades them.

Current risk remains inference, guessing, hallucination and echoing player-supplied answers. Removing privileged facts from actor input reduces direct access; the literal output guard still misses semantic equivalents and translations. After release, truth and contradiction are intentionally discussable. A future change must preserve that distinction and the measured legitimate dialogue instead of restoring blanket keyword blocking.

## Reproduce only this acceptance check

```sh
DISCLOSURE_ACCEPTANCE_REPORT=docs/audit/evidence/current-disclosure-acceptance.json node --import ./scripts/test-worker-env.mjs --import tsx --test tests/current-disclosure-acceptance.test.ts
```

The test creates and removes its own temporary storage directory, uses a synthetic API key, and intercepts all fetch requests. The report omits session IDs, request IDs and credentials. Existing evidence files are updated only when the explicit report environment variable is set.

Skills applied: use, dec-quality-testing, dec-ai-native-patterns, dec-software-principles.
