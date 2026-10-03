# Interrogation: making AI dialogue playable

Interview draft for a 3–5 minute walkthrough, to sit within the requested 15-minute Interrogation story. [The current user brief](INTERVIEW-BRIEF.md) supplies the framing, adaptation limits, breadth overview and collaboration requirement. The specific role/interview logistics remain unspecified. Ownership framing: Jason made the original hackathon game; this revision uses AI-assisted implementation and evaluation. Do not imply every asset or line was personally authored, or that player research occurred.

## Spoken narrative

“I built Interrogation for a hackathon: a noir detective game where you question an AI suspect and try to expose a lie. Revisiting it, the interesting product problem was how to give the player room to experiment while keeping the rules understandable and the outcome credible.

The atmosphere was already strong: warm desk light, cold interrogation rooms, paper files and a cassette-style briefing. I wanted to preserve that identity and make the interaction easier to follow. The history shows the original game evolving toward explicit accusations, clearer win conditions and evidence collection. This revision carries that idea further.

The first decision was to make the player’s reasoning visible. Instead of only sending another message, you can pin a statement, clarify it or challenge it with a specific exhibit. In the demo case, Casey says they left at six and never returned. One record names somebody else; another records Casey arriving at 18:42. Those are different kinds of evidence. The useful interaction is seeing why one challenges the statement and the other does not. Even the valid record establishes presence, not theft.

The second decision was to separate the suspect’s performance from the game’s authority. The model can improvise an answer, but its prose cannot award a win or invent accepted evidence progress. The application owns the session and validates changes. A separate judge evaluates an accusation; the server commits an accepted result. The result view preserves the actual conversation path, including unsuccessful challenges, so the player can inspect how they got there.

That separation also matters when something fails. A retry should not silently become another question or spend another attempt. Completed results can be recovered from the session, rather than depending entirely on browser storage. The intention is to let someone stay focused on the investigation instead of managing the system.

The biggest course correction came from evaluating generated cases. A plausible story could contain another false statement, conflicting roles or evidence that didn’t establish the claimed fact. I added a structured consistency review, but it still accepted an unsupported inference from a phone to its owner in a small evaluation. That changed the demo strategy: use an authored fictional case for a repeatable demonstration, and treat generated-case fairness as continuing work.

The third decision was to make the same game controllable by another agent. A local command interface can read public state and take one action through the same routes as the player. It doesn’t receive the hidden answer or a privileged way to win. That gives me a practical way to inspect the interaction contract as well as the screen.

The local command path has run against the signed-in Codex provider. One measured question took about ten seconds including command startup, so I’m not presenting this as instant conversation. The next experience check is the live browser and voice rehearsal, which I’ll do separately. What this project demonstrates today is a working local interaction with inspectable evidence and bounded AI behavior, alongside an explicit record of what still needs validation.”

## Demo sequence

Planned timing, not a recorded usability result. Use the authored LEDGER case in relaxed mode; combine the short actions with the narrative above.

1. **0:00–0:45 — Orient:** show the briefing and narrow objective: identify the false claim.
2. **0:45–2:15 — Investigate:** open the account, pin the departure statement, compare Morgan’s badge record with Casey’s visitor record. Explain the different feedback.
3. **2:15–3:30 — Resolve:** accuse the denial of returning, explicitly distinguishing presence from theft. Inspect the result’s conversation path and sources.
4. **3:30–4:30 — Explain the boundary:** show the local agent interface or its captured run; describe the generated-case finding and next validation step.

Use [the local demo guide](LOCAL-DEMO.md) for exact setup. If using `/rehearsal`, introduce it as a **recorded example**. The browser sequence above remains a user-owned live check; HTTP evidence does not establish its visual or audio presentation.

## Claim ledger

| Claim | Evidence and boundary |
| --- | --- |
| This builds on the original game. | **Recorded history:** 98 baseline commits through `f8d4c3c`; `43934f0` introduced server sessions, `b8aaf0e` clarified the win condition, `217c9f0` gated accusations on clues. This is evolution, not an entirely new concept. |
| The evidence-led local loop has run. | **Executed:** [HTTP playthrough](audit/evidence/local-http-gameplay.json) records opening, pin, unrelated/supported exhibits, wrong/right accusations and recovered result. One authored case does not prove general fairness. |
| An agent can use the public game contract. | **Executed:** [agent controls](AGENT-CONTROL.md) and [live record](audit/evidence/agent-control-live.json); one Sol inference, 10.197 seconds. Not an autonomous campaign or latency average. |
| Generated-case review is incomplete. | **Executed:** [v2 calibration](audit/GENERATED-REVIEW-V2.md), 6/8 complete diagnostic matches, including a material false acceptance. No reliability percentage claimed. |
| Implementation checks are recorded. | **Executed:** [297-test integrated gate](audit/evidence/current-verify.txt); subsequent CLI/UI [production build](audit/evidence/demo-checkpoint-build.txt). The full suite was not rerun for that later increment. Checkpoints: `96ad39d`, `a20d253`. |
| Voice and presentation need acceptance. | One [ElevenLabs plugin sample](audit/ELEVENLABS-LIVE-CHECK.md) ran; the game server lacks its API key. Browser, microphone, playback and video routing remain user-owned checks. No deployment or player-outcome claim. |

Editorial boundary: website/portfolio integration follows game acceptance. Confirm the first-person wording before delivery; no invented role, user research, adoption or impact metrics.

Skills applied: ai-agent-case-study, case-study-storytelling, case-study-writing.
