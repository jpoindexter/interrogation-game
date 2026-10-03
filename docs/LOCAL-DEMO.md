# Local demo rehearsal

Reviewed against source on 3 October 2026. Target: a fictional noir game shown locally over video. The role, interview format and allotted slot are still unspecified. Start with a 3–5 minute rehearsal target; change it when the actual slot is known. This runbook is not a claim that the browser/audio rehearsal has occurred.

## Prepare privately

1. Use Node 24 and npm 11. In a fresh clone run `npm ci`, then copy `.env.example` to `.env.local` only if the destination does not already exist. Preserve an existing configuration.
2. Select `AI_PROVIDER=codex-local`. Check `./node_modules/.bin/codex --version` and `./node_modules/.bin/codex login status`; sign in interactively with `./node_modules/.bin/codex login` if needed. Never inspect or copy authentication files. The repository targets CLI 0.160.0 and defaults to `gpt-6.1-sol`; verify the current configuration before recording.
3. Leave retrieval off and leaderboard/export local for the interview demo. ElevenLabs is optional; configure its server key privately only when ready to perform the actual mic/playback test. Do not imply voice was tested because a key is present.
4. After code changes, run the relevant check once. Use `npm run typecheck` for type changes and a focused behavior check for the affected flow; reserve `npm run verify` for an integration checkpoint. Do not rerun the full suite for documentation edits or each rehearsal. A green build is not a browser rehearsal.
5. Start `npm run dev -- --port 3187`. If the port is occupied, choose another unused port; do not terminate unrelated apps. Open `http://127.0.0.1:3187` manually when browser access is authorized. Check Settings before screen sharing. Health/configuration indicators do not verify sign-in, quota or voice playback.

## Repeatable server rehearsal

With that server running, execute in another terminal:

```bash
REHEARSAL_ORIGIN=http://127.0.0.1:3187 REHEARSAL_OUTPUT=/tmp/interrogation-rehearsal-new.json npx tsx scripts/rehearse-local.ts
```

Use a fresh output filename to preserve earlier evidence. The script creates fictional authored cases, performs two live evidence responses and two live accusation judgments, checks an incorrect then correct path, retrieves the canonical result and recovers it. It also checks a relaxed give-up loss. The opening and reviewed facts are authored; the suspect's later responses/judgments are live. The script uses the configured Codex account and can consume its usage allowance. It does not run the browser, microphone or ElevenLabs.

For the bounded evaluation corpus, first preview without inference:

```bash
npx tsx scripts/evaluate-ai.ts
```

A deliberate live run is `npx tsx scripts/evaluate-ai.ts --run --output /tmp/interrogation-eval-new.json`; it writes expectations before the current ten calls. Keep the raw sample and source hashes. Do not call ten successful examples “100% reliable.”

## Browser narrative to rehearse

These are **acceptance steps to perform**, not checked-off results. Use text first so optional voice cannot block the core demonstration.

| Step | Action | Expected evidence |
|---|---|---|
| Set the scene | Choose **Start evidence practice** from Cases; read the briefing and disclosed records | Explain that the case is authored and later dialogue is live. Reading the briefing spends no countdown time. |
| Establish the statement | Begin and pin the exact opening: “I left at six and did not return to the building that evening.” | The source remains inspectable; pinning alone gives no clue. |
| Take an unsupported direction | Present the Morgan Reed badge record and edit the suggested question | Clear “not established” feedback; no contradiction progress. Do not describe it as proof that every question was wrong. |
| Establish the contradiction | Present the Casey visitor record at 18:42 against that pinned departure statement | One supported contradiction, exact statement/exhibit sources, no duplicate credit on retry. |
| Demonstrate fair rejection | Accuse Casey of lying about being an operations analyst and actually being a security guard | Rejected accusation consumes one attempt; explain why that assertion is unsupported. |
| Resolve | Accuse the claim of never returning after six using the signed 18:42 entry; explicitly distinguish presence from theft | Accepted result, canonical score/mode, conversation path retains both earlier failures and the supported finding. |
| Show recovery | Refresh the result URL, then expand the relevant path step | Same outcome and sources; no rejudgment. Do not expose its session ID in shared evidence. |

Run a separate relaxed case and give up to inspect the loss map and absence of ranking. Test challenge expiry, three wrong accusations and endurance lawyer pressure separately; do not force all failure paths into the presentation narrative.

