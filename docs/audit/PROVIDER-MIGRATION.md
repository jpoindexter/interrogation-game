# Provider migration and executed feasibility

2026-10-03. Runtime text capabilities now use `src/lib/ai/`: provider-neutral structured requests, a local Codex subscription adapter, and a separate server-only OpenAI Responses HTTP adapter. `src/lib/mistral/` remains a compatibility import location; it no longer constructs or calls a Mistral SDK client. Historical Mistral vectors remain intentionally incompatible with any future embedding model.

## Configuration

| Variable | Default / effect |
|---|---|
| `AI_PROVIDER` | `codex-local`; accepts `codex-local` or `openai` only |
| `CODEX_BIN` | Project `node_modules/.bin/codex` when installed; otherwise executable `codex` |
| `CODEX_MODEL` | `gpt-6.1-sol`; explicit `gpt-6-luna` remains available for lower usage |
| `OPENAI_MODEL` | `gpt-6-luna` |
| `OPENAI_API_KEY` | Required only for the OpenAI API provider; server-only |
| `AI_TIMEOUT_MS` | 90000; bounded to 1000–120000 milliseconds |
| `RAG_EMBEDDING_VERSION` | `openai-text-embedding-3-small-1536-v1`; exact compatibility boundary |
| `AI_RAG_ENABLED` | Off unless exactly `true`; requires the versioned migration, embedding version and server API/database credentials |

Browser-supplied historical model keys are ignored by compatibility facades. The local adapter refuses known Vercel/AWS Lambda environments. The web application's local-origin enforcement remains a separate required integration boundary. A configured provider is not necessarily authenticated, reachable or within its usage limits.

The local default was upgraded to GPT-6.1 Sol for the portfolio demo after the user's request for stronger models. [Current official model documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol) supports structured output and the adapter's existing low reasoning setting. Earlier Luna evidence below remains historical evidence for that model; it is not silently reattributed to Sol. The hosted API default remains unchanged, and explicit environment overrides still take precedence. Model choice alone does not establish generated-case fairness.

Use the project-pinned Codex CLI 0.160.0. The adapter checks the exact tested version before inference and fails closed on a different binary; later CLI upgrades require rechecking isolation flags. The pre-existing global CLI 0.144.1 was not replaced. It could run a 5.6-Luna probe but rejected 6-Luna with the current ChatGPT account transport and could not decode the newer model catalog. Isolated latest-stable 0.160.0 successfully ran 6-Luna using the existing sign-in. Do not interpret the old-client rejection as an account-wide model restriction.

## Isolation and process lifecycle

The adapter invokes one fixed configured executable using `spawn` with `shell:false` and an argument array. Player text travels only through stdin. It is never executable command text or a configurable flag. Each request has a private temporary working directory containing only its output schema and fixed engine instructions; the directory is removed afterward. Credentials are not read, logged, copied into the repository, or copied to hosted environments. The CLI uses its existing authentication store.

Invocation controls are centralized in `src/lib/ai/codex-config.ts`:

- `exec --ignore-user-config --ignore-rules --ephemeral --skip-git-repo-check --json --color never`.
- Explicit model, schema, isolated cwd, and fixed `model_instructions_file`.
- `default_permissions="gameplay"`; `permissions.gameplay.filesystem={":minimal"="read"}` and `permissions.gameplay.network.enabled=false`. No workspace filesystem grant is added.
- `approval_policy="never"`, `web_search="disabled"`, `tools.view_image=false`, project-document budget zero, memory use/generation off, and no session history persistence.
- Disable shell, unified execution, shell snapshot, apps, plugins, remote plugins, hooks, memories, agents, goals, browser/computer/image capabilities, workspace dependency tools, skill dependency install, code mode, code-mode host and tool suggestions.
- The available-skills description budget is restricted to one token. No project instructions or skill instructions are supplied by this adapter.

The JSONL reader rejects unexpected tool item types while the process is running. A deadline, cancellation or invalid tool event kills the subprocess group on macOS/Linux, covering the npm wrapper's native child. Output has a fixed size cap. Tool disabling is not delegated to natural-language instructions alone.

