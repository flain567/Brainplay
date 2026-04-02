import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins, MINE_THEMES } from '../../context/CoinContext.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'
import { WinModal, LoseModal } from '../../components/GameLayout.jsx'

const TUTORIAL_STEPS = [
  { emoji:'💣', title:'Minesweeper', desc:'Buka semua kotak tanpa kena bom! Angka menunjukkan jumlah bom di sekitarnya.', tip:'Mulai dari sudut atau tepi — biasanya lebih aman.' },
  { emoji:'🚩', title:'Tandai Bom', desc:'Tekan lama atau klik tombol 🚩 lalu tap kotak untuk menandai lokasi bom.', tip:'Gunakan angka untuk menghitung posisi bom yang pasti.' },
  { emoji:'🧠', title:'Logika', desc:'Angka 1 = ada 1 bom di 8 kotak sekitar. Gunakan eliminasi untuk menentukan kotak aman.', tip:'Kalau angka = jumlah flag di sekitar, sisa kotak pasti aman!' },
]

const CFG = {
  easy:   { rows: 9,  cols: 9,  mines: 10, timeLimit: 300 },
  medium: { rows: 12, cols: 10, mines: 25, timeLimit: 600 },
  hard:   { rows: 14, cols: 12, mines: 45, timeLimit: 900 },
}

const NUM_COLORS = ['','#2196F3','#4CAF50','#F44336','#9C27B0','#FF9800','#009688','#333','#888']

function createBoard(rows, cols, mines, firstR, firstC) {
  const board = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, count: 0 })))
  // Place mines avoiding first click area
  const safe = new Set()
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const nr = firstR + dr, nc = firstC + dc
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) safe.add(`${nr}-${nc}`)
  }
  let placed = 0
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows), c = Math.floor(Math.random() * cols)
    if (!board[r][c].mine && !safe.has(`${r}-${c}`)) { board[r][c].mine = true; placed++ }
  }
  // Calculate counts
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (board[r][c].mine) continue
    let cnt = 0
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) cnt++
    }
    board[r][c].count = cnt
  }
  return board
}

function revealCell(board, r, c, rows, cols) {
  if (r < 0 || r >= rows || c < 0 || c >= cols) return
  if (board[r][c].revealed || board[r][c].flagged) return
  board[r][c].revealed = true
  if (board[r][c].count === 0 && !board[r][c].mine) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      revealCell(board, r + dr, c + dc, rows, cols)
    }
  }
}

function checkWin(board, rows, cols, mines) {
  let revealed = 0
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (board[r][c].revealed) revealed++
  }
  return revealed === rows * cols - mines
}

