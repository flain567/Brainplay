import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'

const TUTORIAL_STEPS = [
  { emoji:'🔲', title:'Binary Puzzle', desc:'Isi grid dengan angka 0 dan 1 mengikuti 3 aturan logika!', tip:'Mirip Sudoku tapi dengan hanya dua angka.' },
  { emoji:'📏', title:'3 Aturan', desc:'1) Tidak boleh ada 3 angka sama berturut-turut.\n2) Setiap baris/kolom punya jumlah 0 dan 1 sama rata.\n3) Tidak ada baris/kolom yang identik.', tip:'Mulai dari sel yang pasti — cari pola "X_X" yang harus diisi!' },
  { emoji:'⭐', title:'Skor & Timer', desc:'Semakin cepat selesai, semakin banyak poin. Gunakan hint jika buntu!', tip:'Tekan sel untuk toggle: kosong → 0 → 1 → kosong.' },
]

const CFG = {
  easy:   { size: 6, prefilled: 14, timeLimit: 300 },
  medium: { size: 8, prefilled: 20, timeLimit: 480 },
  hard:   { size: 10, prefilled: 28, timeLimit: 600 },
}

// ─── Puzzle Generator ─────────────────────────────────────────────────────
function generateSolution(size) {
  const MAX_ATTEMPTS = 200
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const grid = Array.from({ length: size }, () => Array(size).fill(-1))
    if (fillGrid(grid, 0, 0, size)) return grid
  }
  // Fallback: construct a simple valid grid
  return constructSimple(size)
}

function constructSimple(size) {
  const half = size / 2
  const grid = []
  const patterns = []
  // Generate all valid row patterns
  generatePatterns([], size, half, half, patterns)
  // Pick non-duplicate rows
  const used = new Set()
  for (const p of patterns) {
    if (grid.length >= size) break
    const key = p.join('')
    if (!used.has(key) && checkColsPartial(grid, p, size)) {
      grid.push([...p]); used.add(key)
    }
  }
  while (grid.length < size) grid.push(Array(size).fill(grid.length % 2 === 0 ? 0 : 1).map((v,i) => (i+grid.length) % 2))
  return grid
}

function generatePatterns(current, size, zeros, ones, result) {
  if (current.length === size) { result.push([...current]); return }
  if (result.length > 500) return
  for (const v of [0, 1]) {
    const rem = v === 0 ? zeros : ones
    if (rem <= 0) continue
    if (current.length >= 2 && current[current.length-1] === v && current[current.length-2] === v) continue
    current.push(v)
    generatePatterns(current, size, v===0?zeros-1:zeros, v===1?ones-1:ones, result)
    current.pop()
  }
}

function checkColsPartial(grid, newRow, size) {
  const half = size / 2; const rowIdx = grid.length
  for (let c = 0; c < newRow.length; c++) {
    // Count in column
    let count = 0
    for (let r = 0; r < grid.length; r++) if (grid[r][c] === newRow[c]) count++
    if (count + 1 > half) return false
    // Check 3 consecutive in column
    if (rowIdx >= 2 && grid[rowIdx-1][c] === newRow[c] && grid[rowIdx-2][c] === newRow[c]) return false
  }
  return true
}

function fillGrid(grid, row, col, size) {
  if (row >= size) return isValidComplete(grid, size)
  const nextCol = (col + 1) % size; const nextRow = col + 1 >= size ? row + 1 : row
  const vals = Math.random() < 0.5 ? [0, 1] : [1, 0]
  for (const v of vals) {
    grid[row][col] = v
    if (isValidPartial(grid, row, col, size) && fillGrid(grid, nextRow, nextCol, size)) return true
  }
  grid[row][col] = -1; return false
}

function isValidPartial(grid, row, col, size) {
  const half = size / 2; const v = grid[row][col]
  // Check 3 consecutive horizontally
  if (col >= 2 && grid[row][col-1] === v && grid[row][col-2] === v) return false
  // Check 3 consecutive vertically
  if (row >= 2 && grid[row-1][col] === v && grid[row-2][col] === v) return false
  // Count in row
  let rowCount = 0; for (let c = 0; c <= col; c++) if (grid[row][c] === v) rowCount++
  if (rowCount > half) return false
  // Count in col
  let colCount = 0; for (let r = 0; r <= row; r++) if (grid[r][col] === v) colCount++
  if (colCount > half) return false
  return true
}

