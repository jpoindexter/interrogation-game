# Endpoint isolation acceptance — LOGIC-15

3 October 2026. Original acceptance: missing headers share a documented restrictive budget; questions do not consume leaderboard quota; limits hold across two instances and retries; no provider work begins after a cap.

**Assessment: qualifies Done for the local-demo acceptance criteria**, combining the new route proof below with the retained real-process, restart and adapter-entry receipts. No production change was needed. This does not claim a hosted limiter or currency accounting; neither is substituted for the actual local criteria.

## Newly executed route proof

One additional test in [tests/budget-http.test.ts](../../tests/budget-http.test.ts) invokes the actual interrogation POST and leaderboard GET handlers in the **same isolated data root**, with no forwarding headers. It uses their production limits, durable session/request receipts and local leaderboard store. Only the provider adapter is instrumented; external fetch is forbidden. `Date.now` is held constant to keep this boundary check within one refill window; refill and wall-clock behavior are already covered separately.

[Executed output](evidence/endpoint-isolation.txt): one check passed.

1. The first question returns 200 and enters the instrumented adapter once. Twenty-nine fresh headerless request objects repeat its stable request ID and return the exact accepted receipt. Accepted question count remains one; provider calls remain one. Request retries consume request allowance but do not repeat AI work.
2. The next new question returns 429 `RATE_LIMITED` with `Retry-After: 60`. Attempts to create a new local identity using either `x-forwarded-for` or `x-real-ip` also return 429. No additional adapter call or accepted turn occurs.
3. After the question allowance is exhausted, **all 20** headerless leaderboard reads return 200 with the empty local leaderboard. Its 21st read returns its own 429. Thus question traffic does not spend even one request from the separate leaderboard allowance.

Local identity deliberately maps absent or supplied forwarding headers to `local`, scoped by route and operation. It is restrictive across local clients rather than generating a new identity per request. Production handlers choose their own capacities: interrogation 30 per minute, leaderboard reads 20. The new test uses these unmodified handlers, rather than supplying a fake limiter predicate.

[Scoped strict ESLint](evidence/endpoint-isolation-lint.txt) exited zero. The integrated TypeScript check then identified an inferred header-object union incompatible with `HeadersInit`; an explicit array annotation corrected the test-only type without changing behavior. `tsc --noEmit --incremental false` subsequently exited zero ([typecheck output](evidence/endpoint-isolation-typecheck.txt)). Only this new test was executed for this follow-up; no provider service, browser, voice service or full suite was run. No session capabilities appear in the retained output.

## Original criteria and combined evidence

| Original criterion | Executed evidence |
|---|---|
| Missing headers share documented restrictive budget | New route proof: 30 headerless question requests consume one bucket; subsequent headerless and spoofed-header attempts deny. Contract documented in [SHARED-BUDGETS.md](SHARED-BUDGETS.md). |
| Questions do not consume leaderboard quota | New route proof: 20/20 leaderboard reads remain available after exhaustion of the question bucket. |
| Limits hold across two instances | Retained [current-verify.txt](evidence/current-verify.txt): `actual simultaneous processes never overspend an endpoint; restart retains consumption` executes eight child processes against one real ledger and checks a fresh process remains denied. The corresponding voice and AI tests exercise actual concurrent processes and restarted consumers as well. Source: `tests/shared-budget.test.ts`, `tests/ai-work-budget.test.ts`. |
| Limits hold across retries | New route proof preserves one accepted question/provider call across 29 receipt replays. Retained voice HTTP evidence includes a dropped response, concurrent retry and cached private bytes; interrupted receipts do not silently regenerate. Source: `tests/voice-idempotency-http.test.ts` and its passing entries in `current-verify.txt`. |
| No provider work begins after cap | New route proof denies the new question before adapter entry. Retained `ai-budget-integration.test.ts` receipts deny exhausted/oversized AI work and stopped/exhausted embedding work before adapter/fetch, and preserve failed request receipts. Retained voice checks deny additional reservation beyond caps and demonstrate replay does not reserve again. |

The limiter, voice-budget and AI-scope implementation files had no working-tree changes during this follow-up. Existing receipts are identified as retained evidence; they were not silently presented as fresh reruns. The new route test closes the missing integration gap between endpoint namespaces and the original acceptance language.

The local aggregate limits remain work allowances—reserved calls, input characters, speech characters and recording counts—not measured tokens, spend or external billing. Hosted storage is explicitly unsupported and fails closed. Those wider deployment capabilities remain separate unfinished work; this card's local acceptance does not establish them.

Skills applied: dec-quality-testing, dec-software-principles.