export default function Minesweeper({ onBack, onHome, game, difficulty }) {
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins, activeMineTheme } = useCoins()
  const theme = MINE_THEMES.find(t => t.id === activeMineTheme) || MINE_THEMES[0]
  const tc = useThemeColors()
  const diff = CFG[difficulty?.id] || CFG.easy

  const [phase, setPhase] = useState('tutorial')
  const [board, setBoard] = useState([])
  const [firstClick, setFirstClick] = useState(true)
  const [flagMode, setFlagMode] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [gameOverReason, setGameOverReason] = useState('')
  const [flagCount, setFlagCount] = useState(0)
  const [revealedCount, setRevealedCount] = useState(0)
  const timerRef = useRef(null)
  const longPressRef = useRef(null)

  const bestKey = `minesweeper-best-${difficulty?.id || 'easy'}`
  const [bestTime, setBestTime] = useState(() => { try { return parseInt(localStorage.getItem(bestKey)) || 0 } catch { return 0 } })

  useEffect(() => () => { clearInterval(timerRef.current); clearTimeout(longPressRef.current) }, [])

  const startGame = useCallback(() => {
    // Initialize empty board (mines placed on first click)
    const b = Array.from({ length: diff.rows }, () => Array.from({ length: diff.cols }, () => ({ mine: false, revealed: false, flagged: false, count: 0 })))
    setBoard(b); setFirstClick(true); setFlagMode(false); setTimeElapsed(0); setFlagCount(0); setRevealedCount(0)
    setShowConfetti(false); setGameOverReason(''); setPhase('playing')
    clearInterval(timerRef.current)
  }, [diff])

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current)
    const start = Date.now()
    timerRef.current = setInterval(() => setTimeElapsed(Math.floor((Date.now() - start) / 1000)), 200)
  }, [])

  const handleCell = useCallback((r, c) => {
    if (phase !== 'playing' || gameOverReason) return

    if (flagMode) {
      // Toggle flag
      if (board[r][c].revealed) return
      play('click')
      setBoard(prev => {
        const next = prev.map(row => row.map(cell => ({ ...cell })))
        next[r][c].flagged = !next[r][c].flagged
        setFlagCount(next.flat().filter(c => c.flagged).length)
        return next
      })
      return
    }

    if (board[r][c].flagged || board[r][c].revealed) return

    if (firstClick) {
      // Generate board on first click
      const newBoard = createBoard(diff.rows, diff.cols, diff.mines, r, c)
      revealCell(newBoard, r, c, diff.rows, diff.cols)
      const rev = newBoard.flat().filter(c => c.revealed).length
      setBoard(newBoard.map(row => row.map(cell => ({ ...cell }))))
      setRevealedCount(rev)
      setFirstClick(false)
      startTimer()
      play('click')
      if (checkWin(newBoard, diff.rows, diff.cols, diff.mines)) {
        clearInterval(timerRef.current)
        setTimeout(() => { setShowConfetti(true); play('win'); setGameOverReason('win'); setPhase('result') }, 400)
      }
      return
    }

    // Normal click
    if (board[r][c].mine) {
      // Hit mine!
      play('error')
      setBoard(prev => {
        const next = prev.map(row => row.map(cell => ({ ...cell })))
        // Reveal all mines
        for (let ri = 0; ri < diff.rows; ri++) for (let ci = 0; ci < diff.cols; ci++) {
          if (next[ri][ci].mine) next[ri][ci].revealed = true
        }
        next[r][c].hitMine = true
        return next
      })
      clearInterval(timerRef.current)
      setTimeout(() => { setGameOverReason('mine'); play('gameOver'); setPhase('result') }, 800)
      return
    }

    play('click')
    setBoard(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })))
      revealCell(next, r, c, diff.rows, diff.cols)
      const rev = next.flat().filter(c => c.revealed).length
      setRevealedCount(rev)
      if (checkWin(next, diff.rows, diff.cols, diff.mines)) {
        clearInterval(timerRef.current)
        setTimeout(() => { setShowConfetti(true); play('win'); setGameOverReason('win'); setPhase('result') }, 400)
      }
      return next
    })
  }, [phase, gameOverReason, flagMode, board, firstClick, diff, play, startTimer])

  const handleLongPress = useCallback((r, c) => {
    if (phase !== 'playing' || board[r][c].revealed) return
    play('click')
    setBoard(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })))
      next[r][c].flagged = !next[r][c].flagged
      setFlagCount(next.flat().filter(c => c.flagged).length)
      return next
    })
  }, [phase, board, play])

  const won = gameOverReason === 'win'
  const stars = won ? (timeElapsed < diff.timeLimit * 0.3 ? 3 : timeElapsed < diff.timeLimit * 0.6 ? 2 : 1) : 0
  const score = won ? Math.max(100, Math.round(2000 * (1 - timeElapsed / diff.timeLimit))) : 0
  const coinReward = won ? Math.floor(score / 50) + stars * 5 : Math.floor(revealedCount / 5)
  const isNewBest = won && (bestTime === 0 || timeElapsed < bestTime)

  useEffect(() => {
    if (phase !== 'result') return
    if (isNewBest) { localStorage.setItem(bestKey, timeElapsed.toString()); setBestTime(timeElapsed) }
    if (coinReward > 0) earnCoins(coinReward, 'Minesweeper')
    reportGameResult({ gameId: 'minesweeper', difficultyId: difficulty?.id || 'easy', score, stars, won, timeSec: timeElapsed })
  }, [phase])

  const fmtTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const accent = '#636E72'; const accentLight = '#B2BEC3'
  const bg = tc.bg; const surface = tc.surface; const textMain = tc.text; const textMuted = tc.muted

  if (phase === 'tutorial') return <TutorialModal steps={TUTORIAL_STEPS} onClose={() => setPhase('ready')} />

  if (phase === 'ready') return (
    <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ fontSize:72, marginBottom:12 }}>{theme.style.mine}</div>
        <h1 style={{ fontFamily:"'Fredoka One',cursive", color:accent, fontSize:28, margin:'0 0 8px' }}>Minesweeper</h1>
        <p style={{ color:textMuted, fontSize:14, marginBottom:24, lineHeight:1.5 }}>Buka semua kotak tanpa kena bom!<br/>{diff.rows}×{diff.cols} grid, {diff.mines} bom tersembunyi.</p>
        {bestTime > 0 && <div style={{ color:textMuted, fontSize:13, marginBottom:16 }}>🏆 Best: {fmtTime(bestTime)}</div>}
        <button onClick={startGame} style={{ fontFamily:"'Fredoka One',cursive", fontSize:18, padding:'14px 48px', background:`linear-gradient(135deg,${accent},${accentLight})`, color:'#fff', border:'none', borderRadius:14, cursor:'pointer' }}>MULAI! 🚀</button>
        <div style={{ marginTop:16 }}><button onClick={onBack} style={{ background:'none', border:'none', color:textMuted, cursor:'pointer', fontSize:14 }}>← Kembali</button></div>
      </div>
    </div>
  )

  if (phase === 'result') {
    const diffLabel = { easy: '🟢 Mudah', medium: '🟡 Sedang', hard: '🔴 Sulit' }[difficulty?.id] || '🟢 Mudah'
    const restart = () => setPhase('ready')
    return (
      <div style={{ minHeight:'100dvh', background:bg }}>
        {showConfetti && won && <Confetti />}
        {won ? (
          <WinModal
            emoji="🎉"
            title="Area aman!"
            subtitle="Semua bom berhasil dihindari!"
            diffLabel={diffLabel}
            stats={[
              { label: 'Waktu', value: fmtTime(timeElapsed), color: '#00CEC9' },
              { label: 'Terbuka', value: `${revealedCount}/${diff.rows * diff.cols - diff.mines}`, color: '#A29BFE' },
              { label: 'Skor', value: score, color: '#FF6B6B' },
            ]}
            stars={stars}
            coinReward={coinReward}
            highlight={isNewBest ? '🏆 Waktu terbaik!' : ''}
            onRestart={restart}
            onBack={onBack}
            onHome={onHome}
            dark={tc.dark}
            gameColor="#636E72"
          />
        ) : (
          <LoseModal
            emoji="💥"
            title="Boom!"
            subtitle="Kamu menginjak bom..."
            stats={[
              { label: 'Waktu', value: fmtTime(timeElapsed), color: '#95A5A6' },
              { label: 'Terbuka', value: `${revealedCount}/${diff.rows * diff.cols - diff.mines}`, color: '#A29BFE' },
              { label: 'Skor', value: score, color: '#636E72' },
            ]}
            coinReward={coinReward}
            onRestart={restart}
            onBack={onBack}
            onHome={onHome}
            dark={tc.dark}
            gameColor="#636E72"
          />
        )}
      </div>
    )
  }

  // ─── Playing ────────────────────────────────────────────────────────────
  const cellSize = Math.min(Math.floor((Math.min(window.innerWidth, 440) - 32) / diff.cols), 36)

  return (
    <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:textMuted, fontSize:20, cursor:'pointer' }}>←</button>
        <div style={{ fontFamily:"'Fredoka One',cursive", color:accent, fontSize:14 }}>⏱️ {fmtTime(timeElapsed)}</div>
        <div style={{ fontFamily:"'Fredoka One',cursive", color:'#FF6B6B', fontSize:14 }}>{theme.style.mine} {diff.mines - flagCount}</div>
      </div>

      {/* Flag mode toggle */}
      <div style={{ display:'flex', justifyContent:'center', padding:'0 16px 8px', gap:8 }}>
        <button onClick={() => setFlagMode(false)}
          style={{ padding:'8px 20px', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.2s',
            background: !flagMode ? '#74B9FF' : surface, color: !flagMode ? '#fff' : textMuted, border: !flagMode ? '2px solid #74B9FF' : `2px solid ${tc.border}` }}>
          👆 Buka
        </button>
        <button onClick={() => setFlagMode(true)}
          style={{ padding:'8px 20px', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.2s',
            background: flagMode ? '#FF6B6B' : surface, color: flagMode ? '#fff' : textMuted, border: flagMode ? '2px solid #FF6B6B' : `2px solid ${tc.border}` }}>
          {theme.style.flag} Tandai
        </button>
      </div>

      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:8 }}>
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${diff.cols}, ${cellSize}px)`, gap:1 }}>
          {board.map((row, r) => row.map((cell, c) => {
            let bg2 = (r+c)%2===0 ? theme.style.coveredLight : theme.style.coveredDark
            let content = '', color = textMain
            if (cell.revealed) {
              if (cell.mine) {
                bg2 = cell.hitMine ? '#FF6B6B' : (tc.dark ? '#333' : '#FFCCCC')
                content = theme.style.mine
              } else {
                bg2 = (r+c)%2===0 ? theme.style.revealedLight : theme.style.revealedDark
                if (cell.count > 0) { content = cell.count; color = NUM_COLORS[cell.count] || textMain }
              }
            } else if (cell.flagged) {
              content = theme.style.flag
            }

            return (
              <button key={`${r}-${c}`}
                onClick={() => handleCell(r, c)}
                onContextMenu={(e) => { e.preventDefault(); handleLongPress(r, c) }}
                onTouchStart={() => { longPressRef.current = setTimeout(() => handleLongPress(r, c), 400) }}
                onTouchEnd={() => clearTimeout(longPressRef.current)}
                onTouchMove={() => clearTimeout(longPressRef.current)}
                style={{
                  width:cellSize, height:cellSize,
                  border: cell.revealed ? 'none' : `1px solid ${tc.dark?'#333':'#ccc'}`,
                  borderRadius: 3,
                  background: bg2,
                  color, fontWeight:700,
                  fontSize: typeof content === 'string' && content.length > 1 ? cellSize * 0.4 : cellSize * 0.5,
                  fontFamily: typeof content === 'number' ? "'Fredoka One',cursive" : 'inherit',
                  cursor: cell.revealed ? 'default' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  padding:0,
                  boxShadow: cell.revealed ? 'inset 0 1px 3px rgba(0,0,0,0.1)' : 'inset 0 -2px 0 rgba(0,0,0,0.2)',
                }}>
                {content}
              </button>
            )
          }))}
        </div>
      </div>

      <div style={{ textAlign:'center', padding:'4px 16px 16px', fontSize:11, color:textMuted }}>
        Klik kanan / tekan lama untuk tandai bom
      </div>
    </div>
  )
}
