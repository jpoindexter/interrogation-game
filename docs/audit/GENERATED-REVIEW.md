# Generated-case consistency preflight

## Result and limit

The production generation path now requires a separate structured review before returning a generated candidate. **The first live regression sample exposed review errors:** all four known bad cases were rejected, but the reviewer missed several declared defects and falsely rejected the existing authored LEDGER control. Only 3/6 items satisfied the complete predeclared criteria. This is a fallible preflight, not a semantic correctness or fairness guarantee.

Authored gameplay bypasses generated-case creation and remains unchanged. No fresh case generation or browser playthrough was run in this increment. Earlier generated v1/v2/v3 evidence is preserved.

## Implemented contract

A separate `case-review` capability uses the same configured, isolated provider with independent instructions. It receives the candidate as untrusted JSON data. The review has five required assessments, each `{ pass: boolean, reason: string }`:

1. `singleFalseClaim`: no independent falsehood outside the designated claim.
2. `canonicalConsistency`: identities, roles, chronology and system rules agree across fields.
3. `evidenceSufficiency`: stated evidence contradicts the claim, with the necessary identity/time/rule link; an associated credential or device alone does not establish its user.
4. `publicDiscoverability`: a public lead provides a plausible questioning route to stated case facts.
5. `completeReasoning`: the contradiction has no unfinished text or missing essential inference.

Every assessment must pass. Reasons must cite field names and short exact excerpts. Private review reasons are neither merged into the playable case nor exposed in the rejection error. There is no automatic rewrite, retry, fallback acceptance or second judge vote.

`generateCase` applies the existing deterministic unfinished-text check and normalizes the objective before review. It returns only after a favorable, schema-valid review. An unfavorable review throws `CASE_REVIEW_REJECTED`; malformed review or provider failure also rejects the operation. Candidate generation and review share a single configured `AI_TIMEOUT_MS` deadline (90 seconds by default), including inherited request cancellation. A review cannot restart that budget.

The new review files are `src/lib/ai/generated-review/{contract,prompt,review}.ts`; compatibility integration is in `src/lib/mistral/generate-case.ts`. Reviewer version is `generated-consistency-v1`. This is a separate inference and prompt, not an independent model family or human reviewer. Shared model blind spots remain possible.

## Predeclared live experiment

- [Immutable expectations, full input cases, criteria and source hashes](evidence/generated-review-v1.expected.json)
- [Actual reviews, timing and final source hashes](evidence/generated-review-v1.json)
- Runner: `scripts/evaluation/generated-review-main.ts`
- Corpus: `scripts/evaluation/generated-review-corpus.ts`

Before inference, the corpus fixed four saved generated defects and two authored controls. An expected rejection only counts as a full match if the reviewer also flags the declared defective criteria. A provider error does not count as a successful detection. Labels were not adjusted after output.

The run used local signed-in Codex, `gpt-6-luna`: exactly **6 review calls, 0 generation calls, maximum 2 concurrent**. Start 12:16:50.731Z; finish 12:17:30.052Z; wall time 39.321 seconds. Source hashes before and after were identical. No API key or database was used. Existing subscription usage was incurred; token and monetary cost are not exposed by the capability and were not measured.

| Saved case | Declared outcome | Actual gate | Declared defects recognized | Latency |
| --- | --- | --- | --- | ---: |
| v1 bank | Reject | Reject | Extra lie missed; evidence criterion failed | 15,765 ms |
| v1 law firm | Reject | Reject | Extra lie and culprit-role conflict both missed | 11,160 ms |
| v2 law firm | Reject | Reject | Device-to-person link correctly flagged | 11,981 ms |
| v3 hospital | Reject | Reject | Independent remote-access lie correctly flagged | 12,251 ms |
| Existing authored LEDGER | Accept | Reject | False rejection | 11,300 ms |
| Authored witnessed movement | Accept | Accept | All five passed | 10,840 ms |

Overall accept/reject matched 5/6, but the stricter declared diagnostic criteria matched only **3/6**. Four rejected bad cases do not establish that the reviewer reliably detects their known defects. Individual review calls ranged from 10,840 to 15,765 ms. No combined live candidate-plus-review latency was measured; the deterministic shared-deadline test verifies the budget behavior, not production speed.

## Concrete reviewer failures

**v1 bank: missed a direct second falsehood.** The candidate's cover story calls the vendor legitimate, while its true story says Nina created a fake vendor. The reviewer nevertheless marked `singleFalseClaim: true`, claiming legitimacy was not independently contradicted. Its evidence rejection also focused on uncertainty about payment entry time rather than the declared recorded-approval versus actual-authorization distinction. The case was rejected, but this does not validate the intended semantic detection.

**v1 law firm: missed both declared conflicts.** `crime` names a litigation partner as the embezzler, while `suspect_true_story` assigns the conduct to billing manager Owen. The cover story denies changing payment details; the true story says Owen substituted his own account number. The reviewer marked both consistency criteria true. It rejected evidence because the call did not establish which account number was substituted, even though the designated lie was only denying contact with the vendor. That demand proves more than the actual lie-identification objective requires.

**Existing authored LEDGER: false rejection.** The reviewer said the visitor record's contents were missing from the briefing, even though a lead explicitly directs comparison with the visitor record and the contradiction states that it names Casey arriving at 18:42. The prompt permits questioning about records stated in the case; it does not require every answer to appear in the briefing. The review input is the authored case-data projection, not its separately served exhibit graph, which is a limitation of this control. We retained the predeclared expected acceptance rather than changing the label or adding facts afterward. The actual authored runtime does not go through this new gate.

The v3 review correctly caught the extra remote-access lie, but also demanded personal attribution of the later approval record even though ordering alone addresses the designated prior-approval claim. These examples show overreaching criteria and missed direct contradictions in the same model output.

## Executed deterministic verification

`tests/generated-review.test.ts` exercises the production capability with a mocked Responses transport:

- exactly two separate, tool-disabled calls for an accepted candidate;
- normalized objective is what the reviewer sees; private assessments are not returned;
- each failed criterion blocks return without a third call;
- malformed review and provider failure reject without retry;
- cancellation during the review rejects the whole flow;
- candidate plus review share one deadline: two 650 ms responses cannot complete under a 1,000 ms total budget;
- embedded candidate instructions remain data, separate from the system prompt;
- invoking the actual `createPlayableCase` path on review rejection never invokes the checkpoint callback or reaches session materialization.

These tests cover code behavior with controlled review outputs. They do not prove that the real model follows the criteria; the live experiment above demonstrates that it sometimes does not. The existing authored factory and previous-checkpoint resume behavior were not changed. Root owns the durable request receipt and user-visible error mapping. The focused verification also ran `generation-quality-recovery.test.ts`: review rejection and incomplete-content failure each preserve one failure receipt and the `loadCase` new-attempt path, without a playable session. Across review, content, evaluation and recovery files, 15 tests passed; full TypeScript and scoped strict lint passed. This executes route/helper recovery behavior, not browser interaction.

## Next bounded decision

Keep the gate described as an additional fallible check. A possible next intervention is a structured field-by-field claim comparison before the five verdicts: compare each cover statement with the full true story, compare the crime's actor with the named suspect, and restrict evidence requirements to the designated lie. The discoverability test should explicitly distinguish facts initially visible from facts available through questioning. This needs a new predeclared sample, not relabeling these outputs.

No further calls or prompt tuning were performed after these six reviews. Any future generation benchmark must account for **two provider calls per successful generation flow**, plus its judge calls. The older v1/v2 generation harness manifests predate this gate; their historical counts remain correct for those runs, but must not be reused as the current total provider-call budget.
