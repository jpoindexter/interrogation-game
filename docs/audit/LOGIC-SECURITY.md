# Deep game logic, AI reliability, persistence and security audit

Date: 2026-10-03. Repository: `/Users/jasonpoindexter/Documents/GitHub/INTERIGATION`.

Audit-only: no application changes, real provider calls, database writes, browser access or deployment. Nine additional mocked checks ran successfully through actual TypeScript route/session/parser modules via an isolated transpilation harness. They prove the enumerated route behaviors under the injected responses; they do not prove current provider quality, UI runtime, live DB policy or Vercel routing behavior.

Skills matched (3): code-review, agent-reliability-and-guardrails, dec-quality-testing. Installed skill inventory was enumerated; no `use/SKILL.md` was found in the installed skill roots searched. Generic design-system checks in code-review were not imposed on this backend audit. No memory context was needed for this delegated evidence audit.

Evidence files: `docs/audit/evidence/logic-checks.cjs`, `docs/audit/evidence/logic-check-results.json`. Root evidence reviewed: `docs/audit/evidence/server-checks.cjs`. Original eight root findings are corroborated by source; none disproved. Root execution claims below are attributed to root rather than represented as supplementary execution.

The most urgent gameplay defects are clue-state divergence, timer-expiry closure freshness, invalid model results consuming player attempts, contradictory scoring clocks and missing recoverable terminal state. These directly threaten the local interview demo. Public abuse controls can follow the demo-critical fixes, but must precede a public Vercel launch. Keep the noir identity; improve the correctness of the experience before adding more AI complexity.

## Executed supplementary checks

- Unearned win evaluation accepted and session deleted: `{"status": 200, "disclosedMockSecret": true, "sessionDeleted": true}`
- Timeout export misclassified as exhausted accusations: `{"storedOutcome": "lose_accusations"}`
- Repeated clue reaches server cap while client has only one clue: `{"server": 2, "clientRuleCount": 1}`
- Fresh easy session can submit an expert win learning record: `{"status": 200, "storedDifficulty": "expert", "storedOutcome": "win"}`
- Accusation remains accepted two hours after start: `{"status": 200, "remaining": 2}`
- Truth-leak filter flags exact cover story denial: `{"blocked": true}`
- Case schema accepts blank fields and unsupported difficulty: `{"accepted": true}`
- Malformed judge response spends a real accusation as wrong: `{"status": 200, "correct": false, "attemptsLeft": 2}`
- Suspect TTS validates only prefix and accepts appended arbitrary text: `{"status": 200, "mockedProviderReceivedSuffix": true}`

## LOGIC-01 — Make clues unique, durable and consistent between client and server

Priority: P1. Evidence status: **executed**.

Local: P1, can permanently prevent accusation. Hosted: P1, same correctness issue.

Evidence: app/api/interrogate/route.ts:109-151; app/game/page.tsx:193-201; app/game/components/Dock.tsx:43-44; src/lib/mistral/interrogate.ts:299-306,329-335. Mocked two identical clues produced server count 2, client deduplicated count 1. Root separately proved filtered clue increments and raw leak persists.

Recommended change: Persist clue IDs and full accepted clue events. Validate/filter before any state mutation; store exactly the displayed assistant text. Send available/revealed clue IDs to the model and return authoritative clue state to the client. Avoid deriving clue progress from generated text.

Acceptance: Repeat a clue, return a blocked secret, and retry a turn: each accepted clue counts once, blocked clues count zero, transcript equals shown response, and all difficulties can reach accusation. Verify filtered and lawyer-up responses can be spoken by TTS.

## LOGIC-02 — Repair countdown callback capturing the initial empty game

Priority: P1. Evidence status: **code-path**.

Local: P1 demo-ending risk. Hosted: P1. Runtime browser path not executed.

