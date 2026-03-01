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
- Supabase (leaderboard persistence with RLS)
- Framer Motion (animations across all pages)
- sessionStorage for game result passing between pages

## Project Structure

```
interrogation/
├── app/
│   ├── layout.tsx                    # Root layout, JetBrains Mono font
│   ├── globals.css                   # Tailwind v4 + design tokens + custom animations
│   ├── page.tsx                      # Title screen — hero image, sponsor logos, nav
│   ├── error.tsx                     # Global error boundary
│   ├── not-found.tsx                 # 404 page
│   ├── components/
│   │   ├── ui.tsx                    # Shared UI: BackButton, PageHeader, Spinner, PageShell, InfoPanel
│   │   └── motion.tsx                # Shared Framer Motion variants + transitions
│   ├── data/
│   │   ├── cases.ts                  # CASES + DIFFICULTY_CONFIG constants
│   │   └── leaderboard-seeds.ts      # Seed leaderboard entries (3-letter initials)
│   ├── cases/page.tsx                # Case select — 7 locations + difficulty picker
│   ├── help/page.tsx                 # How to Play + About This Game + scoring
│   ├── leaderboard/page.tsx          # Top 10 leaderboard with new-entry animation
│   ├── settings/page.tsx             # Settings page
│   ├── about/page.tsx                # About page
│   ├── game/
│   │   ├── page.tsx                  # MAIN GAME — orchestrator (~283 lines)
│   │   ├── SuspectAvatar.tsx         # PixelLab-generated suspect avatar with expressions
│   │   ├── hooks/
│   │   │   ├── useVoiceRecorder.ts   # MediaRecorder + silence detection + transcription
│   │   │   ├── useTTS.ts            # ElevenLabs + browser fallback, voice selection, skip
│   │   │   ├── useGameTimer.ts       # Count-up timer with pause during TTS/processing
│   │   │   ├── useSfx.ts            # Sound effects — cached Audio elements, master volume, fade envelopes
│   │   │   ├── useSettings.ts       # Game settings (TTS, music/SFX volume, font, contrast)
│   │   │   └── useBriefingTTS.ts    # Briefing narration TTS with typewriter sync
│   │   ├── components/
│   │   │   ├── utils.ts              # EVIDENCE_ICONS, pickRandomIcons, getSceneBg, DIFFICULTY_CLUES, formatTime
│   │   │   ├── TopBar.tsx            # Timer (counts up) + stress meter
│   │   │   ├── SuspectZone.tsx       # Avatar, waveform, dialogue area
│   │   │   ├── CaseFile.tsx          # Right sidebar — evidence badges, clues, hints, exchange log
│   │   │   ├── Dock.tsx              # Bottom action bar — speak, type, notes, hint, accuse, give up, settings, help, exit
│   │   │   ├── icons.tsx             # SVG icons for dock buttons
│   │   │   ├── CloseIcon.tsx         # Shared close icon
│   │   │   ├── BriefingScreen.tsx    # Pre-game case overview
│   │   │   ├── LoadingScreen.tsx     # Generating case spinner + How to Play
│   │   │   ├── ClueNotification.tsx  # Center-screen clue badge popup
│   │   │   ├── TextInputPanel.tsx    # Type-to-question input
│   │   │   ├── NotesPanel.tsx        # Player notes sidebar
│   │   │   ├── AccuseConfirmDialog.tsx # Accusation confirmation
│   │   │   ├── ExitConfirmDialog.tsx # Exit game confirmation
│   │   │   ├── GiveUpConfirmDialog.tsx # Give up confirmation
│   │   │   ├── SettingsPanel.tsx     # In-game settings
│   │   │   └── HelpPanel.tsx         # In-game help overlay
│   │   ├── win/
│   │   │   ├── page.tsx              # Win screen — APPREHENDED, score breakdown, confession, case details
│   │   │   └── InitialsEntry.tsx     # Arcade HIGH SCORE overlay — 3-letter initials entry
│   │   └── lose/page.tsx             # Lose screen — ESCAPED, case summary, what you missed
│   └── api/
│       ├── generate-case/route.ts    # GET — generates a new case via Mistral (supports ?setting= &difficulty=)
│       ├── interrogate/route.ts      # POST — sends player question, gets suspect response
│       ├── evaluate/route.ts         # POST — win/loss evaluation via Mistral
│       ├── accuse/route.ts           # POST — formal accusation evaluation (correct/incorrect + confession/denial)
│       ├── tts/route.ts              # POST — ElevenLabs TTS with stress-based stability
│       ├── transcribe/route.ts       # POST — Voxtral STT (audio blob → text)
│       └── leaderboard/route.ts      # GET/POST — Supabase leaderboard with scoring formula
├── src/
│   ├── lib/
│   │   ├── mistral.ts                # Mistral client: generateCase, interrogate, evaluateAccusation, evaluateWin, generateLossSummary
│   │   ├── scoring.ts                # calculateScore (sqrt curve) + getDetectiveRating
│   │   ├── db.ts                     # Supabase client
│   │   ├── sanitize.ts               # Input validation helpers
│   │   ├── game-state.ts             # Case type definition
│   │   ├── voice-input.ts            # VoiceInput class (unused, recording inlined in hooks)
│   │   └── voice-output.ts           # VoiceOutput class (unused, ElevenLabs in hooks)
│   └── types/
│       └── speech.d.ts               # SpeechRecognition type declarations
├── public/
│   ├── bg/                           # Pixel art room backgrounds (7 locations)
│   ├── clues/                        # Evidence icons — pixel art items
│   ├── suspects/                     # PixelLab-generated suspect portraits
│   ├── sponsors/                     # Hackathon sponsor logos (11 .webp files)
│   ├── solved/                       # APPREHENDED (caught.png) + ESCAPED (escaped.png) images
│   ├── detective/                    # Detective background art
│   ├── efx/                           # Sound effects — all mono 22kHz 48kbps MP3, trimmed to <1s each
│   ├── music/                         # Background music tracks (menu + game pools)
│   ├── ui/                           # UI assets (logos)
│   └── logo/                         # Game logos
├── scripts/
│   └── generate-suspects.ts          # PixelLab suspect portrait generation
└── .env                              # MISTRAL_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, SUPABASE vars
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

### End-Game Flow
- **Win:** APPREHENDED image → staggered score reveal → scroll-triggered HIGH SCORE overlay → 3-letter initials entry → choice: View Leaderboard or Back to Score
- **Lose (out of accusations):** ESCAPED image → case summary → suspect taunt → the lie/truth/what would have cracked them
- **Lose (gave up):** Same ESCAPED screen but with "Surrendered" outcome + AI-generated smug remark via TTS
- **Leaderboard:** New entries drop in with spring animation, gold glow pulse, "NEW" badge

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

### Sound System
- **useSfx hook** (`app/game/hooks/useSfx.ts`): Central SFX manager with Audio element caching, master volume scaling from settings, and per-sound fade envelopes
- All audio files are mono 22kHz 48kbps MP3, trimmed to exact needed duration (<1s each, ~160KB total)
- Every sound has a fade config (delay + duration) — nothing plays uncontrolled
- Volume tiers: UI clicks 0.15, paper 0.12, dramatic 0.18-0.22, ambient 0.06-0.08
- Inline `playSfx`/`clickSfx` helpers outside game pages read `sfxVolume` from localStorage
- Speaker/mute button mutes both music AND SFX, restores both on unmute
- Ambient system: clock ticks every ~12s, nervous fidgeting sounds at stress >= 6 (probability scales with stress)
- Music: crossfade between menu/game pools (sequential fade out 2s → fade in 2s), track-ended auto-advances

### Key Mechanic: Never Confess
The AI is instructed to NEVER confess or admit lying, even at stress 9. The player wins by making a specific accusation that the judge AI evaluates separately. This prevents auto-confess and forces genuine detective work.

## Design System

All colors are registered as Tailwind v4 tokens in `globals.css`. Use token names, never hardcoded hex.

- **Background:** `bg-black` (`#000000`)
- **Text:** `text-foreground` (`#E8E8E8`)
- **Accent red:** `text-accent` / `bg-accent` (`#C41E1E`) — stress, danger, accuse
- **Accent hover:** `bg-accent-hover` (`#ff4444`)
- **Gold:** `text-gold` / `bg-gold` (`#C8A050`) — hints, active toggles, suspect name, high score
- **Gold hover:** `bg-gold-hover` (`#D4AD5C`)
- **Warning:** `text-warn` (`#F59E0B`)
- **Surface:** `bg-surface` (`#2A2A2A`) — panels, borders
- **Surface hover:** `bg-surface-hover` (`#3A3A3A`)
- **Surface dark:** `bg-surface-dark` (`#1A1A1A`)
- **Surface darker:** `bg-surface-darker` (`#111111`)
- **Bronze:** `text-bronze` (`#B87333`)
- **Font:** JetBrains Mono (monospace)
- **Aesthetic:** Noir detective. Dark, minimal, typographic. Pixel art backgrounds. No chat bubbles.

