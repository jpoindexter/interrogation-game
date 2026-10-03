# Provider contract acceptance — ARCH-04

3 October 2026. This assesses the provider-neutral contract criterion, not hosted deployment or live OpenAI API/ElevenLabs credentials.

## Current boundaries

Case generation and independent review, suspect dialogue and accusation judgment enter `requestStructured`, which selects the configured server provider and validates the capability schema before returning data. The local Codex and future OpenAI Responses transports share `StructuredTask`; optional retrieval/embeddings and ElevenLabs voice remain separate capabilities with their own configuration and acceptance gates.

The UI uses provider-neutral case, dialogue and result types. A current source search found no Mistral/Voxtral application references except the retained historical logo entry in the asset-dimensions data. The earlier namespace migration is documented in [PROVIDER-NAMESPACE.md](PROVIDER-NAMESPACE.md).

Win/loss summaries come from the immutable accepted session result, not another inference. Removing the unused `evaluateWin`, `generateLossSummary`, `sanitizeWinResponse` and `sanitizeLossResponse` compatibility helpers leaves that single authoritative path intact. A reference search over app, source, scripts and tests found no consumers before removal. The active routes continue using `projectResult`; no result behavior was replaced.

The dialogue sanitizer's broad `Record<string, unknown>` return annotation also erased its known fields at TypeScript call sites. Removing that annotation preserves inference of the actual returned `spoken_response`, stress, clue and caught fields. The runtime object is unchanged.

## Executed evidence by criterion

| Original criterion | Evidence and scope |
|---|---|
| Generate/respond/judge/summarize contract fixtures | [Current provider/contract checks](evidence/provider-contract-acceptance.txt): 13 existing checks passed after cleanup, including actual generated-case/review transport and durable creation, structured actor/judge validation and canonical accusation history. [Actor disclosure](ACTOR-DISCLOSURE.md) exercises actual response/judgment routes on all difficulties. [Backend acceptance](BACKEND-ACCEPTANCE.md) and [v4 public playthrough](evidence/disclosure-live-v4.json) execute canonical terminal result and recovery without rejudgment. |
| Structured failures remain service errors | The same 13-check receipt covers missing API configuration, provider refusal/incomplete output, malformed structured judgments, unexpected Codex tool events, cancellation deadlines and literal untrusted input. [Backend acceptance](BACKEND-ACCEPTANCE.md) records failed judgments preserving authoritative counters and outcome. |
| No UI/vendor type coupling | Current imports resolve through shared domain/game modules; the source search and production compilation cover removed compatibility exports. Historical artwork is retained intentionally. |
| Every live AI capability uses the selected provider | The recorded v4 generated public playthrough exercises generation/review/dialogue/judgment through local Codex. [Dialogue polish](DIALOGUE-POLISH.md) records the latest suspect/judge prompt provenance. Current controlled OpenAI transport fixtures execute the alternate selection without claiming an actual external API call. Canonical summaries perform no new model work. |

No new inference, voice call or full test suite was run for this structural follow-up. The latest full build and size/lint evidence is recorded in the implementation ledger. Existing receipts describe their original versions; the new cleanup changes no prompt, transport, scoring or persistence behavior.

## Acceptance boundary

The bounded ARCH-04 migration criterion is supported by contract, runtime and source evidence. Actual hosted OpenAI API usage remains ARCH-06; live voice remains ARCH-07/08. Unresolved development dependency advisories remain ARCH-02 and are not hidden by closing the independent provider-boundary work. This report does not establish browser usability, universal model reliability or a production deployment.

Skills applied: dec-software-principles, dec-quality-testing, enforcing-code-size.
