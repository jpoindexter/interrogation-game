# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A voice-based detective game for the **Mistral Worldwide Hackathon 2026** (Online Track, "Anything Goes").
You're a detective. Mistral is a suspect who's lying. You have 5 minutes to catch the lie using only your voice.

**Solo project. 48-hour hackathon. Started Feb 28, 2026.**

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind v4)
- Mistral Large 3 via `@mistralai/mistralai` SDK — suspect AI brain
- Web Speech API — voice input (browser native, Chrome required)
- Browser SpeechSynthesis — voice output (fallback, upgrade to ElevenLabs later)
- No database. All state in React state + sessionStorage for game results.

## Project Structure

```
interrogation/
├── app/
│   ├── layout.tsx              # Root layout, JetBrains Mono font
│   ├── globals.css             # Tailwind v4 + custom animations
│   ├── page.tsx                # Title screen — "INTERROGATION" + Start button
│   ├── game/
│   │   ├── page.tsx            # MAIN GAME — timer, stress meter, voice I/O, case file
│   │   ├── win/page.tsx        # Win screen — Mistral evaluates performance
│   │   └── lose/page.tsx       # Lose screen — Mistral reveals what was missed
│   └── api/
│       ├── generate-case/route.ts    # GET — generates a new case via Mistral
│       ├── interrogate/route.ts      # POST — sends player question, gets suspect response
│       └── evaluate/route.ts         # POST — win/loss evaluation via Mistral
├── src/
│   ├── lib/
│   │   ├── mistral.ts          # Mistral API client + all 4 functions
│   │   ├── game-state.ts       # GameManager class + Case/GameState types
│   │   ├── voice-input.ts      # VoiceInput class (Web Speech API wrapper)
│   │   └── voice-output.ts     # VoiceOutput class (SpeechSynthesis wrapper)
│   └── types/
│       └── speech.d.ts         # SpeechRecognition type declarations
├── .env                        # MISTRAL_API_KEY (and ELEVENLABS_API_KEY when added)
├── ../PROJECT.md               # Full project spec, UI design, build schedule (parent dir)
└── ../PROMPTS.md               # All Mistral prompts + 3 pre-written fallback cases (parent dir)
```

## How It Works

### Game Flow
1. Player clicks START → `/api/generate-case` calls Mistral to create a unique crime scenario with a suspect, their story, and ONE lie
2. Briefing screen shows the case — crime, suspect name/role, setting
3. Player clicks BEGIN → game starts with 5-minute timer
4. Player taps mic button → Web Speech API listens → transcribes → sends to `/api/interrogate`
5. Mistral responds in character as the suspect (JSON: spoken_response, stress_level, clue_unlocked, caught)
6. Browser SpeechSynthesis speaks the suspect's response aloud
7. Stress meter and case file update in real-time
8. If `caught: true` → win screen. If timer hits 0 → lose screen.
9. Win/lose screens call `/api/evaluate` for Mistral to analyze the interrogation.

### Conversation History
- Stored as `ConversationMessage[]` with proper `user`/`assistant` roles
- Full history sent to Mistral each turn so the suspect maintains story consistency
- Passed via sessionStorage to win/lose screens for evaluation

### Key API Signatures
```typescript
// Generate a case
GET /api/generate-case → Case object

// Interrogate (each turn)
POST /api/interrogate
Body: { caseData: Case, conversationHistory: ConversationMessage[], playerQuestion: string }
Returns: { spoken_response, stress_level, clue_unlocked, caught, internal_state }

// Evaluate win or loss
POST /api/evaluate
Body: { type: 'win'|'lose', caseData, conversationHistory, playerAccusation?, maxStress? }
Returns: evaluation/summary JSON
```

## Design System

- **Background:** `#0A0A0A` (near black)
- **Text:** `#E8E8E8` (off white)
- **Accent:** `#C41E1E` (red — timer, stress, danger)
- **Surface:** `#2A2A2A` (dark gray panels)
- **Dark surface:** `#1A1A1A` / `#111111`
- **Font:** JetBrains Mono (monospace)
- **Aesthetic:** Noir detective. Dark, minimal, typographic. No chat bubbles.

## Current State

