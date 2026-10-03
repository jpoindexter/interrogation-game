# Recovery and visible progress follow-up

3 October 2026. Two source defects were reproduced while reviewing the remaining local acceptance work. These corrections do not establish browser, voice or hosted acceptance.

## Cross-process activity before expiry

An already-running reader cached a session's last activity indefinitely until acquiring an action lock. The real session GET handler checks expiry before taking that lock. If another process kept the session active, the reader could return401 using its old timestamp and never reach the existing lock-time refresh.

The [existing persistence harness](../../tests/session-persistence.test.ts) now includes one case with two real processes. A writer commits an action 30 simulated minutes after creation; the original reader calls the actual session GET handler just over60 simulated minutes after creation. Before the change it returned401. Afterward it returns200 and the writer's question count, preserving the original in-process session reference. Only time is advanced synthetically; the child process, repository writes and route handler are real.

[Session reads](../../src/lib/session/store.ts) now consult durable storage while unlocked, merge a newer revision into the existing objects and discard a cached record if its durable file is missing. Locked actions retain their working snapshot until save. This is local filesystem consistency, not a distributed repository implementation or a proof of every concurrent deletion race.

[Before receipt](evidence/session-cache-before.txt); [after receipt](evidence/session-cache-after.txt). Eight focused persistence/materialization checks passed, covering the new case and existing replay, concurrency, crash, failed-save recovery, token restart and reserved-ID behavior. No provider call or full suite ran.

## Rejected accusations and the question count

The server already marks accusation transcript entries as `kind: 'accusation'`. The client appended the same text without its kind, so the visible case-record progress treated a rejected accusation as a substantive question. The authoritative server release policy was unaffected, producing a misleading local counter until recovery.

The [accusation controller](../../app/game/controller/accusation-action.ts) now retains the kind. An extension to the existing invalid-response/recovery test checks that the accepted rejection consumes its normal attempt while adding zero question progress. The selected test failed before and passed after the one-line change. [Execution summary](evidence/accusation-progress-followup.txt). Actual browser rendering remains unexecuted.

## Scope

No authored-case EvidencePage change was made: further caller tracing showed GameView renders EvidenceWorkbench for that branch, disproving the suspected mismatch. Hosted sessions, shared budgets and transactional receipts remain unfinished; credentials block their live acceptance, not their source implementation.

Skills applied: agent-fanout, dec-software-principles, dec-quality-testing, enforcing-code-size.
