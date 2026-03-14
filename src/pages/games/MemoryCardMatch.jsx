import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

const TUTORIAL_STEPS = [
  { emoji:'🃏', title:'Memory Card Match', desc:'Temukan semua pasangan kartu yang tersembunyi di balik kartu terbalik!', tip:'Ingat posisi kartu yang sudah pernah kamu buka.' },
  { emoji:'👆', title:'Cara Main', desc:'Klik satu kartu untuk membukanya, lalu cari pasangan yang sama. Kalau cocok, kartu tetap terbuka!', tip:'Kalau tidak cocok, kartu akan tertutup lagi — ingat posisinya!' },
  { emoji:'⭐', title:'Sistem Bintang', desc:'Semakin sedikit gerakan yang kamu pakai, semakin banyak bintang yang kamu dapat. Targetkan 3 bintang!', tip:'Easy ≤10 gerakan, Medium ≤14, Hard ≤20 untuk 3 bintang.' },
]

import { useState, useEffect, useCallback } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'

// Pool emoji — ambil sejumlah pairs yang dibutuhkan
const EMOJI_POOL = ['🐶','🐱','🦊','🐻','🦁','🐯','🐸','🐧','🦄','🐼','🦋','🐙']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function createDeck(pairs) {
  const emojis = EMOJI_POOL.slice(0, pairs)
  return shuffle(
    [...emojis, ...emojis].map((emoji, idx) => ({
      id: idx, emoji, flipped: false, matched: false,
    }))
  )
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

export default function MemoryCardMatch({ onBack, game, difficulty }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { reportGameResult } = useProgress()

  const { pairs, cols } = difficulty

  const [deck, setDeck]         = useState(() => createDeck(pairs))
  const [selected, setSelected] = useState([])
  const [moves, setMoves]       = useState(0)
  const [locked, setLocked]     = useState(false)
  const [won, setWon]           = useState(false)
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('tut-memory'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const bestKey = `${game.id}-best-${difficulty.id}`
  const [bestMoves, setBestMoves] = useState(() => parseInt(localStorage.getItem(bestKey) || '0'))

  const timerRunning = !won && moves > 0
  const time = useTimer(timerRunning, resetKey)

  useEffect(() => {
    if (deck.length > 0 && deck.every(c => c.matched)) {
      setWon(true)
      setShowConfetti(true)
      play('win')
      if (bestMoves === 0 || moves < bestMoves) {
        localStorage.setItem(bestKey, moves)
        setBestMoves(moves)
      }
      const stars = moves <= (pairs * 1.5) ? 3 : moves <= (pairs * 2.5) ? 2 : 1
      reportGameResult({
        gameId: 'memory-card',
        difficultyId: difficulty.id,
        won: true,
        score: Math.max(0, pairs * 100 - moves * 10),
        stars,
        timeSec: time,
      })
    }
  }, [deck])

  const flipCard = useCallback((id) => {
    if (locked) return
    const card = deck.find(c => c.id === id)
    if (!card || card.flipped || card.matched) return
    if (selected.length === 1 && selected[0].id === id) return

    play('flip')
    const newDeck     = deck.map(c => c.id === id ? { ...c, flipped: true } : c)
    const newSelected = [...selected, { ...card }]
    setDeck(newDeck)
    setSelected(newSelected)

    if (newSelected.length === 2) {
      setMoves(m => m + 1)
      setLocked(true)
      if (newSelected[0].emoji === newSelected[1].emoji) {
        play('match')
        setTimeout(() => {
          setDeck(d => d.map(c =>
            c.id === newSelected[0].id || c.id === newSelected[1].id
              ? { ...c, matched: true } : c
          ))
          setSelected([])
          setLocked(false)
        }, 500)
      } else {
        setTimeout(() => play('mismatch'), 200)
        setTimeout(() => {
          setDeck(d => d.map(c =>
            c.id === newSelected[0].id || c.id === newSelected[1].id
              ? { ...c, flipped: false } : c
          ))
          setSelected([])
          setLocked(false)
        }, 1000)
      }
    }
  }, [deck, selected, locked, play])

  // Hint system — reveal a pair for 1.5s
  const [hintUsed, setHintUsed] = useState(0)
  const [hintCells, setHintCells] = useState([])
  const useHint = () => {
    if (locked || hintUsed >= 3) return
    play('click')
    const unmatched = deck.filter(c => !c.matched)
    if (unmatched.length < 2) return
    // Find first unmatched pair
    const found = []
    const seen = {}
    for (const c of unmatched) {
      if (seen[c.emoji]) { found.push(seen[c.emoji]); found.push(c); break }
      seen[c.emoji] = c
    }
    if (found.length < 2) return
    setHintCells(found.map(c=>c.id))
    setDeck(d => d.map(c => found.some(f=>f.id===c.id) ? {...c, flipped:true} : c))
    setTimeout(() => {
      setDeck(d => d.map(c => hintCells.includes(c.id)||found.some(f=>f.id===c.id) ? {...c, flipped:false} : c))
      setHintCells([])
    }, 1500)
    setHintUsed(h => h+1)
  }
  const restart = () => {
    play('click')
    setDeck(createDeck(pairs))
    setSelected([])
    setMoves(0)
    setLocked(false)
    setWon(false)
    setShowConfetti(false)
    setHintUsed(0)
    setHintCells([])
    setResetKey(k => k + 1)
  }

  const matchedCount = deck.filter(c => c.matched).length / 2

  // Theme
  const bg        = darkMode ? '#1a1a2e' : '#FFF9F0'
  const surface   = darkMode ? '#16213e' : '#fff'
  const textMain  = darkMode ? '#e8e8f0' : '#2D3436'
  const textMuted = darkMode ? '#8892b0' : '#636E72'
  const borderCol = darkMode ? '#2d3561' : '#DFE6E9'

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px 60px', background: bg, minHeight: '100vh', transition: 'background 0.3s' }}>
      {showTutorial && <TutorialModal steps={TUTORIAL_STEPS} color="#FF6B6B" onClose={() => { setShowTutorial(false); localStorage.setItem("tut-memory","1") }} />}
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => { play('click'); onBack() }}
          style={{ background: surface, border: `2px solid ${borderCol}`, borderRadius: 12, padding: '8px 14px', fontSize: 18, cursor: 'pointer', color: textMain }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: textMain, lineHeight: 1 }}>
            🃏 Memory Card Match
          </h1>
          <p style={{ fontSize: 13, color: textMuted, marginTop: 2 }}>
            Temukan semua {pairs} pasang kartu!
          </p>
        </div>
        {/* Difficulty badge */}
        <span style={{ background: difficulty.id === 'easy' ? '#E8F8F0' : difficulty.id === 'medium' ? '#FFFBF0' : '#FFF0F0', color: difficulty.id === 'easy' ? '#00b894' : difficulty.id === 'medium' ? '#f9a825' : '#FF6B6B', border: `2px solid ${difficulty.id === 'easy' ? '#00b89444' : difficulty.id === 'medium' ? '#f9a82544' : '#FF6B6B44'}`, borderRadius: 100, padding: '6px 14px', fontFamily: "'Fredoka One',cursive", fontSize: 13, whiteSpace: 'nowrap' }}>
          {DIFF_LABEL[difficulty.id]}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: '🎯 Gerakan', value: moves,              color: '#FF6B6B' },
          { label: '⏱ Waktu',   value: formatTime(time),   color: '#4ECDC4' },
          { label: '✅ Pasangan', value: `${matchedCount}/${pairs}`, color: '#A29BFE' },
        ].map(s => (
          <div key={s.label} style={{ background: surface, border: `2px solid ${s.color}33`, borderRadius: 16, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: textMuted, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Board — columns dinamis sesuai difficulty */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: cols >= 4 ? 10 : 12, marginBottom: 24 }}>
        {deck.map(card => (
          <CardTile key={card.id} card={card} onClick={() => flipCard(card.id)} darkMode={darkMode} small={cols >= 5} />
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={restart}
          style={{ background: '#FF6B6B', color: '#fff', border: 'none', borderRadius: 100, padding: '12px 28px', fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: 'pointer', boxShadow: '0 4px 14px #FF6B6B44' }}>
          🔄 Main Lagi
        </button>
        <button onClick={useHint} disabled={hintUsed >= 3 || won}
          style={{ background: hintUsed>=3||won ? 'rgba(255,255,255,0.05)' : 'rgba(255,211,61,0.15)', color: hintUsed>=3||won ? textMuted : '#FFD93D', border: `2px solid ${hintUsed>=3||won ? borderCol : '#FFD93D44'}`, borderRadius: 100, padding: '12px 18px', fontSize: 14, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: hintUsed>=3||won ? 'default' : 'pointer' }}>
          💡 Hint ({3-hintUsed})
        </button>
        <button onClick={() => { play('click'); onBack() }}
          style={{ background: surface, color: textMuted, border: `2px solid ${borderCol}`, borderRadius: 100, padding: '12px 18px', fontSize: 14, fontWeight: 700, fontFamily: "'Fredoka One',cursive", cursor: 'pointer' }}>
          🎯 Level
        </button>
      </div>

      {/* Best record */}
      {bestMoves > 0 && (
        <div style={{ marginTop: 20, background: darkMode ? '#1f1f3e' : '#FFF9F0', border: `2px solid ${darkMode ? '#3d3561' : '#FFE66D'}`, borderRadius: 16, padding: '12px 20px', textAlign: 'center', fontSize: 14, color: textMuted, fontWeight: 600 }}>
          🏆 Rekor {DIFF_LABEL[difficulty.id]}: <span style={{ color: '#FF6B6B', fontFamily: "'Fredoka One',cursive", fontSize: 16 }}>{bestMoves} gerakan</span>
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
        />
      )}
    </div>
  )
}

function CardTile({ card, onClick, darkMode, small }) {
  const frontBg = card.matched
    ? (darkMode ? '#1a3d30' : '#E8FDF5')
    : (darkMode ? '#1e2a4a' : '#fff')

  return (
    <div onClick={onClick} style={{ aspectRatio: '1', perspective: 600, cursor: card.matched ? 'default' : 'pointer' }}>
      <div style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)', transform: (card.flipped || card.matched) ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
        {/* Back */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: 'linear-gradient(135deg,#A29BFE,#FD79A8)', borderRadius: small ? 10 : 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: small ? 20 : 28, boxShadow: '0 3px 10px rgba(0,0,0,0.12)' }}>❓</div>
        {/* Front */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: frontBg, border: `2px solid ${card.matched ? '#4ECDC4' : (darkMode ? '#2d3561' : '#DFE6E9')}`, borderRadius: small ? 10 : 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: small ? 22 : 36, transition: 'background 0.3s' }}>
          {card.emoji}
          {card.matched && <span style={{ position: 'absolute', top: 3, right: 5, fontSize: 10, opacity: 0.6 }}>✅</span>}
        </div>
      </div>
    </div>
  )
}

