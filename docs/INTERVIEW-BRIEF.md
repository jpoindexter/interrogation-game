# Interview positioning and proof brief

User direction captured 3 October 2026. This brief guides the existing interview-story, portfolio and gameplay-evaluation cards. It does not claim the longer stories, adaptation experiment or collaboration example are already complete.

## Core story

Present Interrogation confidently as a game. Its central design problem is:

> How do you let an AI improvise while preserving facts, rules and a fair outcome?

Use **adversarial conversational design** as the framing, with red-teaming techniques where the project can demonstrate them. Explain meaningful decisions about improvisation, evidence, authority, player control, failure recovery and fair judgment. Show the entertaining exchange alongside the decisions that make the experience understandable.

Proposed connecting statement:

> I turn specialist knowledge into AI experiences people can use—and design the controls that make those experiences understandable.

Treat this as positioning supplied by the user, not a measured product outcome.

## Adaptation: implemented mechanism versus unproven outcome

The code contains an optional mechanism that retrieves questions associated with previous winning games and supplies them to later suspects. Current selection is narrower than all questions from wins: [patterns.ts](../src/lib/ai/retrieval/patterns.ts) selects questions linked to accepted clue or authored contradiction events. [service.ts](../src/lib/ai/retrieval/service.ts), [learning.ts](../src/lib/session/learning.ts) and the [suspect prompt](../src/lib/ai/prompts/suspect.ts) implement the retrieval-to-dialogue path. Retrieval is off by default and its live database/embedding quality evaluation is unfinished.

This supports an adaptation mechanism story. It does **not** establish that every play makes the game harder, that failed games drive improvement, or that the model retrains itself. Do not use those stronger claims until their specific behavior is implemented, demonstrated and measured. Recorded failed-game outcomes are not evidence that failures influence later suspects.

The evaluation task should demonstrate the complete loop: a finalized game creates an attributable record, a later game retrieves a relevant example, and the selected example reaches its suspect prompt. Compare retrieval off/on under declared matched conditions; preserve source questions, model/prompt versions, repeated-run policy, fairness/solvability, behavior changes and latency. Record failures and unchanged behavior as well as improvements. A demonstration of data flow alone is not proof of increased difficulty or improved player experience. This is a planned bounded experiment, not a request to run a large paid evaluation immediately.

## Interview format and breadth

Prepare two 15-minute stories around the connecting statement. This board owns the Interrogation story; the second story is outside this capture. The existing 3–5 minute walkthrough remains the short demonstration within the longer story, not the full interview presentation.

Place **Design Manager, Hiring Manager, Design Extractor and UXCheck** in a hiring-manager breadth overview. Each needs one clear purpose and one convincing, inspectable artifact, with deeper material available if asked. Purposes, artifacts and ownership evidence must come from the actual projects; none are invented in this brief. This is a presentation task, not authorization to change those applications.

Prepare one concrete collaboration example with PMs, researchers and engineers. Identify the actual situation, collaborators, Jason's contribution, a decision or disagreement, the resulting artifact and outcome evidence. Independent builds alone do not establish cross-functional collaboration. Missing examples remain an evidence gap; do not invent participants, research, metrics or shared ownership.

## Completion evidence

- A 15-minute Interrogation story makes the design decisions and tradeoffs inspectable and uses the approved framing.
- Each central claim links to a source, commit or observed behavior; demonstrations are labelled live, recorded or proposed.
- The breadth overview contains four verified purposes and four selected artifacts, with optional deeper links.
- The collaboration example has a real source and accurately attributes contributions.
- Adaptation claims stay bounded until the retrieval loop and its claimed effects are demonstrated and measured.
- The user reviews final role-specific framing and narrative before portfolio/interview publication.

## Delivery update — 3 October

The interview may be next week. Build this full case study in the existing portfolio in parallel with game fixes, updating evidence as implementation changes. The separate game website is deferred. This replaces the earlier requirement to wait for all game acceptance before starting the case study.
