import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'

const TUTORIAL_STEPS = [
  { emoji:'🧪', title:'Color Sort', desc:'Urutkan bola warna ke dalam tabung yang tepat! Setiap tabung harus berisi satu warna saja.', tip:'Gunakan tabung kosong sebagai tempat transit sementara.' },
  { emoji:'👆', title:'Cara Main', desc:'Klik tabung sumber untuk mengambil bola paling atas, lalu klik tabung tujuan untuk meletakkannya.', tip:'Bola hanya bisa diletakkan di tabung yang kosong atau yang warna paling atasnya sama.' },
  { emoji:'⭐', title:'Sistem Bintang', desc:'Semakin sedikit langkah yang kamu pakai, semakin banyak bintang! Minimalisir perpindahan untuk 3 bintang.', tip:'Easy ≤20 langkah, Medium ≤30, Hard ≤45 untuk 3 bintang.' },
]

const COLORS = [
  { id: 'red',    hex: '#FF6B6B', name: 'Merah'   },
  { id: 'blue',   hex: '#74B9FF', name: 'Biru'     },
  { id: 'green',  hex: '#00B894', name: 'Hijau'    },
  { id: 'yellow', hex: '#FDCB6E', name: 'Kuning'   },
  { id: 'purple', hex: '#A29BFE', name: 'Ungu'     },
  { id: 'orange', hex: '#E17055', name: 'Oranye'   },
  { id: 'pink',   hex: '#FD79A8', name: 'Pink'     },
  { id: 'cyan',   hex: '#00CEC9', name: 'Cyan'     },
  { id: 'brown',  hex: '#B47B56', name: 'Cokelat'  },
  { id: 'lime',   hex: '#BADC58', name: 'Hijau Muda' },
]

