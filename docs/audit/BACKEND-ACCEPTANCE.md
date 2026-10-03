# Backend acceptance reconciliation

Executed 3 October 2026 against the current worktree following `8779a9b`. This review addresses **only LOGIC-03, LOGIC-06, LOGIC-17 and LOGIC-19**, using the original acceptance text in `evidence/trello-current.json`. It adds no hosted, live-model or browser prerequisites to those four cards. No production source change was needed.

**All four cards were reviewed against their stated acceptance criteria, moved to Done and read back from Trello on 3 October.** This is not completion of the wider demo, model-quality evaluation, voice, browser or hosted-storage tasks.

## LOGIC-03 — one authoritative terminal result

Original acceptance: “Early win evaluation, accusation after expiry, interrogation after win/lawyer-up, repeated finalize, and simultaneous question/finalize all preserve one valid terminal result.”

| Criterion | Executed evidence |
| --- | --- |
| Early win evaluation | Actual evaluation route returns 409; active session retains no invented outcome. |
| Accusation after expiry | Actual accusation route returns 409; records `lose_time`, zero attempts used, no provider invocation. |
| Interrogation after win/lawyer-up | Actual interrogation route returns the existing terminal outcome for each state; transcript is unchanged, provider cannot run. |
| Repeated finalize | Repeated evaluation after give-up returns identical saved result and export receipt. |
| Simultaneous question/finalize | Hold a real interrogation route awaiting controlled provider transport. Both end and evaluate routes return 409 during that in-flight question. Release it, accept one question, then end and evaluate: one `lose_giveup` outcome persists. This exercises route concurrency rather than merely pre-acquiring a lock. |

All listed criteria executed. The unavailable, early and terminal responses run the real route modules, transaction ledger, filesystem persistence and result projection. Controlled provider responses isolate the rule under test; no model-quality inference is made.

## LOGIC-06 — invalid judgments do not spend attempts

Original acceptance: “Malformed JSON, empty object, null, timeout and provider error leave attempts and score unchanged; a valid incorrect judgment consumes exactly one attempt.”

Actual accusation routes received each of: raw non-JSON text, `{}`, `null`, a transport waiting until the real one-second provider deadline aborts, and a thrown provider error. Every failure returned 502, retained three attempts/zero used, retained the exact score and recorded no accusation transcript. A valid incorrect judgment returned 200 and consumed exactly one attempt. Repeating every request with its original ID replayed the same receipt without a second provider call or another consumed attempt.

All listed criteria executed. Score comparisons use relaxed sessions so elapsed wall time does not obscure whether an accusation penalty was applied; challenge mode still counts elapsed time by design. These checks establish transaction/scoring behavior under controlled failure, not model reliability or an API credential connection.

## LOGIC-17 — trusted database destination

Original acceptance: “Headers cannot change server DB destination; localhost, private IP, unexpected protocol and redirect targets are rejected without outbound call.”

The existing five-check database file was executed. A request supplying attacker-controlled database headers still makes the SDK request to the configured Supabase origin. Twenty-one invalid origin variants, including localhost, private IPv4/IPv6, numeric localhost forms, HTTP/FTP, deceptive suffixes, credentials, paths and ports, fail before any fetch call. The transport separately rejects changed destinations before fetch. When the allowed destination returns a controlled 302 toward localhost, the redirect target receives no call; the transport forces `redirect: 'error'`, rejects 3xx, and the SDK surfaces failure.

All listed criteria executed. A call to the originally permitted origin is necessary to discover its redirect; “without outbound call” applies to the rejected destination. There were no actual network requests. No live Supabase, DNS, schema or RLS proof is claimed or required by this card's acceptance. The supported server configuration is HTTPS `<project>.supabase.co`; custom domains/self-hosted databases are explicitly unsupported.

## LOGIC-19 — immutable facts and debrief

Original acceptance: “Second model cannot reverse verdict or change truth; every quoted closest moment matches actual transcript; debrief still renders canonical facts if model is unavailable.”

The actual accusation route accepted a controlled correct judgment. With provider transport then set to throw, repeated win evaluations retained `correct: true`, the canonical lie/truth/contradiction and identical saved result; asking for a loss result returned 409. There is no second inference in the result path. The loss route returned the exact accepted suspect sentence as `closest_moment`, excluding the later terminal remark. Real `CaseDetails` and `LossDetails` React components rendered canonical facts into HTML while provider transport was unavailable; the loss HTML included that exact transcript sentence. The earlier `integration-ending.test.ts` evidence additionally covers the explicit no-response fallback rather than an invented quote.

All listed criteria executed through result routes and actual component server rendering. This does not establish browser layout, hydration, accessibility interactions or audio; those remain their own acceptance work. The implementation chooses deterministic recorded facts instead of optional model narrative, so there are no generated citations to validate.

## Evidence and reproduction

- [Route/result output](evidence/backend-acceptance.json): 13 bounded acceptance scenarios; actual modules and temporary filesystem, controlled provider transport, zero network/provider calls.
- [Retained acceptance harness](evidence/backend-acceptance.tsx): exact behavior harness used for this checkpoint, with import paths adjusted for its saved location. It is an opt-in audit artifact, not added to the regular test suite.
- [Database output](evidence/backend-database-acceptance.txt): five existing checks passed.

From the repository root with Node 24.21.0/npm 11.21.0:

```sh
INTERROGATION_DATA_DIR=$(mktemp -d /tmp/interrogation-backend-acceptance.XXXXXX) node --import tsx docs/audit/evidence/backend-acceptance.tsx
INTERROGATION_TEST_ROOT=$(mktemp -d /tmp/interrogation-db-acceptance.XXXXXX) node --import ./scripts/test-worker-env.mjs --import tsx --test tests/leaderboard-database.test.ts
```

Original execution used the installed Node/npm versions through `npm exec --yes --package=node@24.21.0 --package=npm@11.21.0 --`. Temporary storage isolates these fixtures from the running preview. Do not use private demo sessions for this check. These scenarios are deterministic acceptance checks and do not spend Codex or ElevenLabs credits.
