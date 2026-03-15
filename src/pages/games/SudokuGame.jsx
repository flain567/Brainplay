import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
import { useState, useEffect, useCallback } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'

const TUTORIAL_STEPS = [
  { emoji:'🔢', title:'Sudoku', desc:'Isi grid 9×9 dengan angka 1-9 tanpa duplikat di setiap baris, kolom, dan kotak 3×3!', tip:'Mulai dari baris/kolom yang paling banyak angkanya.' },
  { emoji:'👆', title:'Cara Main', desc:'Klik sel kosong lalu pilih angka 1-9 dari numpad. Gunakan ✕ untuk menghapus. Angka salah akan ditandai merah.', tip:'Gunakan catatan (notes mode) untuk menandai kemungkinan angka di setiap sel.' },
  { emoji:'⭐', title:'Sistem Bintang', desc:'Semakin sedikit kesalahan, semakin banyak bintang! Selesaikan tanpa error untuk 3 bintang.', tip:'Easy: ≤3 error, Medium: ≤2, Hard: ≤1 untuk 3 bintang.' },
]

const DIFF_LABEL = { easy: '🟢 Mudah', medium: '🟡 Sedang', hard: '🔴 Sulit' }

// Sudoku Generator
function generateSudoku(diffId) {
  // Generate a complete valid board
  const board = Array.from({ length: 9 }, () => Array(9).fill(0))

  function isValid(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num) return false
      if (board[i][col] === num) return false
    }
    const r0 = Math.floor(row / 3) * 3
    const c0 = Math.floor(col / 3) * 3
    for (let r = r0; r < r0 + 3; r++) {
      for (let c = c0; c < c0 + 3; c++) {
        if (board[r][c] === num) return false
      }
    }
    return true
  }

  function fillBoard(board) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          const nums = shuffle([1,2,3,4,5,6,7,8,9])
          for (const num of nums) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num
              if (fillBoard(board)) return true
              board[row][col] = 0
            }
          }
          return false
        }
      }
    }
    return true
  }

  function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  fillBoard(board)

  // Solution copy
  const solution = board.map(r => [...r])

  // Remove cells based on difficulty
  const cellsToRemove = { easy: 36, medium: 46, hard: 54 }
  const toRemove = cellsToRemove[diffId] || 36

  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
  )

  let removed = 0
  for (const [r, c] of positions) {
    if (removed >= toRemove) break
    board[r][c] = 0
    removed++
  }

  return {
    puzzle: board.map(r => [...r]),
    solution,
  }
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