**Independent permission check executed:** the same named filesystem policy was applied using CLI `sandbox -P gameplay`, then `/bin/cat` attempted to read an authored harmless temporary canary outside the minimal runtime. It exited 1 with “Operation not permitted” and no content. No private file was used. Network denial is configured; a separate outbound-network negative test was not performed.

## Evidence

- `evidence/codex-provider-proof.json`: current CLI 0.160.0 + `gpt-6-luna`, actual ChatGPT-authenticated structured inference completed in **6105 ms** using the named permission profile. The model reported an empty callable-tool list and no tool execution events occurred. Self-report alone is not independent proof of every internal catalog entry.
- `tests/ai-providers.test.ts`: nine executed checks cover fixed restricted flags, rejection of tool events, runtime schema validation, fixed Responses endpoint/no tools/no storage, missing-key/refusal/incomplete-response errors, immediate unexpected-tool termination, timeout and literal stdin handling. The API tests use a synthetic fetch implementation, not a real API key.
- `evidence/suspect-prompt-equivalence.json`: exact string comparison passed for 12 combinations spanning four difficulties and early/middle/late stress phases. Named prompt sections preserved the existing suspect rules at extraction. A later explicit retrieval correction labels optional prior questions as untrusted observational examples instead of claiming they are proven tactics; therefore the historical 12-case exact-match artifact applies to the extraction increment, before that correction. This does not resolve design contradictions already identified in those rules; the new evidence-graph mode will handle that explicitly.
- Provider boundaries and extracted modules passed explicit 300-line file, 50-line function, four-parameter, complexity-10 and depth-four checks after extraction.

The original judge rules remain: identify the substance of the specific false claim; do not require exact wording; vague/wrong accusations fail. Judge input now uses structured JSON case/transcript/accusation data under separate instructions. Invalid output is a retryable provider failure, not an incorrect verdict. The result route already projects the recorded canonical verdict, so compatibility debrief functions no longer perform a second AI judgment.

## Cancellation and deadlines

Text capability calls accept a final optional `{signal}` execution argument. Existing ignored legacy key strings remain compatible. `requestStructured` checks cancellation before selecting/starting a provider, applies the configured deadline to the entire operation, normalizes abort/timeout failures, and rejects late results before validation/return. Codex version checking accepts the signal and only caches successful version checks. The local model subprocess checks pre-aborted signals before spawning and kills the process group on abort or deadline. Responses receives the combined signal and checks it again after reading the response.

Normal `/api/interrogate` and `/api/accuse` pass `request.signal`. Their durable action ledger currently records a canceled/failed action as `ACTION_FAILED` (HTTP 502); a replay recovers that receipt, while a new attempt needs a new request ID. Canceling inference does not rewind an already started game clock or undo a committed outcome. Authored openings/pinning remain independent of model calls.

Executed evidence: `tests/ai-cancellation.test.ts` starts a real Node child and descendant, confirms both PIDs exist, aborts through the production subprocess helper, confirms both exit, and verifies their delayed file side effect never happens. This exercises process-group cancellation without spending subscription inference. It also checks pre-aborted capabilities/no spawn and Responses signal forwarding/late-response rejection. `tests/ai-cancellation-routes.test.ts` executes both normal route handlers with mocked Responses transport, aborts during inference, and confirms no transcript turn, accusation attempt or outcome is committed. These checks do not establish browser disconnect propagation through a deployed proxy or cancellation of work already accepted remotely by the API.

Generation lost-response/retry handling is a distinct problem. The proposed durable creation receipt protocol is in `GENERATION-IDEMPOTENCY.md`; that document is a proposal, not an implementation claim.

## RAG and authored examples

The old seed command labelled hand-written examples as successful real-looking patterns and wrote them to the database. `scripts/seed-rag.ts` now defaults to a dry run and can export new labelled JSONL via `--output <new-file.jsonl>`. It uses exclusive file creation and makes no provider/database calls. All 15 historical examples are preserved in `src/lib/ai/fixtures/authored-patterns.ts`; every exported row states `provenance:"authored-fixture"` and `observedGameResult:false`.

