import { useState, useEffect, useRef, useCallback } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import Confetti from '../../components/Confetti.jsx'
import { WinModal, LoseModal } from '../../components/GameLayout.jsx'

// ─── Theme Data ───────────────────────────────────────────────────────────────
const THEMES = {
  easy: [
    {
      tema: '🐾 HEWAN',
      kata: ['KUCING','ANJING','KUDA','SAPI','AYAM','KAMBING','KELINCI','HARIMAU'],
    },
    {
      tema: '🍎 BUAH',
      kata: ['APEL','MANGGA','PISANG','JERUK','SEMANGKA','PEPAYA','JAMBU','ANGGUR'],
    },
    {
      tema: '🎨 WARNA',
      kata: ['MERAH','BIRU','HIJAU','KUNING','PUTIH','HITAM','UNGU','ORANYE'],
    },
    {
      tema: '🏠 RUMAH',
      kata: ['PINTU','JENDELA','ATAP','LANTAI','DAPUR','KAMAR','TAMAN','GARASI'],
    },
  ],
  medium: [
    {
      tema: '🏙 KOTA INDONESIA',
      kata: ['JAKARTA','BANDUNG','SURABAYA','MEDAN','SEMARANG','MAKASSAR','PALEMBANG','YOGYAKARTA','MANADO','DENPASAR'],
    },
    {
      tema: '🌏 NEGARA ASIA',
      kata: ['INDONESIA','MALAYSIA','SINGAPURA','THAILAND','VIETNAM','FILIPINA','MYANMAR','KAMBOJA','LAOS','BRUNEI'],
    },
    {
      tema: '🍽 MAKANAN',
      kata: ['RENDANG','SOTO','GADO','PEMPEK','RAWON','GUDEG','SATE','NASI','BAKSO','MIE'],
    },
    {
      tema: '⚽ OLAHRAGA',
      kata: ['SEPAKBOLA','BASKET','RENANG','LARI','BULU','ANGKAT','PANAHAN','TINJU','GULAT','SILAT'],
    },
  ],
  hard: [
    {
      tema: '🌍 NEGARA DUNIA',
      kata: ['INDONESIA','AUSTRALIA','ARGENTINA','PORTUGAL','KOLOMBIA','ETHIOPIA','TANZANIA','UKRAINA','VENEZUELA','KAZAKHSTAN'],
    },
    {
      tema: '🔬 ILMU PENGETAHUAN',
      kata: ['BIOLOGI','KIMIA','FISIKA','MATEMATIKA','GEOGRAFI','SEJARAH','ASTRONOMI','GEOLOGI','EKOLOGI','PSIKOLOGI'],
    },
    {
      tema: '🏛 PAHLAWAN INDONESIA',
      kata: ['SOEKARNO','HATTA','KARTINI','SUDIRMAN','DIPONEGORO','PATTIMURA','HASANUDDIN','MATARAM','MAJAPAHIT','SRIWIJAYA'],
    },
    {
      tema: '🎵 ALAT MUSIK',
      kata: ['GAMELAN','ANGKLUNG','SASANDO','KOLINTANG','TIFA','KENDANG','SARON','REBAB','SULING','KECAPI'],
    },
  ],
}

const DIFF_CFG = {
  easy:   { grid: 9,  wordCount: 6, time: 120 },
  medium: { grid: 11, wordCount: 8, time: 150 },
  hard:   { grid: 13, wordCount: 10, time: 180 },
}

const HIGHLIGHT_COLORS = [
  '#FF6B6B','#4ECDC4','#FFE66D','#A29BFE','#FD79A8',
  '#FF9F43','#54A0FF','#5F27CD','#00D2D3','#1DD1A1',
]

