# Turn feedback and result integration

Executed 3 October 2026. This increment integrates the [turn/dictation recovery](TURN-FEEDBACK-RECOVERY.md), [reason-first reveal](RESULT-REVEAL.md), [canonical loss difficulty](LOSS-OUTCOME-ACCEPTANCE.md), and separate [delayed-turn acceptance](DELAYED-TURN-ACCEPTANCE.md).

## Integration evidence

- [21 focused checks](evidence/turn-result-integrated.txt) passed on pinned Node 24.21.0/npm 11.21.0. The four files cover real component server rendering, controller/transport/retry behavior and controlled exchange navigation. This is not browser hydration or physical-device evidence.
- [Full strict lint](evidence/turn-result-lint.txt) and [application size/complexity](evidence/turn-result-size.txt) passed. Subsequent Help copy has a [scoped clean lint receipt](evidence/turn-result-copy-lint.txt).
- [Initial TypeScript failure](evidence/turn-result-types-initial.txt) identified an older verification script missing the new result callback. That caller was adapted; [integrated TypeScript](evidence/turn-result-types.txt) and [production build](evidence/turn-result-build.txt) then passed. Console trailing whitespace was normalized in the saved build/lint/size receipts; diagnostics were not changed. No runtime guard or compiler rule was disabled. The older acceptance script was not rerun; its historical behavioral receipt remains historical.
- [Production preview receipt](evidence/turn-result-preview.json): build `GJXDOERSKvVaGbauzdHZa` serves Cases, Game, win, loss and Help with HTTP 200; Help contains the new review-before-send guidance. The owned process on port 3187 was restarted without deleting session data. Page HTTP responses do not prove hydrated result views or browser focus.
- No dependency changes, external inference, voice credits, live database operations or deployment occurred. App health still reports a missing ElevenLabs API key; Codex configuration is not a fresh inference check.

The integrated command was:

```sh
npm exec --offline --yes --package=node@24.21.0 --package=npm@11.21.0 -- node --import ./scripts/test-worker-env.mjs --import tsx --test tests/result-reveal.test.tsx tests/result-model.test.ts tests/turn-feedback-recovery.test.tsx tests/action-response-controller.test.ts
```

## Acceptance disposition

LOGIC-11's persistence/rendered-content criterion is met by unchanged executed terminal recovery plus the new actual result-component renders. UX-01/02/04/27, ARCH-11 and LOGIC-13 retain their original unexecuted browser/provider criteria. The [current board snapshot](evidence/trello-current.json) records 70 cards: 20 Done, 30 Verify, 10 In progress, 9 Backlog and 1 Start. The full goal remains active.

Next real checks remain user-owned browser visibility, draft correction/retry, exact-exchange focus, first-screen comprehension, microphone/playback and video rehearsal. Server rendering and green static gates cannot substitute for them. The full 500/429/invalid-JSON/missing-field/refusal recovery matrix also remains open; this increment establishes the connected malformed-turn case only.

Skills applied: use, code-review, dec-accessibility, dec-ai-native-patterns, dec-cognitive-load, dec-quality-testing, enforcing-code-size.
