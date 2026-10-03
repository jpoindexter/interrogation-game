# Copy accuracy ledger — active implementation

2026-10-03. Source and retained evidence were reviewed for CLAIMS, DOCS and ARCH-18. This ledger distinguishes implemented behavior, executed paths and unfinished acceptance; it does not claim a final browser/audio rehearsal. [Documentation acceptance](DOCUMENTATION-ACCEPTANCE.md) records verified cross-document corrections and the evidence reused.

## Accuracy decisions

| Earlier claim | Current treatment | Evidence boundary |
|---|---|---|
| Every case is unique; no two repeat | Removed guarantee; distinguish generated cases from a reviewed authored evidence challenge | Sampling temperature cannot prove uniqueness; authored demo intentionally repeats |
| The suspect will never confess | Removed absolute claim | Prompt/output controls exist, but full live adversarial evaluation remains required |
| Browser keys are never sent to third parties | Removed browser BYOK and all client credential headers | Providers now use server configuration; legacy storage is untouched, nonsecret preferences are allowlisted |
| System Online from keys present in browser | Configuration remains unchecked; separate timestamped observations report past requested operations | `/api/health` never invokes providers. Five-minute observations distinguish bounded outcomes; no guarantee of the next request, playback or database policies. [Acceptance](HEALTH-ACCEPTANCE.md) |
| SpeechSynthesis fallback | Removed | Actual speech helper calls the server TTS endpoint; text is the supported recovery path |
| Winning tactics automatically train or improve the model | Removed | Historical embeddings/retrieval are not model training or causal evidence of effectiveness |
| Exported sessions are training-ready and every game is in Supabase | Replaced by private session records and explicit local/shared storage modes | Local files, shared SQL/controlled HTTP exports and bounded downloads have execution receipts. Real Supabase/PostgREST remains unverified; export is not training |
| Timer pauses while the suspect speaks | Replaced by continuous server deadline | Session transition deadline uses authoritative wall time |
| Unlimited scores only efficiency | Replaced by explicit Relaxed and Endurance rules | `session/play-mode.ts` and `session/stats.ts` exclude elapsed time from both untimed scores; difficulty, questions, hints and wrong accusations still contribute. Actual duration is retained; both modes are unranked |
| Nervousness, pauses or long answers reliably reveal lies | Replaced by fictional-game framing | No human lie-detection or interrogation-training evidence |
| Apple $5M+ savings; Pogo $30M+ revenue; millions of FedEx daily users; 15+ years; launched Gripe/Kern/AgentSmith/Fabrk; historical employer/title lists | Omitted from the in-game builder page pending source verification | These were inherited copy, not established by this game's code or audit; retain in Git history and verify against original career evidence before reuse |
| Hackathon prizes, sponsors and judging priorities | Omitted current assertions; preserve hackathon origin as historical README attribution | This pass did not verify event materials, award receipt or sponsor endorsement |

## Terminology

- **Configured** means the server reports required configuration; it does not mean connected, working or live-tested.
- **Accepted reply** is the text committed for display and speech, rather than raw model output.
- **Reviewed evidence challenge** refers to fixed authored case facts. A generated case's separate review is not a guarantee of solvability or fair judgment.
- **Provider** distinguishes the local Codex subscription adapter from the OpenAI API adapter and ElevenLabs voice.
- **Session record** replaces training-ready data; an export does not establish model improvement.

## Copy retained despite length

README's Vercel limitation, legacy credential handling and verification boundary remain explicit because shortening them would conceal deployment dependencies or imply proof that has not been executed. The local configuration table distinguishes subscription access from API billing without presenting their credentials as interchangeable.

## Earlier editing method

The earlier pass applied technical-microcopy-editor in accuracy → clarity → brevity order, with dec-software-principles, dec-accessibility and enforcing-code-size. Its word counts below remain historical.

## Earlier executed copy and preference checkpoint

At that earlier copy checkpoint, README lexical word count (same regex applied to complete Markdown including commands/table text): baseline HEAD 1498; working copy 1155; reduction 22.9%. These are historical counts, not the current file length. The retained setup, hosted boundary and privacy detail are intentional evidence-bearing text.

