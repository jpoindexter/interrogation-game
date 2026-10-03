# Generated-case evidence obligations

The generated-case reviewer now separates the claim from the observation, checks necessary actor/time/action links, and asks whether an ordinary alternative leaves the denial true. This addresses the known unsupported-inference surface; it does not make semantic review an objective proof or establish general fairness.

## Runtime change

Version `generated-consistency-v3-evidence-obligations` preserves the five verdicts, separate private review, shared candidate/review deadline and no hidden retries. The new evidence module requires reported obligations for actor identity, event time and record meaning. Each is direct, explicitly linked, irrelevant to the designated claim, or missing. Necessary support must quote the contradiction or canonical story; the answer-only `the_truth` field cannot itself supply independent evidence.

The reviewer also considers a normal account compatible with the evidence in which the designated denial remains true. It must not manufacture forgery or dishonest witnesses to reject direct observations. Runtime acceptance rejects any reported missing obligation, blank claimed support, or surviving alternative even when the top-level verdict is favorable. Quote validation rejects excerpts absent from their permitted fields. These are enforceable report-consistency and literal-provenance checks, not independent semantic interpretation: the model can still misclassify an essential obligation as irrelevant, cite an irrelevant passage, or fail to identify an alternative.

The prompt removes an ambiguous prior instruction about using a late record to disprove prior approval. It distinguishes a device from its operator, event time from recording time, and the observed action from a proxy. Obligations are relative to the designated lie: an untimed door-opening denial does not require proof of theft or unrelated timing.

## Bounded execution

Exactly three cases were selected from the already frozen v2 input manifest, with their original expected outcomes and required failures, before dispatch: the phone attribution defect, the recorded-approval-time defect, and the personally recognized door-opening control. No candidate was rewritten. The v1/v2 manifests and results remain unchanged. These are known calibration cases, not held-out or blind evidence for v3.

The opt-in harness writes its manifest and source hashes before inference, uses the current production reviewer `gpt-6.1-sol` through local Codex, limits concurrency to one, makes no generation calls and performs no automatic retries. Each run uses an isolated temporary work allowance and deletes it afterwards. V2 used `gpt-6-luna`, so comparisons cannot isolate a prompt effect from a model change. Subscription token usage and monetary cost are not exposed or measured.

- [Predeclared inputs and source hashes](evidence/generated-review-v3.expected.json)
- [Actual review outputs and timings](evidence/generated-review-v3.json)

The process completed all three calls between 14:14:35.722Z and 14:17:47.074Z on 2026-10-03 (191.352 seconds wall time), with no provider/schema/quote errors. All inference source hashes were identical before and after the run. The executed harness is retained [verbatim](evidence/generated-review-v3-harness.ts.txt); its output-argument validation was subsequently extracted into a helper solely to satisfy the function-complexity gate. No prompt, schema, runtime gate or expected criterion changed after inference.

| Frozen case | Expected | Observed | Review latency |
| --- | --- | --- | ---: |
| Phone attribution | Reject for insufficient evidence | Rejected; actor link missing, different operator remains possible | 62.219 s |
| Recorded approval time | Reject for extra lie and insufficient evidence | Rejected; recording time does not establish authorization time | 79.186 s |
| Direct door-opening observation | Accept | Accepted; actor/action observed, timing unnecessary | 49.944 s |

All three original outcome/required-failure criteria matched. This small known sample is not a reliability estimate. The bank review also raises an arguably unnecessary operator-identity objection even though the cover story admits entering the payment; matching the intended timing failure does not make every reported criticism correct.

## Latency remains a demo risk

These are review-only times. The production flow still shares a 120-second default deadline between candidate generation and review; a 79-second review leaves roughly 41 seconds for generation and overhead. No complete generation was timed here, so this change does not establish acceptable startup latency. The Codex adapter already uses low reasoning effort. The structured reviews contained 5,230–6,609 serialized characters, including the existing claim comparisons and five verdicts plus the new evidence obligations. Removing repeated rationale or using a smaller verified reviewer may reduce latency, but neither change is validated by this run. No timeout was extended and no hidden retries were added.

## Narrow verification

Executed 15 focused checks across `generated-review.test.ts`, `generated-case-contract.test.ts` and `generated-review-corpus.test.ts`. They cover the new missing-link and alternative rejection, irrelevant-time allowance, fabricated/answer-only quote rejection, existing complete-generation private boundary, deadline/cancellation, mandatory verdict failures, no hidden retries and preservation of the frozen corpus. These controlled provider checks do not establish model behavior. Full TypeScript and scoped strict lint passed before inference completed. Scoped size/complexity checks passed after extracting the harness output-argument helper; its dry run dispatched zero calls. No browser, ElevenLabs, database or full test suite was run for this increment.

The end-to-end generated-case/player discovery gate remains open. This review-only sample bypasses candidate generation and the deterministic content gate, as the earlier calibration did. In particular, the original phone case's incomplete contradiction is separately rejected by the content gate; its review result is not evidence that the complete generation pipeline previously admitted that exact candidate.
