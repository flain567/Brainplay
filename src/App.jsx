import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { SettingsProvider, useSettings } from './context/SettingsContext.jsx'
import { ProgressProvider, useProgress, getLevelInfo } from './context/ProgressContext.jsx'
import { CoinProvider, useCoins } from './context/CoinContext.jsx'
import { NotifProvider } from './context/NotifContext.jsx'
import { LeaderboardProvider } from './context/LeaderboardContext.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { DailyChallengeProvider } from './context/DailyChallengeContext.jsx'
import { LimitedModeProvider, useLimitedMode } from './context/LimitedModeContext.jsx'
import { LuckyWheelProvider } from './context/LuckyWheelContext.jsx'
import { LocalAnalyticsProvider } from './context/LocalAnalyticsContext.jsx'
import { CloudSaveProvider, useCloudSave } from './context/CloudSaveContext.jsx'
import { InventoryProvider } from './context/InventoryContext.jsx'
import { SocialProvider, useSocial } from './context/SocialContext.jsx'
import { FriendsProvider, useFriends } from './context/FriendsContext.jsx'
import UserProfileModal from './components/UserProfileModal.jsx'
import Navbar from './components/Navbar.jsx'
import DifficultySelector from './components/DifficultySelector.jsx'
import PageTransition from './components/PageTransition.jsx'
import AchievementToast from './components/AchievementToast.jsx'
import CoinToast from './components/CoinToast.jsx'
import CoinFlyManager from './components/CoinFlyManager.jsx'
import LevelUpModal from './components/LevelUpModal.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import ThemeApplicator from './components/ThemeApplicator.jsx'
import QuickSettings from './components/QuickSettings.jsx'
import BottomNav from './components/BottomNav.jsx'
import MascotCompanion from './components/MascotCompanion.jsx'
import LuckyWheel from './components/LuckyWheel.jsx'
import Home from './pages/Home.jsx'
import { migrateOldStorage } from './utils/storage.js'
import { saveLastPlayed, getLastPlayed } from './utils/lastPlayed.js'
import { useMusic } from './hooks/useMusic.js'
import { preloadFirestore } from './firebase.js'
import { preloadAnalytics, trackSessionStart, trackSessionEnd, trackScreenView, trackGameStart, trackGameComplete, trackGameDropoff, trackDailyActive, trackLimitedModeGameComplete, sendGameAnalyticsToFirestore } from './utils/analytics.js'
import { useLocalAnalytics } from './context/LocalAnalyticsContext.jsx'
import { initNative, setupBackButton, hideStatusBar, showStatusBar, isNative } from './utils/native.js'
import { ADMIN_IDS } from './config/admin.js'

// ─── Lazy-loaded pages (split into separate chunks) ──────────────────────────
const Profile     = lazy(() => import('./pages/Profile.jsx'))
const Shop        = lazy(() => import('./pages/Shop.jsx'))
const Leaderboard = lazy(() => import('./pages/Leaderboard.jsx'))
const GamesPage   = lazy(() => import('./pages/Games.jsx'))
const GameStatsPage = lazy(() => import('./pages/GameStatsPage.jsx'))
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard.jsx'))
const AdminAnalyticsDashboard = lazy(() => import('./pages/AdminAnalyticsDashboard.jsx'))
const InventoryPage = lazy(() => import('./pages/Inventory.jsx'))
const FriendsPage = lazy(() => import('./pages/Friends.jsx'))
const LoginModal  = lazy(() => import('./components/LoginModal.jsx'))
const OnboardingModal = lazy(() => import('./components/OnboardingModal.jsx'))

// ─── Lazy-loaded game components (split into separate chunks) ────────────────
const MemoryCardMatch = lazy(() => import('./pages/games/MemoryCardMatch.jsx'))
const SlitherWorm     = lazy(() => import('./pages/games/SlitherWorm.jsx'))
const Game2048        = lazy(() => import('./pages/games/Game2048.jsx'))
const WordSearchGame  = lazy(() => import('./pages/games/WordSearchGame.jsx'))
const SpaceShooter    = lazy(() => import('./pages/games/SpaceShooter.jsx'))
const HangmanGame     = lazy(() => import('./pages/games/HangmanGame.jsx'))
const ColorSortGame   = lazy(() => import('./pages/games/ColorSortGame.jsx'))
const SudokuGame      = lazy(() => import('./pages/games/SudokuGame.jsx'))
const JigsawPuzzle    = lazy(() => import('./pages/games/JigsawPuzzle.jsx'))
const BrickBreaker    = lazy(() => import('./pages/games/BrickBreaker.jsx'))
const ReactionTest    = lazy(() => import('./pages/games/ReactionTest.jsx'))
const NeonDash        = lazy(() => import('./pages/games/NeonDash.jsx'))
const MemoryPatternPro = lazy(() => import('./pages/games/MemoryPatternPro.jsx'))
const WordleIndonesia = lazy(() => import('./pages/games/WordleIndonesia.jsx'))
const VoxelRacer      = lazy(() => import('./pages/games/VoxelRacer.jsx'))
const MathChallenge   = lazy(() => import('./pages/games/MathChallenge.jsx'))
const NumberSequence  = lazy(() => import('./pages/games/NumberSequence.jsx'))
const QuizTrivia      = lazy(() => import('./pages/games/QuizTrivia.jsx'))
const BinaryPuzzle    = lazy(() => import('./pages/games/BinaryPuzzle.jsx'))
const SlidingPuzzle   = lazy(() => import('./pages/games/SlidingPuzzle.jsx'))
const TowerOfHanoi    = lazy(() => import('./pages/games/TowerOfHanoi.jsx'))
const MinesweeperGame = lazy(() => import('./pages/games/Minesweeper.jsx'))
const FieldsAdventure = lazy(() => import('./pages/games/FieldsAdventure.jsx'))
const LetterTilesGame = lazy(() => import('./pages/games/LetterTiles.jsx'))