const TUBE_CAPACITY = 4
const DIFF_CONFIG = {
  easy:   { colorCount: 4, emptyTubes: 2 },
  medium: { colorCount: 6, emptyTubes: 2 },
  hard:   { colorCount: 8, emptyTubes: 2 },
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generatePuzzle(diffId) {
  const config = DIFF_CONFIG[diffId] || DIFF_CONFIG.easy
  const { colorCount, emptyTubes } = config
  const colors = COLORS.slice(0, colorCount)

  // Create balls: 4 of each color
  let balls = []
  for (const color of colors) {
    for (let i = 0; i < TUBE_CAPACITY; i++) {
      balls.push(color.id)
    }
  }
  balls = shuffle(balls)

  // Distribute into tubes
  const tubes = []
  for (let i = 0; i < colorCount; i++) {
    tubes.push(balls.slice(i * TUBE_CAPACITY, (i + 1) * TUBE_CAPACITY))
  }
  // Add empty tubes
  for (let i = 0; i < emptyTubes; i++) {
    tubes.push([])
  }

  return tubes
}

function isSorted(tube) {
  if (tube.length !== TUBE_CAPACITY) return false
  return tube.every(b => b === tube[0])
}

function isPuzzleSolved(tubes) {
  return tubes.every(t => t.length === 0 || isSorted(t))
}

function canPour(from, to) {
  if (from.length === 0) return false
  if (to.length >= TUBE_CAPACITY) return false
  if (to.length === 0) return true
  return from[from.length - 1] === to[to.length - 1]
}

function getColorHex(colorId) {
  const c = COLORS.find(c => c.id === colorId)
  return c ? c.hex : '#888'
}

function useTimer(running, resetKey) {
  const [time, setTime] = useState(0)
  useEffect(() => { setTime(0) }, [resetKey])
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTime(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [running])
  return time
}

const formatTime = (s) =>
  `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

const DIFF_LABEL = { easy: '🟢 Mudah', medium: '🟡 Sedang', hard: '🔴 Sulit' }

export default function ColorSortGame({ onBack, game, difficulty }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()

  const [tubes, setTubes] = useState(() => generatePuzzle(difficulty.id))
  const [selectedTube, setSelectedTube] = useState(null)
  const [moves, setMoves] = useState(0)
  const [won, setWon] = useState(false)
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('tut-colorsort'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [history, setHistory] = useState([]) // for undo
  const [animatingTube, setAnimatingTube] = useState(null)

  const isGameActive = !won
  const timerRunning = isGameActive && moves > 0
  const time = useTimer(timerRunning, resetKey)

  const bestKey = `colorsort-best-${difficulty.id}`
  const [bestMoves, setBestMoves] = useState(() => parseInt(localStorage.getItem(bestKey) || '0'))

  // Check win
  useEffect(() => {
    if (won || moves === 0) return
    if (isPuzzleSolved(tubes)) {
      setWon(true)
      setShowConfetti(true)
      play('win')

      if (bestMoves === 0 || moves < bestMoves) {
        localStorage.setItem(bestKey, moves)
        setBestMoves(moves)
      }

      const starThresholds = { easy: 20, medium: 30, hard: 45 }
      const threshold = starThresholds[difficulty.id] || 20
      const stars = moves <= threshold ? 3 : moves <= threshold * 1.5 ? 2 : 1
      reportGameResult({
        gameId: 'color-sort',
        difficultyId: difficulty.id,
        won: true,
        score: Math.max(0, 500 - moves * 5),
        stars,
        timeSec: time,
      })
      const coinReward = { easy: 15, medium: 25, hard: 40 }
      let coinAmount = coinReward[difficulty.id] || 15
      if (stars === 3) coinAmount += 20
      earnCoins(coinAmount, `Menang Color Sort (${difficulty.id})`)
    }
  }, [tubes, moves])

  const handleTubeClick = useCallback((tubeIndex) => {
    if (won) return

    if (selectedTube === null) {
      // Select source tube
      if (tubes[tubeIndex].length === 0) return
      if (isSorted(tubes[tubeIndex])) return // already sorted, skip
      play('click')
      setSelectedTube(tubeIndex)
    } else if (selectedTube === tubeIndex) {
      // Deselect
      play('click')
      setSelectedTube(null)
    } else {
      // Try to pour
      if (canPour(tubes[selectedTube], tubes[tubeIndex])) {
        play('match')
        setHistory(h => [...h, tubes.map(t => [...t])])
        setAnimatingTube(tubeIndex)

        const newTubes = tubes.map(t => [...t])
        const ball = newTubes[selectedTube].pop()
        newTubes[tubeIndex].push(ball)
        setTubes(newTubes)
        setMoves(m => m + 1)
        setSelectedTube(null)
        setTimeout(() => setAnimatingTube(null), 300)
      } else {
        play('mismatch')
        setSelectedTube(null)
      }
    }
  }, [selectedTube, tubes, won, play])

  const undo = () => {
    if (history.length === 0 || won) return
    play('click')
    const prev = history[history.length - 1]
    setTubes(prev)
    setHistory(h => h.slice(0, -1))
    setMoves(m => m - 1)
    setSelectedTube(null)
  }

  const restart = () => {
    play('click')
    setTubes(generatePuzzle(difficulty.id))
    setSelectedTube(null)
    setMoves(0)
    setWon(false)
    setShowConfetti(false)
    setHistory([])
    setAnimatingTube(null)
    setResetKey(k => k + 1)
  }

  // Theme
  const bg        = darkMode ? '#1a1a2e' : '#FFF9F0'
  const surface   = darkMode ? '#16213e' : '#fff'
  const textMain  = darkMode ? '#e8e8f0' : '#2D3436'
  const textMuted = darkMode ? '#8892b0' : '#636E72'
  const borderCol = darkMode ? '#2d3561' : '#DFE6E9'
  const accent    = '#6C5CE7'

  const config = DIFF_CONFIG[difficulty.id] || DIFF_CONFIG.easy

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px 60px', background: bg, minHeight: '100vh', transition: 'background 0.3s' }}>
      {showTutorial && <TutorialModal steps={TUTORIAL_STEPS} color={accent} onClose={() => { setShowTutorial(false); localStorage.setItem("tut-colorsort","1") }} />}
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => { play('click'); onBack() }}
          style={{ background: surface, border: `2px solid ${borderCol}`, borderRadius: 12, padding: '8px 14px', fontSize: 18, cursor: 'pointer', color: textMain }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: textMain, lineHeight: 1 }}>
            🧪 Color Sort
          </h1>
          <p style={{ fontSize: 13, color: textMuted, marginTop: 2 }}>
            Urutkan {config.colorCount} warna ke tabung yang tepat!
          </p>
        </div>
        <span style={{ background: difficulty.id === 'easy' ? '#E8F8F0' : difficulty.id === 'medium' ? '#FFFBF0' : '#FFF0F0', color: difficulty.id === 'easy' ? '#00b894' : difficulty.id === 'medium' ? '#f9a825' : '#FF6B6B', border: `2px solid ${difficulty.id === 'easy' ? '#00b89444' : difficulty.id === 'medium' ? '#f9a82544' : '#FF6B6B44'}`, borderRadius: 100, padding: '6px 14px', fontFamily: "'Fredoka One',cursive", fontSize: 13, whiteSpace: 'nowrap' }}>
          {DIFF_LABEL[difficulty.id]}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: '🎯 Langkah', value: moves, color: '#6C5CE7' },
          { label: '⏱ Waktu', value: formatTime(time), color: '#4ECDC4' },
          { label: '🧪 Tabung', value: `${tubes.filter(t => isSorted(t)).length}/${config.colorCount}`, color: '#FF6B6B' },
        ].map(s => (
          <div key={s.label} style={{ background: surface, border: `2px solid ${s.color}33`, borderRadius: 16, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: textMuted, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tubes */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: config.colorCount > 6 ? 8 : 12,
        flexWrap: 'wrap', marginBottom: 28, padding: '0 8px',
      }}>
        {tubes.map((tube, ti) => {
          const isSelected = selectedTube === ti
          const isFull = isSorted(tube)
          const isAnimating = animatingTube === ti

          return (
            <div key={ti} onClick={() => handleTubeClick(ti)}
              style={{
                cursor: won ? 'default' : 'pointer',
                transform: isSelected ? 'translateY(-12px) scale(1.05)' : isAnimating ? 'scale(1.03)' : 'scale(1)',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                filter: isFull ? 'brightness(1.1)' : 'none',
              }}>
              {/* Tube container */}
              <div style={{
                width: config.colorCount > 6 ? 44 : 52,
                height: config.colorCount > 6 ? 160 : 180,
                borderRadius: '0 0 20px 20px',
                borderLeft: `3px solid ${isSelected ? accent : (darkMode ? '#3d3561' : '#B2BEC3')}`,
                borderRight: `3px solid ${isSelected ? accent : (darkMode ? '#3d3561' : '#B2BEC3')}`,
                borderBottom: `3px solid ${isSelected ? accent : (darkMode ? '#3d3561' : '#B2BEC3')}`,
                background: darkMode ? '#0f0f23' : '#F8F9FA',
                display: 'flex', flexDirection: 'column-reverse',
                padding: 3,
                gap: 2,
                position: 'relative',
                boxShadow: isSelected ? `0 8px 20px ${accent}44` : isFull ? `0 4px 12px ${getColorHex(tube[0])}44` : '0 2px 8px rgba(0,0,0,0.08)',
              }}>
                {/* Balls */}
                {tube.map((ball, bi) => (
                  <div key={bi} style={{
                    width: '100%',
                    flex: 1,
                    borderRadius: 12,
                    background: `linear-gradient(145deg, ${getColorHex(ball)}, ${getColorHex(ball)}dd)`,
                    boxShadow: `inset 0 -2px 4px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.25)`,
                    transition: 'all 0.3s',
                  }} />
                ))}
                {/* Empty slots */}
                {Array(TUBE_CAPACITY - tube.length).fill(null).map((_, i) => (
                  <div key={`empty-${i}`} style={{
                    width: '100%', flex: 1,
                    borderRadius: 12,
                    background: 'transparent',
                  }} />
                ))}
                {/* Completed check */}
                {isFull && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    fontSize: 16, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                  }}>✅</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={restart}
          style={{ background: accent, color: '#fff', border: 'none', borderRadius: 100, padding: '12px 28px', fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: 'pointer', boxShadow: `0 4px 14px ${accent}44` }}>
          🔄 Main Lagi
        </button>
        <button onClick={undo} disabled={history.length === 0 || won}
          style={{ background: history.length === 0 || won ? 'rgba(255,255,255,0.05)' : 'rgba(255,211,61,0.15)', color: history.length === 0 || won ? textMuted : '#FFD93D', border: `2px solid ${history.length === 0 || won ? borderCol : '#FFD93D44'}`, borderRadius: 100, padding: '12px 18px', fontSize: 14, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: history.length === 0 || won ? 'default' : 'pointer' }}>
          ↩️ Undo
        </button>
        <button onClick={() => { play('click'); onBack() }}
          style={{ background: surface, color: textMuted, border: `2px solid ${borderCol}`, borderRadius: 100, padding: '12px 18px', fontSize: 14, fontWeight: 700, fontFamily: "'Fredoka One',cursive", cursor: 'pointer' }}>
          🎯 Level
        </button>
      </div>

      {/* Best record */}
      {bestMoves > 0 && (
        <div style={{ marginTop: 20, background: darkMode ? '#1f1f3e' : '#FFF9F0', border: `2px solid ${darkMode ? '#3d3561' : '#FFE66D'}`, borderRadius: 16, padding: '12px 20px', textAlign: 'center', fontSize: 14, color: textMuted, fontWeight: 600 }}>
          🏆 Rekor {DIFF_LABEL[difficulty.id]}: <span style={{ color: accent, fontFamily: "'Fredoka One',cursive", fontSize: 16 }}>{bestMoves} langkah</span>
        </div>
      )}

      {won && (
        <WinModal
          moves={moves}
          time={formatTime(time)}
          diffLabel={DIFF_LABEL[difficulty.id]}
          onRestart={restart}
          onBack={onBack}
          darkMode={darkMode}
          game={game}
          difficulty={difficulty}
        />
      )}
    </div>
  )
}

function WinModal({ moves, time, diffLabel, onRestart, onBack, darkMode, game, difficulty }) {
  const starThresholds = { easy: 20, medium: 30, hard: 45 }
  const threshold = starThresholds[difficulty.id] || 20
  const stars = moves <= threshold ? 3 : moves <= threshold * 1.5 ? 2 : 1
  const bg = darkMode ? '#1a1a2e' : '#fff'
  const textMain = darkMode ? '#e8e8f0' : '#2D3436'
  const textMuted = darkMode ? '#8892b0' : '#636E72'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ background: bg, borderRadius: 28, padding: '40px 36px', textAlign: 'center', maxWidth: 360, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🎉</div>
        <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 32, color: textMain, marginBottom: 4 }}>Selamat!</h2>
        <p style={{ color: textMuted, fontSize: 14, marginBottom: 6 }}>Semua warna berhasil diurutkan!</p>
        <span style={{ display: 'inline-block', background: `${game.color}22`, color: game.color, padding: '4px 14px', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>{diffLabel}</span>

        <div style={{ fontSize: 36, marginBottom: 16, letterSpacing: 4 }}>{'⭐'.repeat(stars)}{'☆'.repeat(3-stars)}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={{ background: darkMode ? '#2d1f2d' : '#F0EFFE', borderRadius: 14, padding: 12 }}>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: '#6C5CE7' }}>{moves}</div>
            <div style={{ fontSize: 12, color: textMuted, fontWeight: 600 }}>Langkah</div>
          </div>
          <div style={{ background: darkMode ? '#1a2d2d' : '#F0FFFE', borderRadius: 14, padding: 12 }}>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: '#4ECDC4' }}>{time}</div>
            <div style={{ fontSize: 12, color: textMuted, fontWeight: 600 }}>Waktu</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onRestart} style={{ flex: 1, background: '#6C5CE7', color: '#fff', border: 'none', borderRadius: 100, padding: '13px 20px', fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: 'pointer', boxShadow: '0 4px 14px #6C5CE744' }}>🔄 Main Lagi</button>
          <button onClick={onBack} style={{ flex: 1, background: darkMode ? '#1e2a4a' : '#F8F9FA', color: textMuted, border: `2px solid ${darkMode ? '#2d3561' : '#DFE6E9'}`, borderRadius: 100, padding: '13px 20px', fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: 'pointer' }}>🎯 Ganti Level</button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes popIn  { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  )
}
