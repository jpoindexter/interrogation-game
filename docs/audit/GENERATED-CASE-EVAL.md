# Generated case evaluation — 2026-10-03

Three generated cases passed structural checks and six judge probes matched their predeclared labels. Source review found story inconsistencies that prevent treating these results as proof of fair, playable cases. No production prompt, validator or judge changes were made during the v1 evaluation. The separately recorded v2 intervention and repeat are described below.

## Executed scope

The run used the production `generateCase` and `evaluateAccusation` capabilities with the existing isolated, signed-in local Codex adapter, model `gpt-6-luna`. Exactly **3 generation calls and 6 judge calls** ran, with at most **2 concurrent calls**. It began at 11:53:03.609Z and finished at 11:54:05.407Z (61.798 seconds wall time). There were no provider exceptions. Source hashes recorded before and after were identical.

- [Predeclared scenarios, criteria and source hashes](evidence/generated-cases-v1.expected.json)
- [Complete generated fictional cases, prompts, outputs and timings](evidence/generated-cases-v1.json)
- Harness: `scripts/evaluation/generated-{corpus,checks,runner,main}.ts`
- Harness regressions: `tests/generated-evaluation.test.ts`

This used the existing Codex subscription. No API key, Supabase, browser or human participant was used. Token counts are not exposed by these production capability returns; monetary cost was not measured and is not claimed to be zero.

## Criteria declared before inference

Each case must pass the production runtime schema and case validator, match its requested difficulty, contain exactly 2/3/4 stress triggers for easy/medium/hard, and contain three nonempty detective leads. A narrow disclosure check verifies that the complete normalized truth or contradiction is not copied into the public briefing, leads, objective or cover story; this does not detect paraphrases or partial disclosure.

Each judge receives the cover story as prior assistant dialogue and two separate accusations. The positive probe directly supplies the canonical lie, truth and contradiction and expects `correct: true`. The negative probe alleges a different person's bicycle-related lie, supported only by an unrelated parking receipt, and expects `correct: false`. Criteria and labels were not changed after execution.

The positive probe is an **oracle test**: it already knows the private answer. It establishes that this judge accepted these canonical accusations, not that a player could discover them. The negative tests wrong-person/wrong-claim rejection. Current judge instructions require identifying the substance of the lie; they do not require independent verification of cited evidence. Therefore this run does not assign a negative label to a correct lie accompanied by wrong evidence, and does not establish evidence-validation quality.