Evidence: app/game/page.tsx:151 registers onExpire(() => handleTimeUp()) with [onExpire]; app/game/hooks/useGameTimer.ts:68 memoizes onExpire forever; useEndGame.ts:28-60 captures caseData/history; lose/page.tsx:101 reads result.caseData.setting.

Recommended change: Keep the expiry callback current via a ref or correct dependencies. Make the loss transition use the authoritative current session and validate persisted result shape before rendering.

Acceptance: With fake timers and a rendered game, generate a case, ask two questions, then expire countdown: final result retains case/session/transcript and loss screen renders without crash.

## LOGIC-03 — Give each session an explicit terminal state and authoritative outcome

Priority: P1. Evidence status: **executed**.

Local: P1 recovery/race risk. Hosted: P1 game integrity/cost risk. Mocked evaluation proves missing authorization gate, not live model behavior.

Evidence: game-session.ts:7-26 has no lifecycle state. evaluate/route.ts:31-48 trusts body.type and deletes session. accuse/route.ts:26-35 omits deadline/terminal-state checks. Executed fresh-session win evaluation returned 200 and deleted session; accusation at start+2h returned 200. These are actual route modules with mocked AI.

Recommended change: Model briefing, active, won, lost and finalized states; persist terminal reason and accepted accusation once. Gate every action; derive result type from state. Make finalization idempotent and use a common per-session transaction/lock.

Acceptance: Early win evaluation, accusation after expiry, interrogation after win/lawyer-up, repeated finalize, and simultaneous question/finalize all preserve one valid terminal result.

## LOGIC-04 — Return the same score and time semantics everywhere

Priority: P1. Evidence status: **code-path**.

Local: P1 visible score credibility. Hosted: P1 fairness. Root executed question count including accusation; timing/display discrepancy is source traced.

Evidence: game-session.ts:63-65,148-151,167-172 measures wall time since generation and includes accusation user messages; useGameTimer.ts:38-70 ticks only active/non-speaking time; game/page.tsx:230 excludes accusations from questions; win/page.tsx:43-54 computes local score while leaderboard/route.ts:41-71 recomputes server score.

Recommended change: Choose active gameplay time versus wall time explicitly. Start clock on accepted Begin; track pause semantics centrally. Freeze a single score breakdown on win and render/store it without client recomputation. Count question event types, not string prefixes.

Acceptance: Spend time on briefing, slow AI, TTS, and wrong accusation; win screen, saved history, export and leaderboard show identical time/count/score under the chosen rules.

## LOGIC-05 — Respect Unlimited mode and define one timer policy

Priority: P1. Evidence status: **executed**.

Local: P1 long interview demo interruption. Hosted: P1 mismatch.

Evidence: app/api/interrogate/route.ts:23-26,74-85 ignores session.timerMode; game-session.ts:25,71 stores it. Root executed easy Unlimited session at 601s returning timeExpired:true.

Recommended change: Use session timer mode and a shared policy. If Unlimited retains an operational cap, label it accurately. Separate active time and provider time; ensure accusation/finalization follows the same deadline.

Acceptance: All four difficulties in both modes obey documented elapsed thresholds and remain consistent with the displayed timer.

## LOGIC-06 — Treat malformed AI judgments and provider failure as retryable errors

Priority: P1. Evidence status: **executed**.

Local: P1 unfair loss/score penalty. Hosted: P1.

Evidence: src/lib/mistral/evaluate.ts:83-89 converts malformed JSON to correct:false; sanitize-response.ts:10-15 coerces missing correct to false; accuse/route.ts:51-52,75-78 increments used and refunds only remaining count. Executed malformed response returned 200 wrong and left 2 attempts; root provider error retained accusationsUsed=1.

Recommended change: Use strict discriminated output schemas, separate invalid output from a valid wrong verdict, and commit accusation/stat changes only after valid accepted judgment. Use bounded retry with stable action ID.

Acceptance: Malformed JSON, empty object, null, timeout and provider error leave attempts and score unchanged; a valid incorrect judgment consumes exactly one attempt.

