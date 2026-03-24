# 🎮 BrainPlay v0.9.5

**Platform Web Game 30 Hari — Santai & Mengasah Otak**

Dibuat oleh **Dwi Agus Hidayat**

---

## Teknologi
- React 18 + Vite 5
- Pure CSS animations (no external UI lib)
- Canvas-based games (Slither Worm, Space Shooter)
- localStorage persistence
- Push Notifications API (browser)
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
- Coin system + Shop (icon packs, snake skins, tile themes, highlights, ships, hangman/tube/sudoku/jigsaw themes, **website themes**)
- 26 achievements dengan progress tracking
- XP dan level progression system
- Streak combo multiplier (1.2x 3hari, 1.5x 7hari, 2.0x 14hari)
- Daily login reward (7-day streak)
- **Push notification system** — daily challenge reminder, streak at risk alert, milestone celebrations
- **Website themes** — 9 tema global app (Sakura, Ocean, Forest, Sunset, Cyberpunk, Lava, Arctic, Royal) purchasable di Shop
- Dark mode + responsive mobile design
- Sound effects + background music
- Interactive particle background
- Notification toast system

## Changelog v0.9.5

### Notification System
- **NotificationManager** — new component with in-app notification bell + panel dropdown
- **Browser push notifications** — daily challenge reminder, hadiah harian, streak at risk alert
- **Streak milestone alerts** — celebrations at 3, 7, 14, 21, 30 day streaks
- **Daily challenge evening reminder** — prompt at 8pm if challenges uncompleted
- **Notification toggle** — enable/disable in mobile drawer settings
- **Auto permission request** — asks browser permission when user enables notifications
- **Notification bell badge** — unread count indicator with pulse animation
- **Notification panel** — dropdown with timestamp, read/unread state, clear all

### Website Themes (Global App Themes)
- **9 purchasable website themes** — change entire app color scheme (light + dark mode)
- Themes: BrainPlay Classic (free), Sakura Bloom, Deep Ocean, Enchanted Forest, Golden Sunset, Cyberpunk Neon, Lava Glow, Arctic Frost, Royal Velvet
- **ThemeApplicator** — component applies CSS variables from active theme in real-time
- **Shop "Tema" tab** — browse, preview (light/dark), buy, and equip website themes
- Each theme defines: bg, surface, text, muted, border, accent, accentAlt, navBg, navScrolled
- Themes persist via localStorage coin state

### Architecture
- SettingsContext refactored — CSS var application moved to ThemeApplicator
- notifEnabled state added to SettingsContext
- CoinContext extended with webThemes catalog, state, and getActiveWebTheme()

## Development

```bash
npm install
npm run dev
npm run build
```
