# Interrogation — adversarial conversational design

A 15-minute interview story with a four-minute demonstration. This is a prepared speaking plan, not an executed timed rehearsal. Specific role and interview format remain unconfirmed. First-person language attributes product direction to Jason and implementation/evaluation assistance to coding agents; review that wording before delivery.

**The question:** How do you let an AI improvise while preserving facts, rules and a fair outcome?

**The audience should leave understanding:** Jason's design judgment about who controls a conversation, what counts as evidence, how an uncertain system recovers and what the execution record actually proves. The game is the vehicle for those decisions.

## Run of show — exactly 15:00

| Clock | Duration | Scene / artifact |
|---|---:|---|
| 00:00–01:30 | 1:30 | Game, design problem and personal contribution; title/briefing |
| 01:30–03:15 | 1:45 | Decision 1: separate performance from authority; control-boundary diagram |
| 03:15–05:00 | 1:45 | Decision 2: make evidence attributable; case file and disclosure rule |
| 05:00–09:00 | 4:00 | Decision 3: explain the route taken; short authored demonstration and result map |
| 09:00–11:00 | 2:00 | Decision 4: make waiting and recovery honest; observed failure and current generation trace |
| 11:00–12:00 | 1:00 | Bound the adaptation claim |
| 12:00–14:00 | 2:00 | What ran, what it establishes, next decision and ownership limits |
| 14:00–15:00 | 1:00 | One discussion question or prepared closing |

Read quoted text as speaker notes, not a script that must be recited verbatim. Artifact inspection, the demo and pauses occupy part of each slot. Keep the 09:00 transition even if the live provider is slow; use the labelled fallback below. Timing needs one real rehearsal before the interview.

## 00:00–01:30 — A game makes the design problem tangible

> “I built Interrogation for a hackathon. You play a detective questioning an AI suspect, compare their account with evidence, and accuse a specific lie. I kept it as a game because the decisions are tangible: you can challenge the conversation and inspect what happens.
>
> “The question I returned to was: how do you let an AI improvise while preserving facts, rules and a fair outcome? I describe that as adversarial conversational design. Red-teaming techniques help expose its failure modes, but I am not claiming this is a general security benchmark.
>
> “My contribution is the game concept, interaction direction and choices about evidence, player control and recovery. I made the original hackathon game, then used coding agents to help audit its history, implement revisions and run bounded checks. I am responsible for the direction and claims I show here; I am not claiming I manually authored every line or illustration.
>
> “The noir identity already worked for the concept. I kept the desk, files and interrogation setting, and concentrated the redesign on making the conversation's consequences understandable.”

**Show:** title or briefing. If using the historical title image, label its earlier provider/sponsor logos as historical; they are not a current provider claim or an award. Introduce the player task before architecture. [Framing and ownership brief](INTERVIEW-BRIEF.md); [Git history audit](audit/AUDIT.md).

## 01:30–03:15 — Decision 1: separate performance from authority

> “The player should be free to ask something unexpected. The suspect's answer is a performance; it cannot also be the final authority on what happened.
>
> “I separated three responsibilities. The player chooses the next question and when to accuse. The actor receives the public account and evidence already disclosed. A separate judge compares an accusation with the canonical case. The application owns accepted statements, attempts, time and the final result.
>
> “That distinction changed the retry design too. If a response is lost, repeating the same request can recover the accepted action. It must not quietly become a second question or spend another accusation. If provider work was interrupted and the result is unknown, the system says so and leaves the next attempt deliberate.
>
> “There is a cost: more state and recovery logic than a chat demo. I accepted that complexity to keep an already-earned outcome stable. A model still makes the first judgment, so this does not make judging infallible. It prevents a later call from casually rewriting it.”

**Show:** the portfolio's labelled editorial control diagram; point to player, server and model in that order. Explain a lost response in plain language rather than showing private logs. Source: [current architecture](ARCHITECTURE.md), [durable request/recovery contract](../database/LOCAL-DEMO.md), [executed result and export recovery](audit/MODULARITY-ACCEPTANCE.md). Do not imply an accusation can be undone: accepted terminal outcomes are preserved, not rolled back.

