# 🎮 BrainPlay v0.9.9

**Platform Web Game 30 Hari — Santai & Mengasah Otak**

Dibuat oleh **Dwi Agus Hidayat**

---

## Teknologi
- React 18 + Vite 8
- Pure CSS animations & **GSAP (GreenSock)** untuk animasi premium
- Canvas-based games (Slither Worm, Space Shooter, Voxel Racer, dll.)
- localStorage persistence + Firebase (auth, Firestore leaderboard/analytics, cloud save)
- Firebase App Check & Security Rules (Anti-Cheat)
- Capacitor 6 (Android)
- Push Notifications API (browser)
- Deploy: Vercel

## Game aktif (24 game)

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
| 23 | Fields of Adventure | Action | 23 |
| 24 | Letter Tiles | Kata | 24 |

Sumber kebenaran daftar game: array `GAMES` di `src/App.jsx`.

## Fitur Unggulan
- **24 Game Eksklusif** dengan 3 level kesulitan masing-masing.
- **Global Context-Aware Mascot 🤖** — Maskot melayang cerdas yang menemani pemain di seluruh menu dan memberikan obrolan dinamis tergantung posisi halaman (Shop, Games, Profile, dll).
- **Lucky Wheel (Gacha System) 🎰** — Putar roda keberuntungan tiap hari untuk mengoleksi item eksklusif dan koin.
- **Anti-Cheat & Security 🛡️** — Arsitektur keamanan tinggi dengan Firebase App Check, Server-Side validation, dan Attempt-Log model untuk kompetisi yang adil.
- **Shop & Cosmetics 🛍️** — Sesuaikan penampilan antarmuka dengan:
  - Tema global app (Dark/Light mode & Website Themes)
  - Maskot Skin & Topi
  - Visual kustom untuk banyak game spesifik (misal skin cacing, partikel balapan).
- Achievements + XP / level progression.
- Streak combo multiplier (1.2x 3 hari, 1.5x 7 hari, 2.0x 14 hari).
- **Push notification** — daily challenge, streak, milestone.
- Sound effects + background music lengkap.
- Leaderboard lokal + online tersinkronisasi Firebase.

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

## Changelog ringkas (v0.9.9)

- Peningkatan UI/UX besar-besaran dengan efek animasi GSAP yang premium di Home, Profile, dan Shop.
- Diperkenalkannya **Global Mascot Assistant** dengan konteks pintar per-halaman. Termasuk *mini-game TicTacToe* rahasia di bubble interaksi.
- Penambahan dua game baru: *Fields of Adventure* dan *Letter Tiles*.
- Mode keamanan *Anti-Cheat* dan *App Check Firebase* diaktifkan.
- **Lucky Wheel** system hadir untuk pembagian *daily reward* yang interaktif.
- Optimalisasi pembagian komponen ke status *lazy loading*.
