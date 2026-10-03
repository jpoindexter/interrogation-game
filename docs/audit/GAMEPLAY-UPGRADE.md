# Interactive gameplay upgrade: prove the contradiction

Status: domain increment implemented and locally tested, 2026-10-03. The interactive UI/provider scenario described here remains a proposal until integrated and exercised. Builds on the audit baseline at `f8d4c3c` and the current session foundation increment. Scope is this fictional local game; the adversary is the game's own suspect model.

Skills matched (4): ideation-methods, dec-software-principles, dec-quality-testing, enforcing-code-size. Method: **TRIZ (Genrich Altshuller)**. Signals: generation, technical/product interaction, constrained by a live AI demo and existing noir mechanics, balanced feasibility. Design contradiction: the suspect needs freedom to improvise convincing evasions, but players need fixed evidence and a verifiable path to win. Apply separation by responsibility: generation supplies acting; a case evidence graph and session transitions decide progress and outcome.

## Concrete slice

Give the player an evidence challenge, not another meter: **pin an exact suspect statement, attach one case exhibit, ask the suspect to reconcile them, then cite the mismatch in the accusation**.

Example reviewed demo case (new authored proposal, not an assertion about existing generated cases):

- A fictional trading-office ledger disappears. The suspect's cover story says they left the building at 18:00 and did not return.
- Exhibit A is a signed visitor log showing a return at 18:42. The exhibit establishes presence; it does not establish theft or motive.
- The detective pins the exact “I left at six” statement, presents the log, and asks, “Then why does this show your signature at 18:42?”
- The suspect may explain, dodge, or revise their account in character. The player wins only by identifying the specific false departure claim and citing the evidence, not by declaring that nervousness proves guilt.
- A second exhibit about a different person's badge is an irrelevant but plausible lead. The player can clear it without being tricked by random clue icons.

The reveal puts the two conflicting claims side by side, highlights the exact transcript source, and shows the accepted accusation. The noir file, stamps, portrait, cassette and sound design remain the visual language.

## Why this follows the repository's history

All 98 reachable commit subjects were re-read; selected changes below were inspected via Git. Subjects establish intent; the listed source changes establish what was added. They do not establish historical runtime correctness.

| Evidence | Established direction | Consequence for this slice |
|---|---|---|
| `db74626` (ACCUSE replaces auto-confess) | Specific lie detection, three attempts, explicit player accusation | Preserve player authorship and the dramatic confession. Do not auto-win from a full stress meter. |
| `299355b`, `src/lib/mistral.ts` diff | Exactly three detective leads, one useful and two red herrings | Give leads stable IDs and a resolved/unresolved status. Make the reason a lead is irrelevant discoverable. |
| `172e5cb`, `src/lib/mistral/interrogate.ts` diff | Evidence-confrontation reactions and silence filling | Make an evidence challenge an explicit action with source references instead of depending entirely on prose prompt interpretation. |
| `0570cac` | Cross-session retrieval adds prior questions to the suspect prompt | Do not make the core game depend on embeddings, database setup or claims of learning. Curated challenge responses are sufficient for the first slice. |
| `ecd5557` | Stress gates, minimum question count, short-question rejection, mode-specific lawyer-up | Reconcile incompatible rules. A short, precise question about a pinned contradiction can be meaningful; word count should not veto it. |
| `217c9f0` actual diff | Dock clue gate and documentation change | The subject claims client + server enforcement, but this commit's actual change is two files. Current behavior needs current tests, independent of its message. |
| Existing `src/lib/mistral/interrogate.ts` rules 12 and final clue rules | “Silence filling” exists beside rules rejecting short questions as lazy | Make the action's evidence reference carry context so a focused “Then explain this” is judged with its exhibit, not text length alone. |
| Audit LOGIC-01/03/06/18/19, UX-06/12/27 | Progress, sources and verdict were not consistently grounded | Use the repaired authoritative session and strict response boundary as prerequisites. |

## Interaction sequence and feedback

1. **Pin statement.** Every accepted suspect turn has a stable turn ID. Select text or choose “Pin statement”; default to the complete short turn so keyboard users do not need text selection. The pinned card links back to its source.
2. **Present evidence.** Select one discovered exhibit and write or speak a question. A confirmation shows the exact quote, exhibit and editable transcript. Send one action with a request ID, not a generic chat turn plus several hidden mutations.
3. **Challenge and accuse.** The reply stays in character. Progress indicates “Contradiction established,” “Still consistent,” or “Could not assess — retry.” The accusation composer can include source references while the player writes the actual claim. No claim is auto-submitted.

