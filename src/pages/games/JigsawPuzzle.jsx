import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'

const TUTORIAL_STEPS = [
  { emoji:'🧩', title:'Jigsaw Puzzle', desc:'Susun potongan gambar ke posisi yang benar untuk membentuk gambar utuh!', tip:'Lihat preview gambar di kiri atas sebagai panduan.' },
  { emoji:'👆', title:'Cara Main', desc:'Klik/tap potongan dari panel kanan, lalu klik posisi yang benar di grid. Atau tukar dua potongan di grid!', tip:'Mulai dari sudut dan tepi — lebih mudah dikenali.' },
  { emoji:'⭐', title:'Sistem Bintang', desc:'Semakin cepat & sedikit langkah, semakin banyak bintang!', tip:'3 bintang: selesai di bawah batas waktu dengan langkah minimal.' },
]

// ─── Procedural pattern generator ────────────────────────────────────────────
const PATTERNS = [
  { name: 'Sunset Beach',   colors: ['#FF6B6B','#FFA07A','#FFD700','#FF8C42','#E74C3C','#FDCB6E','#FF4757','#FF6348'] },
  { name: 'Ocean Wave',     colors: ['#0984E3','#74B9FF','#00CEC9','#00B894','#55EFC4','#81ECEC','#6C5CE7','#A29BFE'] },
  { name: 'Forest',         colors: ['#00B894','#55EFC4','#00CC76','#2ECC71','#A3CB38','#009432','#6AB04C','#BADC58'] },
  { name: 'Galaxy',         colors: ['#6C5CE7','#A29BFE','#FD79A8','#E84393','#0984E3','#74B9FF','#2D3436','#636E72'] },
  { name: 'Candy',          colors: ['#FD79A8','#FDCB6E','#FF6B6B','#A29BFE','#55EFC4','#74B9FF','#E17055','#00CEC9'] },
  { name: 'Autumn',         colors: ['#E17055','#FDCB6E','#D63031','#F39C12','#E74C3C','#FFA502','#CC8E35','#A0522D'] },
]