### Working
- [x] Project scaffolded and building clean
- [x] Title screen
- [x] Case generation via Mistral API
- [x] Briefing screen with case details
- [x] Main game screen with timer, stress meter, case file sidebar
- [x] Voice input via Web Speech API
- [x] Voice output via browser SpeechSynthesis
- [x] Full conversation loop (speak → Mistral → speak response)
- [x] Stress level tracking and visual display
- [x] Clue unlocking
- [x] Win detection (caught: true)
- [x] Lose detection (timer runs out)
- [x] Win screen with Mistral evaluation
- [x] Lose screen with Mistral analysis
- [x] sessionStorage for passing game data between pages
- [x] Dev server running at http://localhost:3001

### Needs Testing / Fixing
- [ ] Test full game loop end-to-end (play through a complete game)
- [ ] Verify Mistral maintains character across multiple turns
- [ ] Verify win detection triggers correctly (not too early, not too late)
- [ ] Test voice recognition accuracy in different conditions
- [ ] Timer reactivity — make sure UI updates every second
- [ ] Handle edge case: player speaks while suspect is still talking
- [ ] Handle API errors gracefully (show message, allow retry)

### TODO — Polish (Design Phase)
- [ ] Audio waveform visualization (currently placeholder bars)
- [ ] Smoother transitions between game states
- [ ] Timer color/size changes as time runs low (pulses under 30s)
- [ ] Stress meter animation refinement
- [ ] Add text input fallback for browsers without speech recognition
- [ ] Add "I caught the lie!" manual button (fallback for win detection)
- [ ] Mobile responsive layout
- [ ] Loading states between API calls
- [ ] Sound effects (optional)

### TODO — Upgrade
- [ ] ElevenLabs TTS for suspect voice (better quality, dynamic stability based on stress)
- [ ] Voxtral real-time STT (Mistral's voice model — judges want to see this)
- [ ] Pre-written fallback cases (3 are in PROMPTS.md, need to wire them up)
- [ ] Multiple difficulty levels
- [ ] Share result functionality

### TODO — Ship
- [ ] Deploy to Vercel
- [ ] Record demo video (60-90 seconds)
- [ ] Write project description for hackathon platform
- [ ] Submit on hackiterate.com

## Commands

```bash
cd interrogation        # All commands run from here
npm run dev             # Start dev server (http://localhost:3000)
npm run build           # Production build
npm run start           # Start production server
npm run lint            # ESLint
```

## Environment Variables

```
MISTRAL_API_KEY=xxx          # Required — Mistral API access
ELEVENLABS_API_KEY=xxx       # Optional — better voice output
ELEVENLABS_VOICE_ID=xxx      # Optional — specific voice for suspect
```

## Key Decisions Made

1. **Web Speech API over Voxtral** for now — browser native means zero latency on transcription. Voxtral can be added later as an upgrade.
2. **SpeechSynthesis over ElevenLabs** for now — instant, no API calls. ElevenLabs planned as upgrade for better voice quality.
3. **sessionStorage over URL params** for game results — no URL size limits, cleaner URLs.
4. **Inlined speech recognition in game page** rather than using the VoiceInput class — simpler, fewer state sync issues.
5. **No database** — fully stateless. All game state lives in React state during play, sessionStorage for result screens.
6. **Structured JSON responses from Mistral** — stress_level, clue_unlocked, caught fields allow game state to be driven by the AI's own assessment of how the interrogation is going.

## Hackathon Context

- **Judging criteria:** Creativity/uniqueness (most important), Future potential, Technical implementation, Pitch quality
- **Special prizes eligible for:** Best Mistral Vibe (AirPods), Best Voice AI (ElevenLabs 6mo)
- **Organizer said:** "Games win. Simple > technically impressive. If you see it on social media you should say wow."
- **Recommended models:** Ministrals, Mistral Large 3, Voxtral (voxtral-realtime)
- **Winner announced:** Friday March 6. Public votes (likes) determine finals entry.
- **Pitch line:** "Mistral can reason. I made it lie. Your job is to catch it."

## Reference Files

- `../PROJECT.md` — Full spec: concept, tech stack, UI layout diagrams, build schedule, demo video script, risk mitigation
- `../PROMPTS.md` — All Mistral prompts: case generator, suspect system prompt, win/loss evaluation, 3 pre-written fallback cases, ElevenLabs voice settings, token cost estimates, test curl command

## Builder

Jason Poindexter — Designer, 15 years (Apple, Google, YouTube, FedEx, London Stock Exchange). Building Gripe (market intelligence), Kern (design system enforcement). Wife just joined Mistral as UX researcher. Solo entry, online track from Barcelona.
