import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'

const TUTORIAL_STEPS = [
  { emoji:'🧩', title:'Sliding Puzzle', desc:'Geser tile angka untuk menyusun urutan dari 1 sampai terakhir!', tip:'Tile kosong adalah ruang gerak — geser tile ke arahnya.' },
  { emoji:'🎯', title:'Strategi', desc:'Susun baris atas dulu, lalu kolom kiri, lalu sisanya. Jangan rusak yang sudah benar!', tip:'Fokus pada angka kecil dulu dan kerjakan per baris.' },
  { emoji:'⭐', title:'Skor', desc:'Semakin sedikit langkah dan waktu, semakin tinggi skor!', tip:'Optimal moves untuk 3×3 sekitar 20-30 langkah.' },
]

const CFG = {
  easy:   { size: 3, timeLimit: 180 },
  medium: { size: 4, timeLimit: 360 },
  hard:   { size: 5, timeLimit: 600 },
}

function createPuzzle(size) {
  // Generate solved state
  const total = size * size
  const tiles = Array.from({ length: total - 1 }, (_, i) => i + 1)
  tiles.push(0) // 0 = empty

  // Shuffle by making random valid moves (guarantees solvability)
  let emptyIdx = total - 1
  const getNeighbors = (idx) => {
    const r = Math.floor(idx / size), c = idx % size, n = []
    if (r > 0) n.push(idx - size)
    if (r < size - 1) n.push(idx + size)
    if (c > 0) n.push(idx - 1)
    if (c < size - 1) n.push(idx + 1)
    return n
  }

  let lastMove = -1
  const moveCount = size * size * 40
  for (let i = 0; i < moveCount; i++) {
    const neighbors = getNeighbors(emptyIdx).filter(n => n !== lastMove)
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)]
    lastMove = emptyIdx;
    [tiles[emptyIdx], tiles[pick]] = [tiles[pick], tiles[emptyIdx]]
    emptyIdx = pick
  }

  return { tiles, emptyIdx }
}

function isSolved(tiles, size) {
  for (let i = 0; i < size * size - 1; i++) {
    if (tiles[i] !== i + 1) return false
  }
  return tiles[size * size - 1] === 0
}

// Colors for tiles
const TILE_COLORS = ['#FF6B6B','#FDCB6E','#00B894','#74B9FF','#A29BFE','#FD79A8','#E17055','#00CEC9','#6C5CE7','#55EFC4',
  '#FF9FF3','#48DBFB','#FF6348','#1DD1A1','#F368E0','#54A0FF','#5F27CD','#01A3A4','#EE5A24','#009432',
  '#FFC312','#C4E538','#12CBC4','#FDA7DF','#ED4C67']

