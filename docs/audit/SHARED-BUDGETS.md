# Shared local work budgets — LOGIC15

Endpoint and voice allowances now share durable local state across Node processes and restarts. This implements local work caps, not currency accounting or a hosted distributed limiter.

## Contract

- `rateLimitDecision(key, capacity = 30)` returns `allowed`, `exhausted`, or `unavailable`. The compatibility `rateLimit` wrapper returns true only for `allowed`. Callers can distinguish HTTP 429 exhaustion from HTTP 503 unavailable storage.
- Endpoint buckets refill continuously at the configured per-minute capacity. Existing endpoint-scoped local keys remain unchanged; spoofed local IP headers cannot create more buckets. A changed capacity for a retained key fails closed until expiry rather than resetting the allowance.
- `reserveVoiceUsage(sessionId, kind, units)` preserves its signature. Speech characters are capped at 60,000 and transcription reservations at 100 per session. Only nonnegative safe integer units and recognized kinds are accepted. Invalid input throws `VoiceError` 400; exhausted allowance throws 429; unavailable storage throws 503.
- Reservations are charged before provider work. Provider errors do not refund them, preventing repeated failed calls from bypassing the limit. These are work counts, not estimated prices.

## Storage and concurrency

`INTERROGATION_DATA_DIR/limits/usage.json`, or `.local/limits/usage.json`, stores at most 10,000 retained entries. Keys are SHA-256 digests of namespaced endpoint/session identifiers; no raw identifiers or voice content appear in the ledger. Files use 0600 and newly created directories use 0700. The repository inherits the session store's explicit hosted-storage guard: Vercel and non-local `SESSION_STORAGE` configurations are unsupported.

One exclusive file lock covers read, validation, expiry, reservation and atomic fsync/rename. This deliberately serializes short local transactions. A busy lock denies work; it never opens a second ledger. The existing lock helper recovers only a demonstrably dead PID and serializes recovery. Live owners, malformed locks and uncertain ownership fail closed; there is no time lease. A stale recovery guard can require operator intervention after all server processes stop.

Expired endpoint entries are removed after five minutes of inactivity; voice entries after two hours. Pruning occurs inside the same lock, so deletion cannot race a reservation. A full ledger denies new keys until expiry frees capacity; active allowances are preserved. Reads reject malformed records and oversized files. Backward wall-clock movement cannot refill tokens or move stored activity time backward. Expiry follows wall time; large forward clock changes can expire allowances, so this is a local-demo control on a trusted host clock.

Atomic writes finish before the caller receives approval. If a write or release fails after data reached disk, the caller receives an unavailable result and consumption may conservatively remain spent. Deleting the data directory resets budgets; operators must not delete it to resolve a routine request failure. A previously running version's memory-only usage cannot be recovered during upgrade.

## Executed evidence

Run `node --import tsx --test tests/shared-budget.test.ts` from the repository. The suite uses private temporary roots and actual child processes, without provider calls:

- Eight simultaneously released endpoint workers cannot spend more than a three-request allowance; a fresh process sees the consumed state.
- Eight simultaneously released voice workers reserve 25 recordings each: exactly four succeed and four hit the 100-recording cap; a fresh process remains blocked. Speech and recording caps share the same session entry.
- A live lock is retained; an actual exited child owner's lock is recovered.
- Malformed and unwritable storage deny new work without replacing corrupt state. Private permissions and absence of raw keys are checked.
- Expiry, 10,000-entry retention, token refill, backward clock handling, invalid inputs, hosted rejection and typed failure decisions are exercised.

This proves the limiter/storage paths in real local processes. It does not establish browser messaging, provider billing accuracy, hosted durability or distributed coordination across machines. Every limited API route uses the typed decision through `requestBudgetFailure`: exhausted allowance returns 429 with Retry-After; unavailable storage returns 503 with BUDGET_UNAVAILABLE. `tests/budget-http.test.ts` executes generation, speech and leaderboard handlers against unavailable storage and exercises the generation endpoint's ten-request allowance without inference.

## Test isolation