## LOGIC-07 — Make win redemption atomic, idempotent and retryable

Priority: P1. Evidence status: **executed**.

Local: P1 lost success record if demo includes leaderboard. Hosted: P1 duplicate/irrecoverable submission.

Evidence: game-session.ts:192-208 consumes token map then allows session fallback; leaderboard/route.ts:41-48 consumes before insert at75-93. Root executed token accepted twice while session alive and 500 then 401 after failed DB write with session deleted.

Recommended change: Replace parallel token sources with one durable terminal result and a unique result/session ID on leaderboard. Perform redemption and write atomically, and return the prior success on duplicate request. Preserve retries on known failed writes.

Acceptance: Concurrent double submission makes one row; DB failure then retry succeeds; process restart preserves retry; exact repeated submission returns the same result.

## LOGIC-08 — Make leaderboard submission status and retry visible

Priority: P1. Evidence status: **code-path**.

Local: P1 if leaderboard is part of demo; otherwise P2. Hosted: P1 invisible failure.

Evidence: app/game/win/page.tsx:173-180 sets leaderboardSubmitted before response, ignores HTTP status and returned canonical score, omits cluesFound and user DB headers.

Recommended change: Use idle/saving/saved/error states. Check response status/schema; show retry without losing initials; use the canonical score/result. Do not require public leaderboard for the local demo.

Acceptance: Mock 401, 500, offline and delayed responses: show truthful state and successful retry, no false saved indicator, and exact clue count.

## LOGIC-09 — Replace keyword secret blocking with tested disclosure rules

Priority: P1. Evidence status: **executed**.

Local: P1 evasive/broken dialogue and unfair dead ends. Hosted: P1 same.

Evidence: sanitize.ts:89-101 checks overlap with the_lie as well as truth; interrogate/route.ts:143-151. Executed exact cover-story denial "I never accessed the vault at midnight." was flagged as leaked secret. sanitize.ts:24 separately blocks harmless "What were you told about the security alarm?" (root executed).

Recommended change: Separate allowed cover-story facts, earned contradictions and hidden solution facts. Keep deterministic output restrictions for internal metadata; use a evaluated disclosure policy rather than blanket lexical overlap. Narrow injection heuristics using benign/adversarial fixtures.

Acceptance: Dataset includes cover-story repetition, normal investigation questions, earned clues, direct leaks, paraphrase leaks and injection attempts; report false positives/negatives and preserve legitimate dialogue.

## LOGIC-10 — Keep learned patterns authoritative and versioned

Priority: P1. Evidence status: **executed**.

Local: P2 unless learning is showcased; hosted: P1 integrity/prompt poisoning.

Evidence: patterns/route.ts:20-63 trusts client difficulty/outcome/questions instead of stored events; usePatterns.ts:18-22 labels latter half of questions effective from final stress. Executed brand-new easy session saved an expert win with fabricated effective question.

Recommended change: Derive patterns from finalized server events only. Record causal per-turn stress/clue changes, accepted outcome, case/model/prompt version and evidence. Do not call second-half questions proven effective. Disable cross-session adaptation until evaluated.

Acceptance: Fresh/unfinished session cannot submit win; wrong difficulty/outcome ignored; repeated export remains one record; effective questions trace to actual accepted clue/stress events.

## LOGIC-11 — Persist correct loss reasons and stop labeling all losses as timeout

Priority: P2. Evidence status: **executed**.

Local: P2 incorrect debrief; hosted: P1 contaminated analytics/training records.

Evidence: evaluate/route.ts:41-45 inspects last assistant text instead of explicit event; useEndGame.ts:64-77 inserts user marker followed by assistant reply; patterns/route.ts:8 excludes lose_lawyer; mistral/evaluate.ts:162 always says ran out of time. Executed timeout exported lose_accusations.

Recommended change: Persist reason at terminal transition and pass it to debrief and learning/export. Include lawyer-up consistently in type/schema. Use actual difficulty on loss (lose/page.tsx:74 uses missing query default medium).

