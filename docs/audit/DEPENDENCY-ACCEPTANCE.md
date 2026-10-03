# Dependency acceptance reconciliation

3 October 2026. **ARCH-02 and ARCH-14 qualify against their original bounded acceptance criteria, with five high development advisories explicitly retained.** This is a disposition recommendation, not a Trello update or a claim that every dependency is advisory-free. No install, replacement experiment, full suite, provider call or browser action was added for this reconciliation.

## Original criteria

[ARCH-02](https://trello.com/c/KrIn92iw) requires: “npm ci, lint, typecheck, build, full fixture game, image routes and production audit pass; unresolved advisories documented with reachability and decision.”

[ARCH-14](https://trello.com/c/WmMdtKzr) requires: “Import scan/install/build/fixture game prove removal; dependency diff reviewed; no forced major or unexplained lockfile churn.” Dependencies are ARCH-02 and ARCH-03. Original descriptions and later implementation notes are preserved in the [initial](evidence/trello-board.json) and [current](evidence/trello-current.json) snapshots.

The unresolved-advisory clause is explicit. The earlier [follow-up](DEPENDENCY-FOLLOWUP.md) statement that both cards must stay open until this finding is eliminated adds a stronger requirement than the cards contain. Its technical findings and rejected experiments remain valid; its disposition is superseded by this criterion mapping. No all-zero development audit, hosted deployment or browser-wide acceptance is silently added.

## Executed evidence mapped to acceptance

| Required path | Evidence | Actual scope |
|---|---|---|
| Reproducible install | [Fresh checkout](FRESH-CHECKOUT.md), [result](evidence/fresh-checkout.json) | New clone at `8779a9b`, Node 24.21.0/npm 11.21.0, clean `npm ci`, build and startup. Current package manifest, lockfile and runtime pins are byte-identical to that checkout. |
| Lint, typecheck and build | [Full gate](evidence/current-verify.txt); latest integrated [lint](evidence/integrated-readiness-lint.txt), [size](evidence/integrated-readiness-size.txt), [build](evidence/integrated-readiness-build.txt) | Prior full gate passed 297 tests, zero-warning ESLint, size rules, route typegen/TypeScript and build. Later source changes have focused checks and current lint/size/build; the build includes TypeScript. The earlier suite is not presented as a new all-tests run. |
| Full fixture game | [Fresh checkout](FRESH-CHECKOUT.md), [modularity acceptance](MODULARITY-ACCEPTANCE.md) | Real HTTP authored opening → give-up → result/export → process-restart recovery. Current actual route fixture separately covers evidence, wrong/right accusation, terminal result, exact replay and export with controlled provider responses. No provider credential is necessary for this criterion. |
| Public and optimized image routes | New [HTTP receipt](evidence/dependency-image-routes.json) | Actual localhost:3187 public PNG returned 200 and decoded to 1024×1024. Next `/_next/image` with `w=256&q=75` returned 200, valid 256×256 WebP for `Accept: image/webp`, and valid 256×256 AVIF for `Accept: image/avif`. Bytes were decoded with sharp, not inferred from headers alone. |
| Production audit | [Retained production audit](evidence/dependency-followup-production.json) | Zero advisories on the current unchanged dependency graph at its recorded check time. No claim about advisories published after that check. |
| Unresolved findings and decision | [Dependency follow-up](DEPENDENCY-FOLLOWUP.md), [full audit](evidence/dependency-followup-audit.json) | Five high development findings propagate one braces advisory through the Next ESLint chain. Current root-discovery setting does not exercise supplied glob patterns. That narrows observed exposure, not proof of no possible exploitation. Retain paired Next/config and functioning rules; await a compatible upstream fix. No suppression, blind downgrade or broken replacement adopted. |
| Removed package import scan | New [source receipt](evidence/dependency-acceptance-source.json) | No `@neondatabase/serverless` or `@mistralai/mistralai` references in app/src/scripts/tests, manifest or lockfile. Historical attribution remains in documentation. Provider/script migration and its targeted proof are in [provider acceptance](PROVIDER-CONTRACT-ACCEPTANCE.md). |

The image requests read only a public portrait and image optimizer output. They establish route execution and format delivery; they do not establish every asset's aesthetics, layout or browser performance.

## Dependency diff review

The [source receipt](evidence/dependency-acceptance-source.json) retains the exact baseline-to-current manifest changes and SHA-256 hashes of the unchanged current manifest, lockfile and runtime pins. Git history places the dependency update in `96ad39d`; no subsequent package/lock changes exist through this review.

- **Removed:** Neon (no runtime consumers after Supabase migration), Mistral SDK (provider and script migration), the old direct `framer-motion` package entry. Motion legitimately retains its own `framer-motion@14` implementation dependency; that transitive is not an unexplained failed removal.
- **Paired platform:** Next and eslint-config-next both 16.3.8; React/react-dom both 19.3.0. Tailwind/PostCSS both 4.3.3. Supabase 2.117.2 and OpenDyslexic 5.3.0 remain in their existing major families.
- **Evaluated major changes:** `motion@14.0.0` is imported through `motion/react` and the project's preference-aware wrapper. Type checking, build and retained fixture/markup checks support source/runtime integration; visual animation acceptance remains separate. This report does not retroactively claim a browser animation comparison or performance gain.
- **Toolchain:** Node 24 and matching Node types, npm 11, Codex CLI 0.160.0 and tsx support the documented local controls. The active `tsc` package is the explicit TypeScript 6.0.2 alias; the separately installed TypeScript 7.0.2 native package is not used by `npm run typecheck` or `npm run build`. Its presence must not be described as proof that the app uses or was validated by the native compiler. ESLint stays at 9.39.5 because v10 exceeds current plugin peer ranges; its support deprecation remains visible.
- **Lockfile policy:** the committed lockfile resolves the intentional dependency replacements and pins, and a clean pinned-runtime install consumes it successfully. Neither rejected glob experiment changed it. No forced audit resolution or unexplained post-install churn was adopted.

ARCH-03's original fresh local installation criterion is already supported by the fresh-checkout receipt. With the new image-route proof, no required ARCH-02/14 acceptance path remains unexecuted at this scope. Keeping the unresolved advisory decision visible is part of completion, not an assertion that the advisory is fixed.

## Limits retained

These cards do not establish live hosted OpenAI, Supabase migrations/RLS, Vercel persistence, real browser motion/accessibility, real microphone/speech, or generalized model fairness. Those remain their own acceptance work. This reconciliation does not rerun or extend the failed compatibility experiments and does not use their clean audits as evidence for the adopted graph.

Skills applied: use, dec-software-principles, dec-quality-testing.
