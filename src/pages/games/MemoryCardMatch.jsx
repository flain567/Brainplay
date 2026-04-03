import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'
import { useHaptics } from '../../hooks/useHaptics.js'
import { useLeaderboard } from '../../context/LeaderboardContext.jsx'
import { WinModal } from '../../components/GameLayout.jsx'

const TUTORIAL_STEPS = [
  { emoji:'🃏', title:'Memory Card Match', desc:'Temukan semua pasangan kartu yang tersembunyi di balik kartu terbalik!', tip:'Ingat posisi kartu yang sudah pernah kamu buka.' },
  { emoji:'👆', title:'Cara Main', desc:'Klik satu kartu untuk membukanya, lalu cari pasangan yang sama. Kalau cocok, kartu tetap terbuka!', tip:'Kalau tidak cocok, kartu akan tertutup lagi — ingat posisinya!' },
  { emoji:'⭐', title:'Sistem Bintang', desc:'Semakin sedikit gerakan yang kamu pakai, semakin banyak bintang yang kamu dapat. Targetkan 3 bintang!', tip:'Easy ≤10 gerakan, Medium ≤14, Hard ≤20 untuk 3 bintang.' },
]

const DEFAULT_POOL = ['🐶','🐱','🦊','🐻','🦁','🐯','🐸','🐧','🦄','🐼','🦋','🐙']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function createDeck(pairs, pool) {
  const icons = (pool || DEFAULT_POOL).slice(0, pairs)
  return shuffle(
    [...icons, ...icons].map((emoji, idx) => ({
      id: idx, emoji, flipped: false, matched: false,
    }))
  )
}

function useTimer(running, resetKey, initialTime = 0, isCountdown = false, onTimeOut = null) {
  const [time, setTime] = useState(initialTime)
  useEffect(() => { setTime(initialTime) }, [resetKey, initialTime])
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setTime(t => {
        if (isCountdown) {
          if (t <= 1) {
            clearInterval(id)
            onTimeOut?.()
            return 0
          }
          return t - 1
        }
        return t + 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, isCountdown, onTimeOut])
  return time
}

const formatTime = (s) =>
  `${Math.floor(s/60).toString().padStart(2,'0')}:${((s%60) || 0).toString().padStart(2,'0')}`

const DIFF_LABEL = { easy: '🟢 Mudah', medium: '🟡 Sedang', hard: '🔴 Sulit' }