## 03:15–05:00 — Decision 2: evidence needs a source and a release rule

> “The earlier actor could see the private solution and was encouraged to leak inconsistencies. Literal filtering missed paraphrases. That made discovery depend too much on the model's performance.
>
> “I changed what the actor can see. It now starts with the public account. In generated Easy cases, the server releases a canonical case-file summary after three distinct substantive questions. Other difficulties use later thresholds. Stress does not unlock it, and model-written clue text cannot create accepted evidence.
>
> “This is a conscious tradeoff. A predictable release makes the case evidence available, but it is less spontaneous than persuading a suspect to reveal something. I have not established that counting questions is the most enjoyable pacing. Generated players can still accuse before the note appears; it is not an artificial permission gate.
>
> “The label matters too. A case-file summary is not a verbatim witness statement, and the question beside its release is not automatically the reason it was discovered. In authored practice, the interaction is more explicit: pin a statement and challenge it with a particular exhibit. I'll show that now.”

**Show:** case evidence origin and the distinction between generated release and authored exhibit challenge. Source: [actor boundary and all-difficulty policy](audit/ACTOR-DISCLOSURE.md). Controlled checks inspect outgoing actor requests; one real generated path establishes the third-question release. They do not establish immunity to guessing, hallucination or all instruction attacks.

## 05:00–09:00 — Decision 3: show why the route succeeded or failed

Open the authored LEDGER case in relaxed mode, prepared before the presentation. This is the **four-minute short walkthrough** inside the story. The exact original source is the [saved authored HTTP/Codex run](audit/evidence/local-http-gameplay-map.json).

Say at entry:

> “This is an authored fictional case in the local application. Its facts and opening are fixed; live suspect replies and judgment still use the signed-in Codex provider. I am showing the interaction, not generating a new case on stage.”

| Clock | Action and short narration | What to make inspectable |
|---|---|---|
| 05:00–05:40 | Read Casey's denial of returning after leaving at six. Pin the statement. “We have a specific claim to test.” | A statement belongs to an actual accepted exchange. |
| 05:40–06:30 | Select Morgan's badge record. “This names someone else. Treating it as evidence about Casey would be an attribution error.” | Unsupported exhibit feedback; no invented contradiction. |
| 06:30–07:20 | Compare Casey's visitor record at 18:42. “This challenges the denial of returning. It still does not prove theft.” | The exact statement/exhibit connection. |
| 07:20–08:10 | Make the narrow accusation about returning. If using the recording, include its preceding rejected role accusation. | A verdict about a false claim, not broad guilt inferred from a stressed response. |
| 08:10–09:00 | Open the result's conversation path. “This preserves supported findings, rejected accusations and neutral dialogue. It shows the route we took, not an invented ideal conversation.” | Expand one relevant exchange if presenting live; identify source and resulting finding. |

**Tradeoff to say while inspecting the map:** “I kept this compact. A large branching tree could imply the system knows which untried question was right. The map explains recorded consequences; it does not score every question or invent alternatives.”

**Honest fallback:** if a request is still pending after about 15 seconds within this slot, say, “The live reply is still pending. I'll switch to a recorded example so we can examine the decision.” Open [local `/rehearsal`](http://127.0.0.1:3187/rehearsal), whose banner says **Recorded · not live AI**. It contains real saved exchanges, not fresh answers to clicks. Do not describe switching pages as proof that an in-flight provider call was cancelled. If the local server itself is unavailable, use the saved trace or the portfolio's labelled diagram; `/rehearsal` still needs that server.

If you choose the recorded walkthrough from the start, replace the entry sentence with: “This is a recorded local Codex run of the authored case. Next and Back only navigate the captured exchanges.” Keep the same time slots. The rehearsal recording includes an unsupported exhibit, supported contradiction, rejected accusation, accepted accusation and debrief. [Fallback provenance and limits](audit/RECORDED-FALLBACK.md); [conversation-path implementation](audit/CLUE-SOURCES.md). Live browser expansion, keyboard interaction and video-call delivery still require Jason's check; HTTP data is not proof of those presentation behaviors.

