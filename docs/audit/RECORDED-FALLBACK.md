# Recorded fallback walkthrough

2026-10-03. Route: `/rehearsal`. Entry point: the explicitly labeled recorded walkthrough link below live authored practice on `/cases`.

## Purpose and boundary

This is a deterministic, read-only presentation of a saved run. A sticky banner reads **Recorded · not live AI**. Next, Back and Restart change only the local step index; there is no text entry, provider call, game mutation, score or leaderboard submission. Refresh starts at the opening. There is no automatic playback, simulated wait, synthetic typing indicator or generated response to a click.

The running local Next application is still required to serve the page and assets. This is a fallback for demonstrating recorded behavior when live providers are unavailable, not an offline application or proof of current provider availability. The app-level music control remains separate ambient audio; this recording contains no captured microphone or ElevenLabs audio.

## Exact source

`docs/audit/evidence/local-http-gameplay-map.json`, captured **2026-10-03T11:43:22.387Z** with `codex-local`, is the source. It records real local HTTP and Codex subscription interaction in the authored practice case. Browser, microphone and ElevenLabs were not exercised in that run.

`app/rehearsal/recording.ts` contains a curated display-only subset and a SHA-256 of the source bytes. The UI's expandable provenance block displays the timestamp, provider, source path, source hash and scope. The source test compares that hash and every copied question, answer, assessment, exhibit and final finding against the original evidence file. If that source is replaced, this test intentionally requires renewed curation rather than silently presenting a different run.

No session ID, request ID, bearer credential, win token, internal claim binding, score, rating or private case fixture is included in the curated fixture. The final findings are copied from the already public end-of-case result, not from server-only authored truth. They are displayed only at the final stage. The recorded accepted accusation/confession appears in its original chronological stage immediately before that final debrief.

## Stages and attribution

| Stage | Saved source | Presentation |
| --- | --- | --- |
| Opening | `/result/win/result/conversationPath/0` | Exact detective opening and Casey account |
| Unsupported exhibit | `/result/win/result/conversationPath/1` | Exact pinned statement, badge record, question, response and rejection rationale |
| Supported exhibit | `/result/win/result/conversationPath/2` | Exact visitor record, question, response and established contradiction |
| Rejected accusation | `/result/win/result/conversationPath/3` | Exact unsupported role accusation and response |
| Accepted accusation | `/result/win/result/conversationPath/4` | Exact evidence-based accusation and recorded confession |
| Debrief | `/result/win/result` | Exact public false claim, finding, evidence connection and judgment explanation |

Section titles, verdict labels, navigation labels and the introductory explanatory sentence are editorial UI copy. They are not presented as captured dialogue. The final path uses text labels as well as styling, including “not established” and “rejected”; color alone does not carry the judgment. The scope of the supported finding remains presence in the building, not proof of theft.

## Local documentation and checks

Before implementation, the bundled Next documentation was read for the page convention, Server/Client Components and Link. The route page is a Server Component with explicit recorded metadata; the walkthrough is a narrow Client Component because navigation needs local state. No shared live gameplay files were changed for this route.

Executed under Node 24: six focused tests passed, and strict scoped ESLint passed without findings. Tests establish exact-source provenance, excluded sensitive/score fields, bounded next/back/restart logic, initial markup labels/controls, delayed final reveal, result path semantics and absence of gameplay network/storage/provider calls in the route's source. The route uses plain native controls with no animation. A local HTTP GET to `http://127.0.0.1:3187/rehearsal` returned 200, and the response HTML included the recorded label, case title, Next recorded step and Restart recording controls. Full project TypeScript checking passed at handoff. HTTP/SSR checks establish route delivery and initial markup, not hydrated button behavior.

Actual browser navigation, focus announcements, sticky-header visibility, small-window and 200% zoom layout, screen-reader behavior, and video-call presentation are still unverified because browser automation permission remains unavailable. Source/SSR tests are not a completed recorded-demo rehearsal.

Skills applied: enforcing-code-size, dec-accessibility, dec-software-principles, dec-motion-animation.