// ─── Game loading fallback ──────────────────────────────────────────────────
function GameLoader() {
  return (
    <div style={{
      width:'100%', height:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:16,
      background:'#07071a',
    }}>
      <div style={{ fontSize:48, animation:'gl-spin 1.2s linear infinite' }}>🎮</div>
      <div style={{ fontFamily:"'Fredoka One',cursive", color:'#A29BFE', fontSize:16 }}>Memuat game...</div>
      <style>{`@keyframes gl-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export const GAMES = [
  {
    id: 'memory-card',
    title: 'Memory Card Match',
    emoji: '🃏',
    description: 'Temukan semua pasangan kartu tersembunyi. Semakin besar grid, semakin susah!',
    color: '#FF6B6B', bg: '#FFF0F0', tag: 'Puzzle',
    component: MemoryCardMatch, day: 1,
    difficulties: [
      { id:'easy',   description:'Grid 3×4, 6 pasang kartu — cocok buat pemula',   stats:['12 kartu','6 pasang'],  cols:3, rows:4, pairs:6  },
      { id:'medium', description:'Grid 4×4, 8 pasang kartu — tantangan yang pas',  stats:['16 kartu','8 pasang'],  cols:4, rows:4, pairs:8  },
      { id:'hard',   description:'Grid 4×6, 12 pasang kartu — uji daya ingatmu!', stats:['24 kartu','12 pasang'], cols:4, rows:6, pairs:12 },
    ],
  },
  {
    id: 'slither-worm',
    title: 'Slither Worm',
    emoji: '🐍',
    description: 'Kendalikan cacing neonmu, makan sebanyak mungkin, dan jangan tabrak tembok!',
    color: '#4ECDC4', bg: '#F0FFFE', tag: 'Casual',
    component: SlitherWorm, day: 2,
    difficulties: [
      { id:'easy',   description:'Kecepatan santai, makanan melimpah — sempurna untuk pemula', stats:['Lambat','45 makanan'] },
      { id:'medium', description:'Kecepatan sedang, arena lebih besar — butuh fokus!',         stats:['Sedang','32 makanan'] },
      { id:'hard',   description:'Kecepatan tinggi, arena luas — untuk yang sudah jago!',      stats:['Cepat','24 makanan']  },
    ],
  },
  {
    id: '2048',
    title: 'Connect Blocks',
    emoji: '🔗',
    description: 'Sambungkan blok angka yang sama! Buat chain agar hasilnya ≥ target untuk naik level. Capai level 5 untuk menang!',
    color: '#A29BFE', bg: '#F0EFFE', tag: 'Puzzle',
    component: Game2048, day: 3,
    difficulties: [
      { id:'easy',   description:'Grid 5×6, target merge 512 per level — santai untuk pemula',          stats:['5×6 grid','Target 512','5 Level']  },
      { id:'medium', description:'Grid 5×7, target merge 1024 per level — lebih banyak baris, lebih seru', stats:['5×7 grid','Target 1024','5 Level'] },
      { id:'hard',   description:'Grid 5×8, target merge 2048 per level — tantangan penuh untuk master!',  stats:['5×8 grid','Target 2048','5 Level'] },
    ],
  },
  {
    id: 'word-search',
    title: 'Word Search',
    emoji: '🔍',
    description: 'Temukan kata-kata tersembunyi di dalam grid huruf acak. Geser ke segala arah!',
    color: '#F39C12', bg: '#FFF8E1', tag: 'Puzzle',
    component: WordSearchGame, day: 4,
    difficulties: [
      { id:'easy',   description:'Grid 8×8, 6 kata — cukup besar untuk pemula',              stats:['8×8 grid','6 kata']  },
      { id:'medium', description:'Grid 10×10, 8 kata — lebih banyak kata, lebih menantang',   stats:['10×10 grid','8 kata'] },
      { id:'hard',   description:'Grid 12×12, 10 kata — pencarian tingkat ahli!',             stats:['12×12 grid','10 kata'] },
    ],
  },
  {
    id: 'space-shooter',
    title: 'Space Shooter',
    emoji: '🚀',
    description: 'Hancurkan wave demi wave alien, kalahkan boss, kumpulkan power-up, dan gunakan kemampuan spesial pesawatmu!',
    color: '#00B894', bg: '#E8FFF8', tag: 'Action',
    component: SpaceShooter, day: 5,
    difficulties: [
      { id:'easy',   description:'5 wave, musuh lambat, 5 HP — misi santai untuk pemula',    stats:['5 wave','5 HP','Boss tiap 3 wave'] },
      { id:'medium', description:'7 wave, musuh sedang, 4 HP — butuh strategi & skill!',     stats:['7 wave','4 HP','Boss tiap 3 wave'] },
      { id:'hard',   description:'10 wave, musuh cepat, 3 HP — hanya pilot legendaris!', stats:['10 wave','3 HP','Boss tiap 3 wave'] },
    ],
  },
  {
    id: 'hangman',
    title: 'Hangman',
    emoji: '💀',
    description: 'Tebak kata tersembunyi dengan menebak huruf satu per satu. Jangan sampai nyawa habis!',
    color: '#E17055', bg: '#FFF3F0', tag: 'Kata',
    component: HangmanGame, day: 6,
    difficulties: [
      { id:'easy',   description:'Kata pendek (4-5 huruf), 8 nyawa — sempurna untuk pemula', stats:['4-5 huruf','8 nyawa'] },
      { id:'medium', description:'Kata sedang (5-7 huruf), 7 nyawa — lebih menantang!',       stats:['5-7 huruf','7 nyawa'] },
      { id:'hard',   description:'Kata panjang (7-12 huruf), 6 nyawa — untuk ahli bahasa!',   stats:['7-12 huruf','6 nyawa'] },
    ],
  },
  {
    id: 'color-sort',
    title: 'Color Sort',
    emoji: '🧪',
    description: 'Urutkan bola warna ke dalam tabung yang tepat. Semakin banyak warna, semakin rumit!',
    color: '#6C5CE7', bg: '#F0EFFE', tag: 'Puzzle',
    component: ColorSortGame, day: 7,
    difficulties: [
      { id:'easy',   description:'4 warna, 6 tabung — logika dasar untuk pemula',   stats:['4 warna','6 tabung'] },
      { id:'medium', description:'6 warna, 8 tabung — perlu strategi yang tepat!',   stats:['6 warna','8 tabung'] },
      { id:'hard',   description:'8 warna, 10 tabung — tantangan otak tingkat tinggi!', stats:['8 warna','10 tabung'] },
    ],
  },
  {
    id: 'sudoku',
    title: 'Sudoku',
    emoji: '🔢',
    description: 'Isi grid 9×9 dengan angka 1-9 tanpa duplikat di setiap baris, kolom, dan kotak 3×3!',
    color: '#0984E3', bg: '#E8F4FD', tag: 'Logika',
    component: SudokuGame, day: 8,
    difficulties: [
      { id:'easy',   description:'36 sel kosong — cocok untuk pemanasan otak',         stats:['45 terisi','36 kosong'] },
      { id:'medium', description:'46 sel kosong — butuh deduksi yang lebih dalam',     stats:['35 terisi','46 kosong'] },
      { id:'hard',   description:'54 sel kosong — hanya master logika yang mampu!',    stats:['27 terisi','54 kosong'] },
    ],
  },
  {
    id: 'jigsaw',
    title: 'Jigsaw Puzzle',
    emoji: '🧩',
    description: 'Susun potongan gambar ke posisi yang benar! Semakin banyak keping, semakin menantang!',
    color: '#E84393', bg: '#FFF0F8', tag: 'Puzzle',
    component: JigsawPuzzle, day: 9,
    difficulties: [
      { id:'easy',   description:'Grid 3×3, 9 keping — cocok untuk pemula',           stats:['3×3 grid','9 keping']  },
      { id:'medium', description:'Grid 4×4, 16 keping — butuh strategi yang tepat!',   stats:['4×4 grid','16 keping'] },
      { id:'hard',   description:'Grid 5×5, 25 keping — tantangan otak tingkat tinggi!', stats:['5×5 grid','25 keping'] },
    ],
  },
  {
    id: 'memory-pattern',
    title: 'Memory Pattern Pro',
    emoji: '🧠',
    description: 'Game premium flagship! Ingat pola sel yang menyala, ulangi urutannya. Boss level, combo system, efek visual spektakuler!',
    color: '#00CEC9', bg: '#E0FFFE', tag: 'Puzzle',
    component: MemoryPatternPro, day: 10,
    difficulties: [
      { id:'easy',   description:'15 level, pola lambat, 4 nyawa — pemanasan otak',          stats:['15 level','4 nyawa','Boss tiap 5 lv'] },
      { id:'medium', description:'20 level, pola sedang, 3 nyawa — uji konsentrasimu!',      stats:['20 level','3 nyawa','Boss tiap 5 lv'] },
      { id:'hard',   description:'25 level, pola cepat, 2 nyawa — hanya master memori!',     stats:['25 level','2 nyawa','Boss tiap 5 lv'] },
    ],
  },
  {
    id: 'reaction-test',
    title: 'Reaction Test',
    emoji: '⚡',
    description: 'Uji kecepatan reaksimu! Tiga mode: Tap timing, Color recognition, dan Sequence memory.',
    color: '#F39C12', bg: '#FFF8E1', tag: 'Action',
    component: ReactionTest, day: 11,
    difficulties: [
      { id:'easy',   description:'5 ronde, sekuens pendek — pemanasan refleks',           stats:['5 ronde','3 warna'] },
      { id:'medium', description:'7 ronde, lebih banyak pilihan — uji fokusmu!',          stats:['7 ronde','4 warna'] },
      { id:'hard',   description:'10 ronde, Stroop effect, sekuens panjang — extreme!',   stats:['10 ronde','Stroop'] },
    ],
  },
  {
    id: 'neon-dash',
    title: 'Neon Dash',
    emoji: '💎',
    description: 'Berlari melewati rintangan neon! Lompat, hindari spike & gap, kumpulkan diamond. Geometry dash style!',
    color: '#00CEC9', bg: '#E0FFFE', tag: 'Action',
    component: NeonDash, day: 12,
    difficulties: [
      { id:'easy',   description:'Kecepatan santai, 8 level — cocok untuk pemula',         stats:['8 level','Lambat','Double Jump'] },
      { id:'medium', description:'Lebih cepat, 12 level, gap muncul — butuh refleks!',     stats:['12 level','Sedang','Gap + Platform'] },
      { id:'hard',   description:'Kecepatan tinggi, 16 level, obstacle padat — extreme!',  stats:['16 level','Cepat','Brutal'] },
    ],
  },
  {
    id: 'brick-breaker',
    title: 'Brick Breaker',
    emoji: '🧱',
    description: 'Hancurkan semua bata dengan bola pantul! Power-up, level progression, dan boss tiap 5 level!',
    color: '#45B7D1', bg: '#E8F8FF', tag: 'Action',
    component: BrickBreaker, day: 13,
    difficulties: [
      { id:'easy',   description:'Bola lambat, paddle lebar, 5 nyawa — santai untuk pemula',   stats:['10 level','5 nyawa','Boss tiap 5 lv'] },
      { id:'medium', description:'Kecepatan sedang, 4 nyawa — butuh refleks yang baik!',       stats:['15 level','4 nyawa','Boss tiap 5 lv'] },
      { id:'hard',   description:'Bola cepat, paddle kecil, 3 nyawa — master breaker only!',   stats:['20 level','3 nyawa','Boss tiap 5 lv'] },
    ],
  },
  {
    id: 'wordle',
    title: 'Wordle Indonesia',
    emoji: '💬',
    description: 'Tebak kata 5 huruf bahasa Indonesia! Warna hijau = posisi benar, kuning = huruf ada tapi salah posisi.',
    color: '#55EFC4', bg: '#E8FFF8', tag: 'Kata',
    component: WordleIndonesia, day: 14,
    difficulties: [
      { id:'easy',   description:'7 percobaan, 3 hint — santai untuk pemula',           stats:['7 tebakan','3 hint'] },
      { id:'medium', description:'6 percobaan, 2 hint — standar Wordle!',               stats:['6 tebakan','2 hint'] },
      { id:'hard',   description:'5 percobaan, 1 hint — hanya master kata!',            stats:['5 tebakan','1 hint'] },
    ],
  },
  {
    id: 'voxel-racer',
    title: 'Voxel Racer',
    emoji: '🚗',
    description: 'Balapan mobil 3D voxel! Hindari rintangan, kumpulkan koin, dan lompat melewati obstacle. Full 3D!',
    color: '#FFD93D', bg: '#FFF9E0', tag: 'Action',
    component: VoxelRacer, day: 15,
    difficulties: [
      { id:'easy',   description:'Kecepatan santai, 6 level — cocok pemula 3D!',        stats:['6 level','Lambat','3 jalur'] },
      { id:'medium', description:'Lebih cepat, 10 level — butuh refleks!',              stats:['10 level','Sedang','Rintangan++'] },
      { id:'hard',   description:'Kecepatan tinggi, 14 level, rintangan padat!',        stats:['14 level','Cepat','Brutal'] },
    ],
  },
  {
    id: 'math-challenge',
    title: 'Math Challenge',
    emoji: '🧮',
    description: 'Uji kecepatan hitungmu! Jawab soal matematika sebelum waktu habis, naik level dari penjumlahan sampai operasi campuran!',
    color: '#6C5CE7', bg: '#F0EFFE', tag: 'Logika',
    component: MathChallenge, day: 16,
    difficulties: [
      { id:'easy',   description:'15 detik per soal, 5 nyawa, target Level 8 — santai untuk pemula',      stats:['15s/soal','5 nyawa','Target Lv8'] },
      { id:'medium', description:'10 detik per soal, 4 nyawa, target Level 10 — butuh kecepatan!',        stats:['10s/soal','4 nyawa','Target Lv10'] },
      { id:'hard',   description:'7 detik per soal, 3 nyawa, mulai Level 2, target Level 12 — extreme!',  stats:['7s/soal','3 nyawa','Target Lv12'] },
    ],
  },
  {
    id: 'number-sequence',
    title: 'Number Sequence',
    emoji: '🔢',
    description: 'Temukan pola dalam deret angka! Dari aritmatika sederhana hingga fibonacci dan kuadrat.',
    color: '#E17055', bg: '#FFF3F0', tag: 'Logika',
    component: NumberSequence, day: 17,
    difficulties: [
      { id:'easy',   description:'20 detik, 5 nyawa, 5 angka — pola sederhana',           stats:['20s/soal','5 nyawa','Target Lv7'] },
      { id:'medium', description:'15 detik, 4 nyawa, 5 angka — pola lebih kompleks',       stats:['15s/soal','4 nyawa','Target Lv9'] },
      { id:'hard',   description:'10 detik, 3 nyawa, 6 angka — master pola!',              stats:['10s/soal','3 nyawa','Target Lv11'] },
    ],
  },
  {
    id: 'quiz-trivia',
    title: 'Quiz Trivia Indonesia',
    emoji: '🇮🇩',
    description: 'Uji pengetahuan umummu tentang Indonesia! Geografi, sejarah, budaya, makanan, dan alam.',
    color: '#0984E3', bg: '#E8F4FD', tag: 'Pengetahuan',
    component: QuizTrivia, day: 18,
    difficulties: [
      { id:'easy',   description:'15 soal, 20 detik, 5 nyawa — santai untuk pemula',       stats:['15 soal','20s','5 nyawa'] },
      { id:'medium', description:'20 soal, 15 detik, 4 nyawa — butuh pengetahuan luas!',   stats:['20 soal','15s','4 nyawa'] },
      { id:'hard',   description:'25 soal, 10 detik, 3 nyawa — ahli Indonesia!',           stats:['25 soal','10s','3 nyawa'] },
    ],
  },
  {
    id: 'binary-puzzle',
    title: 'Binary Puzzle',
    emoji: '🔲',
    description: 'Isi grid dengan 0 dan 1 mengikuti aturan logika! Mirip Sudoku tapi hanya dua angka.',
    color: '#00B894', bg: '#E8FFF8', tag: 'Logika',
    component: BinaryPuzzle, day: 19,
    difficulties: [
      { id:'easy',   description:'Grid 6×6, banyak petunjuk — logika dasar',               stats:['6×6','14 terisi'] },
      { id:'medium', description:'Grid 8×8, lebih sedikit petunjuk — perlu deduksi',        stats:['8×8','20 terisi'] },
      { id:'hard',   description:'Grid 10×10, minimal petunjuk — master logika!',           stats:['10×10','28 terisi'] },
    ],
  },
  {
    id: 'sliding-puzzle',
    title: 'Sliding Puzzle',
    emoji: '🧩',
    description: 'Geser tile angka untuk menyusun urutan yang benar! Semakin besar grid, semakin menantang.',
    color: '#E84393', bg: '#FFF0F8', tag: 'Puzzle',
    component: SlidingPuzzle, day: 20,
    difficulties: [
      { id:'easy',   description:'Grid 3×3, 8 tile — cocok untuk pemanasan',               stats:['3×3','8 tile'] },
      { id:'medium', description:'Grid 4×4, 15 tile — butuh strategi!',                    stats:['4×4','15 tile'] },
      { id:'hard',   description:'Grid 5×5, 24 tile — tantangan extreme!',                 stats:['5×5','24 tile'] },
    ],
  },
  {
    id: 'tower-hanoi',
    title: 'Tower of Hanoi',
    emoji: '🗼',
    description: 'Pindahkan semua disk ke tiang kanan! Disk besar tidak boleh di atas yang kecil.',
    color: '#F39C12', bg: '#FFF8E1', tag: 'Logika',
    component: TowerOfHanoi, day: 21,
    difficulties: [
      { id:'easy',   description:'Mulai 3 disk → 5 disk, 3 level',                        stats:['3→5 disk','3 level'] },
      { id:'medium', description:'Mulai 4 disk → 7 disk, 4 level',                        stats:['4→7 disk','4 level'] },
      { id:'hard',   description:'Mulai 5 disk → 8 disk, 4 level — master!',              stats:['5→8 disk','4 level'] },
    ],
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    emoji: '💣',
    description: 'Buka semua kotak tanpa kena bom! Gunakan angka dan logika untuk menghindari bom.',
    color: '#636E72', bg: '#F0F0F5', tag: 'Logika',
    component: MinesweeperGame, day: 22,
    difficulties: [
      { id:'easy',   description:'9×9 grid, 10 bom — untuk pemula',                       stats:['9×9','10 bom'] },
      { id:'medium', description:'12×10 grid, 25 bom — butuh logika!',                    stats:['12×10','25 bom'] },
      { id:'hard',   description:'14×12 grid, 45 bom — hanya ahli!',                      stats:['14×12','45 bom'] },
    ],
  },
  {
    id: 'fields-adventure',
    title: 'Fields of Adventure',
    emoji: '🗺️',
    description: 'Jelajahi dunia open-world pixel art! Cari peti harta, hindari jebakan, kumpulkan koin!',
    color: '#7ec850', bg: '#E8F5E9', tag: 'Action',
    component: FieldsAdventure, day: 23,
    difficulties: [
      { id:'easy',   description:'5 HP, jebakan ringan — santai explore',                     stats:['5 HP','Reward ++'] },
      { id:'medium', description:'3 HP, jebakan sedang — butuh hati-hati!',                   stats:['3 HP','Reward +'] },
      { id:'hard',   description:'2 HP, jebakan mematikan — petualang sejati!',                stats:['2 HP','Reward +++'] },
    ],
  },
  {
    id: 'letter-tiles',
    title: 'Letter Tiles',
    emoji: '🔤',
    description: 'Susun huruf-huruf acak untuk membentuk kata yang benar! Mulai dari 3 huruf sampai 7 huruf.',
    color: '#A29BFE', bg: '#F0EFFE', tag: 'Kata',
    component: LetterTilesGame, day: 24,
    difficulties: [
      { id:'easy',   description:'10 level, 60 detik, 3 hint — santai untuk pemula',           stats:['10 level','60s','3 hint'] },
      { id:'medium', description:'20 level, 45 detik, 2 hint — butuh kecepatan!',              stats:['20 level','45s','2 hint'] },
      { id:'hard',   description:'30 level, 30 detik, 1 hint — master kata!',                  stats:['30 level','30s','1 hint'] },
    ],
  },
]

function AppInner() {
  const [currentGame, setCurrentGame] = useState(null)
  const [difficulty,  setDifficulty]  = useState(null)
  const [screen,      setScreen]      = useState('home')
  const [isWheelOpen, setIsWheelOpen] = useState(false)
  const [showPause,   setShowPause]   = useState(false)
  const [gameKey,     setGameKey]     = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [inspectingUid, setInspectingUid] = useState(null)
  const screenRef = useRef('home')
  const navRef = useRef({ goHome: null, goBackToDifficulty: null })
  const { isLoggedIn, isGuest, needsName, loading: authLoading, userId, playerName: nickname } = useAuth()
  const { initialSyncDone } = useCloudSave()
  const { muted, musicOff } = useSettings()
  const { earnCoins } = useCoins()
  const { progress, clearLevelUp: originalClearLevelUp } = useProgress()
  const levelInfo = getLevelInfo(progress?.xp || 0)
  const { currentMode } = useLimitedMode()
  const { logActivity } = useSocial()
  const { trackEvent } = useLocalAnalytics()

  const clearLevelUp = () => {
    if (progress.levelUpData) {
      logActivity({
        type: 'level_up',
        details: `mencapai Level ${progress.levelUpData.newLevel}! 🌟`,
        icon: '🆙'
      })
    }
    originalClearLevelUp()
  }

  // Run migration once
  useEffect(() => { migrateOldStorage() }, [])

  // Preload Firestore + Analytics + Native after first render
  useEffect(() => {
    preloadFirestore()
    preloadAnalytics()
    initNative()
    trackSessionStart()
    trackDailyActive()
    // Track session end on page unload
    const onUnload = () => trackSessionEnd()
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  // Track screen views
  useEffect(() => { trackScreenView(screen) }, [screen])

  // ─── Capacitor hardware back button ────────────────────────────────────────
  useEffect(() => {
    return setupBackButton(() => {
      const s = screenRef.current
      if (s === 'game') {
        setShowPause(true)
      } else if (s === 'difficulty' || s === 'profile' || s === 'shop' || s === 'leaderboard') {
        navRef.current.goHome?.()
      }
      // On home screen → Capacitor default (minimize app)
    })
  }, [])

  // Show onboarding after auth is done and user has never been onboarded
  useEffect(() => {
    if (!authLoading && initialSyncDone && (isLoggedIn || isGuest) && !needsName) {
      if (!localStorage.getItem('bp_onboarded')) {
        setShowOnboarding(true)
      }
    }
  }, [authLoading, initialSyncDone, isLoggedIn, isGuest, needsName])

  // Track game completion via bp-game-result event + first-game reward
  useEffect(() => {
    const handler = (e) => {
      const { gameId, difficultyId, score, timeSec, stars, coinEarned, xpEarned } = e.detail || {}
      if (gameId && score > 0) {
        trackGameComplete(gameId, difficultyId || 'easy', score, stars, timeSec)
        
        // Send to Firestore for admin analytics
        sendGameAnalyticsToFirestore(
          userId || 'guest',
          nickname || 'Anonymous',
          gameId,
          difficultyId || 'easy',
          score,
          stars,
          coinEarned || 0,
          xpEarned || 0,
          currentMode?.id || null,
          currentMode?.name || null
        )
        
        // Track limited mode game completion if event is active
        if (currentMode) {
          trackLimitedModeGameComplete(
            currentMode.id,
            currentMode.name,
            gameId,
            difficultyId || 'easy',
            score,
            stars,
            coinEarned || 0,
            xpEarned || 0
          )
          trackEvent('limited_mode_game_complete', {
            event_id: currentMode.id,
            event_name: currentMode.name,
            game_id: gameId,
            difficulty: difficultyId || 'easy',
            score,
            stars: stars || 0,
            coin_earned: coinEarned || 0,
            xp_earned: xpEarned || 0,
          })
        }
        
        // First-game bonus: 100 coins
        if (!localStorage.getItem('bp_first_game_rewarded') && localStorage.getItem('bp_onboarded')) {
          localStorage.setItem('bp_first_game_rewarded', 'true')
          if (earnCoins) earnCoins(100, 'Bonus game pertama! 🎉')
        }
      }
    }
    window.addEventListener('bp-game-result', handler)
    return () => window.removeEventListener('bp-game-result', handler)
  }, [earnCoins, currentMode, trackEvent, userId, nickname])

  const activeDiff   = currentGame?.difficulties?.find(d => d.id === difficulty)
  const isFullscreen = screen === 'game' && (currentGame?.id === 'slither-worm' || currentGame?.id === 'space-shooter' || currentGame?.id === 'brick-breaker' || currentGame?.id === 'memory-pattern' || currentGame?.id === 'neon-dash' || currentGame?.id === 'voxel-racer')

  // ─── Hide status bar in fullscreen canvas games ────────────────────────────
  useEffect(() => {
    if (isFullscreen) { hideStatusBar() } else { showStatusBar() }
  }, [isFullscreen])

  // Music plays on lobby (ambient) and during game (intense)
  const isMusicScene = screen === 'home' || screen === 'profile' || screen === 'difficulty' || screen === 'shop' || screen === 'leaderboard' || screen === 'game'
  useMusic(isMusicScene, muted || musicOff, screen === 'game' ? 'intense' : 'ambient')

  const openGame = (gameId, diffId = null) => {
    const g = GAMES.find(x => x.id === gameId)
    if (!g) return
    setCurrentGame(g)
    if (diffId) {
      setDifficulty(diffId)
      setScreen('game')
      saveLastPlayed(gameId, diffId)
      trackGameStart(gameId, diffId)
    } else {
      setScreen('difficulty')
    }
    setGameKey(k => k + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const continueLastSession = () => {
    const lp = getLastPlayed()
    if (!lp) return
    const g = GAMES.find(x => x.id === lp.gameId)
    if (!g || !g.difficulties?.some(d => d.id === lp.difficultyId)) return
    setCurrentGame(g)
    setDifficulty(lp.difficultyId)
    setScreen('game')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    trackGameStart(g.id, lp.difficultyId)
  }
  const selectDifficulty = (diffId) => {
    setDifficulty(diffId)
    setScreen('game')
    window.scrollTo({ top: 0 })
    if (currentGame) {
      saveLastPlayed(currentGame.id, diffId)
      trackGameStart(currentGame.id, diffId)
    }
  }
  const goHome = () => {
    setIsWheelOpen(false)
    if (screenRef.current === 'game' && currentGame) trackGameDropoff(currentGame.id, difficulty, 'back_to_home')
    setScreen('home'); setCurrentGame(null); setDifficulty(null); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const goBackToDifficulty = () => {
    if (currentGame) trackGameDropoff(currentGame.id, difficulty, 'back_to_difficulty')
    setDifficulty(null); setScreen('difficulty'); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Keep refs in sync for back button handler
  screenRef.current = screen
  navRef.current.goHome = goHome
  navRef.current.goBackToDifficulty = goBackToDifficulty
  
  const goProfile     = () => { setIsWheelOpen(false); setScreen('profile'); setCurrentGame(null); setDifficulty(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goShop        = () => { setIsWheelOpen(false); setScreen('shop'); setCurrentGame(null); setDifficulty(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goLeaderboard = () => { setIsWheelOpen(false); setScreen('leaderboard'); setCurrentGame(null); setDifficulty(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goStats       = () => { setIsWheelOpen(false); setScreen('stats'); setCurrentGame(null); setDifficulty(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goInventory   = () => { setIsWheelOpen(false); setScreen('inventory'); setCurrentGame(null); setDifficulty(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goFriends     = () => { setIsWheelOpen(false); setScreen('friends'); setCurrentGame(null); setDifficulty(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goAnalytics   = () => { setIsWheelOpen(false); setScreen('analytics'); setCurrentGame(null); setDifficulty(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goGames       = () => { setIsWheelOpen(false); setScreen('games'); setCurrentGame(null); setDifficulty(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goAdmin       = () => { setIsWheelOpen(false); setScreen('admin'); setCurrentGame(null); setDifficulty(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openWheel     = () => setIsWheelOpen(true)
  const restartGame   = () => { setShowPause(false); setGameKey(k => k + 1) }
  
  useEffect(() => {
    const handleOpenShop = (e) => {
      setScreen('shop')
      if (e.detail?.tab) {
        sessionStorage.setItem('shop_target_tab', e.detail.tab)
      }
      setIsWheelOpen(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('openShop', handleOpenShop)
    return () => window.removeEventListener('openShop', handleOpenShop)
  }, [])
  
  // Check if current user is admin
  const isAdmin = ADMIN_IDS.includes(userId)

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      {/* Auth loading screen — wait for auth + initial cloud sync */}
      {(authLoading || (isLoggedIn && !initialSyncDone)) && (
        <div style={{
          position:'fixed', inset:0, zIndex:10000,
          background:'#0d0b1e', display:'flex', alignItems:'center', justifyContent:'center',
          flexDirection:'column', gap:16,
        }}>
          <div style={{ fontSize:48, animation:'spin 1.5s linear infinite' }}>🎮</div>
          <div style={{ fontFamily:"'Fredoka One',cursive", color:'#A29BFE', fontSize:16 }}>
            {authLoading ? 'Memuat...' : 'Menyinkronkan data...'}
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {/* Login prompt — shown if not authenticated, or if authenticated but no name set (after sync) */}
      {!authLoading && initialSyncDone && ((!isLoggedIn && !isGuest) || needsName) && (
        <Suspense fallback={null}>
          <LoginModal onDone={() => {}} />
        </Suspense>
      )}
      {/* Onboarding — shown once for first-time users after login */}
      {showOnboarding && !needsName && (isLoggedIn || isGuest) && (
        <Suspense fallback={null}>
          <OnboardingModal
            onPickGame={(gameId) => { setShowOnboarding(false); openGame(gameId) }}
            onSkip={() => setShowOnboarding(false)}
          />
        </Suspense>
      )}
      {!isFullscreen && (
        <Navbar onHome={goHome} onProfile={goProfile} onShop={goShop} onInventory={goInventory} onLeaderboard={goLeaderboard} onGames={goGames} onFriends={goFriends} currentGame={screen === 'game' ? currentGame : null} />
      )}
      <AchievementToast />
      <CoinToast />
      <CoinFlyManager />
      {progress.levelUpData && (
        <LevelUpModal data={progress.levelUpData} onClose={clearLevelUp} />
      )}
      {inspectingUid && (
        <UserProfileModal uid={inspectingUid} onClose={() => setInspectingUid(null)} />
      )}
      <LuckyWheel open={isWheelOpen} onClose={() => setIsWheelOpen(false)} />
      {showPause && (
        <PauseModal 
          onExit={() => { setShowPause(false); goHome() }}
          onRestart={restartGame}
          onResume={() => setShowPause(false)}
          dark={tc.dark}
          gameColor={currentGame?.color}
        />
      )}
      <main style={{ flex:1, paddingBottom: isFullscreen ? 0 : 'calc(68px + env(safe-area-inset-bottom, 0px))' }}>
        <PageTransition pageKey={`${screen}-${currentGame?.id}-${difficulty}`}>
          {screen === 'home' && (
            <Home 
              games={GAMES} 
              onPlay={openGame} 
              onContinueLast={continueLastSession} 
              onProfile={goProfile} 
              onShop={goShop} 
              onStats={goStats} 
              onOpenWheel={openWheel}
              onGames={goGames}
              onFriends={goFriends}
            />
          )}
          {screen === 'profile' && (
            <Suspense fallback={<GameLoader />}>
              <Profile 
                onBack={goHome} 
                games={GAMES} 
                onAnalytics={goAnalytics} 
                onFriends={goFriends}
                onAdmin={userId && ADMIN_IDS.includes(userId) ? goAdmin : null} 
              />
            </Suspense>
          )}
          {screen === 'shop' && (
            <Suspense fallback={<GameLoader />}>
              <Shop onBack={goHome} />
            </Suspense>
          )}
          {screen === 'games' && (
            <Suspense fallback={<GameLoader />}>
              <GamesPage games={GAMES} onOpenGame={openGame} onBack={goHome} />
            </Suspense>
          )}
          {screen === 'inventory' && (
            <Suspense fallback={<GameLoader />}>
              <InventoryPage onBack={goHome} />
            </Suspense>
          )}
          {screen === 'friends' && (
            <Suspense fallback={<GameLoader />}>
              <FriendsPage onBack={goHome} />
            </Suspense>
          )}

          {screen === 'leaderboard' && (
            <Suspense fallback={<GameLoader />}>
              <Leaderboard onBack={goHome} games={GAMES} onInspect={setInspectingUid} />
            </Suspense>
          )}
          {screen === 'stats' && (
            <Suspense fallback={<GameLoader />}>
              <GameStatsPage onBack={goHome} />
            </Suspense>
          )}
          {screen === 'analytics' && (
            <Suspense fallback={<GameLoader />}>
              <AnalyticsDashboard onBack={goHome} />
            </Suspense>
          )}
          {screen === 'admin' && isAdmin && (
            <Suspense fallback={<GameLoader />}>
              <AdminAnalyticsDashboard />
            </Suspense>
          )}
          {screen === 'admin' && !isAdmin && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#A29BFE' }}>
              <h1>❌ Access Denied</h1>
              <p>You do not have permission to view admin analytics</p>
              <button onClick={goHome} style={{ marginTop: '20px', padding: '10px 20px', background: '#A29BFE', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Back to Home
              </button>
            </div>
          )}
          {screen === 'difficulty' && currentGame && (
            <DifficultySelector game={currentGame} onSelect={selectDifficulty} onBack={goHome} />
          )}
          {screen === 'game' && currentGame && activeDiff && (
            <ErrorBoundary>
              <Suspense fallback={<GameLoader />}>
                <currentGame.component 
                  key={gameKey} 
                  onBack={goBackToDifficulty} 
                  onHome={goHome} 
                  game={currentGame} 
                  difficulty={activeDiff} 
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </PageTransition>
      </main>
      {!isFullscreen && (
        <BottomNav 
          activeScreen={isWheelOpen ? 'wheel' : screen} 
          onNavigate={(target) => {
            if (target === 'wheel') setIsWheelOpen(true)
            else if (target === 'home') goHome()
            else if (target === 'shop') goShop()
            else if (target === 'profile') goProfile()
            else if (target === 'games') goGames()
            else if (target === 'inventory') goInventory()
            else if (target === 'friends') goFriends()
          }} 
        />
      )}
      
      {/* ── Global Floating Mascot Assistant ── */}
      {screen !== 'game' && screen !== 'splash' && (
        <MascotCompanion
          floating={true}
          mascotName={progress.mascotName || 'Brainy'}
          skin={progress.selectedMascotSkin}
          hat={progress.selectedMascotHat}
          level={levelInfo.level}
          pageContext={screen}
          observeSections={[]} // Can optionally pass sections if desired, but less relevant globally
        />
      )}

      <div className="crt-overlay" />
    </div>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <CloudSaveProvider>
          <LocalAnalyticsProvider>
            <LimitedModeProvider>
              <CoinProvider>
                <ProgressProvider>
                  <InventoryProvider>
                    <LeaderboardProvider>
                      <SocialProvider>
                        <FriendsProvider>
                          <LuckyWheelProvider>
                            <DailyChallengeProvider>
                              <NotifProvider>
                                <ThemeApplicator />
                                <AppInner />
                              </NotifProvider>
                            </DailyChallengeProvider>
                          </LuckyWheelProvider>
                        </FriendsProvider>
                      </SocialProvider>
                    </LeaderboardProvider>
                  </InventoryProvider>
                </ProgressProvider>
              </CoinProvider>
            </LimitedModeProvider>
          </LocalAnalyticsProvider>
        </CloudSaveProvider>
      </AuthProvider>
    </SettingsProvider>
  )
}
