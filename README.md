# 🎮 BrainPlay v0.9.8

**Platform Web Game 30 Hari — Santai & Mengasah Otak**

Dibuat oleh **Dwi Agus Hidayat**

---

## Teknologi
- React 18 + Vite 8
- Pure CSS animations (no external UI lib)
- Canvas-based games (Slither Worm, Space Shooter, dll.)
- localStorage persistence + Firebase (auth, Firestore leaderboard/analytics, cloud save)
- Capacitor 6 (Android)
- Push Notifications API (browser)
- Deploy: Vercel

## Game aktif (22 game)

| # | Game | Tipe | Hari |
|---|------|------|------|
| 1 | Memory Card Match | Puzzle | 1 |
| 2 | Slither Worm | Casual | 2 |
| 3 | Connect Blocks | Puzzle | 3 |
| 4 | Word Search | Puzzle | 4 |
| 5 | Space Shooter | Casual | 5 |
| 6 | Hangman | Kata | 6 |
| 7 | Color Sort | Puzzle | 7 |
| 8 | Sudoku | Logika | 8 |
| 9 | Jigsaw Puzzle | Puzzle | 9 |
| 10 | Memory Pattern Pro | Puzzle | 10 |
| 11 | Reaction Test | Action | 11 |
| 12 | Neon Dash | Action | 12 |
| 13 | Brick Breaker | Action | 13 |
| 14 | Wordle Indonesia | Kata | 14 |
| 15 | Voxel Racer | Action | 15 |
| 16 | Math Challenge | Logika | 16 |
| 17 | Number Sequence | Logika | 17 |
| 18 | Quiz Trivia Indonesia | Pengetahuan | 18 |
| 19 | Binary Puzzle | Logika | 19 |
| 20 | Sliding Puzzle | Puzzle | 20 |
| 21 | Tower of Hanoi | Logika | 21 |
| 22 | Minesweeper | Logika | 22 |

Sumber kebenaran daftar game: array `GAMES` di `src/App.jsx`.

## Fitur
- 22 game dengan 3 level kesulitan masing-masing (umumnya)
- Coin system + Shop (skins, tema game, **website themes**, dll.)
- Achievements + XP / level progression
- Streak combo multiplier (1.2x 3 hari, 1.5x 7 hari, 2.0x 14 hari)
- Daily login reward (7-day streak)
- **Push notification** — daily challenge, streak, milestone
- **Website themes** — tema global app (light + dark) lewat Shop
- Dark mode + responsive mobile
- Sound effects + background music
- Leaderboard lokal + online (Firestore)

## Admin dashboard (analytics)

Akses admin memakai UID Firebase Auth, **bukan** hardcode di repo.

1. Salin `.env.example` ke `.env.local` (file ini di-ignore Git).
2. Isi `VITE_ADMIN_UIDS` dengan UID dipisah koma, contoh: `VITE_ADMIN_UIDS=uidPertama,uidKedua`.
3. Restart `npm run dev`. Di Vercel/hosting lain, set environment variable yang sama.

Tanpa variabel ini, tombol/menu admin tidak muncul untuk siapa pun.

## Capacitor (Android)

Semua paket `@capacitor/*` memakai **major version yang sama** (6.x). CLI juga 6.x — jangan mencampur CLI 8 dengan core 6.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

### Android

```bash
npm run cap:sync   # build + sync
npm run cap:open   # buka Android Studio
```

## Changelog ringkas (v0.9.8)

- Dokumentasi diselaraskan dengan jumlah game dan stack (Vite 8).
- Admin UID lewat `VITE_ADMIN_UIDS` (lihat `.env.example`).
- `@capacitor/cli` diselaraskan ke 6.x bersama `@capacitor/core` / Android.
- Script `npm run lint` (ESLint 9 + React + React Hooks).

### Riwayat fitur besar (v0.9.5)

- **NotificationManager** — bell + panel notifikasi in-app; browser push untuk daily challenge, hadiah harian, streak at risk, milestone.
- **Website themes** — 9 tema global (Classic gratis + beli di Shop); `ThemeApplicator` + CSS variables.
- **Architecture** — SettingsContext + ThemeApplicator; CoinContext untuk web themes.
