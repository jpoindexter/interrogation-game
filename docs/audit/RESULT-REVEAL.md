# Recorded reasoning before the score

UX-27's win screen now leads with the accepted accusation, canonical false claim, truth, contradiction and recorded judge rationale. Confession is a secondary native disclosure, followed by the recorded conversation path, score and optional leaderboard submission. The heading is “Case solved”; elapsed time remains in the score breakdown. Existing noir colors, typography and artwork are retained.

The reveal selects only a conversation-path node whose kind is `accusation` and status is `supported`. It does not promote an unsupported accusation, ordinary dialogue, successful evidence challenge or unverified legacy entry into a winning accusation. Missing historical accusation and rationale receive explicit unavailable messages. The rationale is copied from the recorded verdict; no new judge call, paraphrase or invented success explanation is introduced.

“View recorded exchange” is a native button. The selected recorded node ID binds a React ref directly to that path entry's `details` element. Its handler opens that entry, focuses its direct native `summary`, and scrolls that summary into view with `behavior: instant`. It does not scan global DOM IDs, synthesize a fragment destination or force smooth motion. The summary retains its visible keyboard-focus styling and normal Enter/Space behavior.

## Executed proof and limits

One [focused check](../../tests/result-reveal.test.tsx) passed using the existing Node/tsx runner and React server renderer. The [receipt](evidence/result-reveal-test.txt) covers:

- Rendered supported-accusation selection despite rejected and unverified alternatives; all three canonical facts and the exact recorded rationale.
- Reasoning → secondary confession → conversation path → score → save order, with no initially open disclosures or modal in this rendered content.
- Missing-path, no-supported-accusation and missing-rationale fallbacks without fabricating a verdict or exposing a broken source action.
- The actual navigation helper against controlled element methods: open the supplied entry before focusing its summary, then request instant scrolling. Missing or invalid targets are ignored.

[Scoped strict lint and size checks](evidence/result-reveal-lint.txt) exited zero. Every changed application module is at most 52 physical lines. The [source receipt](evidence/result-reveal-sources.json) pins the inspected revision of each changed source and the focused test. Root owns integrated TypeScript/build and the separate loss-screen increment.

**Browser acceptance remains open.** Server rendering and controlled element methods do not execute hydration, a physical keyboard, actual focus/scroll behavior, screen-reader announcements, narrow-window layout, first-viewport fit or viewer comprehension. No browser, provider, voice, external database or additional dependency was used. This increment addresses the source-level UX-27 gap; it does not by itself qualify the entire card for Done.

Reproduce only this check:

```sh
node --import ./scripts/test-worker-env.mjs --import tsx --test tests/result-reveal.test.tsx
```

Skills applied: use, dec-accessibility, dec-core-principles, dec-cognitive-load, dec-ai-native-patterns, dec-software-principles, dec-quality-testing.
