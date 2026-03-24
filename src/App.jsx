import { useState, useEffect, lazy, Suspense } from 'react'
import { SettingsProvider, useSettings } from './context/SettingsContext.jsx'
import { ProgressProvider } from './context/ProgressContext.jsx'
import { CoinProvider } from './context/CoinContext.jsx'
import { NotifProvider } from './context/NotifContext.jsx'
import { LeaderboardProvider } from './context/LeaderboardContext.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { DailyChallengeProvider } from './context/DailyChallengeContext.jsx'
import { CloudSaveProvider, useCloudSave } from './context/CloudSaveContext.jsx'
import Navbar from './components/Navbar.jsx'
import DifficultySelector from './components/DifficultySelector.jsx'
import PageTransition from './components/PageTransition.jsx'
import AchievementToast from './components/AchievementToast.jsx'
import CoinToast from './components/CoinToast.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import LoginModal from './components/LoginModal.jsx'
import ThemeApplicator from './components/ThemeApplicator.jsx'
import Home from './pages/Home.jsx'
import Profile from './pages/Profile.jsx'
import Shop from './pages/Shop.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import { migrateOldStorage } from './utils/storage.js'
import { useMusic } from './hooks/useMusic.js'

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
const VoxelRacer      = lazy(() => import('./pages/games/VoxelRacer.jsx'))

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
]

function AppInner() {
  const [currentGame, setCurrentGame] = useState(null)
  const [difficulty,  setDifficulty]  = useState(null)
  const [screen,      setScreen]      = useState('home')
  const { isLoggedIn, isGuest, needsName, loading: authLoading } = useAuth()
  const { initialSyncDone } = useCloudSave()
  const { muted, musicOff } = useSettings()

  // Run migration once
  useEffect(() => { migrateOldStorage() }, [])

  // Music plays on lobby screens, stops during game
  const isLobby = screen === 'home' || screen === 'profile' || screen === 'difficulty' || screen === 'shop' || screen === 'leaderboard'
  useMusic(isLobby, muted || musicOff)

  const openGame = (gameId) => {
    setCurrentGame(GAMES.find(g => g.id === gameId))
    setScreen('difficulty')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const selectDifficulty  = (diffId) => { setDifficulty(diffId); setScreen('game'); window.scrollTo({ top: 0 }) }
  const goHome            = () => { setScreen('home'); setCurrentGame(null); setDifficulty(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goBackToDifficulty = () => { setDifficulty(null); setScreen('difficulty'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goProfile         = () => { setScreen('profile'); setCurrentGame(null); setDifficulty(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goShop            = () => { setScreen('shop'); setCurrentGame(null); setDifficulty(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goLeaderboard     = () => { setScreen('leaderboard'); setCurrentGame(null); setDifficulty(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const activeDiff   = currentGame?.difficulties?.find(d => d.id === difficulty)
  const isFullscreen = screen === 'game' && (currentGame?.id === 'slither-worm' || currentGame?.id === 'space-shooter' || currentGame?.id === 'brick-breaker' || currentGame?.id === 'memory-pattern' || currentGame?.id === 'neon-dash' || currentGame?.id === 'voxel-racer')

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
        <LoginModal onDone={() => {}} />
      )}
      {!isFullscreen && (
        <Navbar onHome={goHome} onProfile={goProfile} onShop={goShop} onLeaderboard={goLeaderboard} currentGame={screen === 'game' ? currentGame : null} />
      )}
      <AchievementToast />
      <CoinToast />
      <main style={{ flex:1 }}>
        <PageTransition pageKey={`${screen}-${currentGame?.id}-${difficulty}`}>
          {screen === 'home' && (
            <Home games={GAMES} onPlay={openGame} onProfile={goProfile} onShop={goShop} />
          )}
          {screen === 'profile' && (
            <Profile onBack={goHome} games={GAMES} />
          )}
          {screen === 'shop' && (
            <Shop onBack={goHome} />
          )}
          {screen === 'leaderboard' && (
            <Leaderboard onBack={goHome} games={GAMES} />
          )}
          {screen === 'difficulty' && currentGame && (
            <DifficultySelector game={currentGame} onSelect={selectDifficulty} onBack={goHome} />
          )}
          {screen === 'game' && currentGame && activeDiff && (
            <ErrorBoundary>
              <Suspense fallback={<GameLoader />}>
                <currentGame.component onBack={goBackToDifficulty} game={currentGame} difficulty={activeDiff} />
              </Suspense>
            </ErrorBoundary>
          )}
        </PageTransition>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <CloudSaveProvider>
          <ProgressProvider>
            <CoinProvider>
              <LeaderboardProvider>
                <DailyChallengeProvider>
                  <NotifProvider>
                    <ThemeApplicator />
                    <AppInner />
                  </NotifProvider>
                </DailyChallengeProvider>
              </LeaderboardProvider>
            </CoinProvider>
          </ProgressProvider>
        </CloudSaveProvider>
      </AuthProvider>
    </SettingsProvider>
  )
}
