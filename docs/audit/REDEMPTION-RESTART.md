# LOGIC-07 — score-save retry across real process restarts

The local restart criterion executed successfully: a score-save failure left the win redeemable, a fresh process saved it, and another fresh process returned the identical receipt. Exactly one immutable leaderboard row remained. This is local durable-storage evidence, not hosted Supabase/RLS acceptance.

## Original acceptance and executed scope

The original LOGIC-07 card requires concurrent double submission to make one row, failure followed by successful retry, preservation across process restart, and the same result on exact repeated submission. Existing redemption checks already covered concurrent calls, a failed persistence operation, lost confirmation after commit, canonical frozen metadata and invalid-token rejection. The missing process boundary was added to the existing redemption test file, rather than creating a broader suite.

The new check runs three short-lived Node processes against the same isolated temporary data directory:

1. The test seeds and durably saves a synthetic won Challenge session and its frozen win-token snapshot. Process A loads that disk snapshot, attempts redemption and encounters a real `EEXIST` filesystem error during insertion into a deliberately blocked destination. The normal leaderboard has zero rows and the token remains valid. The process exits with the expected status 23.
2. Process B starts with fresh module caches, reads the private submission and session from disk, and redeems through the actual `LocalLeaderboardStore`. It observes one row, original player `ABC`, suspect `Ada`, three clues and stress seven. The token is consumed after the durable insert.
3. Process C starts fresh, repeats the exact original submission, then tries changed player/score fields. Both return the same confirmed receipt as Process B. The saved row's SHA-256 is unchanged and the store still contains exactly one JSON row.

The three child PIDs are checked as distinct. No capability is printed in success diagnostics or retained in this report. Temporary credentials and records are removed by fixture cleanup. AI work is disabled in the child environment; no provider, voice, browser, public leaderboard or other external write occurs.

## Verification

[Retained scoped and restart-only outputs](evidence/redemption-restart.txt) preserve the executed checks; no rerun was performed to create this receipt.

- `node --import tsx --test tests/leaderboard-redemption.test.ts`: all five checks passed, including existing concurrency and lost-confirmation paths.
- After extending Process C to exercise both exact replay and changed metadata, the new restart check was rerun alone and passed.
- Scoped strict ESLint passed. Full TypeScript found an unrelated concurrent-edit error in `tests/budget-http.test.ts:73` (`HeadersInit` union includes an optional undefined value); no redemption type errors were reported. Root was notified. The other agent subsequently corrected that HeadersInit type, and root reported TypeScript passing after the correction; the final integrated build is still pending. The original TypeScript failure remains recorded here as observed.
- No application code changed; additions are the existing test/helper plus `leaderboard-restart-worker.ts`.

The synthetic terminal fixture isolates redemption; it does not replay an entire winning game or exercise browser score submission. The controlled filesystem failure proves local persistence failure/retry, not a real hosted database outage. Supabase transaction/RLS behavior and hosted-process durability remain separate unexecuted acceptance gates. No full suite was run for this increment.
