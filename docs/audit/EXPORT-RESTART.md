# Completion export shutdown/restart acceptance — LOGIC-20

3 October 2026. **Original local acceptance qualifies Done with controlled remote transport.** A real child process persisted a pending completion export after a database outage, was terminated with SIGKILL, and a fresh process delivered exactly the same complete record. A subsequent evaluation returned the saved receipt without another delivery. A separate unconfigured-database process reported saved/local and attempted no fetch. This establishes local durable recovery; it does not claim delivery to a live Supabase project.

## Criterion and existing evidence

The original [LOGIC-20 card](https://trello.com/c/ig7RCDyv/28-p2-logic-20-make-completion-exports-reliable-and-observable), retained in [the board snapshot](evidence/trello-current.json), requires:

> DB outage and process shutdown retain pending export; resume produces one complete export; demo without DB performs no placeholder network call and reports local-only persistence.

Existing [session-export checks](../../tests/session-export.test.ts) already exercise first-write persistence, same-process remote failure/retry, confirmed-delivery caching and a real filesystem failure while confirming an injected remote success. The retained [12-test export receipt](evidence/export-acceptance.txt) also covers the actual admin route and CLI. Those checks did not establish pending-export recovery after process shutdown. Only that missing path was added and executed; the prior export suite was not relaunched.

## Executed path

[export-restart.test.ts](../../tests/export-restart.test.ts) uses [a small child-process helper](../../tests/export-restart-worker.ts), private temporary directories and a loopback HTTP fixture:

1. **Outage process:** a synthetic accepted transcript is persisted, then the production `POST /api/session/end` handler ends the session by give-up. The real Supabase SDK builds the upsert, including `on_conflict=session_id` and merge-duplicate preference. The controlled transport routes that configured fixture origin to loopback; the fixture responds HTTP 503. The actual end response reports pending/Supabase/attempt 1. A complete local outbox record exists with three conversation entries including the terminal statement, private case facts, difficulty, outcome, timestamp and stats. Its file permissions are 0600.
2. **Forced shutdown:** after that pending response, the parent sends SIGKILL and observes the child's exit signal. The durable envelope has identical parsed content before and after shutdown. No live session capability, raw transcript or key is printed in the saved test receipt.
3. **Fresh process:** a distinct PID opens the same data directory, recovers the terminal `lose_giveup` session and pending envelope, and calls the production evaluation handler. The controlled remote service is now available. Delivery succeeds; the response and durable envelope report saved/Supabase/attempt 2. A second evaluation returns saved with no further remote call.
4. **One complete export:** two remote attempts occurred—one outage and one successful delivery. Both request records and the saved local record are identical to the original snapshot. The fixture has exactly one remote row keyed by session ID, and the export directory contains exactly one local export.
5. **No database:** a third process starts with no database URL/key and default local export mode. The real terminal end handler returns saved/local/attempt 1. All fetches are forbidden and counted; count is zero. The remote fixture's attempt count remains unchanged. Captured stdout/stderr from all three children contains neither the synthetic key nor the synthetic private truth/transcript markers.

The database transport is controlled deliberately: no external hostname is contacted and no real credential is read or used. Application routes, Supabase request construction, filesystem writes, locking, terminal session persistence, process exit, new-process recovery and retry logic are the production implementations. The fixture models remote uniqueness using the actual SDK conflict key; live database constraints/policies remain separate LOGIC-16 evidence.

## Results and limits

[Execution receipt](evidence/export-restart.txt): **1 bounded test passed**, including all three processes and both persistence modes. [Scoped strict ESLint](evidence/export-restart-lint.txt) and [TypeScript](evidence/export-restart-typecheck.txt) exited zero. No application change was needed, and no full suite, model, voice, browser or live database call ran.

Retry remains on demand through result evaluation/status, not a background worker. The existing [local persistence documentation](../../database/LOCAL-DEMO.md) states that exports contain private case/transcript data, session gameplay access expires after one hour of inactivity, and files are not automatically deleted. This test resumes promptly within that supported session lifetime; it does not prove delivery after expired session access, power-loss/storage corruption recovery, remote RLS/migrations, or a deployed multi-instance store. The tested shutdown occurs after the pending response is durably acknowledged; it is not a claim of atomic remote delivery across every possible crash point.

Skills applied: dec-quality-testing, dec-software-principles.
