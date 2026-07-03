# Neon Trivia VR

A neon-lit holographic trivia game built for WebXR and browser. Test your knowledge across 10 categories with 600 questions, 11 game modes, and a full achievement system — all rendered in immersive 3D spatial UI.

**[Play Now](https://ellyz2426.github.io/neon-trivia/)**

---

## Features

### Trivia Content
- **600 trivia questions** across 10 categories
- **10 categories**: Science, History, Geography, Entertainment, Sports, Technology, Nature, Food & Drink, Arts & Culture, General Knowledge
- **3 difficulty levels**: Easy, Medium, Hard with per-difficulty accuracy tracking
- **Dynamic difficulty** in Endless mode — auto-scales from easy to hard

### Game Modes
1. **Classic** — 20 questions, standard rules
2. **Speed** — 60-second timer, answer as many as you can
3. **Streak** — One wrong answer ends the game
4. **Category** — Pick a category, 20 questions deep
5. **Daily Challenge** — Same questions globally each day (seeded PRNG)
6. **Blitz** — 10 seconds per question
7. **Marathon** — 50 questions, endurance test
8. **Practice** — No timer, no pressure
9. **Challenge** — Head-to-head vs AI opponent with difficulty-based answering probability
10. **Endless** — 3 lives, no timer, difficulty scales dynamically. Survive as long as you can!
11. **Survival** — Beat the clock! Start with 30 seconds; correct answers add time, wrong answers subtract. Harder questions reward more time.

### Progression & Rewards
- **XP & Leveling** system with combo multipliers
- **60 achievements** with persistent tracking and golden unlock notifications
- **Top-15 leaderboard** with mode filtering (All / Classic / Challenge / Endless / Speed)
- **Career stats** dashboard with per-category and per-difficulty accuracy
- **Game history** tracking (last 20 games)
- **Daily streak** tracking
- **Level progress** tracking on title and game over screens

### Gameplay Features
- **3 lifelines**: 50:50, Skip, Hint
- **2 power-ups**: Double Points (2x), Time Freeze
- **Combo scoring** with multipliers up to x10
- **Streak visual effects**: "ON FIRE" at 5+, "UNSTOPPABLE" at 10+ with golden particles
- **Post-game review** with scrollable question results and pagination
- **6 neon themes**: Holodeck, Crimson, Toxic, Ultraviolet, Solar, Arctic

### Visual & Audio
- **Procedural audio system** (Web Audio API tone synthesis)
  - Correct answer ding, wrong answer buzz, timer tick
  - Streak fanfare, achievement fanfare, game over chord
  - Menu click, countdown beeps, GO! tone
  - All sounds respect Master Volume × SFX Volume settings
- **3D holodeck environment** with wireframe decorations, particle effects, fog, and neon grids
- **Animated torus ring** with dynamic rotation
- **4 orbiting point lights** with varying heights
- **250 atmospheric particles** with additive blending
- **Timer urgency effects** — pulsing red lights and tick sounds when timer < 5 seconds
- **Holographic panel float** — subtle sine-wave oscillation on menu panels
- **Achievement notification overlays** with golden styling
- **Trail particle effects** on combo streaks
- **XR controller haptic feedback** for correct/wrong/milestone events
- **HUD bounce** on correct answers, red flash on wrong

## How to Play

### Browser Controls
| Key | Action |
|-----|--------|
| `1-4` | Select answer A-D |
| `F` | Use 50:50 lifeline |
| `S` | Skip question |
| `H` | Use hint |
| `D` | Activate Double Points |
| `T` | Activate Time Freeze |
| `Esc` / `P` | Pause game |

### VR Controls
| Input | Action |
|-------|--------|
| Laser pointer | Select UI buttons |
| `A` button | Activate Double Points |
| `B` button | Pause game |

## Tech Stack

- **IWSDK** 0.4.x — Immersive Web SDK (Meta's WebXR framework)
- **TypeScript** — Fully typed, zero `as any` casts
- **PanelUI / UIKitML** — All 18 spatial UI panels, zero HTML DOM overlays
- **Vite** — Build tooling with UIKitML plugin
- **localStorage** — Persistent stats, achievements, leaderboard, settings

## Build & Run

```bash
# Install dependencies
npm install

# Start dev server
npx vite --host

# Type check
npx tsc --noEmit

# Production build
npm run build
```

## Credits

Built with IWSDK (Immersive Web SDK) by Meta's WebXR team. Designed for dual runtime — works in both standard browsers and WebXR headsets.

IWSDK Daily Build #86 — 2026-07-03
