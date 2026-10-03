# Documentation acceptance — 3 October 2026

**The identified source inconsistencies are corrected and reread; existing setup proof applies to unchanged runtime/install configuration.** CLAIMS and DOCS now support bounded acceptance using their explicit evidence-or-labeling rules and recorded setup execution. ARCH-18 still lacks the newcomer/live rehearsal observation. None establishes a fully accepted game, browser or hosted deployment.

## Original acceptance, without extra gates

The [70-card snapshot](evidence/trello-current.json) defines:

- **CLAIMS:** follow fresh-clone setup; every advertised capability has executed evidence or an explicit experimental/unverified label; preserve historical hackathon attribution separately from the current revision. Explain actual data flows; remove absolute security, learning and real-interrogation claims.
- **DOCS:** documented commands execute on fresh setup; claim/config references match code and proof; no credentials committed. Update current setup, ownership, providers, voice, migrations, troubleshooting, retention and rehearsal while preserving the historical audit.
- **ARCH-18:** fresh checkout starts without killing unrelated apps; a newcomer can distinguish modes, run the fixture/live demo, reset/recover and trace claims to evidence.

Explicitly unverified capabilities satisfy CLAIMS' labeling alternative; they do not become executed capabilities. DOCS does not require a new hosted deployment or fresh provider batch merely to describe an unfinished path.

## Evidence reused

| Requirement | Existing executed evidence and current source check | Boundary |
|---|---|---|
| Reproducible local installation/start | [Fresh checkout](FRESH-CHECKOUT.md) executed Node 24.21.0/npm 11.21.0 install, production/development startup, authored HTTP game and restart at `8779a9b`. Current `package.json`, lockfile, `.node-version` and `.npmrc` have no diff against that commit | No new fresh-clone run; later application changes are not retroactively included in that build |
| No unrelated processes killed | Same receipt stopped only its own server; current `dev` script remains `next dev --hostname 127.0.0.1` | No inferred real browser or newcomer usability proof |
| Live/local versus recorded/API modes | [Live v4](GENERATED-REVIEW-V4.md), [authored HTTP rehearsal](evidence/local-http-gameplay-map.json), [recorded fallback](RECORDED-FALLBACK.md), current provider selector and rehearsal source | Saved real Codex observations remain bounded to their versions. Recorded fallback explicitly makes no model/score call; hydrated presentation remains unverified |
| Credentials and data flows | Server provider/voice modules, preferences allowlist, Settings session-data panel and current env example were inspected. `.env.local` is untracked and ignored; `.local` is ignored | This is a targeted current-file/configuration check, not a fresh repository-history secret scan or proof about arbitrary exports/custom directories |
| Current models and voice | `src/lib/ai/provider.ts` and `src/lib/voice/elevenlabs.ts` agree with documented Codex/OpenAI/STT/TTS defaults | Defaults/configuration are not proof of live API or in-game voice |
| Learning/privacy/fiction claims | Current About, About the Game, help and Settings source excludes automatic training, guaranteed secrecy and real lie-detection promises. [Copy ledger](COPY-ACCURACY.md) maps claims to source and proof | No validation of awards, identity, career metrics, asset rights or human effect |
| Database permissions and retention | [Core SQL privilege receipt](DATABASE-PRIVILEGE-ACCEPTANCE.md), existing shared delivery reports and [020 report](HOSTED-EXPORT-RETENTION.md) distinguish actual SQL from controlled transport | [Optional vector/pattern SQL](PATTERN-DATABASE-ACCEPTANCE.md) subsequently passed in a disposable PostgreSQL17/pgvector container. Actual Supabase/PostgREST and semantic embedding relevance remain unverified. Operator retention never implies complete erasure |

No new tests were added for prose, and no build, provider, browser, installation or external request was run by this documentation pass. A local reference audit checked 77 Markdown file targets across README, architecture, local demo, database guide, copy ledger and this report; all existed. The integrating owner separately reports 403 resolved local references across 12 current documents. Neither check verifies external URLs or rendered browser presentation. Current source checks reuse execution evidence only at its stated scope.

## Exact integration corrections verified

These locations were observed during review. Only `COPY-ACCURACY.md` and this report were changed by this reviewer. The integrating owner made the other corrections; this review then reread the current files and verified each listed correction. No application behavior was inferred from the prose changes.