## 09:00–11:00 — Decision 4: explain uncertainty without inventing progress

> “My first playthrough exposed a different problem: the app looked stuck while preparing a case, then returned an error. The spinner did not tell me whether it was writing, reviewing or failing.
>
> “I kept the noir presentation but made progress reflect server-reported stages and elapsed time. There is no invented percentage. Known failure offers a deliberate new attempt or authored practice; uncertain delivery preserves the original request so recovery does not silently generate another case. Practice still needs live AI for later dialogue, which is why I also kept a clearly labelled recording.
>
> “The failure also changed the underlying review. One real attempt failed after 77.144 seconds because its review evidence could not be validated. We did not retain the offending quotation, so I cannot tell you exactly which text failed. The correction lets the reviewer select allowed source IDs; the application resolves them to exact case text instead of trusting the model to retype a quotation.
>
> “After that correction, one generated case opened in 70.667 seconds. Mira denied being in the finance office at 10:20. After three questions, the case record named Tomas as having personally seen her there. A specific accusation about that location claim won, and the recovered result matched.
>
> “That is one successful run following a recorded failure, not a speed comparison or a reliability percentage. A real source can still be irrelevant. Preserving exact citations removes one failure class; it does not settle semantic fairness.”

**Show:** the unchanged user-provided BEFORE loading screenshot, then the portfolio's labelled condensed generated path. Do not call the diagram a current browser screenshot or an edited live recording. Sources: [initial wait and recovery](audit/GENERATION-RECOVERY.md), [77.144-second failure](audit/DISCLOSURE-LIVE.md), [v4 correction and 70.667-second full path](audit/GENERATED-REVIEW-V4.md), [public run](audit/evidence/disclosure-live-v4.json). The generated demonstration used public state, with no private answer reads during play.

## 11:00–12:00 — Adaptation is a hypothesis with an implemented mechanism

> “There is an optional adaptation path: later suspects can receive questions associated with accepted evidence events in earlier wins. It is off by default.
>
> “A controlled local check established eligibility: an unfinished session cannot claim a win, and client metadata cannot replace the accepted server outcome. Losses can be recorded, but they do not feed the current list of retrieved questions.
>
> “That is not model retraining, and I would not say every play makes the game harder. In fact, because evidence releases at a question threshold, the associated question may simply be the one that happened to arrive third. The next useful experiment is retrieval off versus on under matched conditions: does behavior change, does the case remain solvable, and does that change help the experience?”

Source: [pattern acceptance](audit/PATTERN-ACCEPTANCE.md), [adaptation brief](INTERVIEW-BRIEF.md). Live embeddings/database retrieval and an effect on later play remain unverified. Present the comparison as proposed work, not completed research or authorization for a large evaluation batch.

## 12:00–14:00 — What I can defend, and what I would do next

> “The contribution I want to make visible is the decision structure: who gets the facts, who can change the record, what the player can challenge and what survives a failure.
>
> “The execution evidence is specific. An authored path exercised wrong and supported evidence, wrong and correct accusations, then recovered the canonical result. One generated public path reached a supported win. A clean checkout followed the documented setup and recovered its result after a process restart. Those are useful prototype results. They are not evidence of adoption, enjoyment or a production service.
>
> “The same public game routes also support a local agent command interface. That gives an agent a way to inspect state and take ordinary game actions, without a privileged answer or separate win rule. It helped make the interaction contract inspectable. I am not claiming an autonomous red-team campaign.
>
> “The next experience decision is pacing and comprehension. I would ask another person to play a short case, then explain why the evidence supports—or fails to support—their accusation and what they would do after an interrupted reply. I would observe that before claiming the new disclosure rule makes the game more fun. Browser, voice and shared-screen delivery also need their actual rehearsal.
>
> “This is an independent project with AI assistance. It shows my product and interaction decisions. For how I work with PMs, researchers and engineers, I would use a separate, sourced collaboration example rather than imply a team existed here.”

