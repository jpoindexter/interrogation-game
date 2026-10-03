# Fresh checkout acceptance

Executed 3 October 2026 against remote commit `8779a9b94567848d63fa7aa177ff386acb507ecc` from `codex/portfolio-upgrade`. A new temporary clone used no copied dependencies, environment files or application data. See [sanitized results](evidence/fresh-checkout.json) and [production build output](evidence/fresh-checkout-build.txt).

## Executed setup and game path

The pinned Node `24.21.0` and npm `11.21.0` ran `npm ci`; installation succeeded with 382 packages added. The existing five high development-chain advisories and ESLint 9.39.5 support deprecation remained visible. No forced dependency resolution was applied.

Copied `.env.example` to `.env.local`, then ran `npm run build` successfully. The production server started with `npm run start -- --hostname 127.0.0.1 --port 3194`. `AI_WORK_ENABLED=false` stopped new model work; `INTERROGATION_DATA_DIR` and `AGENT_CONTROL_DIR` pointed to separate private directories inside the temporary workspace. The runtime and npm were supplied through `npm exec --yes --package=node@24.21.0 --package=npm@11.21.0 -- …` for each command.

The documented agent CLI ran one authored relaxed game through the real HTTP routes:

1. `discover` listed the interface.
2. `start` returned the authored case; `opening` recorded its fixed opening.
3. `giveup` ended the game as `lose_giveup`.
4. `result` returned the conversation path and a saved local export; `state` returned the canonical terminal state.
5. After stopping and restarting only this server, `state` and `result` exactly matched their earlier public responses.

Every game HTTP operation returned 200. No inference, transcription or speech request was made. The CLI retained capabilities privately; the committed evidence includes only a summary, never session IDs, bearer values, private case files or raw session exports.

The README development command, `npm run dev -- --port 3194`, also started successfully. Actual `/api/health` and `/cases` HTTP reads returned 200. The health endpoint correctly reported the operator AI stop and missing voice credentials. Git remained clean in the clone after build and development startup.

All owned server processes were stopped; the temporary checkout and its private game data were removed. The existing user preview was not restarted or modified by this check.

## Acceptance scope

- **ARCH-03:** The fresh pinned-runtime install, build and authored fixture game were executed. A hosted runtime and deployment remain separate acceptance work.
- **ARCH-18:** The documented setup, authored mode, explicit ending and durable restart path were executed. This is an agent following the runbook, not a newcomer usability observation or live audiovisual rehearsal.
- **DOCS:** Local installation and run commands were executed without a setup correction. This does not establish that every document or external integration claim has final acceptance.

Browser rendering, keyboard behavior, microphone capture, speech playback, live Codex generation/dialogue, and hosted persistence were intentionally outside this bounded setup check. No full test suite was rerun.