export default function SudokuGame({ onBack, game, difficulty }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()

  const [gameData, setGameData] = useState(() => generateSudoku(difficulty.id))
  const [board, setBoard] = useState(() => gameData.puzzle.map(r => [...r]))
  const [initialCells, setInitialCells] = useState(() => {
    const cells = new Set()
    gameData.puzzle.forEach((row, r) => row.forEach((val, c) => { if (val !== 0) cells.add(`${r}-${c}`) }))
    return cells
  })
  const [selectedCell, setSelectedCell] = useState(null)
  const [errors, setErrors] = useState(0)
  const [errorCells, setErrorCells] = useState(new Set())
  const [won, setWon] = useState(false)
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('bp_tut_sudoku'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [notesMode, setNotesMode] = useState(false)
  const [notes, setNotes] = useState(() => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set())))
  const [hintUsed, setHintUsed] = useState(0)
  const [started, setStarted] = useState(false)

  const isGameActive = !won
  const timerRunning = isGameActive && started
  const time = useTimer(timerRunning, resetKey)

  const bestKey = `sudoku-best-${difficulty.id}`
  const [bestTime, setBestTime] = useState(() => parseInt(localStorage.getItem(bestKey) || '0'))

  const filledCount = board.flat().filter(v => v !== 0).length
  const totalCells = 81

  // Check win
  useEffect(() => {
    if (won || !started) return
    if (filledCount === 81) {
      // Verify correctness
      const isCorrect = board.every((row, r) => row.every((val, c) => val === gameData.solution[r][c]))
      if (isCorrect) {
        setWon(true)
        setShowConfetti(true)
        play('win')

        if (bestTime === 0 || time < bestTime) {
          localStorage.setItem(bestKey, time)
          setBestTime(time)
        }

        const stars = errors <= (difficulty.id === 'hard' ? 1 : difficulty.id === 'medium' ? 2 : 3) ? 3 : errors <= 5 ? 2 : 1
        reportGameResult({
          gameId: 'sudoku',
          difficultyId: difficulty.id,
          won: true,
          score: Math.max(0, 1000 - errors * 50 - Math.floor(time / 10)),
          stars,
          timeSec: time,
        })
        const coinReward = { easy: 20, medium: 35, hard: 50 }
        let coinAmount = coinReward[difficulty.id] || 20
        if (stars === 3) coinAmount += 25
        earnCoins(coinAmount, `Menang Sudoku (${difficulty.id})`)
      }
    }
  }, [board, filledCount])

  const handleCellClick = useCallback((row, col) => {
    if (won) return
    if (initialCells.has(`${row}-${col}`)) {
      // Highlight same number
      setSelectedCell([row, col])
      return
    }
    play('click')
    setSelectedCell([row, col])
  }, [won, initialCells, play])

  const handleNumberInput = useCallback((num) => {
    if (!selectedCell || won) return
    const [row, col] = selectedCell
    if (initialCells.has(`${row}-${col}`)) return

    if (!started) setStarted(true)

    if (num === 0) {
      // Erase
      play('click')
      setBoard(b => { const n = b.map(r => [...r]); n[row][col] = 0; return n })
      setErrorCells(ec => { const n = new Set(ec); n.delete(`${row}-${col}`); return n })
      setNotes(prev => {
        const n = prev.map(r => r.map(s => new Set(s)))
        n[row][col].clear()
        return n
      })
      return
    }

    if (notesMode) {
      // Toggle note
      play('click')
      setNotes(prev => {
        const n = prev.map(r => r.map(s => new Set(s)))
        if (n[row][col].has(num)) n[row][col].delete(num)
        else n[row][col].add(num)
        return n
      })
      return
    }

    // Place number
    if (num === gameData.solution[row][col]) {
      play('match')
      setBoard(b => { const n = b.map(r => [...r]); n[row][col] = num; return n })
      setErrorCells(ec => { const n = new Set(ec); n.delete(`${row}-${col}`); return n })
      // Clear notes for this cell and related cells
      setNotes(prev => {
        const n = prev.map(r => r.map(s => new Set(s)))
        n[row][col].clear()
        // Remove from same row, col, box
        for (let i = 0; i < 9; i++) {
          n[row][i].delete(num)
          n[i][col].delete(num)
        }
        const r0 = Math.floor(row / 3) * 3, c0 = Math.floor(col / 3) * 3
        for (let r = r0; r < r0 + 3; r++)
          for (let c = c0; c < c0 + 3; c++)
            n[r][c].delete(num)
        return n
      })
    } else {
      play('mismatch')
      setErrors(e => e + 1)
      setErrorCells(ec => new Set([...ec, `${row}-${col}`]))
      setBoard(b => { const n = b.map(r => [...r]); n[row][col] = num; return n })
      // Clear error after 1.5s
      setTimeout(() => {
        setBoard(b => {
          const n = b.map(r => [...r])
          if (n[row][col] === num && num !== gameData.solution[row][col]) {
            n[row][col] = 0
          }
          return n
        })
        setErrorCells(ec => { const n = new Set(ec); n.delete(`${row}-${col}`); return n })
      }, 1200)
    }
  }, [selectedCell, won, initialCells, notesMode, gameData, started, play])

  // Keyboard handler
  useEffect(() => {
    const handler = (e) => {
      const key = e.key
      if (key >= '1' && key <= '9') handleNumberInput(parseInt(key))
      else if (key === 'Backspace' || key === 'Delete' || key === '0') handleNumberInput(0)
      else if (key === 'n' || key === 'N') setNotesMode(m => !m)
      else if (key === 'ArrowUp' && selectedCell) { e.preventDefault(); setSelectedCell(([r, c]) => [Math.max(0, r - 1), c]) }
      else if (key === 'ArrowDown' && selectedCell) { e.preventDefault(); setSelectedCell(([r, c]) => [Math.min(8, r + 1), c]) }
      else if (key === 'ArrowLeft' && selectedCell) { e.preventDefault(); setSelectedCell(([r, c]) => [r, Math.max(0, c - 1)]) }
      else if (key === 'ArrowRight' && selectedCell) { e.preventDefault(); setSelectedCell(([r, c]) => [r, Math.min(8, c + 1)]) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleNumberInput, selectedCell])

  const useHintAction = () => {
    if (hintUsed >= 3 || won) return
    if (!started) setStarted(true)
    play('click')
    // Find a random empty cell and fill it
    const emptyCells = []
    board.forEach((row, r) => row.forEach((val, c) => {
      if (val === 0 && !initialCells.has(`${r}-${c}`)) emptyCells.push([r, c])
    }))
    if (emptyCells.length === 0) return
    const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)]
    setBoard(b => { const n = b.map(row => [...row]); n[r][c] = gameData.solution[r][c]; return n })
    setHintUsed(h => h + 1)
    play('match')
  }

  const restart = () => {
    play('click')
    const newData = generateSudoku(difficulty.id)
    setGameData(newData)
    setBoard(newData.puzzle.map(r => [...r]))
    const cells = new Set()
    newData.puzzle.forEach((row, r) => row.forEach((val, c) => { if (val !== 0) cells.add(`${r}-${c}`) }))
    setInitialCells(cells)
    setSelectedCell(null)
    setErrors(0)
    setErrorCells(new Set())
    setWon(false)
    setShowConfetti(false)
    setNotesMode(false)
    setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set())))
    setHintUsed(0)
    setStarted(false)
    setResetKey(k => k + 1)
  }

  // Theme
  const bg        = darkMode ? '#1a1a2e' : '#FFF9F0'
  const surface   = darkMode ? '#16213e' : '#fff'
  const textMain  = darkMode ? '#e8e8f0' : '#2D3436'
  const textMuted = darkMode ? '#8892b0' : '#636E72'
  const borderCol = darkMode ? '#2d3561' : '#DFE6E9'
  const accent    = '#0984E3'

  const selectedNum = selectedCell ? board[selectedCell[0]][selectedCell[1]] : null

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px 60px', background: bg, minHeight: '100vh', transition: 'background 0.3s' }}>
      {showTutorial && <TutorialModal steps={TUTORIAL_STEPS} color={accent} onClose={() => { setShowTutorial(false); localStorage.setItem("bp_tut_sudoku","1") }} />}
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => { play('click'); onBack() }}
          style={{ background: surface, border: `2px solid ${borderCol}`, borderRadius: 12, padding: '8px 14px', fontSize: 18, cursor: 'pointer', color: textMain }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: textMain, lineHeight: 1 }}>
            🔢 Sudoku
          </h1>
          <p style={{ fontSize: 13, color: textMuted, marginTop: 2 }}>
            Isi grid 9×9 tanpa duplikat!
          </p>
        </div>
        <span style={{ background: difficulty.id === 'easy' ? '#E8F8F0' : difficulty.id === 'medium' ? '#FFFBF0' : '#FFF0F0', color: difficulty.id === 'easy' ? '#00b894' : difficulty.id === 'medium' ? '#f9a825' : '#FF6B6B', border: `2px solid ${difficulty.id === 'easy' ? '#00b89444' : difficulty.id === 'medium' ? '#f9a82544' : '#FF6B6B44'}`, borderRadius: 100, padding: '6px 14px', fontFamily: "'Fredoka One',cursive", fontSize: 13, whiteSpace: 'nowrap' }}>
          {DIFF_LABEL[difficulty.id]}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: '❌ Error', value: errors, color: '#FF6B6B' },
          { label: '⏱ Waktu', value: formatTime(time), color: '#4ECDC4' },
          { label: '✅ Terisi', value: `${filledCount}/${totalCells}`, color: '#0984E3' },
        ].map(s => (
          <div key={s.label} style={{ background: surface, border: `2px solid ${s.color}33`, borderRadius: 16, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: textMuted, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sudoku Grid */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          gap: 0,
          border: `3px solid ${darkMode ? '#4a4a6a' : '#2D3436'}`,
          borderRadius: 12,
          overflow: 'hidden',
          width: '100%',
          maxWidth: 400,
          aspectRatio: '1',
        }}>
          {board.map((row, r) => row.map((val, c) => {
            const isInitial = initialCells.has(`${r}-${c}`)
            const isSelected = selectedCell && selectedCell[0] === r && selectedCell[1] === c
            const isSameRow = selectedCell && selectedCell[0] === r
            const isSameCol = selectedCell && selectedCell[1] === c
            const isSameBox = selectedCell && Math.floor(selectedCell[0]/3) === Math.floor(r/3) && Math.floor(selectedCell[1]/3) === Math.floor(c/3)
            const isHighlighted = (isSameRow || isSameCol || isSameBox) && !isSelected
            const isSameNum = val !== 0 && selectedNum !== 0 && val === selectedNum
            const isError = errorCells.has(`${r}-${c}`)
            const cellNotes = notes[r][c]

            const rightBorder = (c + 1) % 3 === 0 && c < 8
            const bottomBorder = (r + 1) % 3 === 0 && r < 8

            let cellBg = surface
            if (isSelected) cellBg = darkMode ? '#2a3a6e' : '#D4E6FF'
            else if (isError) cellBg = darkMode ? '#3a1a1a' : '#FFE0E0'
            else if (isSameNum) cellBg = darkMode ? '#1e2e5e' : '#E8F0FE'
            else if (isHighlighted) cellBg = darkMode ? '#1a2240' : '#F0F4FF'

            return (
              <div key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: cellBg,
                  borderRight: rightBorder ? `2px solid ${darkMode ? '#4a4a6a' : '#2D3436'}` : `1px solid ${darkMode ? '#2a2a4a' : '#DFE6E9'}`,
                  borderBottom: bottomBorder ? `2px solid ${darkMode ? '#4a4a6a' : '#2D3436'}` : `1px solid ${darkMode ? '#2a2a4a' : '#DFE6E9'}`,
                  cursor: won ? 'default' : 'pointer',
                  transition: 'background 0.15s',
                  position: 'relative',
                  aspectRatio: '1',
                }}>
                {val !== 0 ? (
                  <span style={{
                    fontFamily: "'Fredoka One',cursive",
                    fontSize: 'min(4.5vw, 22px)',
                    color: isError ? '#FF6B6B' : isInitial ? textMain : accent,
                    fontWeight: isInitial ? 800 : 700,
                    opacity: isInitial ? 1 : 0.9,
                    transition: 'all 0.2s',
                    animation: isError ? 'shake 0.3s ease' : 'none',
                  }}>{val}</span>
                ) : cellNotes.size > 0 ? (
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                    width: '85%', height: '85%', alignItems: 'center', justifyItems: 'center',
                  }}>
                    {[1,2,3,4,5,6,7,8,9].map(n => (
                      <span key={n} style={{
                        fontSize: 'min(2vw, 9px)', color: cellNotes.has(n) ? accent : 'transparent',
                        fontWeight: 700, lineHeight: 1,
                      }}>{n}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          }))}
        </div>
      </div>

      {/* Number pad */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {[1,2,3,4,5,6,7,8,9].map(num => {
          const count = board.flat().filter(v => v === num).length
          const isFull = count >= 9
          return (
            <button key={num} onClick={() => handleNumberInput(num)} disabled={isFull || won}
              style={{
                width: 40, height: 48,
                border: `2px solid ${isFull ? borderCol : `${accent}44`}`,
                borderRadius: 12,
                fontSize: 20, fontWeight: 800,
                fontFamily: "'Fredoka One',cursive",
                cursor: isFull || won ? 'default' : 'pointer',
                background: isFull ? (darkMode ? '#1a1a2e' : '#F1F3F5') : (notesMode ? (darkMode ? '#1a2e3e' : '#E8F4FD') : surface),
                color: isFull ? textMuted : accent,
                opacity: isFull ? 0.4 : 1,
                transition: 'all 0.2s',
              }}>
              {num}
            </button>
          )
        })}
        <button onClick={() => handleNumberInput(0)} disabled={won}
          style={{
            width: 40, height: 48, border: `2px solid ${borderCol}`,
            borderRadius: 12, fontSize: 16, fontWeight: 800, fontFamily: "'Fredoka One',cursive",
            cursor: won ? 'default' : 'pointer', background: surface, color: '#FF6B6B',
          }}>✕</button>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => { play('toggle'); setNotesMode(m => !m) }}
          style={{
            background: notesMode ? accent : (darkMode ? '#2d3561' : '#F1F3F5'),
            color: notesMode ? '#fff' : textMuted,
            border: `2px solid ${notesMode ? accent : borderCol}`,
            borderRadius: 100, padding: '10px 18px', fontSize: 13, fontWeight: 800,
            fontFamily: "'Fredoka One',cursive", cursor: 'pointer',
          }}>
          ✏️ Catatan {notesMode ? 'ON' : 'OFF'}
        </button>
        <button onClick={useHintAction} disabled={hintUsed >= 3 || won}
          style={{ background: hintUsed>=3||won ? 'rgba(255,255,255,0.05)' : 'rgba(255,211,61,0.15)', color: hintUsed>=3||won ? textMuted : '#FFD93D', border: `2px solid ${hintUsed>=3||won ? borderCol : '#FFD93D44'}`, borderRadius: 100, padding: '10px 18px', fontSize: 13, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: hintUsed>=3||won ? 'default' : 'pointer' }}>
          💡 Hint ({3-hintUsed})
        </button>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={restart}
          style={{ background: accent, color: '#fff', border: 'none', borderRadius: 100, padding: '12px 28px', fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: 'pointer', boxShadow: `0 4px 14px ${accent}44` }}>
          🔄 Main Lagi
        </button>
        <button onClick={() => { play('click'); onBack() }}
          style={{ background: surface, color: textMuted, border: `2px solid ${borderCol}`, borderRadius: 100, padding: '12px 18px', fontSize: 14, fontWeight: 700, fontFamily: "'Fredoka One',cursive", cursor: 'pointer' }}>
          🎯 Level
        </button>
      </div>

      {/* Best record */}
      {bestTime > 0 && (
        <div style={{ marginTop: 20, background: darkMode ? '#1f1f3e' : '#FFF9F0', border: `2px solid ${darkMode ? '#3d3561' : '#FFE66D'}`, borderRadius: 16, padding: '12px 20px', textAlign: 'center', fontSize: 14, color: textMuted, fontWeight: 600 }}>
          🏆 Rekor {DIFF_LABEL[difficulty.id]}: <span style={{ color: accent, fontFamily: "'Fredoka One',cursive", fontSize: 16 }}>{formatTime(bestTime)}</span>
        </div>
      )}

      {won && (
        <WinModal
          errors={errors}
          time={formatTime(time)}
          diffLabel={DIFF_LABEL[difficulty.id]}
          onRestart={restart}
          onBack={onBack}
          darkMode={darkMode}
          game={game}
          difficulty={difficulty}
        />
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) }
          25% { transform: translateX(-4px) }
          75% { transform: translateX(4px) }
        }
      `}</style>
    </div>
  )
}

function WinModal({ errors, time, diffLabel, onRestart, onBack, darkMode, game, difficulty }) {
  const stars = errors <= (difficulty.id === 'hard' ? 1 : difficulty.id === 'medium' ? 2 : 3) ? 3 : errors <= 5 ? 2 : 1
  const bg = darkMode ? '#1a1a2e' : '#fff'
  const textMain = darkMode ? '#e8e8f0' : '#2D3436'
  const textMuted = darkMode ? '#8892b0' : '#636E72'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ background: bg, borderRadius: 28, padding: '40px 36px', textAlign: 'center', maxWidth: 360, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🎉</div>
        <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 32, color: textMain, marginBottom: 4 }}>Selamat!</h2>
        <p style={{ color: textMuted, fontSize: 14, marginBottom: 6 }}>Sudoku berhasil diselesaikan!</p>
        <span style={{ display: 'inline-block', background: `${game.color}22`, color: game.color, padding: '4px 14px', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>{diffLabel}</span>

        <div style={{ fontSize: 36, marginBottom: 16, letterSpacing: 4 }}>{'⭐'.repeat(stars)}{'☆'.repeat(3-stars)}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={{ background: darkMode ? '#2d1f1f' : '#FFF0F0', borderRadius: 14, padding: 12 }}>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: '#FF6B6B' }}>{errors}</div>
            <div style={{ fontSize: 12, color: textMuted, fontWeight: 600 }}>Error</div>
          </div>
          <div style={{ background: darkMode ? '#1a2d2d' : '#F0FFFE', borderRadius: 14, padding: 12 }}>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: '#4ECDC4' }}>{time}</div>
            <div style={{ fontSize: 12, color: textMuted, fontWeight: 600 }}>Waktu</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onRestart} style={{ flex: 1, background: '#0984E3', color: '#fff', border: 'none', borderRadius: 100, padding: '13px 20px', fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: 'pointer', boxShadow: '0 4px 14px #0984E344' }}>🔄 Main Lagi</button>
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