**Pause on the result map:** let the interviewer identify the finding before adding technical detail. Sources: [modularity/critical route acceptance](audit/MODULARITY-ACCEPTANCE.md), [fresh-checkout restart](audit/FRESH-CHECKOUT.md), [agent controls](AGENT-CONTROL.md), [live agent record](audit/evidence/agent-control-live.json). One plugin speech sample is not integrated microphone/playback acceptance; [voice evidence](audit/ELEVENLABS-LIVE-CHECK.md). Subsequent [dialogue polish](audit/DIALOGUE-POLISH.md) is three narrow live calls, not another full run or a measured naturalness improvement.

## 14:00–15:00 — Invite a focused discussion

Choose one question:

> “Where would you want the player to have more control: when evidence arrives, how an accusation is judged, or how the result is explained?”

Let the answer guide a discussion of the relevant tradeoff. If there is no discussion, close with:

> “I turn specialist knowledge into AI experiences people can use—and design the controls that make those experiences understandable. In this game, that means leaving room for improvisation while making facts, evidence and consequences inspectable. The current prototype demonstrates those boundaries in specific executed paths; the next step is learning whether players understand and enjoy them.”

## Likely follow-ups — reference notes, outside the timed story

| Question | Short answer to retain |
|---|---|
| Why use AI at all? | Open questioning and responsive performance. The rules, counters, evidence release and saved result use deterministic code; not every part benefits from generation. |
| What makes this red teaming? | Deliberate unsupported accusations, misleading attribution and instruction attacks probe the conversation boundary. Use the retained [rule sample](audit/RULE-ACCEPTANCE.md) for what actually ran; distinguish its older context from the current actor design. No universal jailbreak-resistance claim. |
| Why not give the actor the full solution? | That earlier access exposed secrets through paraphrases. Public-only context reduces privileged disclosure but cannot prevent every inference or hallucination. |
| Why release evidence after three questions? | A deliberate Easy-mode solvability/pacing rule. It supports predictable access, not proof that a particular question caused discovery. Enjoyment and optimal thresholds are unmeasured. |
| Is the outcome fair? | The server preserves an accepted outcome; semantic judgment and case review remain fallible. The claim is supported behavior in declared runs, not universal fairness. |
| What did AI do versus you? | Coding agents assisted audit, implementation and checks. Jason supplied the concept, experience direction and requested changes, and owns the decisions he can explain. Do not invent manual implementation, research or collaborators. |
| Can I use it on Vercel? | The demonstrated game is local. A hosted OpenAI adapter exists, but shared persistence and actual hosted acceptance remain unfinished. The portfolio case study is separate from deploying the game. |

## Publication and evidence gaps

The full case study was built in the existing `jason.theft.studio` portfolio in parallel; it no longer waits for every game acceptance item. The current inspected portfolio narrative/evidence index uses game source `63e98d4` and the same v4, recovery and adaptation boundaries as this story. This document is not a public deployment claim. The separate game website is deferred.

Before delivery, fill only real missing evidence: confirmed interview role/format, a timed run of this presentation on the actual shared screen, integrated voice if it will be used, and one sourced cross-functional collaboration example (situation, actual participants, Jason's decision, artifact and observed outcome). The four other-app breadth artifacts remain a separate overview task in the [brief](INTERVIEW-BRIEF.md); this story does not pretend they are assembled here.

Edit note: replaced the short-only narrative with a timed decision story; retained the four-minute demo; replaced stale v2-only/current-voice/setup assertions with scoped current evidence; removed the obsolete “portfolio follows game acceptance” gate. No invented user research, collaboration, business impact, causal adaptation or latency improvement.

Skills applied: use, ai-agent-case-study, case-study-storytelling, case-study-writing, folio-proof-check.
