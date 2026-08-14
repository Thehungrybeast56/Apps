# LogIQ — Product Requirements Document

## Vision
A gamified mobile trainer that turns logical reasoning & problem solving into an addictive 100-level journey. By the finish line, the player has been exposed to every core reasoning concept — pattern recognition, sequences, deduction, spatial reasoning, logic grids, probability, self-reference, and classic brain-teaser paradoxes.

## Core Loop
Open app → see Journey → tap next unlocked level → read puzzle → (optional AI hint) → pick answer → submit → celebrate/learn from AI coach → next level. XP + streak + badges + daily challenge keep the loop sticky.

## Screens
1. **Onboarding** — one-tap start, hero image + tagline.
2. **Journey (Levels Map)** — vertical zig-zag path with 100 chunky nodes across 4 zones (Sprout 1-20, Growth 21-50, Ascent 51-80, Summit 81-100). Current node pulses in yellow.
3. **Puzzle Play** — question card, 4 pill answers, sticky Submit, hint button that streams a Gemini-generated hint.
4. **Level Complete** — trophy or sad-face emoji, +XP chip, correct answer, concept label, streamed AI coach explanation, next-level CTA.
5. **Daily Challenge** — one deterministic puzzle per UTC day with hero card.
6. **Profile** — avatar, XP, streak, badges grid (9 badges), reset progress.

## Puzzle Bank (100 levels)
Curated in `/app/backend/puzzles_data.py`. Difficulty ramps: easy → medium → hard → expert. Categories: pattern, sequence, math, riddle, deduction, spatial, logic_grid.

## Gamification
- **XP**: 10 (easy) / 20 (medium) / 35 (hard) / 60 (expert)
- **Streak**: consecutive UTC days played
- **Badges**: First Step, 3-Day Streak, Week Warrior, Rookie Solver, Sharp Mind, Half Genius, Puzzle Pro, Logic Master, Daily Devotee
- **Progress**: stored locally with AsyncStorage under `logiq_progress_v1`

## Integrations
- **Emergent LLM Key** (Gemini 3 Flash) → streamed AI hints (`POST /api/hint`) and explanations (`POST /api/explain`).

## API
- `GET /api/puzzles` — 100 meta records
- `GET /api/puzzles/{level}` — full puzzle
- `GET /api/daily-challenge` — deterministic puzzle for UTC date
- `POST /api/hint` — streams hint text
- `POST /api/explain` — streams post-answer coaching

## Design
Tactile / Playful LIGHT personality. Grass green / coral / sunny yellow palette. Fredoka + Nunito. Rounded nodes, chunky pill buttons, bouncy 0.93 press scale, Phosphor-style icons via @expo/vector-icons.

## Future Enhancements
- Cloud sync via user account
- Social leaderboard
- Level rating / user-submitted puzzles
- Rewind / revisit any completed level for practice

## Implemented Updates
- 2026-08-14: MVP — 100 puzzles, journey map, AI hints/explanations, XP/streak/badges, daily challenge.
- 2026-08-14: **Practice Mode** — tapping any completed (green) level replays it in practice mode; no streak/XP/completion change (banner + tag shown).
- 2026-08-14: **Concept Tracker** — per-category attempts recorded on every answer; Profile shows Concept Mastery with strongest/weakest cards and accuracy bars per reasoning skill.
- 2026-08-14: **Celebration FX** — confetti cannon, synthesized success/wrong chimes (expo-audio), and a spring-bounce animated mascot with a result pin on the win screen.
