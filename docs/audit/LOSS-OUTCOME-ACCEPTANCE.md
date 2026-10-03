# Recorded loss outcome and difficulty

The loss summary previously used canonical difficulty only to construct the next-case link. It now displays that saved difficulty beside the saved outcome in a semantic definition list. Stale browser difficulty and timeout flags cannot replace the evaluation passed into the summary. No scoring, timing, judgment or persistence rule changed.

## Original LOGIC-11 criterion

Win, exhausted accusations, expiry, give-up and lawyer endings must persist and render distinct correct outcomes and difficulty.

The existing executed [integration receipt](evidence/current-verify.txt) covers immutable give-up, lawyer termination and speakable transcript, exhausted accusations, expired-session enforcement, explicit end recovery, and recovery of all four loss flags. `session-foundation.test.ts`, `session-resume.test.ts`, `session-recovery-ui.test.ts` and `result-conversation-path.test.ts` retain those checks. The unchanged terminal rules and previous process/restart evidence are reused; they were not rerun for a presentation field.

The new bounded component check in `tests/result-model.test.ts` renders the actual `LossDetails` for each of the four canonical loss outcomes, with conflicting old browser difficulty/timeout fields. It observes each correct outcome label and the canonical Expert difficulty. It also renders the actual winning score breakdown with the same canonical difficulty and confirmed score. All five checks in that small existing file passed. [Executed output](evidence/result-difficulty.txt).

This closes the missing rendered-content portion of the original criterion when combined with the retained persistence/recovery evidence. It does not establish hydrated browser layout, accessibility-tree behavior, VoiceOver, viewport fit or a new live playthrough. Those user-owned presentation checks remain open. The full goal is not complete.

Skills applied: use, gap-analysis, dec-accessibility, dec-quality-testing, dec-software-principles.