function isValidComplete(grid, size) {
  const half = size / 2
  const rowStrs = new Set(); const colStrs = new Set()
  for (let r = 0; r < size; r++) {
    let c0 = 0, c1 = 0
    for (let c = 0; c < size; c++) { if (grid[r][c] === 0) c0++; else c1++ }
    if (c0 !== half || c1 !== half) return false
    const rs = grid[r].join(''); if (rowStrs.has(rs)) return false; rowStrs.add(rs)
  }
  for (let c = 0; c < size; c++) {
    let c0 = 0, c1 = 0; let cs = ''
    for (let r = 0; r < size; r++) { if (grid[r][c] === 0) c0++; else c1++; cs += grid[r][c] }
    if (c0 !== half || c1 !== half) return false
    if (colStrs.has(cs)) return false; colStrs.add(cs)
  }
  return true
}

function createPuzzle(size, prefilled) {
  const solution = generateSolution(size)
  const puzzle = solution.map(r => r.map(() => -1))
  // Place prefilled cells
  const cells = []; for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push([r, c])
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i+1));[cells[i],cells[j]]=[cells[j],cells[i]] }
  for (let i = 0; i < Math.min(prefilled, cells.length); i++) {
    const [r, c] = cells[i]; puzzle[r][c] = solution[r][c]
  }
  return { puzzle, solution }
}

function checkErrors(grid, size) {
  const errors = new Set()
  const half = size / 2
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === -1) continue
      // Horizontal triple
      if (c >= 2 && grid[r][c] === grid[r][c-1] && grid[r][c] === grid[r][c-2]) { errors.add(`${r}-${c}`); errors.add(`${r}-${c-1}`); errors.add(`${r}-${c-2}`) }
      if (c >= 1 && c < size-1 && grid[r][c] === grid[r][c-1] && grid[r][c] === grid[r][c+1]) { errors.add(`${r}-${c}`); errors.add(`${r}-${c-1}`); errors.add(`${r}-${c+1}`) }
      // Vertical triple
      if (r >= 2 && grid[r][c] === grid[r-1][c] && grid[r][c] === grid[r-2][c]) { errors.add(`${r}-${c}`); errors.add(`${r-1}-${c}`); errors.add(`${r-2}-${c}`) }
      if (r >= 1 && r < size-1 && grid[r][c] === grid[r-1][c] && grid[r][c] === grid[r+1][c]) { errors.add(`${r}-${c}`); errors.add(`${r-1}-${c}`); errors.add(`${r+1}-${c}`) }
    }
    // Count check per row
    let c0 = 0, c1 = 0; for (let c = 0; c < size; c++) { if (grid[r][c] === 0) c0++; if (grid[r][c] === 1) c1++ }
    if (c0 > half || c1 > half) for (let c = 0; c < size; c++) if (grid[r][c] !== -1) errors.add(`${r}-${c}`)
  }
  for (let c = 0; c < size; c++) {
    let c0 = 0, c1 = 0; for (let r = 0; r < size; r++) { if (grid[r][c] === 0) c0++; if (grid[r][c] === 1) c1++ }
    if (c0 > half || c1 > half) for (let r = 0; r < size; r++) if (grid[r][c] !== -1) errors.add(`${r}-${c}`)
  }
  return errors
}

