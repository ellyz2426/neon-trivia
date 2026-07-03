# 🧠 Neon Trivia VR

A holographic quiz show game built with [IWSDK](https://iwsdk.dev) for VR and browser. Test your knowledge across 10 categories in a neon-lit VR holodeck.

**[Play Now](https://ellyz2426.github.io/neon-trivia/)**

## Game Modes

1. **Classic** — 15 questions, timed per-question
2. **Speed** — 60-second countdown, answer as many as possible
3. **Streak** — No timer, game ends on wrong answer
4. **Category** — Pick one of 10 categories, 15 questions
5. **Daily** — Date-seeded challenge, one attempt per day
6. **Blitz** — 10 rapid-fire questions
7. **Marathon** — All 210 questions
8. **Practice** — No timer, no scoring

## Features

- **210 trivia questions** — 21 per category × 10 categories (Science, History, Technology, Geography, Entertainment, Sports, Art & Literature, Music, Nature, Food & Drink)
- **3 difficulty levels** — Easy, Medium, Hard
- **3 lifelines** — 50:50, Skip, Hint
- **40 achievements** with persistent unlock tracking
- **Top 10 leaderboard** per session
- **6 neon themes** — Cyber Blue, Plasma Purple, Neon Green, Solar Gold, Ruby Red, Arctic White
- **XP & leveling** with combo multipliers (x1–x10)
- **Holographic 3D environment** — animated wireframe shapes, particle effects, dynamic fog, floor/ceiling neon grids
- **Spatial UI** — 16 UIKitML panels (zero HTML DOM in-game)
- **localStorage persistence** — stats, leaderboard, achievements, settings

## Controls

All interaction via VR gaze/pointer or mouse — select answer panels, navigate menus, and use lifelines with spatial UI buttons.

## Tech

- **IWSDK v0.4.2** — Meta's Immersive Web SDK (WebXR)
- **Three.js r185** — 3D rendering
- **EliCS v3.4.2** — Entity Component System
- **16 UIKitML panels** — Compiled spatial UI
- **~1,660 lines TypeScript** — Single-file game
- **Vite** — Build tooling

## Development

```bash
npm install
npx iwsdk dev up     # Start dev server
npx iwsdk dev down   # Stop dev server
npm run build        # Production build → dist/
```

## Build Info

IWSDK Daily Build #86 — 2026-07-03