function WinModal({ moves, time, diffLabel, onRestart, onBack, darkMode, game }) {
  const stars   = moves <= (8 * 1.5) ? 3 : moves <= (8 * 2.5) ? 2 : 1
  const bg      = darkMode ? '#1a1a2e' : '#fff'
  const textMain  = darkMode ? '#e8e8f0' : '#2D3436'
  const textMuted = darkMode ? '#8892b0' : '#636E72'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ background: bg, borderRadius: 28, padding: '40px 36px', textAlign: 'center', maxWidth: 360, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🎉</div>
        <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 32, color: textMain, marginBottom: 4 }}>Selamat!</h2>
        <p style={{ color: textMuted, fontSize: 14, marginBottom: 6 }}>Semua kartu berhasil dicocokkan!</p>
        <span style={{ display: 'inline-block', background: `${game.color}22`, color: game.color, padding: '4px 14px', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>{diffLabel}</span>

        <div style={{ fontSize: 36, marginBottom: 16, letterSpacing: 4 }}>{'⭐'.repeat(stars)}{'☆'.repeat(3-stars)}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={{ background: darkMode ? '#2d1f1f' : '#FFF0F0', borderRadius: 14, padding: 12 }}>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: '#FF6B6B' }}>{moves}</div>
            <div style={{ fontSize: 12, color: textMuted, fontWeight: 600 }}>Gerakan</div>
          </div>
          <div style={{ background: darkMode ? '#1a2d2d' : '#F0FFFE', borderRadius: 14, padding: 12 }}>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: '#4ECDC4' }}>{time}</div>
            <div style={{ fontSize: 12, color: textMuted, fontWeight: 600 }}>Waktu</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onRestart} style={{ flex: 1, background: '#FF6B6B', color: '#fff', border: 'none', borderRadius: 100, padding: '13px 20px', fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: 'pointer', boxShadow: '0 4px 14px #FF6B6B44' }}>🔄 Main Lagi</button>
          <button onClick={onBack}    style={{ flex: 1, background: darkMode ? '#1e2a4a' : '#F8F9FA', color: textMuted, border: `2px solid ${darkMode ? '#2d3561' : '#DFE6E9'}`, borderRadius: 100, padding: '13px 20px', fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: 'pointer' }}>🎯 Ganti Level</button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes popIn  { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  )
}
