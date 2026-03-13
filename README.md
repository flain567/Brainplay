# 🎮 BrainPlay

> Kumpulan game santai & mengasah otak yang dibangun **1 game per hari** selama 30 hari.

![React](https://img.shields.io/badge/React-v18-61DAFB?style=flat-square&logo=react) ![Vite](https://img.shields.io/badge/Vite-v5-646CFF?style=flat-square&logo=vite) ![Games](https://img.shields.io/badge/Games-3%2F25-4ECDC4?style=flat-square) ![Status](https://img.shields.io/badge/Status-Active-4CAF50?style=flat-square)

---

## 🕹 Game yang Tersedia

| Hari | Game | Kategori | Difficulty |
|------|------|----------|------------|
| 1 | 🃏 Memory Card Match | Puzzle | Easy / Medium / Hard |
| 2 | 🐍 Slither Worm | Casual | Easy / Medium / Hard |
| 3 | 🔗 Connect Blocks | Puzzle | Easy / Medium / Hard |

> Game baru ditambahkan setiap hari!

---

## ✨ Fitur

- 🌙 **Dark mode** — toggle di navbar
- 🔊 **Sound effects** — Web Audio API, tanpa library eksternal
- 🎯 **Difficulty selector** — Easy / Medium / Hard per game
- 📊 **Statistik & high score** — tersimpan di localStorage
- 🎓 **Tutorial** — panduan singkat sebelum main pertama kali
- 🎊 **Confetti** — efek saat menang atau cetak rekor baru
- 🔥 **Streak harian** — hitung berapa hari berturut-turut main
- 📱 **Responsif** — bisa dimainkan di HP maupun desktop
- ⚡ **PWA ready** — bisa di-install di HP

---

## 🚀 Cara Menjalankan

```bash
# Clone repo
git clone https://github.com/USERNAME/brainplay.git
cd brainplay

# Install dependencies
npm install

# Jalankan development server
npm run dev

# Build untuk production
npm run build
```

Buka `http://localhost:5173` di browser.

---

## 📁 Struktur Project

```
brainplay/
├── public/
│   ├── favicon.svg
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── Confetti.jsx
│   │   ├── DifficultySelector.jsx
│   │   ├── GameCard.jsx
│   │   ├── Navbar.jsx
│   │   ├── PageTransition.jsx
│   │   ├── SplashScreen.jsx
│   │   └── TutorialModal.jsx
│   ├── context/
│   │   └── SettingsContext.jsx
│   ├── hooks/
│   │   └── useSound.js
│   ├── pages/
│   │   ├── Home.jsx
│   │   └── games/
│   │       ├── MemoryCardMatch.jsx
│   │       ├── SlitherWorm.jsx
│   │       └── Game2048.jsx
│   ├── App.jsx
│   └── main.jsx
└── index.html
```

---

## ➕ Cara Menambah Game Baru

1. Buat file baru di `src/pages/games/NamaGame.jsx`
2. Komponen menerima props: `{ onBack, game, difficulty }`
3. Daftarkan di `src/App.jsx` dalam array `GAMES`

```jsx
{
  id: 'nama-game',
  title: 'Nama Game',
  emoji: '🎯',
  description: 'Deskripsi singkat.',
  color: '#FF6B6B',
  bg: '#FFF0F0',
  tag: 'Puzzle',
  component: NamaGame,
  day: 4,
  difficulties: [
    { id: 'easy',   description: '...', stats: ['...'] },
    { id: 'medium', description: '...', stats: ['...'] },
    { id: 'hard',   description: '...', stats: ['...'] },
  ],
}
```

---

## 📅 Roadmap

- [x] Hari 1 — Memory Card Match 🃏
- [x] Hari 2 — Slither Worm 🐍
- [x] Hari 3 — Connect Blocks 🔗
- [ ] Hari 4 — Wordle 💬
- [ ] Hari 5 — Hangman 🪓
- [ ] ...dst hingga Hari 25
- [ ] Konversi ke Android (Capacitor)
- [ ] Google AdMob integration
- [ ] Submit ke Google Play Store

---

Made with ❤️ — 30 Hari · 25 Game · 1 Website