Acceptance: Win, three wrong attempts, expiry, give-up and lawyer-up persist and render distinct correct outcomes/difficulty.

## LOGIC-12 — Add session checkpoint and result recovery suitable for local demo and Vercel

Priority: P1. Evidence status: **code-path**.

Local: P1 refresh/restart/demo recovery. Hosted: P1 instance routing/redeploy failure.

Evidence: game-session.ts:34-46 stores state/tokens/locks only in process global maps; game/page.tsx:107-132 always generates a case on mount; evaluate/route.ts:48 deletes session; win/page.tsx:117 and lose/page.tsx:83 reevaluate on each mount.

Recommended change: Use a storage adapter: local SQLite or durable file DB for demo and durable hosted store later. Persist current session and terminal result; resume by session ID. Reopening result should read cached result, not pay for reevaluation or erase evidence.

Acceptance: Refresh active game, restart local server, revisit result page and route requests through two server instances: same case/progress/result recovers and no duplicate provider evaluation.

## LOGIC-13 — Give every expensive action a deadline, cancellation and idempotency key

Priority: P1. Evidence status: **code-path**.

Local: P1 delayed response can leave demo processing or duplicate a question; hosted: P1 duplicated costs/actions.

Evidence: game/components/utils.ts:32-40 only aborts client fetch; game/page.tsx:172 retries identical POST without action ID. mistral/client.ts:3-9, interrogate.ts:338-342 and tts/route.ts:107-123 show no application-level deadline/cancellation. Locks release only when awaited call settles.

Recommended change: Propagate cancellation where provider supports it; set bounded per-operation deadline and output budget; persist idempotency keys/result replay; handle ambiguous timeout by querying action status. Retry only retryable errors.

Acceptance: Delay response beyond 15s, disconnect after server acceptance, retry and cancel: one accepted turn and one chargeable operation where provider semantics permit, with visible recoverable status.

## LOGIC-14 — Validate and authorize the entire text sent to ElevenLabs

Priority: P2. Evidence status: **executed**.

Local: P2 cost/control; hosted: P1 billable proxy abuse.

Evidence: tts/route.ts:68-75 skips validation for detective role and tests only text.slice(0,80) for suspect. Root executed detective arbitrary text; supplementary test executed approved 80-character prefix plus unapproved suffix reaching mocked fetch.

Recommended change: Accept server-owned utterance ID; load exact approved dialogue/briefing/terminal text from the session, voice and stress included. Cache generated audio and enforce per-session character/cost caps.

Acceptance: Arbitrary detective text and appended suspect suffix get 403; exact approved utterances work once/cached; sanitized fallback and lawyer-up line are valid utterances.

## LOGIC-15 — Fix rate-limit keys and add separate per-session spend budgets

Priority: P2. Evidence status: **executed**.

Local: P2 default request identity ineffective and interactive endpoint budgets interfere; hosted: P1 cost/abuse boundary.

Evidence: rate-limit.ts:19-20 generates new identity when headers absent (root executed);24-33 uses same IP bucket for differing endpoint limits; state is process memory. Generate-case, embeddings, judging, STT and TTS lack aggregate session cost cap.

Recommended change: Separate trusted proxy identity parsing from local mode, use route/user/session namespaces, stable fallback, shared hosted counters and request/concurrency/token/audio/cost limits. Add operator stop switch.

Acceptance: Missing headers share documented restrictive budget; question requests do not consume leaderboard quota; limits hold across two instances and retries; no provider call begins after cap.

## LOGIC-16 — Close public database write bypasses and version the schema

Priority: P1. Evidence status: **code-path**.

Local: P2 when disconnected; hosted: P1 direct DB write bypasses all API win checks. Live RLS was not inspected; this finding is against the documented setup.

