# Briefing and accusation error recovery

Executed 3 October 2026 against the current local client code. This follows ARCH-11's original five failure classes: HTTP 500, HTTP 429, invalid JSON, missing required fields and provider refusal. The checks found a real stale-notice defect and preserve its initial failure evidence.

## Changes and executed results

- [Briefing matrix](../../tests/service-error-briefing.test.tsx): each controlled failure goes through `loadCaseIntent`, the real response validator and generation-receipt storage. No invalid case resolves or acquires a confirmed session receipt. The actual preparation-error component renders an alert, retry, authored-practice escape and return-to-cases link. An explicit valid retry preserves difficulty/setting/mode, uses the same identity for ambiguous failures, and creates a new identity for the known failed receipt. The actual briefing component then renders the validated case. [Execution](evidence/service-error-briefing.txt).
- [Accusation matrix](SERVICE-ERROR-ACCUSATION.md): each failure goes through the real controller, transport, parser, request ledger and feedback callbacks. The actual accusation dialog renders the error with retained text and submit/dismiss controls. Attempts, history, clues, stress and hints remain unchanged in the client state harness; one explicit valid retry consumes one attempt. The initial five checks all reproduced a persistent old error after success. The production controller now dismisses that notice only after validating the accepted response; all five then passed.
- Hints had the same notice lifecycle omission. Their controller now clears obsolete feedback after validated success. The existing invalid-hint test was extended to observe error presence after failure and absence after acceptance.
- A non-JSON action response now gives an actionable preserved-input/same-action retry message instead of raw `SyntaxError` text. A response-body `AbortError` remains cancellation, preserving the draft without a new notice or counter mutation.

[Eleven controller/briefing checks](evidence/service-error-controller.txt) and [five accusation checks](evidence/service-error-accusation.txt) passed. This was a focused run, not another full suite. [Strict lint](evidence/service-error-lint.txt), [module size/complexity](evidence/service-error-size.txt), [TypeScript](evidence/service-error-types.txt) and [production build](evidence/service-error-build.txt) passed. Console trailing whitespace was normalized in saved receipts without changing diagnostics. No dependencies changed and no external model, voice or database operations ran.

## Connected route acceptance

After the client matrix, the remaining local boundary was executed rather than left to inference:

- [Real generation route acceptance](SERVICE-ERROR-GENERATION.md): all five faults pass through the actual provider adapter, generation route, durable ledger and client loader. No partial playable session exists; same-ID replay adds no provider work; the real authored-practice fallback renders a briefing with three attempts and its clock stopped.
- [Connected accusation harness](../../tests/service-error-route-acceptance.ts) and [executed receipt](evidence/service-error-accusation-route.txt): upstream HTTP500/429/non-JSON/missing-fields/refusal pass through the actual provider adapter, accusation route, isolated disk session repository, client controller and dialog rendering. Each becomes HTTP502 `ACTION_FAILED` and preserves complete gameplay, attempts, history and stable score on disk and client. An explicit new-ID retry returns200, commits one accusation/response pair and one attempt, changes the score from1842 to1658 only for the accepted incorrect judgment, and clears the old error. All five scenario subtests and their parent passed; [scoped lint](evidence/service-error-route-lint.txt) and integrated types passed.

Both harnesses are opt-in acceptance files rather than additions to the everyday test suite. They intercept provider HTTP and invoke real route modules in-process; they do not contact an external provider or serve requests through a production Next socket.

## Evidence boundaries and next acceptance

These are executed client functions and React server-rendered components under controlled HTTP responses. The refusal scenario uses the generic `ACTION_FAILED` envelope produced by the current server for provider refusal; it does not contact or execute the model. The briefing test explicitly invokes recovery with the same rule used by the hook, rather than mounting the hook or clicking a browser button. The accusation state harness is not the server's persistent session store.

Retained [backend acceptance](BACKEND-ACCEPTANCE.md) separately executes real accusation routes and persistence for malformed/empty/null/timeout/provider-error judgments. It was not rerun here. The new connected harnesses above now establish the five-class local server-to-client recovery path, including actual saved state, but not a mounted browser. ARCH-11 stays **Verify** for browser-visible recovery. The entire project still needs the user-owned browser, keyboard, microphone/playback and video rehearsal; the app still lacks an ElevenLabs API key.

Re-entry: review `tests/service-error-briefing.test.tsx` and `tests/service-error-accusation.test.tsx` with the actual browser flow when authorized, then observe the same recovery and state invariants. Do not repeat the full suite or infer live provider acceptance from these fixtures.

Skills applied: use, code-review, dec-ai-native-patterns, dec-accessibility, dec-quality-testing.
