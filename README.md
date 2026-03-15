# 🎮 BrainPlay v0.9.2

**Platform Web Game 30 Hari — Santai & Mengasah Otak**

Dibuat oleh **Dwi Agus Hidayat**

---

## Teknologi
- React 18 + Vite 5
- Pure CSS animations (no external UI lib)
- Canvas-based games (Slither Worm, Space Shooter)
- localStorage persistence
- Deploy: Vercel

## Game Aktif (9 Game)
| # | Game | Tipe | Hari |
|---|------|------|------|
| 1 | Memory Card Match | Puzzle | Day 1 |
| 2 | Slither Worm | Casual | Day 2 |
| 3 | Connect Blocks | Puzzle | Day 3 |
| 4 | Word Search | Puzzle | Day 4 |
| 5 | Space Shooter | Casual | Day 5 |
| 6 | Hangman | Kata | Day 6 |
| 7 | Color Sort | Puzzle | Day 7 |
| 8 | Sudoku | Logika | Day 8 |
| 9 | Jigsaw Puzzle | Puzzle | Day 9 |

## Fitur
- 9 game dengan 3 level kesulitan masing-masing
- Coin system + Shop (icon packs, snake skins, tile themes, highlights, consumables)
- 26 achievements dengan progress tracking
- XP dan level progression system
- Streak combo multiplier (1.2x 3hari, 1.5x 7hari, 2.0x 14hari)
- Daily login reward (7-day streak)
- Dark mode + responsive mobile design
- Sound effects + background music
- Interactive particle background
- Notification toast system

## Changelog v0.9.2

### Gameplay Polish (4 game prioritas)

**Slither Worm**
- Turn rate increased (0.10 → 0.14) + dynamic stick-magnitude scaling
- Camera follow sped up (0.09 → 0.12 lerp) — less laggy
- Joystick enlarged 112→130px, knob 44→52px for mobile
- Boost button enlarged 74→86px for easier tapping
- Eat particles — sparkle burst when consuming food
- Kill particles — explosion effect when killing bots
- Death cause tracking — "menabrak bot musuh" vs "menabrak tembok"
- Snappier steering — push joystick further = turn faster

**Connect Blocks**
- Removed confusing red flash on single-tap
- Cell sizing improved — smarter formula with 44px minimum
- Chain indicator — bigger glowing badge with pop animation

**Hangman**
- Keyboard buttons — responsive sizing with clamp() (was fixed 34px)
- Word letters — dynamic sizing based on word length (Hard mode fits)
- Visual hearts — replaced numeric lives with heart icons + pulse on low HP
- Letter reveal animation — popLetter keyframe on correct guess

**Space Shooter**
- Touch movement — smooth 35% lerp (was hard speed cap) — buttery feel
- Screen shake — intensity scales with timer for decaying effect

### UI/UX Improvements
- Interactive Particle Background on Home page
- GameCard ripple effect + win count badge per game
- Scroll-to-top button di Home page
- Streak combo badge di Navbar dan Home banner

### Sistem Baru
- Streak Combo Multiplier — XP bonus berdasarkan streak harian
- NotifContext — toast notification system (info, success, error, reward, levelup)
- GameLayout components — reusable GameHeader, StatsBar, WinModal, LoseModal
- Participation coins — game yang kalah dapat 5 coin

### Bug Fixes
- MemoryCardMatch WinModal star calculation (hardcoded → pairs)
- MemoryCardMatch hint stale closure + board lock saat hint
- Tutorial storage keys di semua 9 game ke centralized bp_tut prefix
- Storage migration untuk old tutorial keys

## Development

```bash
npm install
npm run dev
npm run build
```
