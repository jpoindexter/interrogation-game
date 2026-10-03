# Real generation route failure recovery

Executed 3 October 2026 using the actual generation route, provider adapter, generation ledger, isolated filesystem, client loader/receipt storage and actual error/briefing React components. The only provider replacement is its HTTP transport. No network, model credits, browser or deployment ran.

## Matrix

The provider boundary returned HTTP 500, HTTP 429, non-JSON response content, a structured response missing case fields, and a Responses refusal. Each passed through `/api/generate-case` and became a safe HTTP 502 error; the missing-fields case retains its `INVALID_RESPONSE` code, while other unclassified failures use `ACTION_FAILED`.

For each failure the check observed:

- No resolved playable case or confirmed client session receipt.
- A completed durable failure receipt and no partial server session at its reserved ID.
- Actual preparation-error HTML with an alert, explicit new attempt and authored-practice escape. Private upstream diagnostic text is absent.
- Same-ID repeat returns the same failure without another provider invocation.
- Following the authored-practice option through the same client loader and real route creates an actual briefing session, with three attempts, zero questions and `startTime: 0`. It adds no model call. The actual briefing component renders the returned suspect.

The [final receipt](evidence/service-error-generation-route.txt) contains five scenario subtests and their parent, all passing. [Scoped lint](evidence/service-error-generation-lint.txt) is clean. The harness is [an opt-in acceptance file](../../tests/service-error-generation-acceptance.tsx), outside the regular `*.test.*` suite.

The [initial run](evidence/service-error-generation-route-initial.txt) reached the fourth scenario and hit the real shared generation endpoint limit. This was a fixture-isolation error, not a missing recovery path. Each scenario now has a separate disposable data store; no production admission rule or limit was weakened. The successful run retains the real local headerless admission behavior.

```sh
npm exec --offline --yes --package=node@24.21.0 --package=npm@11.21.0 -- node --import tsx --test tests/service-error-generation-acceptance.tsx
```

## Limits

Route modules are invoked in-process through a controlled fetch bridge, not over a production Next server socket. Response rendering does not mount React effects or execute native browser buttons. Following practice is an explicit harness call to the same loader/route, not a browser click. The check proves safe failure/replay and the authored escape, not successful live generated-case recovery, real provider policy behavior, focus, VoiceOver, or video-call readiness. Those remain separate acceptance gates.
