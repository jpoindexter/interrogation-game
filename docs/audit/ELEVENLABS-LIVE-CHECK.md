# ElevenLabs live connector check

2026-10-03. User authorized sparing use of a reported 10,000-credit balance. This check was limited to one short TTS sample, with a 100-credit ceiling.

Executed through the newly installed ElevenLabs plugin:

- Read-only capability and voice queries succeeded. Flash v2.5 was available, and the premade **George — Warm, Captivating Storyteller** voice was returned by the live voice search.
- An estimate-only call quoted **12.5 credits** for one variation of “I left at six, detective.” It explicitly reported no generation and no charge at that stage.
- Exactly one generation was submitted. Status returned **completed**, with no failures, duration **1.6254 seconds**, model `eleven_flash_v2_5`, and reported final cost **12.5 credits** (USD 0.125 cents). No paid retry or batch was submitted.
- The existing result was shown through the native plugin media view. It was not downloaded or copied into the game.

The sample is in the [ElevenLabs flow](https://elevenlabs.io/app/flows/fXVll1y0z8kQgsJ3nxQ2). Generation ID: `blSCNyjff3FSWqUz4BlT`. Voice ID: `JBFqnCBsd6RMkjVDRZzb`.

No account-balance tool was exposed in this connector inventory, so the starting 10,000-credit balance remains user-reported rather than independently verified. The generation's reported charge is verified by its completed result; a remaining balance was not read.

A Boolean-only inspection of the shell and project environment files found **no configured `ELEVENLABS_API_KEY`**. No credential value was printed or extracted from the connector. Plugin authorization is separate from the local application's server API key.

This establishes one successful live plugin TTS generation. It does not establish the local game's TTS route, STT, microphone permission/capture, in-game audio playback, output quality by listening, or video-call audio routing. No app code or new test suite was added for this check.

Skills applied: ElevenLabs text-to-speech and creative-studio.