Independent route suites need separate data roots because endpoint limits are now shared across workers. The first full parallel suite run with a single root produced cross-worker denials; isolated roots restored the affected retrieval, gameplay and ending suites. Multi-process budget tests intentionally retain one shared root to exercise the real coordination contract.

## Aggregate AI work and operator stop switch

Every call through the structured provider gateway reserves work through `reserveAiWork(task)` in `src/lib/limits/ai-scope.ts`, immediately before adapter entry. Generation receipts and game-action receipts wrap their callbacks with `withAiWorkScope(sessionId, action)`, using Node AsyncLocalStorage to bind generation and later game actions to the same reserved server session ID. Concurrent requests do not share a mutable global current-session variable. Calls outside a session scope use an explicit, separate durable operator allowance, covering direct evaluation/CLI invocation. Direct adapter fixtures bypass the production gateway intentionally; optional embedding calls reserve from the same ledger before fetch. Generation retrieval inherits the reserved session scope; completed-pattern embedding uses its canonical session ID, while standalone retrieval uses the operator scope.

Each scope permits 120 reserved AI calls (structured generation or an embedding batch) and 2,000,000 input characters; each individual call is limited to 100,000 characters. Characters are JavaScript UTF-16 string units from instructions, input and the serialized JSON schema. This is a conservative work budget, not token measurement, generated output usage, currency pricing or observed billing. Case generation and review each reserve a call; deliberate new attempts and provider failures remain charged. Completed request receipts should bypass inference entirely on replay; an unsuccessful provider attempt does not refund its reservation.

AI entries share the same private, hashed, atomic ledger and have a two-hour inactivity expiry. Session expiry is one hour, so an idle expired session cannot regain an AI allowance while remaining active. The operator allowance also expires after two hours without a successful reservation. A new local data directory creates fresh allowances; this is an operator-controlled local demo, not an abuse boundary against its machine owner.

Set `AI_WORK_ENABLED=false` in the server environment and restart the server to stop new AI calls. The value is checked at every reservation, including direct operator calls, before provider execution. Re-enabling requires removing the setting or setting it to `true` and restarting. Already-running provider work is not cancelled by this switch; existing request cancellation remains separate. No credential files or authentication state are inspected.

Typed errors extend the existing `AiError`:

| Code | HTTP status | Meaning and recovery |
|---|---:|---|
| `AI_WORK_DISABLED` | 503 | Operator stopped new work. No reservation/provider call; restore the switch before retry. |
| `AI_INPUT_LIMIT` | 413 | Per-call input exceeds the bound. No reservation/provider call; reduce the input. |
| `AI_WORK_LIMIT` | 429 | Scope's aggregate allowance is exhausted. No new reservation/provider call; retry does not bypass it. |
| `AI_BUDGET_UNAVAILABLE` | 503 | Storage, lock or unsupported hosted configuration prevented approval. No provider call; a write already committed before a later filesystem error may conservatively remain charged. |

Executed local evidence: `node --import tsx --test tests/ai-work-budget.test.ts` passed five tests. Eight simultaneously released child processes attempted 160 reservations: exactly 120 succeeded and 40 hit the aggregate cap. A newly started process remained capped. Tests also exercised the character ceiling, overlapping asynchronous scopes, separate operator cap, stop/re-enable behavior, retained reservations after a simulated provider exception, lock errors and hosted rejection. These tests do not invoke a real provider.

Five `tests/ai-budget-integration.test.ts` checks execute the actual turn route and provider gateway with an instrumented adapter. Stop, exhaustion and oversized input produce zero adapter calls; an explicit new turn after re-enabling reaches the adapter once. Generation denial leaves no playable case. Optional embedding stop/exhaustion checks deny before fetch. Known failed AI attempts are completed receipts, so repeating their request ID repeats the failure. The response marks `requestComplete`; the client advances its ID only for a matching completed receipt, while ambiguous storage/rate failures keep the old ID. Resolve the underlying condition before a new attempt. These checks prove adapter-entry and retry behavior, not external billing or a browser interaction.