export default function BinaryPuzzle({ onBack, game, difficulty }) {
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()
  const tc = useThemeColors()
  const diff = CFG[difficulty?.id] || CFG.easy

  const [phase, setPhase] = useState('tutorial')
  const [grid, setGrid] = useState([])
  const [solution, setSolution] = useState([])
  const [locked, setLocked] = useState([])
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [errors, setErrors] = useState(new Set())
  const [hintsUsed, setHintsUsed] = useState(0)
  const timerRef = useRef(null)

  const bestKey = `binary-puzzle-best-${difficulty?.id || 'easy'}`
  const [bestTime, setBestTime] = useState(() => { try { return parseInt(localStorage.getItem(bestKey)) || 0 } catch { return 0 } })

  useEffect(() => () => clearInterval(timerRef.current), [])

  const startGame = useCallback(() => {
    const { puzzle, solution: sol } = createPuzzle(diff.size, diff.prefilled)
    setGrid(puzzle.map(r => [...r])); setSolution(sol)
    setLocked(puzzle.map(r => r.map(v => v !== -1)))
    setTimeElapsed(0); setHintsUsed(0); setErrors(new Set()); setShowConfetti(false)
    setPhase('playing')
    clearInterval(timerRef.current)
    const start = Date.now()
    timerRef.current = setInterval(() => setTimeElapsed(Math.floor((Date.now() - start) / 1000)), 200)
  }, [diff])

  const toggleCell = useCallback((r, c) => {
    if (locked[r][c]) return
    play('click')
    setGrid(prev => {
      const next = prev.map(row => [...row])
      next[r][c] = next[r][c] === -1 ? 0 : next[r][c] === 0 ? 1 : -1
      // Check errors
      setErrors(checkErrors(next, diff.size))
      // Check win
      const filled = next.every(row => row.every(v => v !== -1))
      if (filled) {
        const correct = next.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]))
        if (correct) {
          clearInterval(timerRef.current)
          setTimeout(() => { setShowConfetti(true); play('win'); setPhase('result') }, 300)
        }
      }
      return next
    })
  }, [locked, solution, diff.size, play])

  const useHint = useCallback(() => {
    // Find first empty or wrong cell
    for (let r = 0; r < diff.size; r++) {
      for (let c = 0; c < diff.size; c++) {
        if (!locked[r][c] && grid[r][c] !== solution[r][c]) {
          play('success')
          setHintsUsed(h => h + 1)
          setGrid(prev => { const next = prev.map(row => [...row]); next[r][c] = solution[r][c]; setErrors(checkErrors(next, diff.size)); return next })
          // Check win after hint
          setGrid(prev => {
            const filled = prev.every(row => row.every(v => v !== -1))
            if (filled && prev.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]))) {
              clearInterval(timerRef.current)
              setTimeout(() => { setShowConfetti(true); play('win'); setPhase('result') }, 300)
            }
            return prev
          })
          return
        }
      }
    }
  }, [grid, locked, solution, diff.size, play])

  const won = phase === 'result'
  const maxTime = diff.timeLimit
  const timePct = Math.max(0, (1 - timeElapsed / maxTime)) * 100
  const stars = won ? (hintsUsed === 0 && timeElapsed < maxTime * 0.4 ? 3 : hintsUsed <= 2 && timeElapsed < maxTime * 0.7 ? 2 : 1) : 0
  const score = won ? Math.max(100, Math.round(1000 * (1 - timeElapsed / maxTime) * (1 - hintsUsed * 0.1))) : 0
  const coinReward = won ? Math.floor(score / 50) + stars * 5 : 0
  const isNewBest = won && (bestTime === 0 || timeElapsed < bestTime)

  useEffect(() => {
    if (phase !== 'result') return
    if (isNewBest) { localStorage.setItem(bestKey, timeElapsed.toString()); setBestTime(timeElapsed) }
    if (coinReward > 0) earnCoins(coinReward, 'Binary Puzzle')
    reportGameResult({ gameId: 'binary-puzzle', difficultyId: difficulty?.id || 'easy', score, stars, won: true, timeSec: timeElapsed })
  }, [phase])

  const fmtTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`
  const accent = '#00B894'; const accentLight = '#55EFC4'
  const bg = tc.bg; const surface = tc.surface; const textMain = tc.text; const textMuted = tc.muted

  if (phase === 'tutorial') return <TutorialModal steps={TUTORIAL_STEPS} onClose={() => setPhase('ready')} />

  if (phase === 'ready') return (
    <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ fontSize:72, marginBottom:12 }}>🔲</div>
        <h1 style={{ fontFamily:"'Fredoka One',cursive", color:accent, fontSize:28, margin:'0 0 8px' }}>Binary Puzzle</h1>
        <p style={{ color:textMuted, fontSize:14, marginBottom:16, lineHeight:1.5 }}>Isi grid {diff.size}×{diff.size} dengan 0 dan 1!</p>
        <div style={{ background:surface, borderRadius:12, padding:14, marginBottom:20, textAlign:'left', fontSize:13, color:textMuted, lineHeight:1.7 }}>
          <div>📏 <b style={{ color:textMain }}>Aturan 1:</b> Maks 2 angka sama berturut-turut</div>
          <div>⚖️ <b style={{ color:textMain }}>Aturan 2:</b> Jumlah 0 dan 1 sama di tiap baris/kolom</div>
          <div>🚫 <b style={{ color:textMain }}>Aturan 3:</b> Tidak ada baris/kolom identik</div>
        </div>
        {bestTime > 0 && <div style={{ color:textMuted, fontSize:13, marginBottom:16 }}>🏆 Best: {fmtTime(bestTime)}</div>}
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
        {isNewBest && <div style={{ background:'linear-gradient(135deg,#FFD700,#FFA500)', color:'#fff', borderRadius:12, padding:'8px 16px', fontSize:14, fontWeight:700, marginBottom:16, display:'inline-block' }}>🏆 WAKTU TERBAIK!</div>}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20, background:surface, borderRadius:16, padding:16 }}>
          {[{ l:'Waktu',v:fmtTime(timeElapsed),i:'⏱️'},{ l:'Skor',v:score,i:'🎯'},{ l:'Hint',v:hintsUsed,i:'💡'},{ l:'Koin',v:`+${coinReward}`,i:'🪙'}].map((s,i) => (
            <div key={i} style={{ textAlign:'center', padding:8 }}><div style={{ fontSize:20 }}>{s.i}</div><div style={{ fontSize:18, fontWeight:700, color:textMain }}>{s.v}</div><div style={{ fontSize:11, color:textMuted }}>{s.l}</div></div>
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
  const cellSize = Math.min(Math.floor((Math.min(window.innerWidth, 440) - 40) / diff.size), 48)
  const filledCount = grid.flat().filter(v => v !== -1).length
  const totalCells = diff.size * diff.size

  return (
    <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:textMuted, fontSize:20, cursor:'pointer' }}>←</button>
        <div style={{ fontFamily:"'Fredoka One',cursive", color:accent, fontSize:16 }}>⏱️ {fmtTime(timeElapsed)}</div>
        <button onClick={useHint} style={{ background:surface, border:`2px solid ${tc.border}`, borderRadius:10, padding:'6px 14px', fontSize:13, fontWeight:700, color:'#FDCB6E', cursor:'pointer' }}>💡 Hint</button>
      </div>

      <div style={{ textAlign:'center', fontSize:12, color:textMuted, padding:'0 16px 8px' }}>
        {filledCount}/{totalCells} terisi · {diff.size}×{diff.size} grid
      </div>

      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${diff.size}, ${cellSize}px)`, gap:3 }}>
          {grid.map((row, r) => row.map((val, c) => {
            const isLocked = locked[r][c]
            const hasError = errors.has(`${r}-${c}`)
            return (
              <button key={`${r}-${c}`} onClick={() => toggleCell(r, c)}
                style={{
                  width:cellSize, height:cellSize, borderRadius:8,
                  border: hasError ? '2px solid #FF6B6B' : isLocked ? `2px solid ${accent}44` : `2px solid ${tc.border}`,
                  background: val === -1 ? surface : val === 0 ? (tc.dark ? '#1a2e4a' : '#dbeafe') : (tc.dark ? '#2e1a4a' : '#ede9fe'),
                  color: val === 0 ? '#3B82F6' : val === 1 ? '#8B5CF6' : 'transparent',
                  fontFamily:"'Fredoka One',cursive", fontSize: cellSize > 36 ? 20 : 16,
                  cursor: isLocked ? 'default' : 'pointer',
                  opacity: isLocked ? 0.85 : 1,
                  fontWeight: isLocked ? 800 : 600,
                  transition:'all 0.1s',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  animation: hasError ? 'bpShake 0.3s ease' : 'none',
                }}>
                {val === -1 ? '·' : val}
              </button>
            )
          }))}
        </div>
      </div>

      {/* Rules reminder */}
      <div style={{ padding:'8px 16px 16px', display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
        <span style={{ fontSize:10, color:textMuted, background:surface, padding:'4px 10px', borderRadius:8 }}>📏 Maks 2 sama berturut</span>
        <span style={{ fontSize:10, color:textMuted, background:surface, padding:'4px 10px', borderRadius:8 }}>⚖️ Jumlah 0=1 tiap baris/kolom</span>
      </div>

      <style>{`@keyframes bpShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }`}</style>
    </div>
  )
}
