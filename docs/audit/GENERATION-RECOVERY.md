# Generated-case startup: failure and recovery

3 October 2026. **One revised startup/easy request reached a recoverable public case in 64.069 seconds.** This is a successful local HTTP generation check, not proof that generated cases are consistently fast, fair or ready for browser presentation.

## What failed

The user's first generated startup/easy play attempt ended after 90.02 seconds with a generic HTTP 502. The supplied screenshots exposed two problems: the wait did not explain the work being performed, and the failure did not give a useful next step. This is user-observed evidence, not a browser reproduction by an agent.

The first production HTTP check after the initial recovery changes still failed. It reached review at 18.384 seconds, then returned `CASE_REVIEW_REJECTED` at 84.078 seconds. The rejection message correctly stated that the case had not been opened for play; no public case was returned. Exposing that failure is better diagnosis, but it is not successful generation.

## Changes in this increment

- Persisted generation phases drive a read-only status endpoint and client polling: prepare, write case, review and ready. The loading view shows elapsed time and slow-request guidance without inventing a completion percentage. Polling does not create or retry a case and exposes no private candidate content.
- Known timeout, provider, unfinished-content and review failures now retain distinct codes and public explanations. Timeout maps to HTTP 504; review rejection remains HTTP 502. Unknown failures retain a generic response without exposing private provider output.
- The recovery screen offers the appropriate same-request recovery or new-attempt action, plus an authored evidence-practice escape and return to case selection. The practice label explains that later suspect replies still use live AI. A lost response is not described as proof that the server created nothing.
- Local generation uses `gpt-6-luna` for the candidate and the configured local dialogue/review model, currently `gpt-6.1-sol`, for review. Candidate and review share a default 120-second deadline. These are separate bounded calls; no automatic regeneration loop was added.
- Prompt version `direct-evidence-v4` narrows the story to two true facts and one simple denial, with a named witness or direct record. It discourages ambiguous attribution from an account or device to a person. The semantic reviewer was unchanged for this follow-up.

These are implementation/source findings. The observed phase transitions and HTTP recovery below provide narrower executed evidence; visual clarity and recovery-button usability still require the user's live check.

## Executed follow-up

| Request | Observed phases | Result |
| --- | --- | --- |
| Initial recovery revision, startup/easy | Generating 1.557s; reviewing 18.384s | HTTP 502 / `CASE_REVIEW_REJECTED`, 84.078s; no public case |
| `direct-evidence-v4`, startup/easy | Generating 1.541s; reviewing 19.848s; ready 64.068s | HTTP 200, 64.069s; public case returned |

For the second request, session recovery returned HTTP 200 and the same case. The interview had not started, so preparation did not consume interview time. Progress markup was present in the production response. These timestamps are observations from polling, not exact internal phase durations.

Evidence: `evidence/generation-live-fix.json` and `evidence/generation-v4-live.json`. Both runs used the actual local production HTTP path and signed-in Codex; neither exercised a browser, microphone or voice playback. This report initiated no additional provider calls.

The initial focused run passed 33/34 checks; the remaining assertion expected old provider-error wording. After changing that assertion to the stable `UNEXPECTED_TOOL` code, all nine affected provider checks passed. Two prompt-contract checks and the final production build also passed. See `evidence/provider-error-checks.txt` and `evidence/generation-build.txt`. The full suite was not rerun for this increment.

The revised case was generated and recovered, but was not played through to a judged accusation in this check. One successful request following one rejected request is not a success-rate or latency guarantee. The existing [semantic-review calibration](GENERATED-REVIEW-V2.md), including its phone-attribution false acceptance, remains relevant; the new generation prompt does not erase that finding.

## Related database boundary checkpoint

LOGIC-17 now uses operator-owned configuration restricted to an HTTPS Supabase project origin. Requests cannot replace it with browser headers. The database transport refuses a different origin, embedded credentials and redirects, and bounds network waits. Custom domains and self-hosted targets are intentionally unsupported in this demo.

`evidence/db-boundary.txt` records 15 passing focused checks, including invalid/private/local/lookalike destinations rejected before outbound work, changed-destination refusal and controlled redirect rejection. This establishes the tested configuration/transport boundary, not live Supabase migrations, RLS or hosted delivery. The original card acceptance criteria remain intact.

## Remaining acceptance

The user owns the later browser check: observed progress, timeout/rejection recovery, same-request recovery after a connection loss and entry into practice. Wider generated-case solvability and a real evidence-to-accusation playthrough of the new case remain open. No affected Trello card is marked Done by this checkpoint.

Skills applied: dec-quality-testing (separate source, HTTP behavior and visual acceptance evidence).