Evidence: README.md:208-210 grants unrestricted public leaderboard insert;253-255 grants anonymous pattern insert/read;src/lib/db.ts:4-10 uses anonymous client;exportSession:251-268 upserts with only INSERT export policy documented at README:230-232.

Recommended change: Create checked-in migrations with constraints and unique session/result keys; public read only where intentional, authenticated server-only writes. Test insert/upsert permissions using anon and privileged roles. Verify vector extension/RPC setup too.

Acceptance: Anonymous direct insertion of forged leaderboard/pattern rows is denied, app trusted write succeeds, duplicate/session constraints hold, exports remain private; fresh DB setup applies from migrations.

## LOGIC-17 — Remove request-controlled database destinations from hosted routes

Priority: P2. Evidence status: **code-path**.

Local: P2 unnecessary BYO complexity; hosted: P1 request-directed server egress/SSRF risk. No SSRF exploit/network request executed; platform egress restrictions unknown.

Evidence: src/lib/db.ts:15-19 accepts x-supabase-url/key and creates a server client to that URL;used by leaderboard,patterns,generate-case. URL target is neither allowlisted nor restricted to operator config.

Recommended change: Use operator-owned server configuration. If BYO remains a product requirement, validate allowed HTTPS hosts and prohibit private/internal addresses with enforced egress controls; do not mix user DB and trusted leaderboard authority.

Acceptance: Headers cannot change server DB destination; localhost, private IP, unexpected protocol and redirect targets are rejected without outbound call.

## LOGIC-18 — Validate generated cases as playable content rather than string shapes

Priority: P1. Evidence status: **executed**.

Local: P1 broken random demo case; hosted: P1 same.

Evidence: sanitize.ts:130-150 accepts empty strings, arbitrary difficulty and nonstring trigger entries converted to empty strings;generate-case/route.ts:33 requires only truthy prevalidation the_lie. Executed validator accepted all blank strings and difficulty=impossible.

Recommended change: Strict case schema plus minimum semantic requirements: requested difficulty enforced, nonempty facts/leads/triggers, consistent timeline, discoverable contradiction, bounded hints. Ship one reviewed stable demo case and validate generated cases before activation.

Acceptance: Reject empty/missing/malformed fields and unsupported difficulty; each approved case passes scripted evidence-to-correct-accusation playthrough; impossible cases never start.

## LOGIC-19 — Stop rejudging a won case and ground the debrief in immutable evidence

Priority: P2. Evidence status: **code-path**.

Local: P1 possible interview contradiction between win and explanation; hosted: P2.

Evidence: mistral/evaluate.ts:93-143 asks second model to judge win again;win/page.tsx:117-120 ignores returned correct field;case secrets and reveal clue are generated rather than canonical. No judge output schema enforces cited evidence IDs.

Recommended change: Freeze verdict at accepted accusation. Reveal canonical facts without generation; generate optional narrative from immutable evidence IDs and validate citations. Separate entertainment prose from authoritative result.

Acceptance: Second model cannot reverse verdict or change truth; every quoted closest moment matches actual transcript; debrief still renders canonical facts if model is unavailable.

## LOGIC-20 — Make completion exports reliable and observable

Priority: P2. Evidence status: **code-path**.

Local: P2 silent missing history; hosted: P1 if exports are part of learning/proof.

Evidence: game-session.ts:242-270 launches unawaited Supabase upsert and only logs returned error;evaluate route deletes session immediately afterward. db.ts:10 placeholder client still performs network when used;README:170 says completed games are persisted.

Recommended change: Persist terminal event and outbox locally before returning; use await or durable background processing with retry/error visibility. Make unconfigured DB an explicit disabled adapter, not a placeholder host. Document retention and avoid raw secrets/transcripts in routine errors.

Acceptance: DB outage and process shutdown retain pending export; resume produces one complete export; demo without DB performs no placeholder network call and reports local-only persistence.

## LOGIC-21 — Build a repeatable gameplay and adversarial evaluation suite before model migration

