# Delayed turn and lost delivery acceptance

Executed 3 October 2026. **One ordinary interrogation turn waited 16.003 seconds for its controlled provider response, committed once, lost HTTP delivery, then replayed and recovered without another provider invocation or AI reservation.** This supplies the missing literal delay/normal-turn boundary in LOGIC-13. It does not claim browser status, production Next networking or actual provider billing acceptance.

## Original criterion and layer

LOGIC-13 requests: delay a response beyond 15 seconds, disconnect after server acceptance, retry and cancel; preserve one accepted turn and one chargeable operation where provider semantics permit, with visible recoverable status. The transaction also must commit the displayed reply and clue event together, with no doubled turn after timeout.

The [focused runner](../../tests/delayed-turn-acceptance.ts) invokes the actual `/api/interrogate` and `/api/session` route modules through a loopback Node HTTP bridge. Those modules execute the real local session dispatcher, filesystem lock/receipt/commit, AI gateway, OpenAI adapter and public recovery projection. Only the external Responses transport is replaced. Unexpected destinations are rejected; no Codex, OpenAI, voice or remote database call can pass through this fixture.

This is an actual HTTP socket and actual production route-module execution, **not a launched Next production server**. The response is deliberately destroyed by the bridge after the route has returned its successful response and durable receipt. It is not an abort during inference or a simulated clock advance.

## Observed sequence

1. Create one synthetic relaxed session in a fresh private temporary directory. Submit one ordinary question with a stable request ID. No generation or opening inference is needed.
2. The actual Responses adapter enters controlled transport once. While it waits, the on-disk request is pending, accepted questions remain zero, and the durable AI budget already records one call reservation.
3. Wait 16 real seconds. The actual route validates the response and commits its exact transcript/receipt. Before any response bytes reach the client, destroy that HTTP response. The client observes a transport failure after 16.090 seconds.
4. Read the synthetic fixture's durable receipt: complete, one question, two transcript entries and one request record. Retry the exact original request over HTTP: 200, an exact parsed-response match to the committed receipt.
5. Read actual `/api/session`: 200, the same conversation, one accepted question and no pending requests. The provider invocation count stays one; the call reservation and all 5,492 reserved input characters are unchanged.

[JSON receipt](evidence/delayed-turn-acceptance.json) records timings, counts, exact-match assertions, runtime and source hashes without session IDs, request IDs or credentials. [Test output](evidence/delayed-turn-acceptance.txt) records one passing check in 16.486 seconds, zero failures. [Scoped strict lint](evidence/delayed-turn-acceptance-lint.txt) exited 0 without output. The owned server and temporary data directory were cleaned up. No product or shared-helper file changed.

## Separate evidence reused

Cancellation was not repeated in this run. The retained [full-gate receipt](evidence/current-verify.txt) already records:

- `ai-cancellation-routes.test.ts`: actual suspect/judge routes propagate request abort and reject late successful output without committing a turn or accusation.
- `ai-cancellation.test.ts`: a real local child and descendant terminate after cancellation, with no delayed side effect; pre-cancelled calls start no provider; the Responses adapter rejects late success.
- Existing action-response controller checks reject late canceled responses and preserve retry identity. These are controller/resource checks, not an observed browser status interaction.

Those are separate earlier executions, not additional assertions performed by this delayed-run receipt. Existing voice and generation retry proof remains relevant to its own paths; it is not substituted for this ordinary-turn check.

## Disposition and remaining limit

The specified >15-second ordinary-turn, accepted-response loss, same-ID replay and unchanged-reservation boundary now has direct execution evidence. No source defect was found in this boundary and no product change was necessary. The runner is explicit opt-in (`delayed-turn-acceptance.ts`, without the regular `.test.ts` suffix), so it does not add 16 seconds to every full suite.

**Keep LOGIC-13 in Verify pending its visible recovery/status acceptance.** The UI owner is separately implementing/reviewing that path. This report does not exercise hydrated recovery/cancel controls, actual microphone/playback or a deployed Next/Supabase transport. One observed adapter call and reservation do not prove one external charge: no billable provider was contacted, and interrupted provider outcomes cannot guarantee billing reversal.

Reproduce only when this boundary changes; preserve existing evidence rather than running another provider batch:

```sh
DELAYED_TURN_REPORT=/tmp/delayed-turn-new.json npm exec --yes --package=node@24.21.0 --package=npm@11.21.0 -- node --import tsx --test tests/delayed-turn-acceptance.ts
```

Skills applied: use, gap-analysis, dec-quality-testing.