export default function MemoryCardMatch({ onBack, onHome, game, difficulty }) {
  const tc = useThemeColors()
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { getActiveCardPack, earnCoins, spendCoins, coins } = useCoins()
  const { vibrateLight, vibrateMedium, vibrateSuccess, vibrateError } = useHaptics()
  const { startScoreSession } = useLeaderboard()

  const { pairs, cols } = difficulty
  const activePack = getActiveCardPack()
  const iconPool = activePack.icons
  const cardBack = activePack.cardBack || null
  const timersRef = useRef([])

  const safeTimeout = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms)
    timersRef.current.push(id)
    return id
  }, [])

  useEffect(() => {
    return () => { timersRef.current.forEach(id => clearTimeout(id)); timersRef.current = [] }
  }, [])

  const [deck, setDeck]         = useState(() => createDeck(pairs, iconPool))
  const [selected, setSelected] = useState([])
  const [moves, setMoves]       = useState(0)
  const [locked, setLocked]     = useState(false)
  const [won, setWon]           = useState(false)
  const [failed, setFailed]     = useState(false)
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('bp_tut_memory-card'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [gameMode, setGameMode] = useState('standard') // standard, timeAttack, mirror

  const bestKey = `${game.id}-best-${difficulty.id}`
  const [bestMoves, setBestMoves] = useState(() => parseInt(localStorage.getItem(bestKey) || '0'))

  const initialTime = useMemo(() => {
    if (gameMode !== 'timeAttack') return 0
    return difficulty.id === 'easy' ? 60 : difficulty.id === 'medium' ? 45 : 30
  }, [gameMode, difficulty.id])

  const timerRunning = !won && !failed && moves > 0
  const time = useTimer(timerRunning, resetKey, initialTime, gameMode === 'timeAttack', () => {
    setFailed(true)
    play('mismatch')
    vibrateError()
  })

  useEffect(() => {
    if (deck.length > 0 && deck.every(c => c.matched)) {
      setWon(true)
      setShowConfetti(true)
      play('win')
      vibrateSuccess()
      if (bestMoves === 0 || moves < bestMoves) {
        localStorage.setItem(bestKey, moves)
        setBestMoves(moves)
      }
      let stars = moves <= (pairs * 1.5) ? 3 : moves <= (pairs * 2.5) ? 2 : 1
      if (paidHints > 0 && stars > 2) stars = 2
      reportGameResult({
        gameId: 'memory-card',
        difficultyId: difficulty.id,
        won: true,
        score: Math.max(0, pairs * 100 - moves * 10),
        stars,
        timeSec: gameMode === 'timeAttack' ? initialTime - time : time,
      })
      const coinReward = { easy: 15, medium: 25, hard: 40 }
      let coinAmount = coinReward[difficulty.id] || 15
      if (stars === 3) coinAmount += 20
      earnCoins(coinAmount, `Menang Memory Card (${difficulty.id})`)
    }
  }, [deck])

  const handleRestart = () => {
    setDeck(createDeck(pairs, iconPool))
    setSelected([])
    setMoves(0)
    setWon(false)
    setFailed(false)
    setLocked(false)
    setHintUsed(0)
    setPaidHints(0)
    setHintCells([])
    setResetKey(k => k + 1)
  }

  const flipCard = useCallback((id) => {
    if (locked || failed || won) return
    const card = deck.find(c => c.id === id)
    if (!card || card.flipped || card.matched) return
    if (selected.length === 1 && selected[0].id === id) return

    play('flip')
    vibrateLight()
    const newDeck     = deck.map(c => c.id === id ? { ...c, flipped: true } : c)
    const newSelected = [...selected, { ...card }]
    setDeck(newDeck)
    setSelected(newSelected)

    if (newSelected.length === 2) {
      if (moves === 0 && startScoreSession) startScoreSession(game.id)
      setMoves(m => m + 1)
      setLocked(true)
      if (newSelected[0].emoji === newSelected[1].emoji) {
        play('match')
        vibrateMedium()
        safeTimeout(() => {
          setDeck(d => d.map(c =>
            c.id === newSelected[0].id || c.id === newSelected[1].id
              ? { ...c, matched: true } : c
          ))
          setSelected([])
          setLocked(false)
        }, 500)
      } else {
        safeTimeout(() => { play('mismatch'); vibrateError() }, 200)
        safeTimeout(() => {
          setDeck(d => d.map(c =>
            c.id === newSelected[0].id || c.id === newSelected[1].id
              ? { ...c, flipped: false } : c
          ))
          setSelected([])
          setLocked(false)
        }, 1000)
      }
    }
  }, [deck, selected, locked, failed, won, play])

  const FREE_HINTS = 3
  const HINT_COST = 100
  const [hintUsed, setHintUsed] = useState(0)
  const [paidHints, setPaidHints] = useState(0)
  const [hintCells, setHintCells] = useState([])

  const useHint = async () => {
    if (locked || won || failed) return
    const isFree = hintUsed < FREE_HINTS
    if (!isFree) {
      if (coins < HINT_COST) { play('mismatch'); vibrateError(); return }
      const ok = await spendCoins(HINT_COST, 'Hint Memory Card')
      if (!ok) return
      setPaidHints(p => p + 1)
    }
    play('click')
    vibrateMedium()
    const unmatched = deck.filter(c => !c.matched && !c.flipped)
    if (unmatched.length < 2) return
    const found = []
    const seen = {}
    for (const c of unmatched) {
      if (seen[c.emoji]) { found.push(seen[c.emoji]); found.push(c); break }
      seen[c.emoji] = c
    }
    if (found.length < 2) return
    const foundIds = found.map(c => c.id)
    setHintCells(foundIds)
    setLocked(true)
    setDeck(d => d.map(c => foundIds.includes(c.id) ? {...c, flipped:true} : c))
    safeTimeout(() => {
      setDeck(d => d.map(c => foundIds.includes(c.id) ? {...c, flipped:false} : c))
      setHintCells([])
      setLocked(false)
    }, 1500)
    setHintUsed(h => h+1)
  }

  const matchedCount = deck.filter(c => c.matched).length / 2

  const winStars = useMemo(() => {
    let stars = moves <= pairs * 1.5 ? 3 : moves <= pairs * 2.5 ? 2 : 1
    if (paidHints > 0 && stars > 2) stars = 2
    return stars
  }, [moves, pairs, paidHints])

  const winCoinAmount = useMemo(() => {
    const coinReward = { easy: 15, medium: 25, hard: 40 }
    let coinAmount = coinReward[difficulty.id] || 15
    if (winStars === 3) coinAmount += 20
    return coinAmount
  }, [winStars, difficulty.id])

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px 60px', background: tc.bg, minHeight: '100dvh', transition: 'background 0.3s', position: 'relative', overflowX: 'hidden' }}>
      {showTutorial && <TutorialModal steps={TUTORIAL_STEPS} color="#FF6B6B" onClose={() => { setShowTutorial(false); localStorage.setItem("bp_tut_memory-card","1") }} />}
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}

      {/* Mode Selector (Visible before first move) */}
      {moves === 0 && !won && !failed && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 24, padding: '12px',
          background: tc.surface, borderRadius: 20, border: `2px solid ${tc.borderCol}`,
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
        }}>
          {['standard', 'timeAttack', 'mirror'].map(m => (
            <button key={m} onClick={() => { play('click'); setGameMode(m); }} style={{
              padding: '10px 16px', borderRadius: 14, border: 'none',
              background: gameMode === m ? 'linear-gradient(135deg, #A29BFE, #6C5CE7)' : (tc.dark ? '#2d3436' : '#f0f0f0'),
              color: gameMode === m ? '#fff' : tc.textMain,
              fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: "'Fredoka One', cursive",
              transition: 'all 0.2s', transform: gameMode === m ? 'scale(1.05)' : 'none'
            }}>
              {m === 'standard' ? '🎯 Standard' : m === 'timeAttack' ? '⏳ Time Attack' : '🪞 Mirror'}
            </button>
          ))}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => { play('click'); onBack() }}
          style={{ background: tc.surface, border: `2px solid ${tc.borderCol}`, borderRadius: 12, padding: '8px 14px', fontSize: 18, cursor: 'pointer', color: tc.textMain }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: tc.textMain, lineHeight: 1 }}>
            🃏 Memory Match
          </h1>
          <div style={{ fontSize: 11, color: tc.textMuted, marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {DIFF_LABEL[difficulty.id]} {gameMode !== 'standard' && <span style={{ color: '#6C5CE7' }}>• {gameMode.toUpperCase()}</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Gerakan', value: moves, color: '#FF6B6B' },
          { label: 'Timer', value: formatTime(time), color: (gameMode === 'timeAttack' && time < 10) ? '#FF4757' : '#4ECDC4' },
          { label: 'Skor', value: `${matchedCount}/${pairs}`, color: '#A29BFE' },
        ].map(s => (
          <div key={s.label} style={{ background: tc.surface, border: `2px solid ${s.color}33`, borderRadius: 16, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: tc.textMuted, marginTop: 3, fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: cols >= 5 ? 8 : 12,
        marginBottom: 24,
        perspective: 1000,
        transform: gameMode === 'mirror' ? 'scaleX(-1)' : 'none'
      }}>
        {deck.map(card => (
          <CardTile
            key={card.id}
            card={card}
            onClick={() => flipCard(card.id)}
            darkMode={tc.dark}
            small={cols >= 5}
            cardBack={cardBack}
            isMirror={gameMode === 'mirror'}
          />
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={useHint}
          disabled={locked || won || failed}
          style={{
            width: '100%', padding: '16px', borderRadius: 16, border: 'none',
            background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)', color: '#fff',
            fontFamily: "'Fredoka One', cursive", fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            opacity: (locked || won || failed) ? 0.5 : 1, transition: 'all 0.3s',
            boxShadow: '0 4px 15px rgba(108, 92, 231, 0.3)'
          }}
        >
          <span>💡</span> Hint {hintUsed < FREE_HINTS ? `(Gratis: ${FREE_HINTS - hintUsed})` : `(🪙 ${HINT_COST})`}
        </button>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleRestart}
            style={{ flex: 1, background: tc.surface, color: tc.textMain, border: `2px solid ${tc.borderCol}`, borderRadius: 16, padding: '14px', fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: 'pointer' }}>
            🔄 Reset
          </button>
          <button onClick={() => { play('click'); onBack() }}
            style={{ flex: 1, background: tc.surface, color: tc.textMain, border: `2px solid ${tc.borderCol}`, borderRadius: 16, padding: '14px', fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: 'pointer' }}>
            🎮 Level
          </button>
        </div>
      </div>

      {won && (
        <WinModal
          gameTitle={game.title}
          stars={winStars}
          stats={[
            { label: 'Moves', value: moves, color: '#FF6B6B' },
            { label: 'Waktu', value: formatTime(gameMode === 'timeAttack' ? initialTime - time : time), color: '#4ECDC4' },
            { label: 'Mode', value: gameMode === 'standard' ? 'Standard' : gameMode === 'timeAttack' ? 'Time Attack' : 'Mirror', color: '#A29BFE' }
          ]}
          onRestart={handleRestart}
          onHome={onHome}
          gameColor={game.color}
        />
      )}

      {failed && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(8px)', animation: 'fade-in 0.3s'
        }}>
          <div style={{
            background: tc.surface, padding: 32, borderRadius: 28, textAlign: 'center',
            maxWidth: 320, width: '90%', border: `4px solid #FF4757`,
            boxShadow: '0 20px 50px rgba(255,71,87,0.3)', transform: 'translateY(-20px)'
          }}>
            <div style={{ fontSize: 72, marginBottom: 16, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.2))' }}>⏰</div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 28, color: '#FF4757', marginBottom: 8, letterSpacing: -0.5 }}>WAKTU HABIS!</div>
            <p style={{ color: tc.textMuted, fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>Yah, waktumu sudah habis! Ayo coba lagi lebih cepat!</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleRestart} style={{
                padding: '16px', borderRadius: 16, border: 'none',
                background: '#FF4757', color: '#fff',
                fontFamily: "'Fredoka One', cursive", fontSize: 16, cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(255,71,87,0.3)'
              }}>Main Lagi</button>
              <button onClick={onHome} style={{
                padding: '16px', borderRadius: 16, border: `2px solid ${tc.borderCol}`,
                background: 'transparent', color: tc.textMain,
                fontFamily: "'Fredoka One', cursive", fontSize: 15, cursor: 'pointer'
              }}>Keluar</button>
            </div>
          </div>
        </div>
      )}

      {bestMoves > 0 && (
        <div style={{ marginTop: 24, background: tc.surface, border: `2px solid ${tc.borderCol}`, borderRadius: 20, padding: '16px', textAlign: 'center', fontSize: 14, color: tc.textMuted, fontWeight: 700 }}>
          🏆 Rekor {DIFF_LABEL[difficulty.id]}: <span style={{ color: '#FF6B6B', fontFamily: "'Fredoka One',cursive", fontSize: 18 }}>{bestMoves} gerakan</span>
        </div>
      )}
    </div>
  )
}

function CardTile({ card, onClick, darkMode, small, cardBack, isMirror }) {
  const frontBg = card.matched
    ? (darkMode ? '#1a3d30' : '#E8FDF5')
    : (darkMode ? '#1e2a4a' : '#fff')
  const isImage = card.emoji && card.emoji.startsWith('/')

  return (
    <div onClick={onClick} style={{ aspectRatio: '1', perspective: 1000, cursor: card.matched ? 'default' : 'pointer', height: '100%' }}>
      <div style={{
        width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d',
        transition: 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: (card.flipped || card.matched) ? 'rotateY(180deg)' : 'rotateY(0deg)'
      }}>
        {/* Back */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
          borderRadius: small ? 12 : 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)', overflow: 'hidden'
        }}>
          {cardBack ? (
            <img src={cardBack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: small ? 20 : 28, color: 'rgba(255,255,255,0.7)', fontWeight: 800 }}>?</span>
          )}
        </div>
        {/* Front */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: frontBg,
          border: `3px solid ${card.matched ? '#4ECDC4' : (darkMode ? '#3d4a7a' : '#E0E7FF')}`,
          borderRadius: small ? 12 : 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: small ? 24 : 36,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          <div style={{ transform: isMirror ? 'scaleX(-1)' : 'none', opacity: card.matched ? 0.6 : 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isImage ? (
              <img src={card.emoji} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
            ) : (
              card.emoji
            )}
          </div>
          {card.matched && <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 10 }}>✅</span>}
        </div>
      </div>
    </div>
  )
}