export default function SlidingPuzzle({ onBack, game, difficulty }) {
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()
  const tc = useThemeColors()
  const diff = CFG[difficulty?.id] || CFG.easy

  const [phase, setPhase] = useState('tutorial')
  const [tiles, setTiles] = useState([])
  const [emptyIdx, setEmptyIdx] = useState(0)
  const [moves, setMoves] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [animTile, setAnimTile] = useState(null)
  const timerRef = useRef(null)

  const bestKey = `sliding-puzzle-best-${difficulty?.id || 'easy'}`
  const [bestMoves, setBestMoves] = useState(() => { try { return parseInt(localStorage.getItem(bestKey)) || 0 } catch { return 0 } })

  useEffect(() => () => clearInterval(timerRef.current), [])

  const startGame = useCallback(() => {
    const { tiles: t, emptyIdx: e } = createPuzzle(diff.size)
    setTiles(t); setEmptyIdx(e); setMoves(0); setTimeElapsed(0); setShowConfetti(false); setAnimTile(null)
    setPhase('playing')
    clearInterval(timerRef.current)
    const start = Date.now()
    timerRef.current = setInterval(() => setTimeElapsed(Math.floor((Date.now() - start) / 1000)), 200)
  }, [diff])

  const moveTile = useCallback((idx) => {
    if (phase !== 'playing') return
    const size = diff.size
    const r1 = Math.floor(idx / size), c1 = idx % size
    const r2 = Math.floor(emptyIdx / size), c2 = emptyIdx % size
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return

    play('click')
    setAnimTile(idx)
    setTimeout(() => setAnimTile(null), 150)

    setTiles(prev => {
      const next = [...prev];
      [next[idx], next[emptyIdx]] = [next[emptyIdx], next[idx]]
      if (isSolved(next, size)) {
        clearInterval(timerRef.current)
        setTimeout(() => { setShowConfetti(true); play('win'); setPhase('result') }, 400)
      }
      return next
    })
    setEmptyIdx(idx)
    setMoves(m => m + 1)
  }, [phase, emptyIdx, diff.size, play])

  const won = phase === 'result'
  const optimalMoves = diff.size === 3 ? 25 : diff.size === 4 ? 80 : 150
  const stars = won ? (moves <= optimalMoves ? 3 : moves <= optimalMoves * 1.5 ? 2 : 1) : 0
  const score = won ? Math.max(100, Math.round(2000 * (optimalMoves / moves) * (1 - timeElapsed / diff.timeLimit * 0.5))) : 0
  const coinReward = won ? Math.floor(score / 50) + stars * 5 : 0
  const isNewBest = won && (bestMoves === 0 || moves < bestMoves)

  useEffect(() => {
    if (phase !== 'result') return
    if (isNewBest) { localStorage.setItem(bestKey, moves.toString()); setBestMoves(moves) }
    if (coinReward > 0) earnCoins(coinReward, 'Sliding Puzzle')
    reportGameResult({ gameId: 'sliding-puzzle', difficultyId: difficulty?.id || 'easy', score, stars, won: true, timeSec: timeElapsed })
  }, [phase])

  const fmtTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`
  const accent = '#E84393'; const accentLight = '#FD79A8'
  const bg = tc.bg; const surface = tc.surface; const textMain = tc.text; const textMuted = tc.muted

  if (phase === 'tutorial') return <TutorialModal steps={TUTORIAL_STEPS} onClose={() => setPhase('ready')} />

  if (phase === 'ready') return (
    <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ fontSize:72, marginBottom:12 }}>🧩</div>
        <h1 style={{ fontFamily:"'Fredoka One',cursive", color:accent, fontSize:28, margin:'0 0 8px' }}>Sliding Puzzle</h1>
        <p style={{ color:textMuted, fontSize:14, marginBottom:24, lineHeight:1.5 }}>Susun angka urut di grid {diff.size}×{diff.size}!</p>
        {bestMoves > 0 && <div style={{ color:textMuted, fontSize:13, marginBottom:16 }}>🏆 Best: {bestMoves} langkah</div>}
        <button onClick={startGame} style={{ fontFamily:"'Fredoka One',cursive", fontSize:18, padding:'14px 48px', background:`linear-gradient(135deg,${accent},${accentLight})`, color:'#fff', border:'none', borderRadius:14, cursor:'pointer' }}>MULAI! 🚀</button>
        <div style={{ marginTop:16 }}><button onClick={onBack} style={{ background:'none', border:'none', color:textMuted, cursor:'pointer', fontSize:14 }}>← Kembali</button></div>
      </div>
    </div>
  )

  if (phase === 'result') return (
    <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>
      {showConfetti && <Confetti />}
      <div style={{ textAlign:'center', maxWidth:420, width:'100%' }}>
        <div style={{ fontSize:64, marginBottom:8 }}>🎉</div>
        <h1 style={{ fontFamily:"'Fredoka One',cursive", color:'#00B894', fontSize:26, margin:'0 0 4px' }}>PUZZLE SELESAI!</h1>
        {isNewBest && <div style={{ background:'linear-gradient(135deg,#FFD700,#FFA500)', color:'#fff', borderRadius:12, padding:'8px 16px', fontSize:14, fontWeight:700, marginBottom:16, display:'inline-block' }}>🏆 REKOR BARU!</div>}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20, background:surface, borderRadius:16, padding:16 }}>
          {[{l:'Langkah',v:moves,i:'👆'},{l:'Waktu',v:fmtTime(timeElapsed),i:'⏱️'},{l:'Skor',v:score,i:'🎯'},{l:'Koin',v:`+${coinReward}`,i:'🪙'}].map((s,i) => (
            <div key={i} style={{textAlign:'center',padding:8}}><div style={{fontSize:20}}>{s.i}</div><div style={{fontSize:18,fontWeight:700,color:textMain}}>{s.v}</div><div style={{fontSize:11,color:textMuted}}>{s.l}</div></div>
          ))}
        </div>
        <div style={{ fontSize:32, marginBottom:16 }}>{[1,2,3].map(s=><span key={s} style={{opacity:s<=stars?1:0.2}}>⭐</span>)}</div>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          <button onClick={() => setPhase('ready')} style={{ fontFamily:"'Fredoka One',cursive", fontSize:16, padding:'12px 32px', background:`linear-gradient(135deg,${accent},${accentLight})`, color:'#fff', border:'none', borderRadius:12, cursor:'pointer' }}>Main Lagi 🔄</button>
          <button onClick={onBack} style={{ fontFamily:"'Fredoka One',cursive", fontSize:16, padding:'12px 32px', background:surface, color:textMain, border:`2px solid ${tc.border}`, borderRadius:12, cursor:'pointer' }}>Kembali</button>
        </div>
      </div>
    </div>
  )

  // ─── Playing ────────────────────────────────────────────────────────────
  const size = diff.size
  const cellSize = Math.min(Math.floor((Math.min(window.innerWidth, 420) - 40) / size), 80)

  return (
    <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:textMuted, fontSize:20, cursor:'pointer' }}>←</button>
        <div style={{ fontFamily:"'Fredoka One',cursive", color:accent, fontSize:16 }}>⏱️ {fmtTime(timeElapsed)}</div>
        <div style={{ fontFamily:"'Fredoka One',cursive", color:textMuted, fontSize:14 }}>👆 {moves}</div>
      </div>

      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${size}, ${cellSize}px)`, gap:4, background:surface, padding:6, borderRadius:14 }}>
          {tiles.map((val, idx) => {
            const isCorrect = val !== 0 && val === idx + 1
            return (
              <button key={idx} onClick={() => moveTile(idx)}
                style={{
                  width:cellSize, height:cellSize, borderRadius:10,
                  border: val === 0 ? 'none' : isCorrect ? '2px solid #00B89444' : `2px solid ${tc.border}`,
                  background: val === 0 ? 'transparent' : TILE_COLORS[(val - 1) % TILE_COLORS.length] + (tc.dark ? 'cc' : ''),
                  color: '#fff', fontFamily:"'Fredoka One',cursive",
                  fontSize: size <= 3 ? 28 : size <= 4 ? 22 : 18,
                  cursor: val === 0 ? 'default' : 'pointer',
                  transition:'transform 0.12s ease',
                  transform: animTile === idx ? 'scale(0.9)' : 'scale(1)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  textShadow: val === 0 ? 'none' : '0 1px 3px rgba(0,0,0,0.3)',
                  boxShadow: val === 0 ? 'none' : '0 2px 8px rgba(0,0,0,0.15)',
                }}>
                {val !== 0 ? val : ''}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ textAlign:'center', padding:'0 16px 20px', fontSize:12, color:textMuted }}>
        Susun angka 1 → {size*size-1} dari kiri atas ke kanan bawah
      </div>
    </div>
  )
}