The predeclared source rubric separately checks one-lie consistency, whether evidence logically contradicts that lie, a plausible public questioning path, internal chronology/roles/objective consistency, and the distinction between disproving an account and proving a crime. The review below is an inspection of generated text, not a second model or participant rating. This separation follows the recommendation to define task-specific success criteria and test representative and difficult cases in [OpenAI's evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices#handle-edge-cases).

## Observed results

| Scenario | Generation | Canonical accusation | Different-person accusation | Structural checks |
| --- | ---: | ---: | ---: | --- |
| Bank / easy | 20,727 ms | Accepted, 8,793 ms | Rejected, 7,878 ms | 5/5 |
| Law firm / medium | 22,029 ms | Accepted, 7,500 ms | Rejected, 6,976 ms | 5/5 |
| Hospital / hard | 15,543 ms | Accepted, 7,654 ms | Rejected, 7,921 ms | 5/5 |

All nine capability latencies ranged from 6,976 to 22,029 ms, median 7,921 ms. These are local wall-clock measurements including adapter startup and validation, not model-only inference time or a performance guarantee. Failed-accusation public prose passes through the production authored sanitizer; the observed negative `correct` labels came from the judge, while that prose is not raw model reasoning.

## Source-review findings

### P1: Law-firm case names inconsistent culprit roles

In `generated-law-medium`, `crime` says “A litigation partner embezzled $84,000.” The suspect is billing manager Owen Whitaker, and `suspect_true_story` says he created the false invoice and routed the money to an account he controlled. A partner is also part of the cover story's blame-shifting account. These statements do not establish a consistent canonical perpetrator; the summary presents that blame as fact while the private story makes Owen responsible.

**Reproduction:** inspect the case's `crime`, `suspect_role`, `suspect_true_story` and `suspect_cover_story` fields in the evidence JSON. The validator accepts this case and the judge accepts its canonical lie accusation. Structural and verdict agreement do not catch the cross-field inconsistency.

**Suggested acceptance:** canonical summaries identify the same actor and conduct as the private story; allegations attributed to another character stay explicitly attributed. Preserve this case as a regression fixture. A semantic review or authored structured fact model is needed; string role matching alone cannot safely validate all narratives.

### P2: Bank and law-firm cover stories contain more than one materially false claim

The prompt requires a mostly true story with one specific lie. Bank/easy designates payment-after-approval as the lie, but its cover story also calls the vendor legitimate while its true story says Nina created a fake vendor. Law/medium designates never-contacted-the-vendor as the lie, but its cover story also denies changing payment details while its true story says Owen substituted his own account number.

A player could identify a real falsehood from the generated story and still miss the one field the strict judge is told to accept. This review identifies that potential fairness defect; it did not spend additional live calls testing those alternate accusations.

**Suggested acceptance:** either make every material claim outside the designated lie consistent with the true story, or explicitly model and accept all independently valid contradictions. Do not quietly broaden scoring until the intended game contract is chosen.

### P2: Public objectives promise stronger proof than the winning condition requires

Bank/easy asks to prove the payment fraudulent; law/medium asks to prove the trust transfer fraudulent; hospital/hard asks to prove the rebate diverted. The judge's actual condition is identifying the designated lie. In the hospital case, proving that Priya could not have used the retired saved template does not independently prove where the rebate went. The private story supplies the theft, but the described contradiction only addresses her method claim.

**Suggested acceptance:** use a public objective that accurately describes the implemented lie-finding task, or require a separate canonical proof chain for the stronger crime claim. Do not characterize a correct lie judgment as proof of every allegation in the crime summary.

### P2: Bank chronology leaves approval timing ambiguous

The lie is entering a payment after approval. The case provides a 4:12 p.m. payment and a 5:06 p.m. recorded approval; the manager left the building at 3:40 p.m. A later recording is not necessarily a later approval, and leaving the building does not rule out remote approval. The private truth stipulates that approval was later, but the described public evidence lacks a rule equating the record time with actual authorization or excluding an earlier authorization.

**Suggested acceptance:** state the relevant approval-system rule and evidence, or change the claim to something the timestamps directly disprove. Do not assume physical presence is required for approval.

### Additional coverage limits and observations

- Each case has a public lead pointing toward its designated weakness: reconciliation/approval order, vendor contact, or retired template. This is a plausible route on paper. No actor questioning sequence was executed, so discovery, dialogue consistency, pacing and target question counts remain unverified.
- The law case combines an extension's phone log with a vendor recollection, which is stronger than an extension log alone. The hospital truth explicitly says the template was unavailable. The ordinary phrase “saved template” could still imply a local copy; making availability constraints explicit would reduce ambiguity.
- Bank/easy and law/medium both generated case number `6381`, `$84,000`, and a Meridian workplace despite different setting instructions and random seeds. This is an observed duplicate, not a measured diversity rate. The prompt's “different every single time” promise has no cross-request memory; case numbers must remain display labels rather than unique session identifiers. Cross-run uniqueness was not a predeclared pass/fail check.
- No expert case, repeated generations, freeform actor playthrough, alternate valid accusation, human fairness assessment, browser flow or hosted deployment was evaluated. The 15 structural passes and 6 verdict matches are this small sample's observations, not an estimated reliability rate.

## Re-entry and done criterion

This evaluation increment is complete when the bounded live evidence, immutable predeclared labels, source review and executable harness checks are present. It does **not** close generated-case fairness or solvability.

Root should choose and implement the story/objective contract fixes, retain the observed defects as fixtures, and then run a newly declared bounded evaluation plus a player-view questioning path. The existing live evidence must remain unchanged. To inspect criteria without inference, run `npx tsx scripts/evaluation/generated-main.ts`. Any subsequent real run must use an explicit `--run --output` path that does not already exist; the harness refuses to overwrite existing manifests.


## V2 intervention and predeclared repeat

Following the v1 findings, `generateCase` now normalizes the public objective to **Identify the false claim**, even if the provider returns a stronger crime-proof objective. This affects generated cases only; the authored case factory is unchanged. A mocked production-capability regression executes the structured response path and verifies that normalization.

Prompt version `one-false-claim-v2` requires a canonical observed incident rather than an unsupported guilty-role summary, consistent identities, exactly one false sentence copied into `the_lie`, all other cover-story statements consistent with the truth, and a public questioning route. It explicitly distinguishes recorded approval time from actual authorization and physical departure from the ability to act remotely. These are model instructions, not semantic runtime validation. The judge contract is unchanged.

V2 uses the identical three setting/difficulty scenarios, same five structural checks, same accusation labels and same source-review rubric as v1. The new manifest records the prompt version and also hashes the generation capability containing runtime normalization. These changes were declared before the second inference run; v1 artifacts remain intact. The two samples must be reported separately rather than pooled into a reliability claim.

- [V2 predeclared manifest](evidence/generated-cases-v2.expected.json)
- [V2 complete evidence](evidence/generated-cases-v2.json)

### V2 observed results

Exactly 3 generation and 6 judge calls ran, at most 2 in parallel, from 11:59:43.847Z to 12:01:06.747Z (82.900 seconds wall time). Source hashes were identical before and after this run. No provider exceptions occurred. All 15 structural checks passed; all 6 predeclared verdict labels matched. The production runtime normalized all three objectives to the implemented win condition.

| Scenario | Generation | Canonical accusation | Different-person accusation | Structural checks |
| --- | ---: | ---: | ---: | --- |
| Bank / easy | 28,651 ms | Accepted, 13,987 ms | Rejected, 7,822 ms | 5/5 |
| Law firm / medium | 18,344 ms | Accepted, 9,359 ms | Rejected, 8,035 ms | 5/5 |
| Hospital / hard | 20,146 ms | Accepted, 8,054 ms | Rejected, 10,747 ms | 5/5 |

The nine v2 capability latencies ranged from 7,822 to 28,651 ms, median 10,747 ms. Both samples together consumed 18 calls under the two separately authorized bounds. Token and monetary usage remain unmeasured. This is not a controlled performance comparison: different generated text, provider variability and a tiny sample confound any claimed speed effect.

### V2 source review against the unchanged rubric

**Observed improvement in this sample:** all three `crime` fields describe an incident rather than assigning guilt to an inconsistent role. Each `the_lie` is now an exact sentence in its cover story. The explicit bank/law extra falsehoods seen in v1 did not recur in this sample. Objectives align with lie identification by runtime enforcement, independently of model compliance. These observations do not establish general semantic correctness.

**P2 — incomplete contradiction text remains accepted.** All three contradiction fields have exactly 500 characters, the schema maximum. Bank/easy ends with `a later-se`; hospital/hard ends with `His `; law/medium ends without punctuation after `complete a transfer`. The first two are visibly unfinished. The production schema validates string length, not complete reasoning. The inspected generation/adapter path does not slice individual fields, so the evidence is consistent with constrained model output rather than application field truncation. The core earlier sentences still contain useful facts; this is a concrete quality failure, not proof that every case is impossible.

**Suggested acceptance:** explicitly budget concise, complete contradiction prose below the schema ceiling, and reject clearly unfinished fragments using a focused validation rule. Do not treat terminal punctuation as a semantic validator. Keep the v2 outputs intact as regressions; any subsequent prompt change requires a new sample rather than replacing this one.

**P2 — device evidence still needs an identity boundary.** Law/medium says a code sent to Julian's registered phone was entered from that phone after badge-out. This supports a device action but does not itself establish Julian's exclusive possession or rule out another user. Its private truth says he approved the transfer; a fair public contradiction should include the fact that binds this action to him. The contradiction also introduces a claim about having no firm token, while the cover story's designated false sentence is about remote approval. That additional proposed dialogue should not silently create a second required lie.

**Residual consistency questions, not established failures:** bank/easy's crime summary says no accompanying authorization record, while the private timeline includes later approval; explicitly locating the missing record at submission would avoid ambiguity. Law/medium's claim that the account was already short when checked is not grounded in its private story. Hospital/hard says the suspect updated a supplier under authorized maintenance, while the private story says he concealed a routing change; the allowed maintenance scope and which record was updated need enough detail to keep the other cover statements demonstrably true. These were identified by source review, not additional live judge or actor calls.

**Discoverability remains unexecuted.** Each case includes a plausible public lead, but some contradictions direct the player to request workflow guides, phone records or maintenance tickets. No separate tools for those artifacts were exercised in this run. A real suspect conversation must reveal usable details through permitted questioning; the oracle accusation cannot establish that path. The hospital case usefully distinguishes changing a routing account from authorizing payment, but the story's linked approval record merely asserts that the change was his action without explaining the identity binding.

**Diversity remains bounded.** V2 law/medium and hospital/hard both name Julian Mercer. V2 bank again uses case `6381` and $84,000. These repeats are observations; no population diversity claim is justified. The model receives no prior-case memory despite the generation prompt's uniqueness request.

### Verification and remaining gate

Executed after the production change: four focused tests covering the mocked production-capability normalization and evaluation checks; full TypeScript check; scoped strict size/lint check. The actual v2 provider run independently confirms all returned objectives. These checks do not establish browser behavior, participant fairness, reliable freeform discovery or a semantic safeguard.

The next gate is a coherent single-lie case with an explicit evidence-to-person/action link and a complete contradiction, followed by a player-view questioning path. V1 and v2 both passed the deliberately narrow structural/judge checks and both exposed story-quality limitations. Neither is labeled broadly safe, fair, or reliably solvable.


## V3 completeness guard and single live check

After preserving v2, root added a narrow production rejection for a contradiction exactly at the 500-character schema ceiling without sentence-ending punctuation. The generator now requests one or two complete sentences targeting 350 characters; prompt version is `one-false-claim-v3`. This is not a semantic validator. The three actual v2 fragments are retained as regression fixtures, and a production-capability test confirms rejection before a generated case is returned.

A separately predeclared single hospital/hard generation took 16,018ms and returned a complete 340-character contradiction, the correct public objective and a valid case shape. See `evidence/generated-completeness-v3.expected.json` and `generated-completeness-v3.json`. No judge or actor calls were included in this single check.

Source inspection still finds an extra material falsehood: the cover story denies remote access after departure, while the true story says remote access occurred. The designated lie instead concerns second-approver authorization. Thus completeness improved in this one observation, but the one-lie fairness defect remains open. Do not describe v3 as semantically accepted or generated-case solvability as established. A stronger fact/claim consistency boundary and player-view discovery test remain required.