// ─── Grid Generator ───────────────────────────────────────────────────────────
function generateGrid(size, words) {
  const dirs = [
    [0,1],[1,0],[1,1],[0,-1],[-1,0],[-1,-1],[1,-1],[-1,1]
  ]
  const grid = Array.from({ length: size }, () => Array(size).fill(''))
  const placed = []

  for (const word of words) {
    let success = false
    let tries   = 0
    while (!success && tries < 150) {
      tries++
      const dir = dirs[Math.floor(Math.random() * dirs.length)]
      const r   = Math.floor(Math.random() * size)
      const c   = Math.floor(Math.random() * size)
      const er  = r + dir[0] * (word.length - 1)
      const ec  = c + dir[1] * (word.length - 1)
      if (er < 0 || er >= size || ec < 0 || ec >= size) continue
      // Check conflicts
      let ok = true
      const cells = []
      for (let i = 0; i < word.length; i++) {
        const nr = r + dir[0] * i
        const nc = c + dir[1] * i
        if (grid[nr][nc] !== '' && grid[nr][nc] !== word[i]) { ok = false; break }
        cells.push([nr, nc])
      }
      if (!ok) continue
      cells.forEach(([nr, nc], i) => { grid[nr][nc] = word[i] })
      placed.push({ word, cells })
      success = true
    }
  }

  // Fill remaining with random letters
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') grid[r][c] = letters[Math.floor(Math.random() * letters.length)]
    }
  }
  return { grid, placed }
}

function cellKey(r, c) { return `${r},${c}` }

