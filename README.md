# Interrogation

A voice-based detective interrogation game. You're a detective. Mistral is a suspect who's lying. Your job is to catch the lie through questioning alone.

Every case is procedurally generated — a unique white-collar crime, suspect, cover story, and one hidden lie. The suspect is played by Mistral Large, given a full backstory and instructed to defend it under adversarial pressure. No two cases are the same.

Built for the **Mistral Worldwide Hackathon 2026** (Online Track).

> *"Mistral can reason. I made it lie. Your job is to catch it."*

## How It Works

1. Pick a location and difficulty
2. A unique case is generated — crime, suspect, cover story, and one lie
3. Interrogate the suspect using voice or text
4. The suspect responds in character with stress-reactive voice
5. Collect clues by asking the right questions under pressure
6. Make your accusation — a separate judge AI evaluates it
7. Correct = confession. Wrong = lose an attempt (3 total)

The AI is instructed to **never confess**, even at maximum stress. You win by making a specific, accurate accusation — not by getting the suspect to crack.

## Stack

- **Next.js 16** — App Router, TypeScript, Tailwind v4
- **Mistral Large 3** — suspect AI brain, case generation, accusation evaluation
- **Voxtral STT** — speech-to-text for player voice input
- **ElevenLabs TTS** — suspect voice with dynamic stress-based stability
- **Browser SpeechSynthesis** — fallback when ElevenLabs unavailable
- **Supabase** — leaderboard persistence with RLS, game export storage
- **Framer Motion** — animations across all pages
- **PixelLab** — procedurally generated suspect portraits

## Getting Started

```bash
npm install
cp .env.example .env    # Fill in your API keys
npm run dev             # http://localhost:3000
```

### Environment Variables

```
MISTRAL_API_KEY=            # Required — case gen, interrogation, evaluation, STT
ELEVENLABS_API_KEY=         # Required — TTS for suspect voice
ELEVENLABS_VOICE_ID=        # Optional — specific ElevenLabs voice ID
NEXT_PUBLIC_SUPABASE_URL=   # Required — Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Required — Supabase anon key (RLS-protected)
SUPABASE_SERVICE_ROLE_KEY=  # Optional — admin export endpoint
EXPORT_SECRET=              # Optional — admin export auth
```

API keys can also be configured in the Settings page at runtime — the app ships keyless and players bring their own keys.

### Commands

```bash
npm run dev       # Dev server
npm run build     # Production build
npm run start     # Production server
npm run lint      # ESLint
```

## Game Mechanics

### Difficulty

| Level | Clues | Timer | Suspect Behavior |
|-------|-------|-------|-----------------|
| Easy | 2 | 5 min | Obvious lie, nervous |
| Medium | 3 | 7 min | Catchable lie, composed |
| Hard | 4 | 9 min | Subtle lie, skilled deflector |
| Expert | 5 | 10 min | Deeply buried lie, manipulative |

An **unlimited** timer mode is also available — on hard/expert, the suspect will lawyer up after 4 consecutive high-stress exchanges.

### Clue System

Clues unlock at stress thresholds spread across 1–9, gated by:
- Minimum question count per difficulty
- Minimum question length (no one-word fishing)
- Server-enforced stress thresholds per clue number

The Accuse button unlocks only after all required clues are collected.

### Scoring

```
score = timeScore x difficultyMultiplier x efficiencyBonus x hintPenalty x accusationPenalty

timeScore       = 1000 x sqrt(max(0, 1 - elapsed / (parTime x 2)))
multiplier      = easy 1.0x, medium 1.5x, hard 2.0x, expert 2.5x
efficiencyBonus = 1.0-1.5x (fewer questions than par = bonus)
hintPenalty     = 0.85^hintsUsed
accusePenalty   = max(0, 1 - wrongAccusations x 0.1)
```

Score is calculated **server-side** from frozen stats at win time — client values are ignored.

### End Game

- **Win:** APPREHENDED stamp, staggered score reveal, arcade-style 3-letter initials entry, leaderboard
- **Lose (accusations):** ESCAPED, case summary, suspect taunt, the lie revealed
- **Lose (time):** Same as above with timeout outcome
- **Give up:** AI-generated smug remark via TTS, full case reveal

## Architecture

