# Accusation service-error acceptance

**Executed 3 October 2026:** five controlled failure classes pass through the actual client accusation controller, request transport/ledger, response validation, feedback hook callbacks and accusation-dialog rendering. Every case preserves the draft and client game state before a deliberate retry, then accepts exactly one valid judgment and clears the old error.

## Executed matrix

| Controlled HTTP boundary | Failure behavior | Manual retry |
| --- | --- | --- |
| HTTP 500 with `ACTION_FAILED` | Recovery dialog contains the retained accusation and error notice; client state unchanged. | Existing policy allocates a new ID for the explicitly failed attempt. |
| HTTP 429 with `RATE_LIMITED` | Retained input and state; no automatic retry. | Same unconfirmed request ID. |
| Invalid JSON in a 200 response | Plain-language explanation: the response could not be read, input is preserved, and retry recovers the same action. No raw parser details. | Same unconfirmed request ID. |
| Missing judgment fields in a 200 response | Incomplete-response error is rendered without partially accepting the judgment. | Same unconfirmed request ID. |
| Provider-refusal boundary envelope | Controlled HTTP 502 `ACTION_FAILED`, matching the production session-ledger mapping of an unhandled provider refusal. | Existing policy allocates a new ID for the explicitly failed attempt. No provider was called. |

For every row, assertions verify unchanged accusation count, accepted history, clues, stress/max stress, hints, previous response and gameplay data after failure. The original accusation remains editable, the controller returns to active, and the actual named native dialog contains an alert plus Submit accusation and Dismiss message controls. No timing synchronization, speech or ending runs before acceptance.

The manually triggered valid judgment is an incorrect accusation with attempts remaining. It changes the client count from three to two exactly once, appends one accusation/response pair after the original history, retains the other protected state, speaks once, clears only the accepted accusation draft, and causes no loss/result navigation. The prior error is absent when the dialog is reopened.

## Defect found and correction verified

The [initial execution receipt](evidence/service-error-accusation-initial.txt) records all five cases failing at the same final assertion: accepted retries left their previous error notice persistent. Earlier preservation and retry assertions passed. The production accusation controller was corrected to dismiss the notice only after the response is fully validated. The shared response reader was also corrected to turn invalid JSON into actionable recovery copy while preserving cancellation semantics.

The unchanged acceptance criterion then passed in all five cases. This agent added only the scoped test/report/evidence; the root agent owns those production corrections and separate hint/cancellation checks.

## Reproduction

```sh
npm exec --offline --yes --package=node@24.21.0 --package=npm@11.21.0 -- node --import tsx --test tests/service-error-accusation.test.tsx
```

- [Test](../../tests/service-error-accusation.test.tsx)
- [Final executed receipt](evidence/service-error-accusation.txt): five passed, zero failed.
- [Scoped ESLint receipt](evidence/service-error-accusation-lint.txt): zero diagnostics.

## Evidence boundary

This is connected client acceptance using the existing action-state harness, a controlled fetch boundary and actual-component server rendering. It executes production `accusationAction`, `requestGameAction`, request-ID ledger and parsers; actual feedback-hook callbacks feed the actual `AccuseConfirmDialog` markup. It does not mock the error handling being tested.

It does **not** execute `/api/accuse`, a provider refusal, filesystem/database persistence, or server-side attempt/stat mutation. Those server checks remain separate evidence. It is also not a mounted React lifecycle, browser keyboard/focus test, screen-reader announcement, actual audio playback or deployment proof. No provider, browser, broad suite or build ran for this scoped increment.

This supplies the accusation portion of the ARCH-11 client failure matrix. The briefing matrix is separate, and complete screen/provider failure recovery must not be inferred from this report.

## Subsequent connected route check

The root subsequently integrated a separate [opt-in real-route harness](../../tests/service-error-route-acceptance.ts). Its [execution receipt](evidence/service-error-accusation-route.txt) now connects the same upstream failure classes through the actual provider adapter, accusation route, isolated filesystem persistence, client controller and actual dialog rendering. It verifies unchanged saved attempts/history/score on failure, then exactly one committed incorrect judgment on explicit retry. See [combined acceptance](SERVICE-ERROR-ACCEPTANCE.md) for the current disposition. This later proof does not retroactively broaden the original client-only matrix above, and it still does not mount a browser or contact a live provider.

Skills applied: use, dec-quality-testing, dec-accessibility, flow-errors.