| Location at review | Inconsistency found | Current verified correction |
|---|---|---|
| `README.md:86` | Said the changed disclosure path had no successful live playthrough | Preserves v3 failure and describes single v4 success with limits; links the current controlled sample with two semantic misses among eight restricted outputs |
| `docs/ARCHITECTURE.md:60` | Said v4 had not run through a live provider | Now states the executed generation/disclosure/accusation/recovery path and its browser/fairness limits; retains semantic-miss evidence |
| `docs/LOCAL-DEMO.md:83`, `docs/ARCHITECTURE.md:92` | Presented portfolio `596306a`/game `ea703ca` as current | Both now match recorded `6f5b52f`/`63e98d4`, with unpublished/visual-review limits and no claim about later hosted work |
| `.env.example:23` before correction | Advertised unused `ELEVENLABS_VOICE_ID` | Removed. Runtime still selects detective/suspect voices in `voice/voices.ts`; no new override feature was introduced |
| `README.md:105,109`, `.env.example:32` before correction, database guide | Described through 019 and deferred all export/score-backed retention | Migration sequence now reaches020; text describes separate operator retention, 30-day default, compact score retry receipts and deferred invalid bindings. Local files, unknown buckets and future broad-use namespace work remain distinct |
| Earlier `COPY-ACCURACY.md` Unlimited row | Claimed elapsed time affects current untimed score | **Corrected here:** Relaxed/Endurance pass zero elapsed seconds to scoring; preserve duration in stats, other factors and unranked status |
| Earlier ledger final paragraph | Claimed all current docs and About described v4, despite stale paragraphs and About making no detailed v4 claim | **Corrected here:** per-claim source/evidence mapping and explicit cross-document correction list |

Current documentation also uses broad “provider settings change” wording for observation invalidation. Its implemented fingerprint covers the listed AI/voice environment keys; the ledger describes this as bounded requested-operation evidence, not a universal credential or configuration probe. No claim of cross-worker shared health is made.

## Remaining acceptance and stop boundary

**CLAIMS — recommend Done for the original bounded criterion:** identified cross-document inconsistencies are resolved, with no additional source mismatch found in the current setup/UI pass. Capabilities either cite executed evidence or retain explicit experimental/unverified labels, as the card permits. Historical event assertions remain attributed to the original repository, not independently verified; no award assertion was restored. Original career/ownership evidence remains with the user. Source alignment is not verification of that history, and separate UX-16/PROOF ownership criteria remain open.

**DOCS — recommend Done for current documentation acceptance:** installation commands have a real pinned fresh-checkout receipt and unchanged package configuration. Later source changes have separate focused/build receipts; do not call this a new current-tree fresh-install test. Named corrections and 020 operational wording now match the reviewed source/report. This diff adds no credentials; server configuration examples contain placeholders and `.env.local` remains untracked/ignored. This does not assert a new repository-history secret audit. Later implementation changes must update their affected documentation; they do not justify withholding the current bounded criterion solely because named external capabilities remain unverified.

**ARCH-18 — keep Verify:** executed setup, fixture and restart recovery exist. A newcomer following the complete live/browser rehearsal has not been observed; actual screen-share presentation remains user-owned. Keep this original requirement explicit rather than recreating infrastructure. These recommendations do not themselves move Trello cards.

Browser keyboard/layout/VoiceOver, actual in-game microphone/STT/TTS/playback and screen-share routing, human fairness/interest review, biography/ownership and asset provenance remain external/user evidence gaps. The server app's missing ElevenLabs key differs from the successful plugin sample. Hosted OpenAI/Supabase/Storage/Vercel acceptance needs its own authorized target/credentials; optional hosted scope does not block an honestly labeled local rehearsal. Portfolio visual approval/publication remains separate, and the standalone game website stays deferred.

The copy ledger expanded from 707 to 1211 lexical words (71.3% growth) because this pass added the requested current claim/evidence mapping. Its longer qualifiers are retained to avoid merging source, fixture, actual local SQL/HTTP, live provider and browser evidence; no brevity reduction is claimed. Terminology is normalized to **configured**, **observed request**, **recorded fallback**, **accepted-event association**, and **unverified**; none implies deployment or model improvement.

Skills applied: use, gap-analysis, dec-quality-testing, technical-microcopy-editor.