Priority: P1. Evidence status: **proposal**.

Local: P1 migration/demo confidence; hosted: P1 same. Proposed suite has not been implemented.

Evidence: package.json scripts contain no test command; no committed gameplay tests found. Prompt asks model to infer stress, clues, denial and judging; existing mocked tests expose mechanics independent of model quality.

Recommended change: Use contract fixtures for adapters, behavioral state-machine tests, curated small case set, correct/near-miss/wrong accusation labels and deterministic replay. Measure winability, secret disclosure, false blocks, latency, voice fallback and failure recovery across old/new models. Retain root/supplementary reproductions as regression fixtures.

Acceptance: One command runs offline mechanics tests; explicit opt-in bounded provider eval produces model/prompt version, cases, pass rates, latency and cost. Browser journey proves start→voice/text→clues→accuse→debrief with disconnect recovery.

## LOGIC-22 — Preserve source evidence and narrow security/learning claims

Priority: P2. Evidence status: **proposal**.

Local: P1 interview credibility; hosted: P2 documentation accuracy.

Evidence: README.md:154,160,164,166 claims leak prevention/single-use/TTS restriction/poisoning defense beyond reproduced guarantees;272 describes export feedback loop;usePatterns.ts:18-22 uses heuristic effect attribution.

Recommended change: Present hackathon controls as initial defenses, identify measured versus intended behavior, and describe RAG as retrieval-based adaptation rather than trained learning. Link accepted improvements and executed evidence. Avoid promises of reliable lie detection or real interrogation training from game performance.

Acceptance: Every interview/README claim has a source or executed demonstration; no claim of security, live learning or production persistence relies only on intended code.

## Additional constraints and disconfirming observations

- The direct premature evaluation response does not grant a leaderboard win token. It still permits early reveal, session destruction and avoidable model spend; do not describe it as an arbitrary leaderboard win exploit.
- Existing win/session IDs use strong randomness and token comparison is timing-safe. The defects are lifecycle/consumption semantics, not weak randomness.
- Model responses already strip `caught` to false, cap strings/stress and omit internal_state; client-facing case sanitization strips known solution fields. Preserve these useful boundaries while replacing weak validation.
- A user-supplied Mistral API key does not inherently let an attacker proxy the official Mistral SDK endpoint. The code comment making that claim is not evidence of such an exploit.
- Request input strings, upload size and key routes already have some limits. The finding is inconsistent/evadable aggregate enforcement, not an assertion that every request is unbounded.
- In-memory state can serve a single uninterrupted local Node process. Multi-instance Vercel failure remains a source-derived deployment risk, not observed production failure.
- Server-side secret filter can reject legitimate cover-story denial and still miss paraphrased disclosure. Neither a secret leak rate nor a jailbreak success rate was measured against a real model.
- An active case bearer session is currently the only app authorization boundary. For the explicitly single-user local demo, a large account/authentication system is unnecessary; isolate the local bridge and remove public spend paths before hosting.

## Smallest useful implementation sequence after user selection

1. Stable reviewed demo case; authoritative session lifecycle/clues/timer/result; preserve progress on retry and restart.
2. Provider boundary and strict contracts; invalid results do not punish the player; local Codex integration feasibility verified by the separate provider audit; ElevenLabs restores exact approved utterances.
3. End-to-end recorded rehearsal and fault injection; then hosted durable storage, spend limits, RLS, observability and wider randomized case evaluations.

Do not split files merely to satisfy a number. Natural modules here are game policy/state transitions, session repository, clue ledger, action idempotency, result scoring, provider adapters, case schema, judging contract, narration, audio authorization and export outbox. Keep route handlers thin and domain rules testable; practical implementation size targets can be 150 lines for hooks/components, 250 for domain modules and a 300-line exception ceiling with rationale. The actual application refactor remains audit-only and awaits selection.

Skills applied: code-review, agent-reliability-and-guardrails, dec-quality-testing.