function generatePuzzlePattern(cols, rows, patternIdx) {
  const pat = PATTERNS[patternIdx % PATTERNS.length]
  const tiles = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      // Create a unique gradient for each tile
      const c1 = pat.colors[(r + c) % pat.colors.length]
      const c2 = pat.colors[(r + c + 1) % pat.colors.length]
      const c3 = pat.colors[(r * 2 + c) % pat.colors.length]
      // Shape type for visual variety
      const shape = (r + c) % 4
      tiles.push({ idx, r, c, c1, c2, c3, shape })
    }
  }
  return { tiles, name: pat.name, colors: pat.colors }
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Render a single tile ────────────────────────────────────────────────────
function PuzzleTile({ tile, size, showNumber, dimmed, glow, onClick, selected, correct, dark }) {
  if (!tile) return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      border: `2px dashed ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
    }} />
  )

  const { c1, c2, c3, shape, idx } = tile
  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: 10,
        background: `linear-gradient(${135 + shape * 30}deg, ${c1}, ${c2})`,
        position: 'relative', overflow: 'hidden',
        cursor: 'pointer', userSelect: 'none',
        opacity: dimmed ? 0.35 : 1,
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        transform: selected ? 'scale(1.08)' : glow ? 'scale(1.04)' : 'scale(1)',
        boxShadow: selected
          ? `0 0 0 3px #fff, 0 0 0 5px ${c1}, 0 8px 24px ${c1}66`
          : correct
            ? `0 0 12px ${c1}44, inset 0 0 0 2px rgba(255,255,255,0.15)`
            : `inset 0 0 0 1px rgba(255,255,255,0.12)`,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Decorative shape */}
      {shape === 0 && (
        <div style={{ position:'absolute', bottom:'-20%', right:'-20%', width:'60%', height:'60%', borderRadius:'50%', background: c3, opacity: 0.35 }} />
      )}
      {shape === 1 && (
        <div style={{ position:'absolute', top:'-10%', left:'-10%', width:'50%', height:'50%', borderRadius:'50%', background: c3, opacity: 0.3 }} />
      )}
      {shape === 2 && (
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%) rotate(45deg)', width:'40%', height:'40%', background: c3, opacity: 0.3, borderRadius: 4 }} />
      )}
      {shape === 3 && (
        <>
          <div style={{ position:'absolute', top:'10%', right:'10%', width:'30%', height:'30%', borderRadius:'50%', background: c3, opacity: 0.25 }} />
          <div style={{ position:'absolute', bottom:'15%', left:'15%', width:'25%', height:'25%', borderRadius:'50%', background: c1, opacity: 0.2 }} />
        </>
      )}
      {/* Shine */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'40%', background:'linear-gradient(180deg, rgba(255,255,255,0.18), transparent)', borderRadius:'10px 10px 0 0' }} />
      {/* Number */}
      {showNumber && (
        <div style={{
          position:'absolute', bottom:4, right:6,
          fontSize: size < 50 ? 9 : 11, fontWeight:800, color:'rgba(255,255,255,0.6)',
          fontFamily:"'Fredoka One',cursive",
        }}>
          {idx + 1}
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function JigsawPuzzle({ onBack, game, difficulty }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()
  const dark = darkMode

  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('tut-jigsaw'))

  // Grid config by difficulty
  const config = difficulty.id === 'easy'
    ? { cols: 3, rows: 3 }
    : difficulty.id === 'medium'
      ? { cols: 4, rows: 4 }
      : { cols: 5, rows: 5 }

  const totalPieces = config.cols * config.rows
  const [patternIdx] = useState(() => Math.floor(Math.random() * PATTERNS.length))
  const pattern = generatePuzzlePattern(config.cols, config.rows, patternIdx)

  // Game state
  const [grid, setGrid] = useState([])           // current arrangement on board (index = position, value = tile idx or null)
  const [tray, setTray] = useState([])            // unplaced pieces (tile indices)
  const [selected, setSelected] = useState(null)  // { source: 'tray'|'grid', idx: number }
  const [moves, setMoves] = useState(0)
  const [time, setTime] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const timerRef = useRef(null)
  const startedRef = useRef(false)

  // Initialize puzzle
  useEffect(() => {
    const shuffled = shuffleArray(Array.from({ length: totalPieces }, (_, i) => i))
    // Put all pieces in tray initially
    setTray(shuffled)
    setGrid(new Array(totalPieces).fill(null))
    setMoves(0)
    setTime(0)
    setGameOver(false)
    setShowConfetti(false)
    startedRef.current = false
  }, [totalPieces, patternIdx])

  // Timer
  useEffect(() => {
    if (gameOver) { clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => {
      if (startedRef.current) setTime(t => t + 1)
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [gameOver])

  // Check win
  const checkWin = useCallback((newGrid) => {
    if (newGrid.some(v => v === null)) return false
    return newGrid.every((v, i) => v === i)
  }, [])

  // Handle piece selection & placement
  const handleTrayClick = (tileIdx) => {
    if (gameOver) return
    if (!startedRef.current) startedRef.current = true
    play('click')

    if (selected && selected.source === 'tray' && selected.idx === tileIdx) {
      setSelected(null) // deselect
      return
    }
    setSelected({ source: 'tray', idx: tileIdx })
  }

  const handleGridClick = (pos) => {
    if (gameOver) return
    if (!startedRef.current) startedRef.current = true

    if (!selected) {
      // Select from grid if occupied
      if (grid[pos] !== null) {
        play('click')
        setSelected({ source: 'grid', idx: pos })
      }
      return
    }

    if (selected.source === 'tray') {
      // Place from tray to grid
      if (grid[pos] !== null) {
        // Swap: grid piece goes back to tray, tray piece goes to grid
        const oldGridTile = grid[pos]
        const newGrid = [...grid]
        newGrid[pos] = selected.idx
        setGrid(newGrid)
        setTray(t => [...t.filter(i => i !== selected.idx), oldGridTile])
        setMoves(m => m + 1)
        play(newGrid[pos] === pos ? 'match' : 'click')
        if (checkWin(newGrid)) handleWin(newGrid)
      } else {
        // Place into empty slot
        const newGrid = [...grid]
        newGrid[pos] = selected.idx
        setGrid(newGrid)
        setTray(t => t.filter(i => i !== selected.idx))
        setMoves(m => m + 1)
        play(newGrid[pos] === pos ? 'match' : 'click')
        if (checkWin(newGrid)) handleWin(newGrid)
      }
      setSelected(null)
    } else if (selected.source === 'grid') {
      // Swap two grid pieces
      if (selected.idx === pos) { setSelected(null); return }
      const newGrid = [...grid]
      const temp = newGrid[pos]
      newGrid[pos] = newGrid[selected.idx]
      newGrid[selected.idx] = temp
      setGrid(newGrid)
      setMoves(m => m + 1)

      const posCorrect = newGrid[pos] === pos
      const selCorrect = newGrid[selected.idx] === selected.idx
      play(posCorrect || selCorrect ? 'match' : 'click')
      if (checkWin(newGrid)) handleWin(newGrid)
      setSelected(null)
    }
  }

  const handleWin = (finalGrid) => {
    play('win')
    setGameOver(true)
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 4000)

    // Stars
    const timeLimits = { easy: [60, 120], medium: [120, 240], hard: [240, 420] }
    const moveLimits = { easy: [12, 20], medium: [25, 45], hard: [40, 70] }
    const tl = timeLimits[difficulty.id]
    const ml = moveLimits[difficulty.id]
    const timeStar = time <= tl[0] ? 3 : time <= tl[1] ? 2 : 1
    const moveStar = moves <= ml[0] ? 3 : moves <= ml[1] ? 2 : 1
    const stars = Math.min(timeStar, moveStar)

    // Save best
    const bestKey = `jigsaw-best-${difficulty.id}`
    const saved = localStorage.getItem(bestKey)
    if (!saved || time < parseInt(saved)) {
      localStorage.setItem(bestKey, time)
    }

    reportGameResult({
      gameId: 'jigsaw',
      difficultyId: difficulty.id,
      won: true,
      score: Math.max(1, Math.floor(1000 - time * 2 - moves * 5)),
      stars,
      timeSec: time,
    })

    let coinAmount = { easy: 15, medium: 25, hard: 40 }[difficulty.id]
    if (stars === 3) coinAmount += 20
    earnCoins(coinAmount, `Menang Jigsaw (${difficulty.id})`)
  }

  const handleRestart = () => {
    play('click')
    const shuffled = shuffleArray(Array.from({ length: totalPieces }, (_, i) => i))
    setTray(shuffled)
    setGrid(new Array(totalPieces).fill(null))
    setMoves(0)
    setTime(0)
    setGameOver(false)
    setShowConfetti(false)
    startedRef.current = false
    setSelected(null)
  }

  // Auto-place correct hint
  const handleHint = () => {
    if (gameOver) return
    // Find first piece in tray or wrong position in grid
    for (let pos = 0; pos < totalPieces; pos++) {
      if (grid[pos] !== pos) {
        const tileIdx = pos
        const inTray = tray.includes(tileIdx)
        if (inTray) {
          const newGrid = [...grid]
          if (newGrid[pos] !== null) {
            // Move existing piece back to tray
            setTray(t => [...t.filter(i => i !== tileIdx), newGrid[pos]])
          } else {
            setTray(t => t.filter(i => i !== tileIdx))
          }
          newGrid[pos] = tileIdx
          setGrid(newGrid)
          setMoves(m => m + 1)
          play('match')
          if (checkWin(newGrid)) handleWin(newGrid)
          return
        }
      }
    }
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  // Colors
  const accent = game?.color || '#FDCB6E'
  const bg = dark ? '#0d0b1e' : '#FFF9F0'
  const surface = dark ? '#16213e' : '#fff'
  const textMain = dark ? '#e8e8f0' : '#2D3436'
  const textMuted = dark ? '#8892b0' : '#636E72'
  const borderCol = dark ? '#2d3561' : '#DFE6E9'

  // Responsive tile size
  const containerRef = useRef(null)
  const [tileSize, setTileSize] = useState(64)

  useEffect(() => {
    const update = () => {
      const w = Math.min(window.innerWidth - 40, 520)
      const maxTile = Math.floor((w - (config.cols - 1) * 6 - 16) / config.cols)
      setTileSize(Math.min(maxTile, 90))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [config.cols])

  const correctCount = grid.filter((v, i) => v === i).length
  const progressPct = Math.round((correctCount / totalPieces) * 100)

  const stars = gameOver ? (() => {
    const timeLimits = { easy: [60, 120], medium: [120, 240], hard: [240, 420] }
    const moveLimits = { easy: [12, 20], medium: [25, 45], hard: [40, 70] }
    const tl = timeLimits[difficulty.id]
    const ml = moveLimits[difficulty.id]
    const timeStar = time <= tl[0] ? 3 : time <= tl[1] ? 2 : 1
    const moveStar = moves <= ml[0] ? 3 : moves <= ml[1] ? 2 : 1
    return Math.min(timeStar, moveStar)
  })() : 0

  return (
    <>
      <style>{`
        .jig-root {
          min-height: 100vh; padding: 24px 16px 80px;
          transition: background 0.4s;
        }
        .jig-inner { max-width: 600px; margin: 0 auto; }
        .jig-back {
          display: inline-flex; align-items: center; gap: 8px;
          background: ${surface}; border: 2px solid ${borderCol};
          border-radius: 12px; padding: 8px 16px;
          font-size: 13px; font-weight: 700; color: ${textMuted};
          cursor: pointer; margin-bottom: 20px; font-family: 'Nunito',sans-serif;
          transition: all 0.18s;
        }
        .jig-back:hover { border-color: ${accent}; color: ${accent}; transform: translateX(-3px); }

        /* Stats bar */
        .jig-stats {
          display: flex; gap: 8px; margin-bottom: 16px;
          animation: slide-up 0.4s ease both;
        }
        .jig-stat {
          flex: 1; text-align: center; padding: 10px 6px;
          background: ${surface}; border: 2px solid ${borderCol};
          border-radius: 14px; transition: all 0.2s;
        }
        .jig-stat-val {
          font-family: 'Fredoka One',cursive; font-size: 18px;
          color: ${accent}; margin-bottom: 2px;
        }
        .jig-stat-lbl { font-size: 10px; color: ${textMuted}; font-weight: 700; }

        /* Board area */
        .jig-board-wrap {
          background: ${surface}; border: 2px solid ${borderCol};
          border-radius: 20px; padding: 16px;
          margin-bottom: 16px; position: relative;
          animation: slide-up 0.4s 0.1s ease both;
        }
        .jig-board {
          display: grid; gap: 6px; justify-content: center;
          margin: 0 auto;
        }

        /* Tray */
        .jig-tray-wrap {
          background: ${surface}; border: 2px solid ${borderCol};
          border-radius: 20px; padding: 16px;
          animation: slide-up 0.4s 0.2s ease both;
        }
        .jig-tray {
          display: flex; gap: 6px; flex-wrap: wrap;
          justify-content: center; min-height: 40px;
        }

        /* Preview overlay */
        .jig-preview-overlay {
          position: fixed; inset: 0; z-index: 150;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          animation: fadeInTut 0.2s ease;
        }
        .jig-preview-card {
          background: ${surface}; border-radius: 24px;
          padding: 24px; max-width: 380px; width: 100%;
          animation: popInTut 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }

        /* Game over overlay */
        .jig-gameover {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          animation: fadeInTut 0.3s ease;
        }
        .jig-gameover-card {
          background: ${surface}; border: 2px solid ${accent}44;
          border-radius: 28px; padding: 32px; max-width: 380px; width: 100%;
          text-align: center; box-shadow: 0 24px 80px ${accent}33;
          animation: popInTut 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }

        /* Progress bar */
        .jig-progress-track {
          height: 8px; border-radius: 100px; overflow: hidden;
          background: ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'};
          margin-bottom: 16px;
        }
        .jig-progress-fill {
          height: 100%; border-radius: 100px;
          background: linear-gradient(90deg, ${accent}, ${accent}bb);
          transition: width 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }

        /* Actions */
        .jig-actions {
          display: flex; gap: 8px; margin-bottom: 16px;
          animation: slide-up 0.4s 0.05s ease both;
        }
        .jig-action-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 10px; border-radius: 12px; border: 2px solid ${borderCol};
          background: ${surface}; font-size: 12px; font-weight: 700;
          color: ${textMuted}; cursor: pointer; transition: all 0.2s;
          font-family: 'Nunito',sans-serif;
        }
        .jig-action-btn:hover { border-color: ${accent}; color: ${accent}; transform: translateY(-2px); }
        .jig-action-btn:active { transform: scale(0.97); }

        @keyframes fadeInTut { from{opacity:0} to{opacity:1} }
        @keyframes popInTut  { from{transform:scale(0.75);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes slide-up  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

        @media (max-width: 480px) {
          .jig-root { padding: 16px 12px 60px; }
          .jig-stats { gap: 6px; }
          .jig-stat { padding: 8px 4px; border-radius: 10px; }
          .jig-stat-val { font-size: 15px; }
          .jig-board-wrap, .jig-tray-wrap { padding: 12px; border-radius: 16px; }
        }
      `}</style>

      <div className="jig-root" style={{ background: bg }}>
        <div className="jig-inner">

          {showTutorial && (
            <TutorialModal
              steps={TUTORIAL_STEPS}
              color={accent}
              onClose={() => { setShowTutorial(false); localStorage.setItem('tut-jigsaw','1') }}
            />
          )}

          {showConfetti && <Confetti />}

          {/* Back button */}
          <button className="jig-back" onClick={() => { play('click'); onBack() }}>
            ← Kembali
          </button>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:16, animation:'slide-up 0.4s ease both' }}>
            <div style={{ fontSize:14, fontWeight:700, color:accent, marginBottom:4, fontFamily:"'Fredoka One',cursive" }}>
              🧩 Jigsaw Puzzle
            </div>
            <div style={{ fontSize:12, color:textMuted }}>
              {pattern.name} • {config.cols}×{config.rows} ({totalPieces} keping)
            </div>
          </div>

          {/* Stats */}
          <div className="jig-stats">
            <div className="jig-stat">
              <div className="jig-stat-val">{formatTime(time)}</div>
              <div className="jig-stat-lbl">⏱️ Waktu</div>
            </div>
            <div className="jig-stat">
              <div className="jig-stat-val">{moves}</div>
              <div className="jig-stat-lbl">👆 Langkah</div>
            </div>
            <div className="jig-stat">
              <div className="jig-stat-val">{correctCount}/{totalPieces}</div>
              <div className="jig-stat-lbl">✅ Benar</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="jig-progress-track">
            <div className="jig-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Action buttons */}
          <div className="jig-actions">
            <button className="jig-action-btn" onClick={() => setShowPreview(true)}>
              🖼️ Preview
            </button>
            <button className="jig-action-btn" onClick={handleHint}>
              💡 Hint
            </button>
            <button className="jig-action-btn" onClick={handleRestart}>
              🔄 Ulang
            </button>
          </div>

          {/* Board */}
          <div className="jig-board-wrap" ref={containerRef}>
            <div style={{ fontSize:11, color:textMuted, textAlign:'center', marginBottom:10, fontWeight:700 }}>
              📋 Papan Puzzle {selected ? '— Klik posisi untuk menempatkan' : '— Pilih keping di bawah'}
            </div>
            <div
              className="jig-board"
              style={{
                gridTemplateColumns: `repeat(${config.cols}, ${tileSize}px)`,
                gridTemplateRows: `repeat(${config.rows}, ${tileSize}px)`,
              }}
            >
              {grid.map((tileIdx, pos) => {
                const tile = tileIdx !== null ? pattern.tiles[tileIdx] : null
                const isCorrect = tileIdx !== null && tileIdx === pos
                const isSelected = selected?.source === 'grid' && selected?.idx === pos
                return (
                  <div key={pos} onClick={() => handleGridClick(pos)}>
                    {tile ? (
                      <PuzzleTile
                        tile={tile}
                        size={tileSize}
                        showNumber
                        selected={isSelected}
                        correct={isCorrect}
                        dark={dark}
                      />
                    ) : (
                      <div style={{
                        width: tileSize, height: tileSize, borderRadius: 10,
                        background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                        border: `2px dashed ${selected ? accent + '66' : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, color: textMuted, fontWeight: 700, cursor: selected ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                      }}>
                        {pos + 1}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tray */}
          <div className="jig-tray-wrap">
            <div style={{ fontSize:11, color:textMuted, textAlign:'center', marginBottom:10, fontWeight:700 }}>
              🧩 Keping tersedia ({tray.length} sisa)
            </div>
            <div className="jig-tray">
              {tray.length === 0 && !gameOver && (
                <div style={{ fontSize:13, color:textMuted, padding:12 }}>
                  Semua keping sudah di papan! ✨
                </div>
              )}
              {tray.map(tileIdx => {
                const tile = pattern.tiles[tileIdx]
                const isSelected = selected?.source === 'tray' && selected?.idx === tileIdx
                return (
                  <div key={tileIdx} onClick={() => handleTrayClick(tileIdx)}>
                    <PuzzleTile
                      tile={tile}
                      size={Math.min(tileSize, 56)}
                      showNumber
                      selected={isSelected}
                      dark={dark}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Preview overlay */}
          {showPreview && (
            <div className="jig-preview-overlay" onClick={() => setShowPreview(false)}>
              <div className="jig-preview-card" onClick={e => e.stopPropagation()}>
                <h3 style={{ fontFamily:"'Fredoka One',cursive", fontSize:18, color:textMain, textAlign:'center', marginBottom:14 }}>
                  🖼️ Preview — {pattern.name}
                </h3>
                <div style={{
                  display:'grid',
                  gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
                  gap: 4, marginBottom: 16,
                }}>
                  {pattern.tiles.map(tile => (
                    <PuzzleTile key={tile.idx} tile={tile} size={Math.floor(280 / config.cols)} showNumber dark={dark} />
                  ))}
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  style={{
                    width:'100%', padding:'12px', borderRadius:100, border:'none',
                    background:`linear-gradient(135deg,${accent},${accent}bb)`,
                    color:'#fff', fontFamily:"'Fredoka One',cursive", fontSize:15,
                    cursor:'pointer', boxShadow:`0 6px 20px ${accent}44`,
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          )}

          {/* Game Over overlay */}
          {gameOver && (
            <div className="jig-gameover">
              <div className="jig-gameover-card">
                <div style={{ fontSize:56, marginBottom:12 }}>🎉</div>
                <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:textMain, marginBottom:8 }}>
                  Puzzle Selesai!
                </h2>
                <div style={{ fontSize:36, marginBottom:12, letterSpacing:4 }}>
                  {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
                </div>
                <div style={{ display:'flex', gap:16, justifyContent:'center', marginBottom:24 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:accent }}>{formatTime(time)}</div>
                    <div style={{ fontSize:11, color:textMuted, fontWeight:700 }}>Waktu</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:accent }}>{moves}</div>
                    <div style={{ fontSize:11, color:textMuted, fontWeight:700 }}>Langkah</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button
                    onClick={() => { play('click'); onBack() }}
                    style={{
                      flex:1, padding:'12px', borderRadius:100,
                      border:`2px solid ${borderCol}`, background:'transparent',
                      color:textMuted, fontFamily:"'Fredoka One',cursive", fontSize:14,
                      cursor:'pointer',
                    }}
                  >
                    ← Kembali
                  </button>
                  <button
                    onClick={handleRestart}
                    style={{
                      flex:2, padding:'12px', borderRadius:100, border:'none',
                      background:`linear-gradient(135deg,${accent},${accent}bb)`,
                      color:'#fff', fontFamily:"'Fredoka One',cursive", fontSize:15,
                      cursor:'pointer', boxShadow:`0 6px 20px ${accent}44`,
                    }}
                  >
                    🔄 Main Lagi
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
