# Provider-neutral game AI namespace

ARCH-04 naming cleanup, 2026-10-03.

The former `src/lib/mistral` folder already called the configured provider through
`src/lib/ai/provider.ts`. It is now `src/lib/game-ai`: case preparation, suspect
dialogue, accusation judgment, and response sanitization are game responsibilities.
Provider selection, transport, schemas, and prompts remain in `src/lib/ai`. No
additional interface layer was introduced.

All source, test, and evaluation-script imports now use the new namespace. Evaluation
source-fingerprint paths also changed, so subsequent evidence hashes include the
actual files. The recorded-rehearsal isolation assertion rejects imports from both
the new namespace and the historical one.

The unused `client.ts` and `embeddings.ts` migration facades were removed after a
repository reference search found no consumers. The active exports and call
signatures are preserved. There is no compatibility folder under the old name.
Root metadata no longer describes the current game as Mistral-powered.

Historical hackathon attribution, original image asset names, and negative tests
that reject old Mistral credentials or embedding spaces remain intentionally. They
do not select a runtime provider. Historical audit evidence was not rewritten.

## Executed checks

- TypeScript no-emit check passed after the namespace move.
- Scoped strict ESLint passed for every changed source, script, and test file.
- Code-size rules passed for the five game AI modules (127 physical lines total at
  this checkpoint; largest module 41 lines).
- Source/import search found no remaining old namespace imports in app, source,
  tests, or scripts.
- Whitespace check passed.

These checks establish source resolution and lint/size compliance for the rename.
They do not establish a fresh production build, provider execution, or browser
behavior. No model or voice calls were made for this structural change. The shared
workspace may receive subsequent provenance edits in these modules; their validation
is recorded separately.
