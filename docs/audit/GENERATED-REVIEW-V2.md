# Generated-case review v2 calibration

**Material failure: the semantic reviewer falsely accepted the saved phone-attribution case.** It treated a code entered from a registered phone as proof that the suspect personally approved a transfer. The revised reviewer is still fallible, and generated-case fairness and solvability remain unproven.

The exact saved case also has a 500-character contradiction without final punctuation. The separate deterministic content gate rejects that original string before production review. Therefore this experiment demonstrates a semantic-review false acceptance, not that the complete production generation pipeline would admit that exact saved case. It does not establish what the reviewer would do with a newly generated, fully written version of the same unsupported inference.

## Intervention declared before inference

Reviewer version `generated-consistency-v2` requires private structured comparisons before the same five mandatory verdicts:

- Every material cover assertion is compared with excerpts from the full true story or truth field, rather than checking only the designated lie.
- The actor assigned wrongdoing in `crime` is compared with canonical identity and role facts.
- Evidence requirements address only the designated false claim; disproving a denial of contact does not require proving account ownership or theft.
- Initial public leads are distinguished from case facts available through questioning; an answer need not be fully disclosed in the briefing.

Runtime validation checks that quoted excerpts occur in their allowed source fields, allowing only whitespace and typographic quote normalization. It rejects favorable verdicts when structured comparisons report another contradicted claim, an actor conflict, insufficient evidence or no questioning path. These checks establish literal provenance and report consistency; they cannot establish that the model interpreted the facts correctly or enumerated every claim.

The existing five verdicts, private report boundary, no-retry behavior and shared candidate/review deadline remain. No candidate generation, browser interaction, API-key provider call or database query was performed in this calibration.

## Frozen corpus and actual calls

The six v1 candidates, criteria and labels were read directly from the immutable v1 expected manifest. A regression test verifies exact structural equality of those six inputs. Two authored controls were added before inference: a witnessed door-opening denial expected to pass, and an erasure case with both a culprit-role conflict and an extra archive-entry lie expected to fail. They were held out from v1 calibration but authored by the same evaluator; this is not an external blind assessment.

- [V2 predeclared inputs, labels and source hashes](evidence/generated-review-v2.expected.json)
- [V2 actual structured comparisons, verdicts and timing](evidence/generated-review-v2.json)
- [V1 findings and limitations](GENERATED-REVIEW.md)

Exactly **8 review calls**, **0 generation calls**, and at most **2 concurrent calls** ran using isolated local Codex with `gpt-6-luna`. The run started at 12:33:06.771Z and ended at 12:34:29.846Z on 2026-10-03: 83.075 seconds wall time. Individual calls ranged from 17,652 to 24,000 ms, median 20,126 ms. No provider or quote-provenance errors occurred. Source hashes were identical before and after the frozen run.

The existing subscription was used. Token and monetary usage are not exposed by the capability and were not measured. This is review-only latency, not total new-case latency. The reviewer was not retuned and labels were not changed after these results.

| Case | Expected | Semantic gate | Complete declared criteria | Latency |
| --- | --- | --- | --- | ---: |
| v1 bank | Reject | Reject | Missed recorded-time evidence defect | 21,314 ms |
| v1 law firm | Reject | Reject | Matched extra-lie and actor-conflict criteria | 20,770 ms |
| v2 law firm / phone | Reject | **Accept** | Missed device-to-person evidence defect | 23,247 ms |
| v3 hospital | Reject | Reject | Matched extra remote-access lie criterion | 24,000 ms |
| Frozen authored LEDGER | Accept | Accept | Matched | 18,221 ms |
| Frozen authored movement | Accept | Accept | Matched | 17,652 ms |
| Held-out authored door | Accept | Accept | Matched | 17,935 ms |
| Held-out authored erasure defect | Reject | Reject | Matched both declared defects | 19,482 ms |

The overall admit/reject label matched 7/8. The stricter declared diagnostic criteria matched **6/8**: 4/6 on the frozen regression corpus and 2/2 on the new controls. V1 matched 3/6 strict criteria on those same six cases. These are calibration observations, not reliability estimates. V1 rejected the phone case while falsely rejecting LEDGER; v2 corrected the LEDGER result but falsely accepted the phone case. A higher aggregate score conceals that material tradeoff.

## What remains wrong

**False acceptance — phone attribution.** The v2 comparison quotes that a one-time code “was entered from that phone after his office badge-out time,” then marks this sufficient to disprove Julian's personal denial of approving remotely. The case provides no exclusive possession or witnessed user identity. Literal quote validation passes because the quote is real; the inference is still unsupported. The prompt explicitly distinguishes a device from its user, but the model did not apply that distinction here.

**Missed diagnostic criterion — recorded approval time.** Bank/easy's reviewer now correctly flags the extra vendor-legitimacy falsehood and rejects the case. It nevertheless marks the designated timing evidence sufficient by treating a 5:06 p.m. recorded approval as actual authorization at that time, plus the manager's departure as supporting evidence. The candidate states no rule establishing those implications. Rejection for another reason does not make this missed criterion resolved.

**Improved in this sample.** The field comparisons explicitly identify the law-firm case's changed-payment-details denial and conflicting partner-versus-billing-manager culprit role. They also identify the v3 hospital's independent remote-access denial. Both original authored controls and the new door control pass without being required to prove theft; the held-out erasure case's extra lie and role conflict are rejected. No new generated case was assessed, so this does not establish generalization to current generation output or actual player discovery.

## Approved post-capture deterministic correction

After the live evidence was captured, a code inspection found an edge in the cross-check: a secondary claim marked `contradicted` with an empty truth excerpt could escape rejection because the extra-claim predicate also required a nonempty excerpt. The approved correction rejects any reported secondary contradiction, regardless of excerpt length. A regression test exercises an otherwise all-pass report with exactly that empty-excerpt secondary claim.

Only this deterministic guard and its version marker changed after capture; the prompt, frozen corpus and live labels were not retuned. Current marker: `generated-consistency-v2.1-guard`. V2 evidence retains the original before/after hashes; [the correction record](evidence/generated-review-v2-guard-correction.json) records the subsequent two file hashes. The live sample did not exercise that edge, and no further inference was run to claim otherwise.

## Verification and next gate

Focused tests execute schema/quote rejection, report-verdict consistency, the empty-excerpt regression, exact corpus preservation, private report omission, each mandatory failed criterion, cancellation, the shared deadline, and failure before a playable checkpoint. All 13 focused tests, full TypeScript and scoped strict lint passed after the correction. Mocked provider tests now use isolated temporary data directories so they do not consume the demo operator's durable allowance.

The next decision should address the remaining evidence-to-person and recorded-time inference boundaries, while preserving acceptance of legitimate direct observations. A typed statement of what the record establishes versus what the claim requires may be useful, but another model-authored field alone would not be a guarantee. This increment does not authorize another live sample, new generation, prompt tuning or a fairness claim.
