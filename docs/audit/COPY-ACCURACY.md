# Copy accuracy ledger — active implementation

2026-10-03. This is a working accuracy pass, not a final completion claim. The provider, voice and session integrations are changing concurrently. Re-check this document and README against the final executed demo before using them in the interview.

## Accuracy decisions

| Earlier claim | Current treatment | Evidence boundary |
|---|---|---|
| Every case is unique; no two repeat | Removed guarantee; distinguish generated cases from a reviewed authored evidence challenge | Sampling temperature cannot prove uniqueness; authored demo intentionally repeats |
| The suspect will never confess | Removed absolute claim | Prompt/output controls exist, but full live adversarial evaluation remains required |
| Browser keys are never sent to third parties | Removed browser BYOK and all client credential headers | Providers now use server configuration; legacy storage is untouched, nonsecret preferences are allowlisted |
| System Online from keys present in browser | Replaced by configured/live use unchecked server report | `/api/health` checks configuration, not model/voice/database operation |
| SpeechSynthesis fallback | Removed | Actual speech helper calls the server TTS endpoint; text is the supported recovery path |
| Winning tactics automatically train or improve the model | Removed | Historical embeddings/retrieval are not model training or causal evidence of effectiveness |
| Exported sessions are training-ready and every game is in Supabase | Replaced by private session records and explicit storage modes | Local durable storage exists; hosted migration and delivery need their own tests |
| Timer pauses while the suspect speaks | Replaced by continuous server deadline | Session transition deadline uses authoritative wall time |
| Unlimited scores only efficiency | Removed | Current score calculation includes elapsed time and other factors |
| Nervousness, pauses or long answers reliably reveal lies | Replaced by fictional-game framing | No human lie-detection or interrogation-training evidence |
| Apple $5M+ savings; Pogo $30M+ revenue; millions of FedEx daily users; 15+ years; launched Gripe/Kern/AgentSmith/Fabrk; historical employer/title lists | Omitted from the in-game builder page pending source verification | These were inherited copy, not established by this game's code or audit; retain in Git history and verify against original career evidence before reuse |
| Hackathon prizes, sponsors and judging priorities | Omitted current assertions; preserve hackathon origin as historical README attribution | This pass did not verify event materials, award receipt or sponsor endorsement |

## Terminology

- **Configured** means the server reports required configuration; it does not mean connected, working or live-tested.
- **Accepted reply** is the text committed for display and speech, rather than raw model output.
- **Reviewed evidence challenge** refers to fixed authored case facts; generated-case behavior has separate acceptance work.
- **Provider** distinguishes the local Codex subscription adapter from the OpenAI API adapter and ElevenLabs voice.
- **Session record** replaces training-ready data; an export does not establish model improvement.

## Copy retained despite length

README's Vercel limitation, legacy credential handling and verification boundary remain explicit because shortening them would conceal deployment dependencies or imply proof that has not been executed. The local configuration table distinguishes subscription access from API billing without presenting their credentials as interchangeable.

## Skills

Applied technical-microcopy-editor in accuracy → clarity → brevity order, with dec-software-principles, dec-accessibility and enforcing-code-size. Exact before/after word counts are recorded after the final file validation below.

## Executed copy and preference checks

README lexical word count (same regex applied to complete Markdown including commands/table text): baseline HEAD 1498; current working copy 1155; reduction 22.9%. The retained setup, hosted boundary and privacy detail are intentional evidence-bearing text.

Five settings/security tests passed, including allowlisted legacy preference fallback, preservation of the original storage entry, exclusion of credentials from new writes/headers, and strict parsing of configuration-only health responses. Scoped strict ESLint and whole-project TypeScript passed at this handoff. These checks do not establish successful browser provider calls, live voice, rendered accessibility or the final demo.
