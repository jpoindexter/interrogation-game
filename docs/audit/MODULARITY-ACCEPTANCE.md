# Modularity and critical-flow acceptance

3 October 2026. **ARCH-10 qualifies for Done against its original bounded criterion.** This report recommends disposition; it does not move Trello. It combines the enforced size gate, current route execution and explicitly scoped existing receipts. Browser parity, live voice and hosted persistence are separate cards and are not inferred from this result.

## Original criterion

The card requires: “Lint enforces accurate limits excluding blanks/comments/generated files; full fixture critical flows retain behavior; no minification or arbitrary one-function fragmentation.” Its dependency is ARCH-04, the provider-neutral contract boundary. No browser rendering or every-feature end-to-end suite is specified.

## Size and structure

[eslint.size.config.mjs](../../eslint.size.config.mjs) applies to handwritten TS/TSX in `app`, `src` and `scripts`: 300 lines per file, 50 per function, complexity 10, four parameters and nesting depth four. Blank and comment lines are excluded explicitly. The inherited configuration excludes generated Next/build output and historical audit evidence; JSON content is declarative data, not a disguised executable-module exception. No application-side size-rule suppression was found in the inspected source. The [integrated polish size gate](evidence/integrated-polish-size.txt), [lint](evidence/integrated-polish-lint.txt) and [production build](evidence/integrated-polish-build.txt) passed. Root's subsequent ARCH-04 cleanup removes unused wrappers rather than adding an alternative runtime.

The architecture has cohesive owners: page composition, controller/state/view, public evidence controls, session transitions/transactions/results, provider contracts/adapters and voice resources. Representative current physical lengths are 15 lines for the game page, 39 for its controller, 69 for its view, 103 for session turns, 22 for canonical results, 116 for the store and 47 for the request ledger. Blank/comment-excluded executable counts are no greater. The game-AI operations are small named capability modules; historical provider names are not used as a second live abstraction layer. The split preserves readable multi-line source rather than shortening it through minification.

## Critical-flow receipts

| Flow | Current owner | Executed receipt and scope |
|---|---|---|
| Authored start and opening | generation route, authored gameplay session, turn service | New [route acceptance](evidence/modularity-acceptance.json): actual authored start and opening return 200 with no provider call and no private answer in briefing. |
| Generated start and review | game-AI generation, selected provider, structured review, generation checkpoint | [V4 full path](GENERATED-REVIEW-V4.md) started through actual localhost/Codex in 70.667 seconds, then public questions and evidence release. Frozen source references and its original execution limits remain in that report. Root's post-cleanup contract checks separately exercise the actual generation/review and identity path with controlled transport. |
| Unsupported and supported evidence | gameplay route, exact statements, exhibit rules | New route acceptance pins the opening, rejects an irrelevant exhibit without a clue, then establishes the correct statement/exhibit contradiction exactly once. Two controlled dialogue calls. |
| Wrong and correct accusation | accusation route, selected-provider judge, session transaction | New route acceptance rejects the first accusation while preserving active state and two attempts; the subsequent specific contradiction wins. Two controlled judgment calls. |
| Terminal result and replay | result projection, evaluate route | New route acceptance reads and repeats the immutable canonical result with exact equality. No provider call is made for either result. This also proves the current debrief uses stored facts instead of the removed model-summary wrapper. |
| Export and state recovery | export service/private repository/admin route, public session projection | New route acceptance reads one durable local export, downloads it through the actual admin route, and recovers the public terminal state. Outcome and all shared canonical statistics match; exports legitimately include extra clue/stress fields. No duplicate export or result rejudgment. |
| Other terminal modes and crash boundaries | transitions, ending controller, durable receipt repository | [Actor disclosure checks](ACTOR-DISCLOSURE.md) include current ending tests and all-difficulty release/replay. [Backend acceptance](BACKEND-ACCEPTANCE.md) preserves terminal race/fault results; [fresh checkout](FRESH-CHECKOUT.md) separately proves real process restart at 8779a9b. These are retained at their recorded scope, not relabelled as a new browser or hosted run. |

The latest authored check uses actual Next route modules, the selected OpenAI adapter boundary and a real isolated filesystem. The transport returns declared synthetic dialogue/judgments; it never contacts OpenAI or ElevenLabs. All ten action/result responses were 200, there were exactly four controlled provider calls, and the admin export returned one record. The private temporary directory was removed after execution. No session capability or private case export is committed. See [sanitized JSON](evidence/modularity-acceptance.json), [console receipt](evidence/modularity-acceptance.txt) and [frozen executed harness](evidence/modularity-acceptance.ts.txt).

## ARCH-04 dependency

The current capability path is `src/lib/game-ai` → shared AI contracts/provider selection → Codex-local or OpenAI adapter. Root removed unused `evaluateWin`/`generateLossSummary` exports and their obsolete sanitizers. Canonical `projectResult` owns the summary; it does not require another model. The actual current authored route check above proves dialogue/judgment selection plus canonical debrief without an extra call. Existing live Codex generation/review/dialogue/judgment traces establish the local selected-provider path within their stated scope. The [post-cleanup provider-contract acceptance](PROVIDER-CONTRACT-ACCEPTANCE.md) records the 13 focused checks; root owns the ARCH-04 card decision; neither card needs a hosted API deployment to prove its local architectural boundary.

## Verification corrections and limits

The first harness invocation used top-level await in this CommonJS-transformed repository and never ran application code. The second classified the second judgment as wrong because its marker also occurred in prior conversation history; explicit first-wrong/second-correct fixture responses corrected the harness. The third compared entire export/result stat objects, overlooking intentional export-only fields; the final check compares all shared canonical fields and separately verifies exported clue count. No production defect or source correction was attributed to those harness mistakes. The final complete route is the saved successful receipt.

No full suite, browser automation, external provider call or voice work was added by this check. Controlled judgments establish bookkeeping and module integration, not model fairness. The report does not prove current rendered accessibility, voice audibility, user enjoyment or hosted deployment. Later production-source changes require checking the affected receipt/source hashes, not automatically repeating every test.

Skills applied: dec-software-principles, folio-proof-check.
