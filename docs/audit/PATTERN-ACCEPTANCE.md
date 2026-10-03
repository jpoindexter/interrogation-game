# LOGIC-10 — authoritative pattern eligibility

The current local path accepts completed server outcomes, selects only evidence-associated questions from wins, and rejects a fresh or unfinished session claiming success. One focused acceptance check executed the current three-question disclosure policy, rather than relying solely on the earlier model-clue behavior. No application defect was found in the exercised path; no application code changed.

## Acceptance evidence

The original LOGIC-10 criteria are: fresh/unfinished sessions cannot submit a win; client difficulty/outcome cannot replace server facts; repeated export stays one record; selected questions trace to actual accepted clue/stress events.

The new `pattern-acceptance.test.ts` check used isolated temporary local storage and the actual session transitions, accepted-turn recorder, pattern construction, pattern-store eligibility service, pattern route and local export service:

- Fresh and active sessions sent forged win/expert/effective-question metadata to the actual POST handler. Both received 409; unfinished storage rejected before its injected placeholder was called.
- Each controlled session accepted three distinct substantive questions. Only the third released the canonical case record. The model-supplied fake clue did not become evidence. The pattern retained three exact turn events, stress deltas 0→1→2→3, the fixture's explicit provenance and one question source at `accepted-turn:4` / `clue-1`.
- A controlled accepted accusation finalized one win; another session ended as a give-up loss. Both completed outcomes could be stored, but only the winning evidence-associated question became a retrieved example. Stress-only turns and the loss contributed no tactic.
- Repeated construction returned the same pattern. An added orphan event with a mismatched question/timestamp did not become evidence. No legacy inference or fabricated metadata was used to fill missing event links.
- The actual local export ignored supplied accusation/correctness values and used the accepted server accusation, win and easy difficulty. Repeating export returned the same bytes and left exactly one JSON record.

The existing [accepted-event checkpoint](EVENT-GROUNDED-PATTERNS.md) records the actual POST handler's completed-loss spoof rejection through controlled transports, authored contradiction-receipt references, incompatible-version filters and disabled-by-default behavior. Those unchanged boundaries remain relevant; the new test focuses on the current deterministic disclosure path and local export replay.

## What ran

[Retained output](evidence/pattern-acceptance.txt): one focused integrated check passed. Scoped strict lint and full TypeScript passed. Pattern-store dependencies used a literal zero-vector placeholder and an in-memory capture solely to observe eligible canonical data; global network access from the test was configured to throw. No embedding was computed or sent, and no model, voice, browser or external database call occurred. The winning judgment was a controlled accepted server event, not a live model judgment. No full suite ran.

## Limits

A case record currently unlocks after a question-count threshold. Therefore selecting the associated question demonstrates a recorded association, not that its wording caused evidence discovery or improved later play. Losses are stored as observations but do not drive the current retrieved-question list. Retrieval remains off by default. This is not model retraining, proof that each play becomes harder, causal effectiveness or an evaluated adaptation loop.

The repeated-export check proves the local canonical export's one-record behavior. The patterns v3 table has a source-defined unique `(session_id, embedding_version)` constraint and the production adapter requests conflict-ignore upsert, but live migration, actual remote duplicate handling, RLS and embedding/retrieval quality were not executed. No local receipt should be used to claim those hosted gates complete.
