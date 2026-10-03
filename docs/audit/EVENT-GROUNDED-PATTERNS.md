# LOGIC-10: accepted-event pattern attribution

Date: 3 October 2026. Scope: server learning records and optional retrieval. No live database, embedding, voice or AI calls were made for this change.

## Behavior implemented

Previously every question in a completed win could become a retrieved example. Now a question requires a recorded accepted clue event or an authored contradiction challenge receipt. Ordinary questions from wins, opening markers, legacy sessions without recorded events, and incompatible pattern versions do not qualify. Stress changes are retained as simulated game events; they are neither lie evidence nor a selection rule for learned questions.

The server records accepted turn IDs, exact questions, transcript offsets, timestamps, stress before/after, and newly accepted clue IDs. Authored challenge references include the original action, statement, exhibit and contradiction IDs. These are associations within game rules, not causal claims about effective interrogation. Private records also retain case content hashes and execution-time provider/model selection plus prompt hashes when captured. Case and separate review executions are recorded independently. Historical sessions retain missing provenance rather than reconstructing it from current environment settings. Public case and response projections omit this metadata.

The embedding input changed to evidence-associated questions. Migration `005_event_grounded_patterns.sql` creates a separate v3 table/RPC with schema `accepted-events-v1` and embedding version `openai-text-embedding-3-small-1536-events-v2`. It retains service-role-only access and unique `(session_id, embedding_version)` records; old vectors/history are not backfilled. Embedding text contains the question and evidence category, not session capabilities or private source identifiers. Retrieval stays off by default.

## Executed evidence

- `node --import ./scripts/test-worker-env.mjs --import tsx --test tests/ai-retrieval.test.ts`: 7/7 checks passed. Existing tests cover default-off behavior, version boundaries, unfinished-session rejection and spoofed payloads through the actual POST route with mocked transports. The added integration check commits a real server turn and an authored evidence challenge and verifies attribution; a winning session with no event evidence produces no tactics.
- One existing generation review test was extended and executed with `--test-name-pattern='generation performs a separate review'`: passed. Mock Responses requests prove the stored model and prompt hash match the actual outgoing requests for both draft and review.
- `npx tsc --noEmit`: passed.
- Scoped strict lint/code-size check on edited source and retrieval test: passed.

## Remaining acceptance evidence

No Supabase migration was applied. SQL uniqueness, live RLS, duplicate export storage and the embedding service remain unverified remotely. The scripted event checks do not prove retrieval improves gameplay, causal effectiveness, or a browser/provider playthrough. No existing card should be marked fully done from these checks alone.