Historical retrieval now defaults off (`AI_RAG_ENABLED=false`). Disabled GET/POST return HTTP 200 with `status:"disabled"`; new-case retrieval performs no fetch and emits no warning. Enabling requires `AI_RAG_ENABLED=true`, the exact `RAG_EMBEDDING_VERSION=openai-text-embedding-3-small-1536-v1`, a server OpenAI API key, Supabase service-role configuration and the optional `003_versioned_patterns.sql` migration. The Codex subscription does not provide an embedding API key.

The adapter uses the fixed official embeddings endpoint, `text-embedding-3-small`, explicit 1536 dimensions, timeout and runtime vector/model checks. New `interrogation_patterns_v2` and `match_patterns_v2` isolate model, version, dimensions and observed-game provenance. Existing 1024-dimensional rows are untouched and never copied into the new space. Authored seed examples remain exported fixtures, excluded from observed-game retrieval. The SQL uses service-role-only grants, RLS, bounded matching and a unique session/version key with insert-on-conflict-do-nothing semantics.

POST accepts a session identifier; it derives outcome, questions, final stress, clues and time from the terminal server session. Client-supplied outcome/statistics/effective-question guesses are ignored. Active and briefing sessions are rejected before embedding. Historical questions are labelled observations, without invented causal effectiveness or a misleading retrieved-subset win rate.

`tests/ai-retrieval.test.ts`: six executed tests cover default-off routes/no network/no log, explicit version/key gating, response validation, terminal-only canonical facts, incompatible-space/source exclusion, and an actual POST containing forged client fields through mocked embedding/Supabase transports. No live embedding API, SQL migration execution, Supabase write, retrieval-quality evaluation or real cross-game learning is claimed. To enable later: apply the isolated SQL in the intended database, run a controlled terminal-game insert/read and permission checks, then evaluate example quality before opting in. No legacy-vector backfill is automatic.

## Official sources checked

- [Codex developer commands](https://learn.chatgpt.com/docs/developer-commands#codex-exec): non-interactive execution and JSONL events. Installed CLI help verified exact flags.
- [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference): feature controls, project instructions, permission profiles and network boundaries. Not every current-doc key works on the old CLI; the unsupported `agents.enabled` attempt was removed before proceeding.
- [GPT-6 Luna API model](https://developers.openai.com/api/docs/models/gpt-6-luna): Responses and structured-output support. Actual Codex availability was checked separately.
- [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs): JSON-schema response format. Runtime validation remains in place for failure/refusal/malformed transport cases.
- [OpenAI embeddings guide](https://developers.openai.com/api/docs/guides/embeddings#how-to-get-embeddings): verified model, fixed endpoint and default 1536-dimensional space.
- Package registry `npm view @openai/codex version dist-tags --json` returned latest stable `0.160.0`; alpha builds were not selected.

A subsequent live fictional-case check exercised suspect dialogue (11009 ms), a correct accusation (8149 ms) and an incorrect accusation (7862 ms), recorded in `evidence/live-provider-capabilities.json`. Both judgments matched expectations. The incorrect explanation exposed the hidden truth, revealing a real existing game defect: incorrect public judgments now use one of three authored defensive reactions plus neutral guidance, discarding privileged judge prose until a win. A regression test confirms neither output field discloses a supplied hidden fact. This sanitization change is intentional and separate from the exact suspect-prompt extraction.

A live generated fictional case completed in 17122 ms and passed the structural gate (`evidence/live-generated-case.json`). This does not establish that the generated mystery is fair or playable.

Remaining completion evidence: real generated-case playability, broader representative live suspect/judge quality, actual UI integration, voice, provider outage recovery in the browser, and public-hosted API operation with credentials. The local subscription adapter is not a substitute for API billing or a deployable Codex sign-in on Vercel.

Skills applied: OpenAI Docs, enforcing-code-size, dec-software-principles, dec-quality-testing.