function getCellsBetween(r1, c1, r2, c2) {
  const cells = []
  const dr = r2 - r1, dc = c2 - c1
  const len = Math.max(Math.abs(dr), Math.abs(dc))
  if (len === 0) return [[r1, c1]]
  // Must be straight line
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return []
  const sr = dr === 0 ? 0 : dr / Math.abs(dr)
  const sc = dc === 0 ? 0 : dc / Math.abs(dc)
  for (let i = 0; i <= len; i++) cells.push([r1 + sr * i, c1 + sc * i])
  return cells
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WordSearch({ onBack, onHome, game, difficulty }) {
  const cfg  = DIFF_CFG[difficulty.id]
  const { play }     = useSound()
  const { darkMode } = useSettings()
  const dark = darkMode

  // Pick random theme for this difficulty
  const [themeData]   = useState(() => {
    const pool = THEMES[difficulty.id]
    return pool[Math.floor(Math.random() * pool.length)]
  })

  const targetWords = themeData.kata.slice(0, cfg.wordCount)

  const [level,       setLevel]       = useState(1)
  const [coins,       setCoins]       = useState(0)
  const [gridData,    setGridData]    = useState(null)
  const [found,       setFound]       = useState([])    // [{word, cells, color}]
  const [selecting,   setSelecting]   = useState(false)
  const [selStart,    setSelStart]    = useState(null)  // {r,c}
  const [selEnd,      setSelEnd]      = useState(null)
  const [timeLeft,    setTimeLeft]    = useState(cfg.time)
  const [phase,       setPhase]       = useState('playing') // playing|won|lost
  const [confetti,    setConfetti]    = useState(false)
  const [flashWord,   setFlashWord]   = useState('')
  const [currentTheme, setCurrentTheme] = useState(themeData)
  const [currentWords, setCurrentWords] = useState(targetWords)
  const [bestCoins,    setBestCoins]  = useState(() =>
    parseInt(localStorage.getItem(`ws-best-${difficulty.id}`) || '0')
  )

  const boardRef  = useRef(null)
  const timerRef  = useRef(null)

  // Init grid
  useEffect(() => {
    const { grid, placed } = generateGrid(cfg.grid, currentWords)
    setGridData({ grid, placed })
    setFound([])
    setSelStart(null)
    setSelEnd(null)
    setPhase('playing')
    setTimeLeft(cfg.time)
  }, [currentWords, cfg.grid])

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setPhase('lost')
          play('gameOver')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, currentWords])

  // Cell size
  const [cellSize, setCellSize] = useState(34)
  useEffect(() => {
    const upd = () => {
      const w = Math.min(window.innerWidth - 24, 500)
      setCellSize(Math.max(24, Math.floor((w - 8) / cfg.grid) - 2))
    }
    upd(); window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [cfg.grid])

  // Get cell from point
  const getCellAt = useCallback((clientX, clientY) => {
    const board = boardRef.current; if (!board) return null
    const rect  = board.getBoundingClientRect()
    const c = Math.floor((clientX - rect.left)  / (cellSize + 2))
    const r = Math.floor((clientY - rect.top)   / (cellSize + 2))
    if (r < 0 || r >= cfg.grid || c < 0 || c >= cfg.grid) return null
    return { r, c }
  }, [cellSize, cfg.grid])

  // Check if selection matches a word
  const checkSelection = useCallback((start, end) => {
    if (!start || !end || !gridData) return
    const cells = getCellsBetween(start.r, start.c, end.r, end.c)
    if (!cells.length) return
    const word = cells.map(([r,c]) => gridData.grid[r][c]).join('')
    const wordRev = [...word].reverse().join('')

    const match = currentWords.find(w =>
      (w === word || w === wordRev) &&
      !found.some(f => f.word === w)
    )
    if (match) {
      const color = HIGHLIGHT_COLORS[found.length % HIGHLIGHT_COLORS.length]
      const actualCells = word === match ? cells : [...cells].reverse()
      play('match')
      setFlashWord(match)
      setTimeout(() => setFlashWord(''), 1200)
      const gained  = match.length * 10
      const newFound = [...found, { word: match, cells: actualCells, color }]
      setFound(newFound)
      setCoins(c => c + gained)
      if (newFound.length === currentWords.length) {
        clearInterval(timerRef.current)
        setPhase('won')
        setConfetti(true)
        play('win')
        const bonus = timeLeft * 2
        setCoins(c => {
          const total = c + bonus
          if (total > bestCoins) {
            localStorage.setItem(`ws-best-${difficulty.id}`, total)
            setBestCoins(total)
          }
          return total
        })
      }
    }
  }, [gridData, currentWords, found, play, timeLeft, bestCoins])

  // Pointer events
  const onPointerDown = useCallback((e, r, c) => {
    e.preventDefault()
    setSelecting(true)
    setSelStart({ r, c })
    setSelEnd({ r, c })
  }, [])

  const onPointerEnter = useCallback((e, r, c) => {
    if (!selecting) return
    setSelEnd({ r, c })
  }, [selecting])

  const onPointerUp = useCallback((e) => {
    if (!selecting) return
    setSelecting(false)
    checkSelection(selStart, selEnd)
    setSelStart(null)
    setSelEnd(null)
  }, [selecting, selStart, selEnd, checkSelection])

  // Touch handlers for board
  const onTouchMove = useCallback((e) => {
    e.preventDefault()
    const t = e.touches[0]
    const cell = getCellAt(t.clientX, t.clientY)
    if (cell) setSelEnd(cell)
  }, [getCellAt])

  const onTouchEnd = useCallback((e) => {
    e.preventDefault()
    setSelecting(false)
    checkSelection(selStart, selEnd)
    setSelStart(null)
    setSelEnd(null)
  }, [selStart, selEnd, checkSelection])

  // Next level
  const nextLevel = () => {
    play('click')
    const pool    = THEMES[difficulty.id]
    const newTheme = pool[Math.floor(Math.random() * pool.length)]
    const newWords = newTheme.kata.slice(0, cfg.wordCount)
    setLevel(l => l + 1)
    setCurrentTheme(newTheme)
    setCurrentWords(newWords)
    setPhase('playing')
    setConfetti(false)
    setTimeLeft(cfg.time)
  }

  const restart = () => {
    play('click')
    const { grid, placed } = generateGrid(cfg.grid, currentWords)
    setGridData({ grid, placed })
    setFound([])
    setSelStart(null)
    setSelEnd(null)
    setPhase('playing')
    setTimeLeft(cfg.time)
  }

  // Get current selection highlight cells
  const selCells = selStart && selEnd
    ? new Set(getCellsBetween(selStart.r, selStart.c, selEnd.r, selEnd.c).map(([r,c]) => cellKey(r,c)))
    : new Set()

  // Found cells map: cellKey → color
  const foundCellMap = {}
  found.forEach(f => f.cells.forEach(([r,c]) => { foundCellMap[cellKey(r,c)] = f.color }))

  const pct      = Math.round((timeLeft / cfg.time) * 100)
  const timerCol = timeLeft > 60 ? '#4ECDC4' : timeLeft > 30 ? '#FFE66D' : '#FF6B6B'
  const DLABEL   = { easy:'🟢 Mudah', medium:'🟡 Sedang', hard:'🔴 Sulit' }
  const bg       = dark ? '#0f1117' : '#f8f9ff'
  const surface  = dark ? '#1a1d2e' : '#ffffff'
  const textMain = dark ? '#e8e8f0' : '#1a1a2e'
  const textMuted= dark ? '#7a7a96' : '#636E72'
  const border   = dark ? '#2a2a40' : '#e8e8f0'

  if (!gridData) return (
    <div style={{ minHeight:'100vh', background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:20, color:textMuted }}>Membuat puzzle...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:bg, display:'flex', flexDirection:'column', alignItems:'center', paddingBottom:32 }}>
      <style>{`
        @keyframes wordFound { 0%{transform:scale(1)} 40%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes flash     { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popModal  { from{transform:scale(0.8);opacity:0} to{transform:scale(1);opacity:1} }
        .cell-btn { touch-action: none; cursor: pointer; border: none; outline: none; transition: transform 0.08s; }
        .cell-btn:active { transform: scale(0.9); }
      `}</style>

      <Confetti active={confetti} onDone={() => setConfetti(false)} />

      {/* ── Header ── */}
      <div style={{ width:'100%', maxWidth:520, display:'flex', alignItems:'center', padding:'14px 16px 10px', gap:10, borderBottom:`1px solid ${border}` }}>
        <button onClick={() => { play('click'); onBack() }}
          style={{ background:'transparent', border:`1.5px solid ${border}`, borderRadius:10, padding:'7px 13px', color:textMuted, fontSize:15, cursor:'pointer', fontWeight:700, fontFamily:"'Nunito',sans-serif" }}>
          ←
        </button>
        <div style={{ flex:1, textAlign:'center' }}>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14, color:textMuted }}>TINGKAT {level}</div>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:20, color:textMain, lineHeight:1 }}>
            Cari Kata 🔍
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,211,61,0.12)', border:'1.5px solid rgba(255,211,61,0.3)', borderRadius:100, padding:'6px 14px' }}>
          <span style={{ fontSize:16 }}>🪙</span>
          <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:18, color:'#FFD93D' }}>{coins}</span>
        </div>
      </div>

      {/* ── Timer bar ── */}
      <div style={{ width:'100%', maxWidth:520, padding:'8px 16px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12, fontWeight:700 }}>
          <span style={{ color:textMuted }}>{DLABEL[difficulty.id]}</span>
          <span style={{ color:timerCol, fontFamily:"'Fredoka One',cursive", fontSize:15 }}>
            ⏱ {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}
          </span>
        </div>
        <div style={{ height:8, background:dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.07)', borderRadius:100, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${timerCol},${timerCol}88)`, borderRadius:100, transition:'width 1s linear, background 0.5s' }}/>
        </div>
      </div>

      {/* ── Theme banner ── */}
      <div style={{ width:'100%', maxWidth:520, padding:'10px 16px 0' }}>
        <div style={{ background: dark?'rgba(162,155,254,0.1)':'rgba(162,155,254,0.08)', border:'1.5px solid rgba(162,155,254,0.25)', borderRadius:14, padding:'8px 16px', textAlign:'center' }}>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:20, color:'#A29BFE', letterSpacing:'1px' }}>
            {currentTheme.tema}
          </div>
        </div>
      </div>

      {/* ── Word list ── */}
      <div style={{ width:'100%', maxWidth:520, padding:'8px 16px 0' }}>
        <div style={{ background:surface, border:`1.5px solid ${border}`, borderRadius:14, padding:'10px 14px', display:'flex', flexWrap:'wrap', gap:'6px 12px' }}>
          {currentWords.map(word => {
            const foundEntry = found.find(f => f.word === word)
            const isFlash    = flashWord === word
            return (
              <span key={word} style={{
                fontFamily: "'Fredoka One',cursive",
                fontSize: 14,
                color: foundEntry ? foundEntry.color : textMuted,
                textDecoration: foundEntry ? 'line-through' : 'none',
                fontWeight: foundEntry ? 800 : 400,
                opacity: foundEntry ? 1 : 0.65,
                background: foundEntry ? `${foundEntry.color}18` : 'transparent',
                padding: foundEntry ? '2px 8px' : '2px 4px',
                borderRadius: 6,
                transition: 'all 0.3s',
                animation: isFlash ? 'wordFound 0.4s ease' : 'none',
              }}>
                {foundEntry ? '✓ ' : ''}{word}
              </span>
            )
          })}
        </div>
      </div>

      {/* ── Grid ── */}
      <div style={{ padding:'10px 12px 0', width:'100%', maxWidth:520 }}>
        <div
          ref={boardRef}
          onMouseLeave={onPointerUp}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ display:'inline-grid', gridTemplateColumns:`repeat(${cfg.grid},${cellSize}px)`, gap:2, background:surface, borderRadius:18, border:`1.5px solid ${border}`, padding:6, boxShadow: dark?'0 8px 32px rgba(0,0,0,0.3)':'0 8px 32px rgba(0,0,0,0.08)', userSelect:'none', touchAction:'none' }}
        >
          {gridData.grid.map((row, r) =>
            row.map((letter, c) => {
              const key      = cellKey(r, c)
              const isSel    = selCells.has(key)
              const fColor   = foundCellMap[key]
              const isFound  = !!fColor

              return (
                <div
                  key={key}
                  className="cell-btn"
                  onPointerDown={e => onPointerDown(e, r, c)}
                  onPointerEnter={e => onPointerEnter(e, r, c)}
                  onPointerUp={onPointerUp}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: cellSize > 30 ? 16 : 13,
                    fontWeight: 800,
                    color: isSel || isFound ? '#fff' : textMain,
                    background: isFound
                      ? fColor
                      : isSel
                      ? '#A29BFE'
                      : 'transparent',
                    transform: isSel ? 'scale(1.1)' : 'scale(1)',
                    transition: 'background 0.12s, transform 0.08s',
                    boxShadow: isSel ? '0 2px 8px rgba(162,155,254,0.5)' : 'none',
                    position: 'relative',
                  }}
                >
                  {letter}
                  {/* Shine on found */}
                  {isFound && (
                    <div style={{ position:'absolute', top:2, left:3, width:'40%', height:'30%', background:'rgba(255,255,255,0.3)', borderRadius:3, pointerEvents:'none' }}/>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Progress */}
      <div style={{ width:'100%', maxWidth:520, padding:'10px 16px 0', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ flex:1, height:7, background:dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.07)', borderRadius:100, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${(found.length/currentWords.length)*100}%`, background:'linear-gradient(90deg,#A29BFE,#4ECDC4)', borderRadius:100, transition:'width 0.4s ease' }}/>
        </div>
        <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:14, color:textMuted, flexShrink:0 }}>
          {found.length}/{currentWords.length} kata
        </span>
      </div>

      {/* Flash message */}
      {flashWord && (
        <div style={{ position:'fixed', top:100, left:'50%', transform:'translateX(-50%)', zIndex:50, background:'#4ECDC4', color:'#fff', padding:'10px 24px', borderRadius:100, fontFamily:"'Fredoka One',cursive", fontSize:18, boxShadow:'0 4px 20px rgba(78,205,196,0.5)', animation:'slideUp 0.2s ease', whiteSpace:'nowrap' }}>
          ✓ {flashWord}! +{flashWord.length * 10} 🪙
        </div>
      )}

      {phase === 'won' && (
        <WinModal
          title="Hebat!"
          subtitle={`Semua kata ditemukan di tingkat ${level}!`}
          diffLabel={DLABEL[difficulty.id]}
          stats={[
            { label: 'Kata', value: `${found.length}/${currentWords.length}`, color: '#A29BFE' },
            { label: 'Sisa waktu', value: `${timeLeft}s`, color: '#FF6B6B' },
            { label: 'Total koin', value: String(coins), color: '#4ECDC4' },
          ]}
          coinReward={timeLeft * 2}
          restartLabel={`▶ Tingkat ${level + 1}`}
          onRestart={nextLevel}
          onBack={() => { play('click'); onBack() }}
          onHome={onHome}
          dark={darkMode}
          gameColor={game?.color || '#A29BFE'}
        />
      )}

      {phase === 'lost' && (
        <LoseModal
          emoji="⏰"
          title="Waktu habis!"
          subtitle={`Kamu menemukan ${found.length} dari ${currentWords.length} kata.`}
          diffLabel={DLABEL[difficulty.id]}
          stats={[
            {
              label: 'Belum ketemu',
              value: currentWords.filter(w => !found.find(f => f.word === w)).join(', ') || '—',
              color: '#FF6B6B',
            },
          ]}
          coinReward={0}
          onRestart={restart}
          onBack={() => { play('click'); onBack() }}
          onHome={onHome}
          dark={darkMode}
          gameColor="#FF6B6B"
        />
      )}
    </div>
  )
}