### Animation System
Shared variants in `app/components/motion.tsx`: `fadeIn`, `fadeUp`, `fadeDown`, `scaleIn`, `slideLeft`, `slideRight`, `stagger()`. Transition presets: `smooth`, `snappy`, `springy`, `gentle`. `PageMotion` wrapper for page-level fade-in.

### Shared UI Components
`app/components/ui.tsx`: `BackButton`, `PageHeader`, `Spinner`, `PageShell`, `InfoPanel`. Use these instead of duplicating patterns.

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
MISTRAL_API_KEY=xxx                    # Required — Mistral API (case gen, interrogation, evaluation, STT)
ELEVENLABS_API_KEY=xxx                 # Required — ElevenLabs TTS for suspect voice
ELEVENLABS_VOICE_ID=xxx                # Optional — specific ElevenLabs voice ID
NEXT_PUBLIC_SUPABASE_URL=xxx           # Required — Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx      # Required — Supabase anon key (public, RLS-protected)
```

## Key Decisions

1. **Voxtral STT** for voice input — Mistral's own speech model, judges want to see Mistral ecosystem usage
2. **ElevenLabs TTS** with stress-based stability — voice literally degrades as suspect gets nervous
3. **Browser SpeechSynthesis** as fallback — works when ElevenLabs is unavailable
4. **MediaRecorder + silence detection** — 2s silence auto-stops recording, no manual stop needed
5. **sessionStorage** for game results — no URL size limits, cleaner URLs
6. **Supabase** for leaderboard — RLS policies for public read + insert, no auth needed
7. **Timer counts UP** — no arbitrary time pressure, speed rewarded through scoring formula
8. **3 accusations max** — only lose condition (no timer-based lose). Forces careful play.
9. **Give Up option** — AI generates smug remark, reveals answers, counts as loss
10. **Separate accusation judge** — different Mistral call evaluates the accusation independently from the suspect character
11. **Structured JSON responses** — stress_level, clue_unlocked fields let game state be driven by AI assessment
12. **Modular architecture** — game page ~283 lines, extracted hooks + components, pages ≤300 lines, components ≤150 lines
13. **Arcade high score** — scroll-triggered overlay, 3-letter initials, spring animation on leaderboard entry

## File Size Limits

- Pages: ≤300 lines
- Components: ≤150 lines
- Utilities: ≤50 lines

## Hackathon Context

- **Judging criteria:** Creativity/uniqueness (most important), Future potential, Technical implementation, Pitch quality
- **Special prizes:** Best Mistral Vibe (AirPods), Best Voice AI (ElevenLabs 6mo)
- **Sponsors:** Mistral, ElevenLabs, NVIDIA, AWS, Hugging Face, Jump Trading, Weights & Biases, Giant, Raise, Tilde Research, White Circle
- **Winner announced:** Friday March 6. Public votes (likes) determine finals entry.
- **Pitch line:** "Mistral can reason. I made it lie. Your job is to catch it."

## Builder

Jason Poindexter — Designer, 15 years (Apple, Google, YouTube, FedEx, London Stock Exchange). Building Gripe (market intelligence), Kern (design system enforcement). Solo entry, online track from Barcelona.