## Actual desktop/voice acceptance

Before calling the demonstration ready, record a complete run on the intended video-call setup. Check readable dialogue/evidence at 1280×720 and the receiver's display size; repeat at 200% zoom and a small window. Traverse all dialogs with Tab/Shift-Tab/Escape, inspect focus return and selected settings, and check reduced motion and contrast using the rendered interface.

For voice, record a real microphone question, inspect its transcript, edit a deliberately misrecognized accusation before Send, hear a full suspect response, then stop/skip and navigate during speech. Confirm no stale playback or open microphone tracks. Verify master mute with music off/voice on and ensure shared audio is intelligible. Provider or voice failure must preserve a usable typed game.

Perform three timed rehearsals; record total duration, inference wait, interruptions, retry behavior and what a first-time viewer could explain. A read-only fallback is implemented at `/rehearsal`: the persistent banner says **Recorded · not live AI**, and Back / Next recorded step / Restart recording traverse saved exchanges without model calls or score submission. Its provenance panel identifies the captured run and source hash; see [recorded fallback evidence](audit/RECORDED-FALLBACK.md). Six fixture/markup checks and an HTTP200 initial page response are recorded, but hydrated button behavior remains unverified. Verify this page in the actual browser before relying on it during the call; source/markup tests do not prove its interactive presentation.

## Recovery and safe reset

- **Operator stop:** set `AI_WORK_ENABLED=false` in the server environment and restart this demo server. New structured AI and optional embedding calls are blocked; accepted results remain readable. Restore `true` and restart before deliberately making a new attempt. This does not cancel a provider call already running, stop optional ElevenLabs, or change external billing.
- **AI work allowance:** each session and the separate operator/evaluation scope allow 120 AI calls (structured generation or embedding batches) and 2,000,000 reserved input characters, with a 100,000-character per-call bound. Generation and its review consume separate calls in the reserved session. These are conservative work counts, not token or currency accounting; errors are not refunded. See [shared budgets](audit/SHARED-BUDGETS.md). Do not empty the data directory to bypass a limit.
- **In-progress or uncertain storage:** retry the same request. The client retains its generation receipt; do not click a new attempt merely because a response is slow.
- **Interrupted before checkpoint / known failure:** review the message before choosing an explicit new attempt. The app cannot know whether an external provider finished before a process died.
- **Interrupted after generation checkpoint:** same-ID retry restores the reserved case and session. It does not generate again.
- **Active or terminal session:** preserve `/game?session=…` or the result URL and restart the same local server with the same data directory. Refresh should recover accepted state. Idle session availability expires after one hour; files are not automatically erased.
- **Blocked browser storage:** expect the explicit recovery/error path; do not claim browser success from fixtures. Use the server-backed result URL rather than fabricating a new result.
- **Fresh rehearsal without deleting history:** stop only this demo server with Ctrl-C and restart it with a new private directory, for example `INTERROGATION_DATA_DIR=.local/rehearsal-02 npm run dev -- --port 3187`. Start a new case rather than opening a resume URL from the old directory. Keep the earlier directory until its evidence is no longer needed.
- **Receipt cap or stale recovery lock:** stop the demo server and review/archive local data deliberately. Never delete live locks or retry old request IDs against a freshly emptied receipt store.

## Honest interview claims

Supported by saved evidence: modular Next/React implementation; server-owned outcome; local durable recovery and idempotent receipts tested with real processes; real HTTP/Codex authored win/loss paths and small predeclared authored/generated judge samples. Generated-v1 review found case-coherence defects despite passing judge probes; its evidence is retained while the prompt/objective revision is tested. Say which parts are scripted and which are live.

Not yet established: actual current browser/audio/video rehearsal, broad accessibility compatibility, generated-case solvability, statistically reliable judging, live OpenAI API/ElevenLabs/Supabase, hosted Vercel sessions, player enjoyment or measured product impact. Production dependency audit reports zero findings in its saved snapshot; development advisories remain. Keep hackathon history distinct from this revision and verify biography/date claims with the user.

Use [acceptance coverage](audit/ACCEPTANCE-COVERAGE.md), [architecture](ARCHITECTURE.md) and [private storage details](../database/LOCAL-DEMO.md) as the handoff. No credentials or private session files belong in presentation materials.

Skills applied: dec-software-principles, dec-quality-testing, system-architecture-translator, ai-agent-case-study.