The evidence drawer stays in place while a response arrives. New replies and clues show a badge; they do not hijack the reader's tab or scroll. Errors preserve the question and selected evidence. Provider timeout is not a failed challenge and spends no attempt.

For screen sharing, one evidence pair should fill the existing file panel, with the suspect and response still visible. Do not introduce a separate complex investigation canvas for this slice.

## More dialogue and meaningful options

Add three contextual actions beside a pinned statement, all preparing an editable draft rather than auto-submitting dialogue:

| Action | Player sees | Fictional suspect behavior | Progress rule |
|---|---|---|---|
| **Clarify** | “Walk me through what happened between six and seven.” | Gives a more specific account using established facts and guarded details. | More detail is not itself a clue or proof. Record any new claim with its source turn. |
| **Present evidence** | The chosen quote and exhibit plus “How do these fit together?” | May explain, deflect, revise the account, or acknowledge the contradiction in character. | The evidence graph determines whether the pair conflicts; the model supplies dramatic delivery. |
| **Leave space** | “You paused there. What were you about to say?” | A reviewed personality may elaborate, hold silence, or redirect; no universal prediction of human behavior is implied. | No automatic stress/score reward for clicking. It becomes useful only if a new supported claim emerges. |

Free text and voice remain primary. Contextual actions give the player a way forward when stuck and visibly communicate distinct tactics. Do not offer three paraphrases of the same question or prescribe the winning answer.

For the first reviewed case, author a small dialogue matrix: opening stance; two plausible clarifications; relevant versus irrelevant evidence responses; one changed account; correct and incorrect accusation reactions. The live model may vary wording within those state-dependent bounds. Label authored rehearsal dialogue explicitly. A transcript's dramatic gesture remains fiction, not independently verified evidence.

**GAMEPLAY-DIALOGUE acceptance:** two substantially different player approaches produce coherent distinct conversation paths using the same immutable case facts; a short focused follow-up can work; prior claims stay available; no unexpected confession or new canonical fact appears. Test text and actual voice.

**GAMEPLAY-TACTICS acceptance:** every option explains its purpose through action/copy, yields an editable draft with preserved context, can be cancelled, and is keyboard operable. Irrelevant evidence, repeated clicks and silence do not farm progress; failure preserves draft and costs nothing.

**GAMEPLAY-EVIDENCE acceptance:** one reviewed contradiction and one irrelevant exhibit have stable source IDs and a verified path through pin → exhibit → challenge → accusation; undisclosed/foreign IDs and duplicate requests cannot change progress.

**GAMEPLAY-EVAL acceptance:** a deterministic corpus plus repeated live-provider runs cover faithful acting, grounded evidence, malformed output, premature confession, ambiguous accusation and alternate valid phrasing. Report validity and narrative-quality results separately; a provider changing its wording is not a defect unless it violates a contract.

## Minimal contracts and authority

Use small domain records rather than a global UI state object:

- `CaseExhibit`: stable `id`, `title`, `kind`, canonical `text`, disclosure prerequisite IDs, and reviewed claim IDs it supports or contradicts. Public responses only contain currently disclosed exhibits.
- `RecordedTurn`: stable `id`, accepted question, accepted displayed answer, linked exhibit IDs, timestamp. The server stores the same answer shown and spoken.
- `ChallengeAction`: stable request `id`, one source turn ID, one exhibit ID, editable player question. Reject references outside this session or undisclosed evidence.
- `ChallengeResult`: accepted action ID, source IDs, narrative reply, and an authoritative progress result. Repeating the same request returns the same result; rephrasing the same evidence pair does not farm new progress.
- `AcceptedAccusation`: claim, evidence IDs, validated verdict and rationale. Frozen once. The debrief projects it without asking another model to reverse the result.

For the reviewed demo case, contradiction validity follows its authored evidence graph. Do not present the model's confidence as fact or let it create a new exhibit. A generated-case mode needs its own consistency review/evaluation before adopting the same guarantee. Model prose may be rejected or retried; it cannot add tools, change canonical facts, spend attempts or mark a win directly.

A well-founded challenge should count toward a visible evidence requirement. It must not also require grinding eight unrelated turns or reaching an arbitrary stress value. Keep stress for dramatic delivery; evaluate any replacement score formula separately. This proposed rule changes the current progression and must be implemented explicitly with updated help and tests.

## Acceptance for this one slice

