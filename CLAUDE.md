# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A voice-based detective interrogation game for the **Mistral Worldwide Hackathon 2026** (Online Track, "Anything Goes").
You're a detective. Mistral is a suspect who's lying. Your job is to catch the lie through questioning alone.

**Solo project. 48-hour hackathon. Started Feb 28, 2026.**

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind v4)
- Mistral Large 3 via `@mistralai/mistralai` SDK — suspect AI brain + case generation + accusation evaluation
- Voxtral STT via Mistral API — speech-to-text for player voice input
- ElevenLabs TTS — suspect voice output with dynamic stress-based stability
- Browser SpeechSynthesis — fallback voice when ElevenLabs unavailable
- No database. All state in React state + sessionStorage for game results. Leaderboard in `/tmp`.

## Project Structure

```
interrogation/
├── app/
│   ├── layout.tsx                    # Root layout, JetBrains Mono font
│   ├── globals.css                   # Tailwind v4 + custom animations (clueReveal, pixelFloat, etc.)
│   ├── page.tsx                      # Title screen — hero image, sponsor logos, nav
│   ├── cases/page.tsx                # Case select — 7 locations + difficulty picker
│   ├── help/page.tsx                 # How to Play + About This Game + scoring
│   ├── leaderboard/page.tsx          # Top 10 leaderboard with seed data
│   ├── game/
│   │   ├── page.tsx                  # MAIN GAME — orchestrator (801 lines)
│   │   ├── SuspectAvatar.tsx         # PixelLab-generated suspect avatar with expressions
│   │   ├── components/
│   │   │   ├── utils.ts              # EVIDENCE_ICONS, pickRandomIcons, getSceneBg, DIFFICULTY_CLUES, formatTime
│   │   │   ├── TopBar.tsx            # Timer (counts up) + stress meter
│   │   │   ├── SuspectZone.tsx       # Avatar, waveform, dialogue area
│   │   │   ├── CaseFile.tsx          # Right sidebar — evidence badges, clues, hints, exchange log
│   │   │   ├── Dock.tsx              # Bottom action bar — speak, type, notes, hint, accuse, settings, help, exit
│   │   │   └── Panels.tsx            # ClueNotification, TextInputPanel, NotesPanel, ExitConfirmDialog, AccuseConfirmDialog, SettingsPanel, HelpPanel
│   │   ├── win/page.tsx              # Win screen — confession, case breakdown, score, leaderboard submit
│   │   └── lose/page.tsx             # Lose screen — what you missed, the truth revealed
│   └── api/
│       ├── generate-case/route.ts    # GET — generates a new case via Mistral (supports ?setting= &difficulty=)
│       ├── interrogate/route.ts      # POST — sends player question, gets suspect response
│       ├── evaluate/route.ts         # POST — win/loss evaluation via Mistral
│       ├── accuse/route.ts           # POST — formal accusation evaluation (correct/incorrect + confession/denial)
│       ├── tts/route.ts              # POST — ElevenLabs TTS with stress-based stability
│       ├── transcribe/route.ts       # POST — Voxtral STT (audio blob → text)
│       └── leaderboard/route.ts      # GET/POST — file-based leaderboard with scoring formula
├── src/
│   ├── lib/
│   │   ├── mistral.ts                # Mistral client: generateCase, interrogate, evaluateAccusation, evaluateWin, generateLossSummary
│   │   ├── scoring.ts                # calculateScore (sqrt curve) + getDetectiveRating
│   │   ├── game-state.ts             # Case type definition
│   │   ├── voice-input.ts            # VoiceInput class (unused, recording inlined in page.tsx)
│   │   └── voice-output.ts           # VoiceOutput class (unused, ElevenLabs in page.tsx)
│   └── types/
│       └── speech.d.ts               # SpeechRecognition type declarations
├── public/
│   ├── bg/                           # Pixel art room backgrounds (7 locations)
│   ├── clues/                        # Evidence icons — pixel art items
│   ├── suspects/                     # PixelLab-generated suspect portraits
│   ├── sponsors/                     # Hackathon sponsor logos (11 .webp files)
│   ├── solved/                       # Case closed stamp
│   ├── ui/                           # UI assets (logos)
│   └── logo/                         # Game logos
└── .env                              # MISTRAL_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
```

## How It Works