Five settings/security tests passed, including allowlisted legacy preference fallback, preservation of the original storage entry, exclusion of credentials from new writes/headers, and strict parsing of configuration-only health responses. Scoped strict ESLint and whole-project TypeScript passed at this handoff. These checks do not establish successful browser provider calls, live voice, rendered accessibility or the final demo.

## Current source alignment — 3 October

| Current claim | Source and evidence | Limit retained |
|---|---|---|
| Local setup uses signed-in Codex without an OpenAI API key | `ai/provider.ts`; [fresh checkout](FRESH-CHECKOUT.md); [live generated v4](GENERATED-REVIEW-V4.md) | Requires the local CLI sign-in and allowance. Voice and API use separate server keys. Fresh installation ran at `8779a9b`, not the current entire tree |
| Drafting uses Luna; local review/dialogue/judgment use Sol by default | `ai/provider.ts`; `.env.example` | Environment overrides apply. `OPENAI_MODEL` controls the separate API adapter. Model names are configuration, not comparative quality evidence |
| Generated case → public evidence → accepted accusation → recovery ran live | [V4 report and receipt](GENERATED-REVIEW-V4.md): 70.667-second generation, three questions, score1300 and matching recovery | One CLI/HTTP path, no browser/audio/restart or population fairness guarantee. Preserve the earlier 77.144-second v3 failure |
| Public-only actor input reduces direct access to private answers | [Current disclosure acceptance](CURRENT-DISCLOSURE-ACCEPTANCE.md): actual routes, controlled transport, five legitimate and eight restricted outputs | All five legitimate examples preserved; two semantic equivalents still leaked. These selected fixtures are not live-model or population error rates |
| Dialogue wording was improved after that recorded path | [Dialogue polish](DIALOGUE-POLISH.md): two replies and one judgment on the same public case | Adapter calls, not a new full playthrough. Different phrasing in two replies does not prove general naturalness |
| Settings show configuration and recent requested-operation outcomes | `config/provider-observations.ts`, `settings/ConnectionSettings.tsx`; [health acceptance](HEALTH-ACCEPTANCE.md) | No background model/voice probes. Observations are process-local, expire after five minutes and do not establish continuous service health |
| ElevenLabs voice is implemented but optional | `voice/elevenlabs.ts`; [voice receipts](VOICE-IDEMPOTENCY.md); [plugin sample](ELEVENLABS-LIVE-CHECK.md) | Plugin speech is not in-game microphone, transcription, playback or call-audio acceptance. Voice identity comes from `voice/voices.ts`, not a configurable global voice ID |
| Retrieval uses accepted-event associations | [Pattern acceptance](PATTERN-ACCEPTANCE.md); [database privilege acceptance](DATABASE-PRIVILEGE-ACCEPTANCE.md) | Disabled by default; no training, causal improvement, measured RAG benefit or actual pgvector/pattern permission acceptance |
| Portfolio case study was built and pushed | Recorded checkpoint `6f5b52f`, game evidence pinned to `63e98d4`; current README/status | Not independently republished by this copy review; visual approval and publication remain open. Later hosted/retention work is outside that case-study evidence snapshot |

The About and help pages frame stress and vocal delivery as fiction, preserve historical Mistral/Voxtral attribution, and distinguish optional voice from typed play. They do not claim that the v4 playthrough was displayed in a browser. Current source retains no supplied career metrics or award claims on the builder page.

The integrating owner corrected the stale v4 and portfolio statements, removed unused `ELEVENLABS_VOICE_ID`, and synchronized migration020 retention wording. This review reread those source changes and checked 77 local links across six current documents; all resolved. [The documentation report](DOCUMENTATION-ACCEPTANCE.md) records the exact scope. No current mismatch from that correction list remains; it is not a claim that live/browser acceptance occurred.

Biography, chronology, individual/team ownership, awards and asset rights still need their original evidence or user confirmation. Browser, in-game audio, human fairness/interest review and live hosted acceptance remain their own unfinished paths. This documentation criterion permits explicit unverified labels; it does not require inventing additional deployments or provider tests to validate prose.

Skills applied: use, gap-analysis, dec-quality-testing, technical-microcopy-editor.