- A reviewed case has one valid evidence path and at least one plausible irrelevant path; both are exercised through the actual game UI.
- A pinned quote opens exactly the stored source turn after ten further exchanges. Keyboard and screen-reader users can pin, select, confirm and remove a reference.
- Correct evidence + a concise question advances one unique challenge; wrong evidence explains that it does not establish the selected claim. Neither case invents facts or treats stress as proof.
- Duplicate/concurrent requests yield one event. Refresh retains the pinned quote and accepted challenge. Undisclosed or foreign exhibit IDs are rejected before provider execution.
- Malformed model output, a timeout, loss of voice and a delayed stale reply preserve draft/evidence/attempts and allow text retry.
- The accepted accusation cannot be reversed by debrief generation. Every displayed quotation resolves to a stored turn or reviewed exhibit.
- One actual text turn, one actual voice turn and one evidence challenge reach the actual canonical result with the selected live provider. The same path is separately available as clearly marked recorded rehearsal.
- Three runs of the intended interview-sized scenario demonstrate the loop within the agreed presentation window; record observed timings, not an invented performance target.

## Proposed work packages, in dependency order

Root is tracking the expansion with GAMEPLAY-DIALOGUE, GAMEPLAY-TACTICS, GAMEPLAY-EVIDENCE and GAMEPLAY-EVAL. This subtask has made no Trello changes. Link these expansion cards to the existing audit dependencies below; track the expanded backlog separately from the original 62-card baseline.

1. **Reviewed case and stable evidence references — GAMEPLAY-EVIDENCE.** Depends on DEMO, LOGIC-18, LOGIC-01 and EVAL. Own `domain/case-evidence`, one reviewed case fixture, and contract/regression tests. Done when every reference and valid/invalid path is machine checked and the case is manually reviewed.
2. **Pin → present → challenge interaction — GAMEPLAY-DIALOGUE / GAMEPLAY-TACTICS.** Depends on UX-06, UX-12, LOGIC-03 and LOGIC-06. Own compact evidence controls, challenge service/route, request deduplication, pending/error states, and accessible source navigation. Done when the real rendered interaction and its failure recovery pass.
3. **Grounded reveal and local adversarial rehearsal — GAMEPLAY-EVAL.** Depends on UX-27, LOGIC-19, EVAL, VERIFY and DEMO-MEASURE. Own result evidence view and fixed evaluation corpus against this game's prompts. Exercise irrelevant evidence, repeated requests, invented exhibit IDs, instruction-like player text, premature confession and malformed judgments. Report which checks ran live versus deterministic. Done when every attempt preserves game authority and the real evidence-to-result path is recorded.

(Additional game modes, expanded case packs and image variants are later candidates; finish this slice first.)

## Boundary and re-entry

Now: integrate the foundation fixes and provider/audio path. Next: agree the reviewed demo case facts, then implement package 1 before adding UI. Later: compare player understanding and completion behavior before replacing the stress-gated game across all cases. DOCS may track the current implementation continuously; SITE and PORTFOLIO execution begins only after the game completion gate, as the user requested. Use the executed game evidence and verified Git history for those later narratives.

The session foundation currently has local behavior tests for clue uniqueness, terminal guards, deadlines, invalid judgments and canonical result projection. It does not yet supply stable transcript IDs, durable request idempotency, persistent recovery or evidence graphs. Those gaps are prerequisites, not implicit completed capabilities.

Skills applied: ideation-methods (TRIZ), dec-software-principles, dec-quality-testing, enforcing-code-size.

## Executed domain increment

`src/lib/gameplay/` now implements the fictional ledger evidence graph, browser-safe dialogue option exports, stable session-scoped turn and statement IDs, exact quote pinning, reviewed assertion binding, public projections, evidence challenge assessment, request receipts and per-attempt cancellation. `tests/gameplay-evidence.test.ts` executes 14 checks covering valid/irrelevant evidence, alternate reviewed assertions, hidden-source denial, canonical-source citations, duplicate/conflicting/concurrent requests, invalid-response recovery and stale-response rejection. Scoped lint and TypeScript passed when this increment was handed off.

This is not a browser or provider completion claim. The fixture is authored and graph-tested, not yet human/play reviewed. Arbitrary generated statements have no deterministic claim binding: only complete reviewed assertion variants qualify, avoiding false matches in quoted/negated snippets. API integration must preserve this limit, use the accepted visible/spoken provider response, set the gameplay terminal status from the canonical session outcome, and persist state/receipts under the session transaction.