### Game Flow
1. Player picks a location + difficulty → `/api/generate-case` calls Mistral to create a unique crime, suspect, cover story, and ONE lie
2. Briefing screen shows the case — crime, suspect name/role, setting, difficulty badge
3. Player clicks BEGIN → game starts, timer counts UP from 0:00
4. Player taps mic → MediaRecorder captures audio → `/api/transcribe` (Voxtral STT) → text sent to `/api/interrogate`
5. Mistral responds in character (JSON: spoken_response, stress_level, clue_unlocked, internal_state)
6. ElevenLabs TTS speaks the response (stability decreases with stress)
7. Stress meter, evidence badges, and case file update in real-time
8. Player collects N clues (stress-gated) → unlocks ACCUSE button
9. Player hits ACCUSE → records or types accusation → `/api/accuse` judges accuracy
10. Correct = confession + win screen. Incorrect = denial + lose an attempt (3 total)
11. Win/lose screens call `/api/evaluate` for detailed Mistral analysis

### Scoring Formula (src/lib/scoring.ts)
```
score = timeScore × difficultyMultiplier × hintPenalty × accusationPenalty

timeScore     = 1000 × sqrt(max(0, 1 - elapsed / (parTime × 2)))
parTime       = easy: 240s, medium: 360s, hard: 480s, expert: 600s
multiplier    = easy: 1.0×, medium: 1.5×, hard: 2.0×, expert: 2.5×
hintPenalty   = 0.85^hintsUsed  (−15% each)
accusePenalty = max(0, 1 − wrongAccusations × 0.1)  (−10% each)
```

### Difficulty System
- **Easy:** 2 clues needed, 2 stress triggers, obvious lie, nervous suspect
- **Medium:** 3 clues, 3 triggers, catchable lie, composed suspect
- **Hard:** 4 clues, 4 triggers, subtle lie, skilled deflector
- **Expert:** 5 clues, 5 triggers, deeply buried lie, manipulative suspect

### Clue System
- Clues unlock at stress thresholds spread across 1-9 (dynamic per difficulty)
- Each clue = detective observation (one sentence, not dialogue)
- Badge notification pops center-screen with `clueReveal` animation
- Evidence icons shown in sidebar — grayscale until unlocked
- Accuse button locked until all clues collected

### Key Mechanic: Never Confess
The AI is instructed to NEVER confess or admit lying, even at stress 9. The player wins by making a specific accusation that the judge AI evaluates separately. This prevents auto-confess and forces genuine detective work.

## Design System

- **Background:** `#0A0A0A` (near black)
- **Text:** `#E8E8E8` (off white)
- **Accent red:** `#C41E1E` (stress, danger, accuse)
- **Gold:** `#C8A050` (hints, active toggles, suspect name)
- **Surface:** `#2A2A2A` (panels, borders)
- **Dark surface:** `#1A1A1A` / `#111111`
- **Font:** JetBrains Mono (monospace)
- **Aesthetic:** Noir detective. Dark, minimal, typographic. Pixel art backgrounds. No chat bubbles.

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
MISTRAL_API_KEY=xxx          # Required — Mistral API (case gen, interrogation, evaluation, STT)
ELEVENLABS_API_KEY=xxx       # Required — ElevenLabs TTS for suspect voice
ELEVENLABS_VOICE_ID=xxx      # Optional — specific ElevenLabs voice ID
```

## Key Decisions

1. **Voxtral STT** for voice input — Mistral's own speech model, judges want to see Mistral ecosystem usage
2. **ElevenLabs TTS** with stress-based stability — voice literally degrades as suspect gets nervous
3. **Browser SpeechSynthesis** as fallback — works when ElevenLabs is unavailable
4. **MediaRecorder + silence detection** — 2s silence auto-stops recording, no manual stop needed
5. **sessionStorage** for game results — no URL size limits, cleaner URLs, no database needed
6. **Timer counts UP** — no arbitrary time pressure, speed rewarded through scoring formula
7. **3 accusations max** — only lose condition (no timer-based lose). Forces careful play.
8. **Separate accusation judge** — different Mistral call evaluates the accusation independently from the suspect character
9. **Structured JSON responses** — stress_level, clue_unlocked fields let game state be driven by AI assessment
10. **Modular components** — game page (801 lines) orchestrates 7 extracted component files

## Hackathon Context

- **Judging criteria:** Creativity/uniqueness (most important), Future potential, Technical implementation, Pitch quality
- **Special prizes:** Best Mistral Vibe (AirPods), Best Voice AI (ElevenLabs 6mo)
- **Sponsors:** Mistral, ElevenLabs, NVIDIA, AWS, Hugging Face, Jump Trading, Weights & Biases, Giant, Raise, Tilde Research, White Circle
- **Winner announced:** Friday March 6. Public votes (likes) determine finals entry.
- **Pitch line:** "Mistral can reason. I made it lie. Your job is to catch it."

## Builder

Jason Poindexter — Designer, 15 years (Apple, Google, YouTube, FedEx, London Stock Exchange). Building Gripe (market intelligence), Kern (design system enforcement). Solo entry, online track from Barcelona.
