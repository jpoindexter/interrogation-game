# Independent integration review

2026-10-03. Reviewed live source across the authored/free-text game, request receipts, ending/results, speech authorization, provider cancellation and local persistence. Used fictional temporary sessions and deterministic transport fixtures. No new browser session, real model call or voice-provider call was made for this review.

## Findings, ranked by behavioral impact

| Priority | Finding and source | Reproduction / status |
| --- | --- | --- |
| P1 | A legitimate live paraphrase is reported as unsupported evidence. `src/lib/gameplay/session.ts:40` binds only exact reviewed strings; `src/lib/gameplay/challenges.ts:41` merges unbound statements with genuinely wrong exhibits. | Replayed the actual benchmark actor answer “I left at six and didn’t come back that evening. That’s my account.” Pinning it and presenting the signed Casey visitor record returned `not_established`, zero progress, and “This exhibit does not establish a contradiction…” The exact authored opening remains solvable. **Amended after the reproduction:** this is now `unreviewed_statement`, with no progress and no claim that the evidence is wrong. Public source flags and the selector distinguish reviewed wording from live wording; the result map marks this unverified and directs the player to the reviewed opening. Reviewed wording does not mean truthful. Full semantic binding remains out of scope. |
| P1 | A late client timeout can overwrite a won game with a local loss result. Ending client previously discarded `/api/session/end`'s authoritative outcome and always scheduled `/game/lose`. | Actual end route on an already-won session returned `outcome:'win'`; old client retained timeout flags. **Amended:** validated ending outcome/result controls speech and destination, preserving the confession and win token. Browser storage failure no longer blocks canonical result URL navigation. Executed test includes actual route → client parser → result persistence. |
| P1 | Navigation away during a confession uses “skip” semantics and may navigate back to a result. `app/game/controller/useGameActions.ts` called `skipSpeech()` before `/cases`; a pending `finishWin` resumes on `skipped`. | Source trace: SpeechPlayer resolves skipped; `finishWin` only stops for cancelled, then pushes the win page. **Amended by root:** exitGame now calls cancelSpeech, preserving skip only for an explicit playback skip. The player lifecycle cancellation tests execute resource disposal; real browser navigation remains pending. |
| P2 | Give-up/timeout ending speech was never accepted into server transcript, so the TTS authorization rejected it. | Actual `/api/session/end` returned 200 + “This interview is over, detective.” Calling `authorizeSpeech` with that exact response returned 403. **Amended:** canonical loss ending is appended once as an assistant terminal message; repeated same/new end requests do not duplicate it. Wins retain the existing accepted confession. No authorization bypass added. |
| P2 | Literal metadata guard missed quoted JSON keys; clue text bypassed disclosure checks. | `inspectDisclosure('{"stress_triggers":["x"]}')` returned allowed. `commitTurn` accepted the exact private truth in `clue_unlocked` while spoken text was harmless. **Amended:** quoted field keys are matched; clue text passes the same literal guard before collection. Spoken dialogue remains intact when only its clue is withheld. |
| P2 | Browser storage quota failure after successful accusation reopened active play instead of showing the already-won result. `app/game/controller/accusation-action.ts` stored before navigation inside the action try/catch. | Executed action fixture with successful response and throwing `sessionStorage.setItem`: phases were processing→active, no navigation, action returned false. **Reported to root; root owns win flow and URL-based result recovery.** Ending-side persistence now degrades to the canonical result URL. |
| P2 | Server transcript omitted timestamps; recovered games lose the timing visible before refresh. | After accepted `commitTurn`, both canonical messages had no timestamp; local client held elapsed timestamps. **Amended:** questions, responses, accusations and terminal endings persist whole elapsed seconds at acceptance. The authored opening uses the same elapsed timestamp helper. UI mapping/recovery integration remains separately owned by root. |

## Executed regression coverage

`tests/integration-ending.test.ts` covers:

- Give-up and elapsed timeout → accepted ending speech authorization → no duplication on repeated/new request IDs.
- Last substantive suspect reply remains the result context; generic terminal boilerplate is excluded. Ending without a prior reply states that no reply was recorded.
- Already-won session + client timeout intent → authoritative win/confession → `/game/win?session=<id>`, including throwing browser storage.
- Quoted internal field labels and exact private clue disclosure are withheld while harmless speech remains visible.
- Question and accusation messages persist elapsed whole-second timestamps, clamped to terminal time.

`tests/gameplay-unreviewed.test.tsx` replays the exact observed live paraphrase through canonical pin/challenge/projection, checks no false unsupported classification or progress, verifies reviewed opening/live wording labels in rendered HTML, and checks the result map is unverified. Existing wrong-exhibit tests still distinguish genuinely unsupported pairs. `tests/session-foundation.test.ts` covers explicit endurance escalation and legacy unlimited relaxation.

These are real route/domain/client-helper executions with local temporary fixture data. They do not prove ElevenLabs playback, real browser focus races or result-page rendering. Root's browser/integration work must supply that separate evidence.

## Contract limits retained honestly

The disclosure policy is a **literal** guard: normalized complete private facts and explicit internal labels. It does not detect arbitrary paraphrases, translated extraction or all semantic attacks. Public cover-story discussion is intentionally allowed. The actor never establishes canonical contradiction progress; authored claim/exhibit relationships do. Generated legacy cases still depend on model-emitted clue content and question/stress thresholds, so a generated JSON schema pass is not a solvability proof.

Canonical conversation `timestamp` now means whole elapsed seconds at server acceptance, not epoch milliseconds or the start of microphone recording. Gameplay's internal `RecordedTurn.timestamp` remains epoch milliseconds; callers must convert deliberately instead of mixing those units. Existing messages with no timestamp remain absent rather than inventing one.

Local generation receipts fail closed after an interrupted unknown operation. They prevent same-ID automatic regeneration, but a crash between session creation and receipt completion can leave an inaccessible orphan session; full reserved-ID materialization/recovery is a separate improvement. Local file locks and data storage are not a hosted transactional backend.

Provider cancellation has independent real child-process evidence, but does not retract model work already completed or undo committed game state. Terminal state must remain authoritative even when a client receives a stale timeout or presses another ending control.

Skills applied: dec-quality-testing, dec-software-principles, enforcing-code-size, dec-ai-native-patterns, dec-cognitive-load.

## Subsequent recovery boundary review

The `/game?session=…` terminal restore path still threw when session storage was unavailable, despite result URLs supporting server recovery. It now treats the browser cache as optional and routes to `/game/win?session=…` or `/game/lose?session=…`. Recovery controller regressions execute the blocked-storage path and all loss reasons. Session responses now validate message roles/content, clues, counters, pending requests, timer data, gameplay projection and consistent terminal outcomes before applying client state. Eight focused recovery tests passed; browser navigation remains unverified.