```
app/
├── page.tsx                     # Title screen
├── cases/                       # Case select — locations + difficulty
├── game/
│   ├── page.tsx                 # Main game orchestrator
│   ├── hooks/                   # useVoiceRecorder, useTTS, useGameTimer, useSfx, useSettings
│   ├── components/              # Dock, TopBar, CaseFile, SuspectZone, BriefingScreen, dialogs
│   ├── win/                     # Win screen + InitialsEntry
│   └── lose/                    # Lose screen
├── leaderboard/                 # Top 20, new-entry animation
├── settings/                    # API key config, export, preferences
├── help/                        # How to play, scoring, about
├── about/                       # Builder info
└── api/
    ├── generate-case/           # GET — Mistral case generation
    ├── interrogate/             # POST — player question → suspect response
    ├── accuse/                  # POST — accusation evaluation (separate judge)
    ├── evaluate/                # POST — win/loss analysis
    ├── hint/                    # POST — obfuscated stress trigger hints
    ├── tts/                     # POST — ElevenLabs TTS
    ├── transcribe/              # POST — Voxtral STT
    ├── leaderboard/             # GET/POST — Supabase leaderboard
    ├── patterns/                # GET/POST — cross-session learning patterns
    └── export/                  # GET — admin JSONL export

src/lib/
├── mistral/                     # Mistral client, interrogation, evaluation, case gen, embeddings
├── game-session.ts              # Server-side session store, win tokens, export
├── game-state.ts                # Type definitions
├── scoring.ts                   # Score calculation + detective ratings
├── sanitize.ts                  # Input validation, injection detection
├── db.ts                        # Supabase client
└── rate-limit.ts                # Per-IP rate limiting
```

## Security

The game runs adversarial AI against player input — security is a core feature, not an afterthought.

**Input sanitization:** 30+ regex injection patterns, Unicode normalization (NFKD), zero-width char stripping, base64 payload detection, gibberish/non-English blocking.

**Output scanning:** AI responses checked against case secrets with fuzzy matching (40% threshold, stop-word filtered). Leaked responses replaced with deflection.

**Judge isolation:** Accusation evaluation uses a separate Mistral call with dedicated system prompt, randomized boundary tokens, stripped injection markers. Judge calls never use player-provided API keys.

**Stress enforcement:** Server-side monotonic clamping — stress only goes up, max +1 per turn. Clue thresholds are server-enforced. AI cannot spike or drop stress to game gates.

**Win tokens:** 128-bit random, timing-safe comparison, single-use, 30-minute TTL. Score calculated from server-side stats snapshot — client-reported values ignored.

**Session security:** 192-bit random IDs, mutex locks, 1-hour TTL, 5000 max sessions with LRU eviction. Timer mode pinned at creation.

**TTS validation:** Requires active session. Text must match a recent assistant message. Prevents free TTS proxy abuse.

**RAG poisoning defense:** Cross-session learned tactics filtered through injection detection and sanitization before prompt inclusion.

## Data Export

Completed games are persisted to Supabase for analysis and model improvement:
- Full case data (including secrets), conversation history, outcome, stats, accusation details
- Admin export: `GET /api/export?secret=EXPORT_SECRET&limit=100&offset=0&outcome=win&difficulty=hard`
- CLI: `EXPORT_SECRET=xxx npx tsx scripts/export-data.ts --output=data/export.jsonl`

## Sound Design

- Immersive audio: ambient clock ticking, nervous fidgeting at high stress, dramatic stings
- Background music with crossfade between menu and game pools
- All SFX mono 22kHz 48kbps MP3, <1s each, with per-sound fade envelopes
- Master volume controls for music and SFX independently
- ElevenLabs voice stability decreases with suspect stress — the voice literally degrades

## Design

Noir detective aesthetic. Dark, minimal, typographic. JetBrains Mono. Pixel art backgrounds and suspect portraits. No chat bubbles — dialogue appears as styled text in the scene.

## Supabase Setup

Create a `leaderboard` table:

```sql
CREATE TABLE leaderboard (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name text NOT NULL,
  case_number text,
  case_setting text,
  suspect_name text,
  time_remaining int,
  stress_level int,
  clues_found int,
  hints_used int,
  accusations_used int,
  detective_rating text,
  score int NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "Public insert" ON leaderboard FOR INSERT WITH CHECK (true);
```

Optional `game_exports` table for training data:

```sql
CREATE TABLE game_exports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text UNIQUE NOT NULL,
  case_data jsonb NOT NULL,
  conversation jsonb NOT NULL,
  outcome text NOT NULL,
  difficulty text NOT NULL,
  setting text,
  stats jsonb NOT NULL,
  accusation_text text,
  accusation_correct boolean,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE game_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert" ON game_exports FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "no_public_read" ON game_exports FOR SELECT TO anon USING (false);
```

Optional `interrogation_patterns` table for cross-session learning:

```sql
CREATE TABLE interrogation_patterns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text UNIQUE NOT NULL,
  setting text,
  difficulty text NOT NULL,
  outcome text NOT NULL,
  questions jsonb,
  effective_questions jsonb,
  max_stress int,
  clues_found int,
  time_elapsed int,
  embedding vector(1024),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE interrogation_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert" ON interrogation_patterns FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_read" ON interrogation_patterns FOR SELECT TO anon USING (true);
```

## Built By

Jason Poindexter — Designer, 15 years. Apple, Google, YouTube, FedEx, London Stock Exchange. Solo entry from Barcelona.
