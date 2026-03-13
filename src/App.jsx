import { useState } from 'react'
import { SettingsProvider } from './context/SettingsContext.jsx'
import Navbar from './components/Navbar.jsx'
import DifficultySelector from './components/DifficultySelector.jsx'
import PageTransition from './components/PageTransition.jsx'
import Home from './pages/Home.jsx'
import MemoryCardMatch from './pages/games/MemoryCardMatch.jsx'
import SlitherWorm from './pages/games/SlitherWorm.jsx'
import Game2048 from './pages/games/Game2048.jsx'
import WordleGame from './pages/games/WordleGame.jsx'

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
    description: 'Sambungkan blok angka yang sama, capai target, dan naiki level untuk blok baru!',
    color: '#A29BFE', bg: '#F0EFFE', tag: 'Puzzle',
    component: Game2048, day: 3,
    difficulties: [
      { id:'easy',   description:'Grid 5×6, target 512 — santai untuk pemula',          stats:['5×6 grid','Target 512']  },
      { id:'medium', description:'Grid 5×7, target 1024 — lebih banyak baris, lebih seru', stats:['5×7 grid','Target 1024'] },
      { id:'hard',   description:'Grid 5×8, target 2048 — tantangan penuh untuk master!',  stats:['5×8 grid','Target 2048'] },
    ],
  },
]

function AppInner() {
  const [currentGame, setCurrentGame] = useState(null)
  const [difficulty,  setDifficulty]  = useState(null)
  const [screen,      setScreen]      = useState('home')

  const openGame = (gameId) => {
    setCurrentGame(GAMES.find(g => g.id === gameId))
    setScreen('difficulty')
  }
  const selectDifficulty  = (diffId) => { setDifficulty(diffId); setScreen('game') }
  const goHome            = () => { setScreen('home'); setCurrentGame(null); setDifficulty(null) }
  const goBackToDifficulty = () => { setDifficulty(null); setScreen('difficulty') }

  const activeDiff   = currentGame?.difficulties?.find(d => d.id === difficulty)
  const isFullscreen = screen === 'game' && currentGame?.id === 'slither-worm'

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      {!isFullscreen && (
        <Navbar onHome={goHome} currentGame={screen === 'game' ? currentGame : null} />
      )}
      <main style={{ flex:1 }}>
        <PageTransition pageKey={`${screen}-${currentGame?.id}-${difficulty}`}>
          {screen === 'home' && (
            <Home games={GAMES} onPlay={openGame} />
          )}
          {screen === 'difficulty' && currentGame && (
            <DifficultySelector game={currentGame} onSelect={selectDifficulty} onBack={goHome} />
          )}
          {screen === 'game' && currentGame && activeDiff && (
            <currentGame.component onBack={goBackToDifficulty} game={currentGame} difficulty={activeDiff} />
          )}
        </PageTransition>
      </main>
    </div>
  )
}

export default function App() {
  return <SettingsProvider><AppInner /></SettingsProvider>
}
