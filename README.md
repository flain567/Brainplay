# 🎮 BrainPlay v0.9.2

**Platform Web Game 30 Hari — Santai & Mengasah Otak**

Dibuat oleh **Dwi Agus Hidayat**

---

## Teknologi
- React 18 + Vite 5
- Pure CSS animations (no external UI lib)
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

### UI/UX Improvements
- Interactive Particle Background — canvas-based animated particles yang bereaksi terhadap mouse/touch
- GameCard ripple effect + win count badge per game
- Scroll-to-top button di Home page
- Streak combo badge di Navbar dan Home banner
- Improved hover/tap animations pada quick action cards

### Sistem Baru
- Streak Combo Multiplier — XP bonus berdasarkan streak harian
- NotifContext — toast notification system baru (info, success, error, reward, levelup)
- GameLayout components — reusable GameHeader, StatsBar, ActionButtons, WinModal, LoseModal
- Participation coins — game yang kalah dapat 5 coin sebagai partisipasi

### Bug Fixes
- MemoryCardMatch WinModal star calculation (sebelumnya hardcoded, sekarang pakai pairs)
- MemoryCardMatch hint system stale closure + board lock saat hint
- Tutorial storage keys di semua 9 game ke centralized bp_tut prefix
- Storage migration untuk old tutorial keys

## Development

```bash
npm install
npm run dev
npm run build
```
