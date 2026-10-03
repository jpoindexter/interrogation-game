# Interrogation: deep audit and upgrade brief

Audit date: 3 October 2026. Baseline: `f8d4c3c00e229bf0dfc8427e1c5593cc98edb7fc`.

Board: [https://trello.com/b/Ww5bceNb/interrogation-superhuman-demo-upgrade](https://trello.com/b/Ww5bceNb/interrogation-superhuman-demo-upgrade). **62 cards verified by readback.** [Backlog index](BACKLOG.md).

Specialist reports: [game logic and security](LOGIC-SECURITY.md), [design and assets](DESIGN-ASSETS.md), [architecture and migration](ARCHITECTURE.md). [Artwork contact sheet](evidence/design-contact-sheet.jpg).

## Decision

This is worth developing as an interview demonstration. Its strongest material is the interaction between voice, character performance, uncertain AI output, evidence, and a constrained win condition. Preserve the noir pixel-art identity. Make a short, reliable investigation feel excellent before adding more game modes.

The current implementation is not yet verified for a live interview. The production build succeeds, but gameplay correctness, recovery, accessibility, and data claims have material gaps. The audit separates local-demo priorities from the work required for a public Vercel deployment.

## Scope and authority

- **Outcome:** an evidence-backed audit, complete Trello backlog, and an actionable upgrade sequence for a Superhuman interview demo.
- **Target:** the current repository and its full reachable Git history. Local demo over video first; Vercel later.
- **Must:** investigate OpenAI/Codex subscription use, ElevenLabs voice, modern stack, cohesive modules, existing visual identity, and all discovered problems.
- **Must not:** mistake source inspection or mocked tests for live gameplay; erase the original hackathon provenance; silently turn sample data into user evidence.
- **Authority:** audit first, then choose changes; user subsequently authorized deep parallel audits and a private Trello board. Product implementation and image regeneration remain a separate execution phase after the audit recommendations.
- **Done evidence for this audit:** saved reports, verified board and card inventory, reproducible checks, concrete fixes and acceptance criteria. This does not establish that the app itself is demo-ready.

## What was actually checked

| Check | Result | What it establishes |
|---|---|---|
| Clone, remote, branch, history | `main` matched `origin/main`; 98 reachable commits | Repository baseline and recorded history |
| GitHub PRs/issues/releases/Actions | No PRs or issues returned; zero releases and workflow runs | No evidence in those GitHub surfaces; not proof there was no testing elsewhere |
| Install | `npm ci --ignore-scripts` succeeded | Lockfile resolves on this machine |
| Production build | Passed Next compilation, TypeScript and prerendering | Buildability only |
| ESLint | 21 errors, 49 warnings | Existing static-quality debt; some are naming/config issues rather than runtime failures |
| Dependency audit | 18 flagged packages: 1 critical, 14 high, 2 moderate, 1 low | Registry advisory matches, not proof every advisory is exploitable here |
| Source inventory | 95 TS/TSX/CSS files, 9,898 physical lines | Size baseline, including scripts |
| Asset inventory | 134 files, about 31.9 MiB | Repository payload, not measured page transfer size |
| Literal asset references | No missing literal image/audio paths in scanned TS/TSX | Does not cover every computed path or network request |
| Server reproductions | Eight root checks and nine specialist route checks reproduced defects; export CLI regression separately exercised with synthetic data | Actual route/domain code under mocked provider and database responses |
| Visual review | Historic hero screenshot and current local asset inspection | Artwork/source critique, not live responsive verification |
| Live browser | Blocked by browser tool: user permission declined for localhost:3187 | No interactive, keyboard, screen-reader, viewport or audio end-to-end claim |
| Current AI/voice/database services | Not exercised | No paid-provider, credentials, live persistence, latency or Vercel proof |

Evidence is saved under `docs/audit/evidence/`. The root server harness can be rerun from the repository root with `node docs/audit/evidence/server-checks.cjs`. Expected provider-failure messages are intentional fixtures. The checks assert the presence of defects; they are not a passing regression suite for the desired behavior.

## The first three work packages

1. **Make the demonstration truthful and repeatable.** A curated case, clear local setup, reliable text path, visible failure/retry, canonical game state, and a saved replay explicitly labeled as recorded. Correct README/setup/export claims. Define one short demonstration from entry to judgment.
2. **Modernize the runtime and AI boundary.** Patch Next and its matching ESLint config, introduce validated provider contracts, prove local Codex structured output and latency, then reconnect ElevenLabs STT/TTS. Preserve separate suspect and judge context.
3. **Refine the experience for video.** Legible dialogue/evidence, clear listening/transcribing/thinking/speaking states, keyboard operation, restrained motion, useful evidence provenance, and targeted outcome-art consistency.

The rest is preserved in Trello and the specialist reports. The sequence is dependency-driven; a public leaderboard, RAG pipeline, or wholesale art replacement is not required to prove this local demo.

## Verified and traced findings from the root audit

Evidence labels: **executed** = observed with a named check; **code-path** = traced in source; **proposal** = improvement to validate. Severity is based on the stated local-demo use, with public-hosting consequences called out separately.

| ID | Finding and evidence | Improvement and acceptance criterion |
|---|---|---|
| R01 | **Executed:** `app/api/interrogate/route.ts` adds the raw assistant message and increments clues before secret scanning. A blocked response returned no clue but server clue count became 1; raw secret remained in history. | Validate final response before atomic state mutation. After a blocked output, displayed history and server history match and no invisible clue is consumed. |
| R02 | **Executed:** unlimited easy game returned `timeExpired` at 601 seconds. `SERVER_TIME_LIMITS[difficulty]` is used without checking pinned `timerMode`. | Use explicit active-time policy per mode. Exercise all four difficulties in countdown and unlimited modes with a fake clock. |
| R03 | **Executed:** judge provider failure restored `accusationsLeft` to 3 but left `accusationsUsed` at 1. | Commit an attempt only on a valid judgment, or roll back both values. Provider timeouts and parse failures must not spend attempts or lower score. |
| R04 | **Executed:** after session deletion by evaluation, failed leaderboard write consumed the win token: first request 500, retry 401. | Make persistence and redemption transactional/idempotent. A retry after a temporary failure saves exactly one score. |
| R05 | **Executed:** an unexpired session token was accepted twice (`true,true,false`) because token-map consumption leaves the session fallback token alive. | One authoritative redemption record. Concurrent duplicate submissions must produce one durable score. |
| R06 | **Executed:** arbitrary text with `role: detective` reached mocked TTS provider with status 200. | Derive briefing text/role/voice server-side from the session. Reject arbitrary unrelated text. Lower priority for private loopback demo; required before public hosting. |
| R07 | **Executed:** “What were you told about the security alarm?” is treated as prompt injection. | Evaluate legitimate detective questions separately from adversarial payloads; preserve gameplay while refusing instruction override. No claim that regex filtering secures an LLM. |
| R08 | **Executed:** absent IP headers generate a fresh bucket per call. | Define a bounded fallback identity and deployment-specific trusted proxy handling. Repeated unidentified requests must share a limit, with separate endpoint/session budgets. |
| R09 | **Code-path:** case loading calls `res.json()` without checking `res.ok` or validating the case; a JSON 500 error becomes `caseData` and enters briefing. `app/game/page.tsx:122–131`. | Typed result boundary and explicit recoverable setup/error state. Missing credentials, 429, malformed JSON and provider timeout stay out of briefing. |
| R10 | **Code-path plus server counter check:** visible timer pauses during processing/speech and starts after briefing; server score uses wall time since case creation and counts accusation messages as questions. Win screen recomputes its own score. | One authoritative result and consistent time definition. Same session shows identical score in result, history, share and leaderboard, independent of provider/audio latency. |
| R11 | **Code-path:** keyless play is incomplete. `/api/accuse` and `/api/evaluate` intentionally ignore browser Mistral keys. Win-page leaderboard POST and leaderboard GET also omit custom Supabase headers. | Explicit deployment configuration and readiness validation; remove BYOK from the local presentation path. Prove a full case using the selected provider mode. |
| R12 | **Code-path:** game sessions, locks and win tokens are process memory. | Sufficient only within one local process. Before Vercel, use a shared store with TTL, atomic transitions and idempotency; verify cross-instance continuation and restart behavior. |
| R13 | **Code-path:** UI says keys are “never sent to third parties,” but headers send them through app routes to providers; settings also contact providers directly. | Explain actual credential handling. Prefer server environment configuration for this personal demo. No browser credential form on the presentation path. |
| R14 | **Code-path:** leaderboard merges sample entries with fetched entries and substitutes samples after failure without labeling them. | Clearly label demo data; show an honest empty/error state. Never use seeded scores as evidence of adoption. |
| R15 | **Code-path:** README Supabase public-insert policy permits direct leaderboard writes outside the token-checking app endpoint; live policy is unknown. | Server-only trusted score writes and migration-owned policies. Anonymous direct inserts fail while valid server submission succeeds. |
| R16 | **Code-path:** documented schema lacks `match_patterns` function and pgvector setup required by retrieval. Settings exports using anon key despite documented no-public-read policy; session export uses environment client rather than per-user Supabase. | Reproducible migrations and one config model; keep RAG/export optional for demo. Verify retrieval/export against a disposable database, never by reading production player data. |
| R17 | **Code-path:** “effective questions” are just the second half of questions when final stress is at least four; exports store role/content, not per-turn stress/clue events. | Record structured turn events if learning/evaluation is retained. Describe retrieval conditioning accurately; no automatic model training or improved win-rate claim without evaluation. |
| R18 | **Code-path:** voice recorder lacks unmount teardown; AudioContext is closed on silence but not normal manual stop. Audio requests lack consistent timeout/cancellation. | One abortable audio lifecycle; navigation, stop, retry and provider timeout release mic, context, object URLs, callbacks and timers. Verify on target browser. |
| R19 | **Code-path:** winning always invokes confession TTS even when voice output setting is disabled. README claims browser SpeechSynthesis fallback but response hook falls back to text only. | Respect voice settings consistently and document the actual fallback. Complete win/lose/mute flows with audio off. |
| R20 | **Code-path:** `npm run dev` calls a script that force-kills all listeners on ports 3000–3002. | Remove broad port killing. Starting this repo must not stop unrelated local apps. Audit used direct Next launch on port 3187. |

Additional findings, reproductions and source anchors are in the specialist reports. Similar findings are consolidated into implementation cards; separate acceptance checks remain recorded.

## OpenAI, Codex and ElevenLabs plan

The current local CLI is `codex-cli 0.144.1`; `codex login status` reported ChatGPT authentication. Official docs say Codex supports subscription sign-in and that `codex exec` reuses saved CLI auth; schema-constrained final output is documented. This establishes a plausible **local integration path**, not game suitability, latency, account capacity or a general hosted ChatGPT API entitlement. [Authentication](https://learn.chatgpt.com/docs/auth), [non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode).

Proposed boundary: `GameModelProvider` exposes case generation, suspect turn and accusation judgment as typed operations. A local Codex adapter and a later OpenAI API adapter implement the same contract. Keep game authority in deterministic application code. Never allow suspect output to run tools or choose state transitions directly. The local bridge must remain loopback/private, isolate the runtime from repo/user files and tools, use bounded requests, and keep judge context separate from suspect context. Test the installed CLI/version capabilities before choosing exact flags or SDK implementation.

For Vercel, use server-held API credentials once available; subscription login is not a substitute for standard API billing. Do not copy local Codex credentials into a public web app. A hosted recorded demo can be explicitly labeled while real inference remains local. This is a recommendation, not a deployment completed during the audit.

Replacing Mistral also removes **Voxtral transcription** and **Mistral embeddings**, not just the chat model. ElevenLabs has STT and TTS capabilities; evaluate Scribe for transcription, start with simple turn-based recording and reliable text fallback, then consider streaming if measured latency warrants it. [ElevenLabs transcription documentation](https://elevenlabs.io/docs/overview/capabilities/speech-to-text).

Retain separate modules for recording, transcription, synthesis, playback and UI states. Record latency for stop-recording → transcript, submit → validated answer, and answer → first audio. Do not claim realtime voice from a full-response/full-audio buffering pipeline.

## Stack and code structure

Keep Next.js, React, TypeScript and Tailwind. The framework family is already suitable. Upgrade in bounded groups using the saved registry snapshot, peer checks and current official guidance; do not change every major version together.

| Area | Current baseline | Recommendation |
|---|---|---|
| Next / eslint-config-next | 16.1.6 | Priority security update as a matched pair; registry snapshot offered 16.3.8. Recheck advisories at implementation. |
| React / React DOM | 19.2.3 | Update as a pair to a Next-compatible release; verify voice/effect lifecycles. |
| Tailwind / PostCSS plugin | 4.2.1 resolved | Compatible 4.x refresh together; screenshot typography/layout before and after. |
| Framer Motion | 12.34.3 | Compatible 12.x first; do not absorb a 14.x migration without a concrete benefit. Add motion preference control. |
| TypeScript / ESLint | 5.9.3 / 9.39.3 resolved | Fix existing lint first, then a deliberate compatibility-tested major upgrade if useful. |
| Mistral SDK | 1.14.1 | Replace after provider parity, including STT/embedding dependencies; do not spend effort upgrading a provider being removed. |
| Neon | 1.0.2 | Remove unused dependency after import verification; Supabase replaced it in history. |
| Supabase | 2.98.0 | Retain behind optional persistence boundary; future public mode needs migrations/policies and shared sessions. |
| Runtime/tooling | Node types 20; no clear pinned app runtime/test script | Pin a currently supported runtime compatible with dependencies and Vercel; add focused integration/eval checks. |

These are staged candidates from a registry snapshot, not a tested lockfile upgrade. See [Next upgrade guidance](https://nextjs.org/docs/app/guides/upgrading) and the architecture report.

Line counts alone are an inadequate quality gate: `app/game/page.tsx` packs 21.8 KB into 313 lines, including seven lines over 300 characters. Format first, then split by responsibility. Suggested standards: components/routes generally 100–150 readable lines, orchestration 150–250, 300 hard ceiling for handwritten source; separate data/prompt fixtures, and explicitly configure how comments/blanks are counted. Use function complexity and state ownership alongside line counts.

Primary seams: game reducer/events; case loading; turn submission; accusation lifecycle; result projection; session repository; scoring policy; prompt assembly; schema validation; audio lifecycle; presentation-only scene/dock/dialog components. Do not move a 250-line function into a hook and call the architecture modular.

## Visual and interaction direction

Apply First-Principles: the observer must understand the case, hear one natural exchange, see why a detail matters, and understand the verdict. Every visual effect should support that sequence.

Keep the warm noir lighting, pixel-art character family, case file metaphor and strong single primary action. Use a 16:9 demo composition with readable dialogue and evidence. The historic hero screenshot shows atmosphere, but tiny utility navigation and a sponsor-heavy footer do not explain the interaction. Add a compact game premise and keep hackathon sponsorship in provenance/credits.

Give listening, transcribing, thinking, speaking, stopped and failed states distinct visible feedback. Let the player review/edit a transcript before spending an accusation. Make evidence traceable to a quoted turn; decorative random evidence icons should not imply objects were discovered when they were not.

Use a curated case for the short demo; retain procedural generation as a separate feature. Keep retries, text input, mute and skip available. Avoid forcing the viewer through a long reveal, onboarding or settings sequence. The specialist asset report identifies which existing images merit reuse versus targeted regeneration; a new rendering is accepted only when it improves a specific composition or consistency problem.

## History and interview story

All 98 commit subjects were inspected; selected decisive diffs were reviewed. The complete chronological index is saved in `evidence/commit-history.txt`. Recorded author dates: 36 commits on 28 February 2026, 60 on 1 March, and two on 8 May. These dates are repository evidence, not a claim about hours worked or the entire ideation period.

| Evolution | Evidence | Interview value / remaining question |
|---|---|---|
| Formal accusation replaced automatic confession | `db74626` | Clear shift from applying generic pressure to articulating a contradiction. Explain your reasoning; no user-research claim is recorded. |
| Voice/text, accessibility settings and modularization | `356bd71`, `325c2d7`, `221722f` | Interaction breadth and iteration; current accessibility and lifecycle gaps must be acknowledged. |
| Hidden case moved off client | `43934f0` | A concrete trust boundary with a before/after example. Does not establish complete security. |
| Briefing, clues, help and win conditions revised repeatedly | `3078d3d`, `299355b`, `b8aaf0e`, `898758b`, `217c9f0` | Strong material for explaining comprehension tradeoffs. History proves iterations, not their measured effectiveness. |
| Sound, speech, skip and mute refined | `49f5cf2`, `772fbf5`, `840e21e` | Taste and systems work worth showing with real audio evidence. |
| Cross-session retrieval and exports introduced | `0570cac`, `ac1b171` | Prototype learning infrastructure; not trained model improvement. |
| Supabase header override removed then restored nine minutes later | `52e50ad` → `a4bcc5b` | A setup-versus-trust-boundary tradeoff left unresolved. Separate local and public configuration. |
| Final auth change missed CLI caller | `f8d4c3c` | Export route moved to Bearer auth, but export script still puts/logs secret in URL. Test callers whenever contracts change. |

Suggested honest project introduction: “I built a voice detective game for a hackathon to explore how people probe an AI character. The main design problem was making a probabilistic conversation feel legible and fair: players needed useful clues, an understandable accusation, and recovery when speech or generation failed. This revision focuses on those boundaries and the quality of the live interaction.”

For Superhuman relevance, emphasize thoughtful AI behavior, craft, human control, and fast comprehensible feedback. Their published values discuss user empathy and remarkable product experiences; this is a framing inference, not a claim about the unknown role or interview rubric. [Superhuman values](https://blog.superhuman.com/our-values/).

Do not claim adoption, user research, a competition win, improved retention, model fine-tuning, production security, or verified accessibility without supporting evidence. Keep the original hackathon stack/timeline separate from this new revision.

## Execution acceptance gate

Before calling the upgrade demo-ready, execute the full chosen case in the actual presentation browser with real providers: startup → briefing → text question → voice question → visible evidence → wrong accusation with one attempt spent → correct accusation → audible/text verdict → consistent result. Also execute mic denial, voice disabled, provider timeout, retry, duplicate request, malformed model output, timer expiry, give up, refresh and navigation cleanup.

Measure the demo on the same video-sharing setup, with audio routing checked. Save a short recording as backup and label it as recorded if used. For Vercel, add independent cross-instance session, secret handling, rate limit, database policy and deployment verification. Passing the local flow does not establish hosted readiness.

## Skills

Skills matched (15): code-review, design-review, dec-core-principles, dec-quality-testing, dec-accessibility, dec-ai-native-patterns, folio-proof-check, openai-docs, enforcing-code-size, dec-software-principles, agent-fanout, ideation-methods, dec-cognitive-load, iconography-and-imagery, agent-reliability-and-guardrails.

Applied principles: single source of truth, graceful degradation, progressive disclosure, accessible names/focus, explicit AI states and uncertainty, integration-first verification, single responsibility and evidence-grounded portfolio claims. The use dispatcher was absent from the enumerated installed inventory; equivalent selection/read/application was performed directly.
