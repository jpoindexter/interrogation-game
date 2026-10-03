# Dialogue delivery and verdict wording

The real [v4 public playthrough](evidence/disclosure-live-v4.json) exposed two presentation defects: the suspect repeatedly used “I can’t confirm” and finally referred to “the information here”; the judge called a generated case's false claim an “authored lie.” The playthrough still reached a supported accusation and consistent result, but those phrases weakened the fictional interview.

## Trace and correction

The suspect acting prompt explicitly directed missing facts to “say you cannot confirm it or return to your recorded account,” which encouraged a repeated formula. The replacement retains the factual boundary but asks the actor to respond as a person in the scene: challenge a premise, request the named record, or hold a relevant position without adding an alibi. It asks for the new part of each question to be addressed before briefly restating an existing claim. Delivery suggestions are choices, not scripts to recite. References to missing context, information access and model/rule machinery are prohibited in spoken dialogue.

The cagey-phase prompt also invited “precise but IRRELEVANT details.” That conflicting instruction now permits precision about an already supplied claim/record or a pointed clarifying question, and prohibits an invented fact, denial or alibi. Other difficulty/phase choices remain intact.

The judge prompt itself used “authored lie.” It now says “designated false claim,” asks for one plain factual explanation, and excludes authored/generated/model terminology from the player-facing explanation. A successful confession must stay within canonical conduct; identifying a false claim is not automatically proof of the entire crime.

Only `suspect-text.json`, `adaptive-text.json` and `judge.ts` changed. The public actor-context allowlist, private-fact guard, disclosure policy, server outcome authority and judge acceptance threshold did not change. No canned replacement response was added.

## Executed scope

Four existing focused checks in `case-disclosure.test.ts` and `ai-judgment-history.test.ts` passed. They cover public actor context, exclusion of private facts for direct/legacy callers, deterministic accepted-question disclosure and canonical accusation history. Scoped strict lint, prompt size/complexity and TypeScript passed. These checks protect the factual boundary; they do not prove natural live phrasing.

## Bounded live observation

Exactly three authorized local Codex adapter calls ran on the same already-public case: two suspect replies recreating the pre-disclosure questions, followed by one judgment using the public terminal facts and recorded accusation. No new case, private answer read, voice call, browser action or automatic retry occurred. Source hashes were unchanged during inference; actual provenance reports `codex-local` / `gpt-6.1-sol` and the per-call prompt hashes.

- First reply (13.680s): “I’m holding to what I said: I wasn’t in the finance office at 10:20 on Tuesday. Show me Tomas’s signed statement, and we can compare what he says about that time with my account.”
- Second reply (14.317s): “How I know Tomas isn’t a substitute for what he actually saw. Check whether his statement says he personally saw me at 10:20 on Tuesday, and where, or whether he’s drawing a conclusion about my location.”
- Judge (17.357s): accepted the specific location claim, explained the contradiction with the dated personal observation, and avoided “authored”/“generated.” Its confession admitted the canonical presence/document possession while explicitly saying that admission alone did not establish theft.

The two replies used different deflections, did not invent an alibi or a relationship detail, and omitted the prior model/context wording. The first still repeats the relevant denial; this was a direct challenge to that claim, not a blanket claim that repetition has disappeared. The second avoids answering an unknown relationship rather than filling the gap. These are qualitative observations from one known case, not evidence of broad naturalness, prompt-attack resistance or judge accuracy. The check used the real adapters and prompts, not browser/server-session playback; the earlier v4 playthrough remains the end-to-end disclosure/outcome evidence.

[Predeclared inputs and criteria](evidence/dialogue-polish-live.expected.json), [three observed outputs](evidence/dialogue-polish-live.json), and [original raw capture](evidence/dialogue-polish-live.raw.json) are retained. One harness metadata bug reused the mutable history array in the final manifest: `initialHistory` grew from four to eight entries. The readable evidence restores that field from the immutable pre-call manifest and explicitly records the correction; observed outputs/timings are unchanged. The [exact executed harness](evidence/dialogue-polish-harness.executed.ts.txt) matches the recorded hash. The [reusable snapshot](evidence/dialogue-polish-harness.ts.txt) subsequently clones that field and validates the spoken-response type; a zero-call dry run and TypeScript passed, with no inference rerun. Both snapshots are text artifacts, outside application compilation.
