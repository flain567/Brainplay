import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'
import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

// ─── Kategori & Kata ─────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'kota', name: 'KOTA', icon: '🏙️',
    words: {
      easy:   ['BALI','MEDAN','DEPOK','BOGOR','SOLO','TEGAL','BLITAR','PALU','AMBON','CIMAHI'],
      medium: ['JAKARTA','BANDUNG','MALANG','MANADO','PADANG','BEKASI','SERANG','CIREBON','KUPANG','SORONG','KEDIRI','LANGSA'],
      hard:   ['SURABAYA','SEMARANG','MAKASSAR','DENPASAR','PALEMBANG','SAMARINDA','PONTIANAK','BENGKULU','JAYAPURA','GORONTALO','PEKANBARU','BALIKPAPAN','TASIKMALAYA','PURWOKERTO'],
    }
  },
  {
    id: 'negara', name: 'NEGARA', icon: '🌍',
    words: {
      easy:   ['INDIA','MESIR','RUSIA','CHILE','LAOS','NEPAL','TURKI','LIBYA','BENIN','KOREA'],
      medium: ['JEPANG','BRAZIL','KANADA','SPANYOL','JERMAN','ITALIA','MEKSIKO','POLANDIA','SWEDIA','YUNANI','KROASIA','UKRAINA'],
      hard:   ['INDONESIA','AUSTRALIA','ARGENTINA','KOLOMBIA','VENEZUELA','PORTUGAL','NORWEGIA','SELANDIA','FINLANDIA','PAKISTAN','ETHIOPIA','KAMBOJA','MADAGASKAR','BANGLADESH'],
    }
  },
  {
    id: 'hewan', name: 'HEWAN', icon: '🐾',
    words: {
      easy:   ['SAPI','AYAM','IKAN','KUDA','ULAR','KUTU','RUSA','TIKUS','SINGA','PANDA'],
      medium: ['KUCING','KELINCI','BURUNG','KERBAU','GAJAH','RUBAH','DOMBA','KIJANG','MERAK','BEBEK','ANGSA','ELANG'],
      hard:   ['HARIMAU','JERAPAH','GORILLA','PENGUIN','LUMBA','KELELAWAR','BUNGLON','KALKUN','ORANGUTAN','KOMODO','RAJAWALI','BANTENG','BERUANG','MERPATI'],
    }
  },
  {
    id: 'buah', name: 'BUAH', icon: '🍎',
    words: {
      easy:   ['APEL','JERUK','PEAR','JAMBU','NANAS','MELON','KURMA','LEMON','PLUM','SALAK'],
      medium: ['MANGGA','PISANG','DURIAN','PEPAYA','ANGGUR','RAMBUTAN','KELAPA','MARKISA','ALPUKAT','CERI','PERSIK','KESEMEK'],
      hard:   ['SEMANGKA','NANGKA','MANGGIS','BELIMBING','SIRSAK','SAWO','MATOA','DUKU','CEMPEDAK','KEDONDONG','SRIKAYA','DELIMA','KIWI','LECI'],
    }
  },
  {
    id: 'profesi', name: 'PROFESI', icon: '👨‍💼',
    words: {
      easy:   ['GURU','KOKI','PILOT','POLISI','DOKTER','HAKIM','SUPIR','BIDAN','WASIT','SATPAM'],
      medium: ['PETANI','NELAYAN','ARSITEK','PELUKIS','PENULIS','AKUNTAN','APOTEKER','DESAINER','PERAWAT','MONTIR','NAHKODA','PENARI'],
      hard:   ['PROGRAMMER','PENGACARA','PSIKOLOG','WARTAWAN','DIPLOMAT','ILMUWAN','FOTOGRAFER','ASTRONAUT','INSINYUR','KONSULTAN','FISIKAWAN','SOSIOLOG','SENIMAN','MUSISI'],
    }
  },
  {
    id: 'makanan', name: 'MAKANAN', icon: '🍜',
    words: {
      easy:   ['NASI','ROTI','SATE','SOTO','PECEL','BAKSO','BUBUR','RAWON','OPOR','GULAI'],
      medium: ['RENDANG','GADO','KETOPRAK','MARTABAK','SIOMAY','PEMPEK','GUDEG','LONTONG','BATAGOR','LUMPIA','CILOK','PAPEDA'],
      hard:   ['TONGSENG','SEBLAK','KETUPAT','KLEPON','LEMPER','MENDOAN','SERABI','SURABI','KAREDOK','PEUYEUM','TEKWAN','CENDOL','KOLAK','GETUK'],
    }
  },
]

// ─── Arah pencarian (8 arah) ─────────────────────────────────────────────────
const DIRECTIONS = [
  [0, 1], [1, 0], [1, 1], [1, -1],
  [0, -1], [-1, 0], [-1, -1], [-1, 1],
]

// ─── Warna highlight (defaults) ──────────────────────────────────────────────
const DEFAULT_WORD_COLORS = [
  '#FF6B6B', '#4ECDC4', '#A29BFE', '#FD79A8', '#00B894',
  '#FDCB6E', '#6C5CE7', '#E17055', '#00CEC9', '#0984E3',
  '#E84393', '#55EFC4', '#81ECEC', '#FAB1A0', '#74B9FF',
]

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

// ─── Tutorial ────────────────────────────────────────────────────────────────
const TUTORIAL_STEPS = [
  { emoji: '🔍', title: 'Cari Kata!', desc: 'Temukan semua kata yang tersembunyi di dalam grid huruf acak.', tip: 'Kata bisa horizontal, vertikal, atau diagonal!' },
  { emoji: '👆', title: 'Geser & Tandai', desc: 'Tekan huruf pertama lalu geser ke huruf terakhir untuk menandai kata.', tip: 'Kamu bisa geser ke 8 arah: atas, bawah, kiri, kanan, dan semua diagonal.' },
  { emoji: '⏱️', title: 'Kumpulkan Bintang', desc: 'Semakin cepat kamu selesai, semakin banyak bintang yang didapat!', tip: 'Gunakan hint jika stuck, tapi usahakan tanpa bantuan untuk skor maksimal!' },
]

// ─── Difficulty config ───────────────────────────────────────────────────────
const DIFF_CFG = {
  easy:   { gridSize: 8,  wordCount: 6,  hintCount: 3, timeBonus: [60, 120] },
  medium: { gridSize: 10, wordCount: 8,  hintCount: 2, timeBonus: [90, 180] },
  hard:   { gridSize: 12, wordCount: 10, hintCount: 1, timeBonus: [120, 240] },
}

// ─── Grid generator ──────────────────────────────────────────────────────────
function generateGrid(words, size) {
  // Pre-filter: remove words longer than grid size
  const validWords = words.filter(w => w.replace(/\s/g, '').length <= size)

  let bestGrid = null
  let bestPlacements = []
  let bestCount = 0

  for (let attempt = 0; attempt < 30; attempt++) {
    const grid = Array.from({ length: size }, () => Array(size).fill(''))
    const placements = []
    // Sort longest first for better placement success
    const shuffled = [...validWords].sort((a, b) => {
      const diff = b.replace(/\s/g, '').length - a.replace(/\s/g, '').length
      return diff !== 0 ? diff : Math.random() - 0.5
    })

    for (const word of shuffled) {
      const clean = word.replace(/\s/g, '')
      let placed = false
      const shuffledDirs = [...DIRECTIONS].sort(() => Math.random() - 0.5)

      for (let tries = 0; tries < 500 && !placed; tries++) {
        const dir = shuffledDirs[tries % shuffledDirs.length]
        const r = Math.floor(Math.random() * size)
        const c = Math.floor(Math.random() * size)
        const endR = r + dir[0] * (clean.length - 1)
        const endC = c + dir[1] * (clean.length - 1)

        if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue

        let canPlace = true
        for (let i = 0; i < clean.length; i++) {
          const nr = r + dir[0] * i
          const nc = c + dir[1] * i
          if (grid[nr][nc] !== '' && grid[nr][nc] !== clean[i]) {
            canPlace = false
            break
          }
        }

        if (canPlace) {
          const cells = []
          for (let i = 0; i < clean.length; i++) {
            const nr = r + dir[0] * i
            const nc = c + dir[1] * i
            grid[nr][nc] = clean[i]
            cells.push(`${nr}-${nc}`)
          }
          placements.push({ word, clean, cells, dir })
          placed = true
        }
      }
    }

    if (placements.length > bestCount) {
      bestGrid = grid
      bestPlacements = placements
      bestCount = placements.length
    }
    if (bestCount === validWords.length) break
  }

  // Fill empty cells
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (bestGrid[r][c] === '') bestGrid[r][c] = LETTERS[Math.floor(Math.random() * 26)]

  return { grid: bestGrid, placements: bestPlacements }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getCellsBetween(start, end) {
  if (!start || !end) return []
  const [sr, sc] = start
  const [er, ec] = end
  const dr = Math.sign(er - sr)
  const dc = Math.sign(ec - sc)
  const distR = Math.abs(er - sr)
  const distC = Math.abs(ec - sc)
  if (distR !== 0 && distC !== 0 && distR !== distC) return []
  if (distR === 0 && distC === 0) return [`${sr}-${sc}`]
  const steps = Math.max(distR, distC)
  const cells = []
  for (let i = 0; i <= steps; i++) {
    cells.push(`${sr + dr * i}-${sc + dc * i}`)
  }
  return cells
}

function pickCategory() {
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
}

function pickWords(category, diffId, count) {
  const pool = category.words[diffId] || category.words.easy
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function formatTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

function loadStats(diffId) {
  try { return JSON.parse(localStorage.getItem(`wordsearch-stats-${diffId}`)) || {} } catch { return {} }
}
function saveStats(diffId, s) {
  localStorage.setItem(`wordsearch-stats-${diffId}`, JSON.stringify(s))
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function WordSearchGame({ onBack, game, difficulty }) {
  const cfg = DIFF_CFG[difficulty.id]
  const { play } = useSound()
  const tc = useThemeColors()
  const dark = tc.dark
  const { reportGameResult } = useProgress()
  const { earnCoins, getActiveHighlightColors } = useCoins()
  const WORD_COLORS = (getActiveHighlightColors ? getActiveHighlightColors() : null) || DEFAULT_WORD_COLORS

  // ── State ──
  const [category, setCategory] = useState(() => pickCategory())
  const [words, setWords] = useState(() => pickWords(pickCategory(), difficulty.id, cfg.wordCount))
  const [grid, setGrid] = useState([])
  const [placements, setPlacements] = useState([])
  const [foundWords, setFoundWords] = useState([])
  const [foundHighlights, setFoundHighlights] = useState({}) // cellKey -> { color, wordIndex }
  const [selecting, setSelecting] = useState(false)
  const [startCell, setStartCell] = useState(null)
  const [selectedCells, setSelectedCells] = useState([])
  const [timer, setTimer] = useState(0)
  const [phase, setPhase] = useState('playing') // playing | won
  const [hints, setHints] = useState(cfg.hintCount)
  const [hintCells, setHintCells] = useState({}) // cellKey -> true (temporary highlight)
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('bp_tut_word-search'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [toast, setToast] = useState('')
  const [stats, setStats] = useState(() => loadStats(difficulty.id))
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [comboTimer, setComboTimer] = useState(0)
  const [shake, setShake] = useState(false)
  const [lastFoundAnim, setLastFoundAnim] = useState(null) // word just found
  const [round, setRound] = useState(1)
  const [totalScore, setTotalScore] = useState(0)
  const [categorySelectMode, setCategorySelectMode] = useState(false)

  const timerRef = useRef(null)
  const comboRef = useRef(null)
  const gridRef = useRef(null)
  const colorIdx = useRef(0)

  // ── Init game ──
  const initGame = useCallback((cat, diffId) => {
    const w = pickWords(cat, diffId, cfg.wordCount)
    const { grid: g, placements: p } = generateGrid(w, cfg.gridSize)
    setCategory(cat)
    setWords(w)
    setGrid(g)
    setPlacements(p)
    setFoundWords([])
    setFoundHighlights({})
    setSelectedCells([])
    setStartCell(null)
    setSelecting(false)
    setTimer(0)
    setPhase('playing')
    setHints(cfg.hintCount)
    setHintCells({})
    setScore(0)
    setCombo(0)
    setComboTimer(0)
    setShake(false)
    setLastFoundAnim(null)
    colorIdx.current = 0
  }, [cfg])

  // Init on mount
  useEffect(() => {
    const cat = pickCategory()
    initGame(cat, difficulty.id)
  }, [difficulty.id])

  // Timer
  useEffect(() => {
    if (phase === 'playing') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
      return () => clearInterval(timerRef.current)
    } else {
      clearInterval(timerRef.current)
    }
  }, [phase])

  // Combo timer
  useEffect(() => {
    if (comboTimer > 0) {
      comboRef.current = setTimeout(() => {
        setComboTimer(t => {
          if (t <= 1) { setCombo(0); return 0 }
          return t - 1
        })
      }, 1000)
      return () => clearTimeout(comboRef.current)
    }
  }, [comboTimer])

  // ── Check word ──
  const checkWord = useCallback((cells) => {
    for (const p of placements) {
      if (foundWords.includes(p.word)) continue
      const fwd = p.cells.length === cells.length && p.cells.every((c, i) => c === cells[i])
      const rev = p.cells.length === cells.length && p.cells.every((c, i) => c === cells[cells.length - 1 - i])
      if (fwd || rev) return p.word
    }
    return null
  }, [placements, foundWords])

  // ── Handle word found ──
  const handleWordFound = useCallback((word, cells) => {
    play('match')
    const newCombo = combo + 1
    setCombo(newCombo)
    setComboTimer(5)

    // Score calculation
    const baseScore = word.replace(/\s/g, '').length * 15
    const comboBonus = newCombo > 1 ? newCombo * 10 : 0
    const pts = baseScore + comboBonus
    setScore(s => s + pts)

    setFoundWords(f => [...f, word])
    setLastFoundAnim(word)
    setTimeout(() => setLastFoundAnim(null), 800)

    // Highlight colors
    const colors = WORD_COLORS
    const color = colors[colorIdx.current % colors.length]
    colorIdx.current++

    const newHighlights = {}
    cells.forEach(c => { newHighlights[c] = color })
    setFoundHighlights(h => ({ ...h, ...newHighlights }))

    // Check win
    const newFound = [...foundWords, word]
    if (newFound.length === placements.length) {
      clearInterval(timerRef.current)
      setTimeout(() => {
        play('win')
        setPhase('won')
        setShowConfetti(true)

        const [fast, mid] = cfg.timeBonus
        const stars = timer <= fast ? 3 : timer <= mid ? 2 : 1
        const finalScore = score + pts

        // Report to global progress
        reportGameResult({
          gameId: 'word-search',
          difficultyId: difficulty.id,
          won: true,
          score: finalScore,
          stars,
          timeSec: timer,
        })

        // Coin reward
        const coinReward = { easy: 15, medium: 25, hard: 40 }
        let coinAmount = coinReward[difficulty.id] || 15
        if (stars === 3) coinAmount += 20
        earnCoins(coinAmount, `Menang Word Search (${difficulty.id})`)

        // Local stats
        setStats(st => {
          const ns = {
            ...st,
            played: (st.played || 0) + 1,
            won: (st.won || 0) + 1,
            bestTime: st.bestTime ? Math.min(st.bestTime, timer) : timer,
            totalWords: (st.totalWords || 0) + newFound.length,
          }
          saveStats(difficulty.id, ns)
          return ns
        })

        // Save best score
        const oldBest = localStorage.getItem(`word-search-best-${difficulty.id}`)
        if (!oldBest || finalScore > parseInt(oldBest)) {
          localStorage.setItem(`word-search-best-${difficulty.id}`, finalScore.toString())
        }
      }, 400)
    }
  }, [foundWords, placements, play, combo, score, timer, difficulty.id, dark])

  // ── Selection handlers ──
  const handlePointerDown = (r, c) => {
    if (phase !== 'playing') return
    setSelecting(true)
    setStartCell([r, c])
    setSelectedCells([`${r}-${c}`])
  }

  const handlePointerMove = (r, c) => {
    if (!selecting || !startCell || phase !== 'playing') return
    const cells = getCellsBetween(startCell, [r, c])
    if (cells.length > 0) setSelectedCells(cells)
  }

  const handlePointerUp = () => {
    if (!selecting) return
    setSelecting(false)
    if (selectedCells.length > 1) {
      const word = checkWord(selectedCells)
      if (word) {
        handleWordFound(word, selectedCells)
      } else {
        play('mismatch')
        setShake(true)
        setTimeout(() => setShake(false), 400)
      }
    }
    setSelectedCells([])
    setStartCell(null)
  }

  // Touch support
  const getCellFromTouch = (e) => {
    if (!gridRef.current) return null
    const touch = e.touches[0]
    const rect = gridRef.current.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    const cellSize = rect.width / cfg.gridSize
    const col = Math.floor(x / cellSize)
    const row = Math.floor(y / cellSize)
    if (row >= 0 && row < cfg.gridSize && col >= 0 && col < cfg.gridSize) return [row, col]
    return null
  }

  // ── Hint ──
  const useHint = () => {
    if (hints <= 0 || phase !== 'playing') return
    play('click')
    const unfound = placements.filter(p => !foundWords.includes(p.word))
    if (unfound.length === 0) return
    const target = unfound[Math.floor(Math.random() * unfound.length)]
    setHints(h => h - 1)

    // Show first 2 cells
    const showCells = target.cells.slice(0, 2)
    const newHints = {}
    showCells.forEach(c => { newHints[c] = true })
    setHintCells(h => ({ ...h, ...newHints }))
    showToast(`Petunjuk: "${target.word}" dimulai dari sini!`)

    setTimeout(() => {
      setHintCells(h => {
        const copy = { ...h }
        showCells.forEach(c => { delete copy[c] })
        return copy
      })
    }, 3000)
  }

  // ── New game / next round ──
  const newGame = (cat) => {
    play('click')
    const nextCat = cat || pickCategory()
    initGame(nextCat, difficulty.id)
    setRound(r => r + 1)
    setTotalScore(ts => ts + score)
  }

  // ── Toast ──
  const showToast = (msg, duration = 2000) => {
    setToast(msg)
    setTimeout(() => setToast(''), duration)
  }

  // ── Stars ──
  const getStars = () => {
    const [fast, mid] = cfg.timeBonus
    if (timer <= fast) return 3
    if (timer <= mid) return 2
    return 1
  }

  // ── Colors ──
  const bg = tc.bg
  const surface = tc.surface
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const borderCol = tc.borderCol
  const accent = game?.color || '#4ECDC4'
  const gridBg = dark ? '#1a1f3e' : '#FFFFFF'
  const cellBg = dark ? '#16213e' : '#F8F9FA'

  // ── Category select mode ──
  if (categorySelectMode) {
    return (
      <div style={{ minHeight: '100dvh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'background 0.3s' }}>
        <div style={{ width: '100%', maxWidth: 480, padding: '20px 16px' }}>
          <button onClick={() => setCategorySelectMode(false)} style={{ background: surface, border: `2px solid ${borderCol}`, borderRadius: 12, padding: '9px 18px', fontSize: 14, fontWeight: 700, color: textMuted, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", marginBottom: 20 }}>
            ← Kembali
          </button>

          <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, color: textMain, textAlign: 'center', marginBottom: 8 }}>Pilih Kategori</h2>
          <p style={{ fontSize: 13, color: textMuted, textAlign: 'center', marginBottom: 24 }}>Pilih tema kata yang ingin kamu cari</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { newGame(cat); setCategorySelectMode(false) }}
                style={{
                  background: surface,
                  border: `2px solid ${borderCol}`,
                  borderRadius: 16,
                  padding: '20px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = borderCol; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <span style={{ fontSize: 36 }}>{cat.icon}</span>
                <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 16, color: textMain }}>{cat.name}</span>
                <span style={{ fontSize: 11, color: textMuted }}>{(cat.words[difficulty.id] || cat.words.easy).length} kata</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'background 0.3s', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <style>{`
        @keyframes tileShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-4px)} 40%{transform:translateX(4px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
        @keyframes toastIn { from{opacity:0;transform:translateY(-10px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
        @keyframes statsIn { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 0 0 rgba(78,205,196,0)} 50%{box-shadow:0 0 12px 4px rgba(78,205,196,0.3)} }
        @keyframes wordPop { 0%{transform:scale(1)} 50%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes hintPulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes comboPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
      `}</style>

      {showTutorial && (
        <TutorialModal steps={TUTORIAL_STEPS} color={accent} onClose={() => { setShowTutorial(false); localStorage.setItem('bp_tut_word-search', '1') }} />
      )}
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: textMain, color: bg, padding: '10px 22px', borderRadius: 100, fontSize: 14, fontWeight: 700, fontFamily: "'Fredoka One',cursive", animation: 'toastIn 0.2s ease', whiteSpace: 'nowrap', maxWidth: '90vw', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', padding: '14px 16px 10px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, gap: 10 }}>
        <button onClick={() => { play('click'); onBack() }}
          style={{ background: 'transparent', border: `1.5px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`, borderRadius: 10, padding: '7px 13px', color: textMuted, fontSize: 15, cursor: 'pointer', fontWeight: 700, fontFamily: "'Nunito',sans-serif" }}>
          ←
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: textMain, lineHeight: 1 }}>
            {category.icon} {category.name}
          </div>
          <div style={{ fontSize: 11, color: textMuted, fontWeight: 700 }}>
            {difficulty.id === 'easy' ? '🟢 Mudah' : difficulty.id === 'medium' ? '🟡 Sedang' : '🔴 Sulit'} • Ronde {round}
          </div>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: textMain, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', padding: '5px 10px', borderRadius: 8, minWidth: 52, textAlign: 'center' }}>
          {formatTime(timer)}
        </div>
      </div>

      {/* ── Score & Combo bar ── */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 15, color: textMain }}>🏆 {score}</span>
          {combo > 1 && (
            <span style={{
              background: `linear-gradient(135deg, ${accent}, #6C5CE7)`,
              color: '#fff', padding: '3px 10px', borderRadius: 12,
              fontSize: 12, fontWeight: 800, fontFamily: "'Fredoka One',cursive",
              animation: 'comboPulse 0.5s ease infinite',
            }}>
              COMBO x{combo}!
            </span>
          )}
        </div>
        <button
          onClick={useHint}
          disabled={hints <= 0 || phase !== 'playing'}
          style={{
            background: hints > 0 ? '#FFF9C4' : (dark ? '#1e2a4a' : '#eee'),
            border: hints > 0 ? '1.5px solid #FFF176' : `1.5px solid ${borderCol}`,
            borderRadius: 20, padding: '5px 14px', cursor: hints > 0 ? 'pointer' : 'default',
            fontSize: 14, fontWeight: 700, fontFamily: "'Fredoka One',cursive",
            color: hints > 0 ? '#F57F17' : textMuted, opacity: hints > 0 ? 1 : 0.5,
            transition: 'all 0.2s',
          }}>
          💡 {hints}
        </button>
      </div>

      {/* ── Word list ── */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 16px 10px', justifyContent: 'center' }}>
        {placements.map((p, i) => {
          const isFound = foundWords.includes(p.word)
          const color = isFound ? (WORD_COLORS)[i % WORD_COLORS.length] : null
          return (
            <span key={p.word} style={{
              padding: '5px 12px', borderRadius: 100,
              fontSize: 12, fontWeight: 800, fontFamily: "'Fredoka One',cursive",
              letterSpacing: '0.5px',
              background: isFound ? (color + '22') : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
              color: isFound ? color : textMuted,
              textDecoration: isFound ? 'line-through' : 'none',
              border: `1.5px solid ${isFound ? color + '44' : 'transparent'}`,
              transition: 'all 0.3s ease',
              animation: lastFoundAnim === p.word ? 'wordPop 0.4s ease' : 'none',
            }}>
              {p.word}
            </span>
          )
        })}
      </div>

      {/* ── Grid ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4px 12px', width: '100%', maxWidth: 480 }}>
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cfg.gridSize}, 1fr)`,
            gap: difficulty.id === 'hard' ? 1 : 2,
            width: '100%',
            maxWidth: 420,
            background: gridBg,
            borderRadius: 16,
            padding: difficulty.id === 'hard' ? 6 : 8,
            boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
            border: `2px solid ${dark ? '#2d3561' : '#E8E8E8'}`,
            touchAction: 'none',
            animation: shake ? 'tileShake 0.4s ease' : 'none',
            position: 'relative',
          }}
          onMouseLeave={() => { if (selecting) handlePointerUp() }}
          onTouchMove={e => { e.preventDefault(); const cell = getCellFromTouch(e); if (cell) handlePointerMove(cell[0], cell[1]) }}
          onTouchEnd={() => handlePointerUp()}
        >
          {grid.map((row, r) =>
            row.map((letter, c) => {
              const key = `${r}-${c}`
              const isSelected = selectedCells.includes(key)
              const highlightColor = foundHighlights[key]
              const isHint = hintCells[key]

              return (
                <div
                  key={key}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: cfg.gridSize <= 8 ? 17 : cfg.gridSize <= 10 ? 14 : 12,
                    fontWeight: 800,
                    fontFamily: "'Fredoka One',cursive",
                    borderRadius: cfg.gridSize <= 8 ? 6 : 4,
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    background: isSelected
                      ? (accent + '33')
                      : highlightColor
                        ? (highlightColor + '30')
                        : isHint
                          ? '#FDCB6E44'
                          : cellBg,
                    color: isSelected
                      ? accent
                      : highlightColor
                        ? highlightColor
                        : isHint
                          ? '#F57F17'
                          : (dark ? '#c8cfe8' : '#2D3436'),
                    transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                    border: isSelected
                      ? `2px solid ${accent}`
                      : isHint
                        ? '2px solid #FDCB6E'
                        : `1px solid ${dark ? '#2d3561' : '#EEE'}`,
                    animation: isHint ? 'hintPulse 1s ease infinite' : 'none',
                    boxShadow: isSelected ? `0 0 8px ${accent}44` : 'none',
                  }}
                  onMouseDown={() => handlePointerDown(r, c)}
                  onMouseEnter={() => handlePointerMove(r, c)}
                  onMouseUp={() => handlePointerUp()}
                  onTouchStart={e => { e.preventDefault(); handlePointerDown(r, c) }}
                >
                  {letter}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Progress ── */}
      <div style={{ width: '100%', maxWidth: 480, padding: '8px 16px 4px' }}>
        <div style={{ height: 5, background: dark ? '#1e2a4a' : '#EEE', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: `linear-gradient(90deg, ${accent}, #6C5CE7)`,
            width: `${placements.length > 0 ? (foundWords.length / placements.length) * 100 : 0}%`,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: textMuted, fontWeight: 700, marginTop: 4, paddingBottom: 16 }}>
          {foundWords.length} / {placements.length} kata ditemukan
        </div>
      </div>

      {/* ── Won overlay ── */}
      {phase === 'won' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{
            background: surface, borderRadius: 24, padding: '28px 24px', maxWidth: 360, width: '100%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.3)', animation: 'statsIn 0.3s ease',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 52, marginBottom: 4 }}>🎉</div>
            <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 28, color: accent, marginBottom: 4 }}>Hebat!</h2>
            <p style={{ fontSize: 13, color: textMuted, marginBottom: 16 }}>Semua kata ditemukan!</p>

            {/* Stars */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
              {[1, 2, 3].map(s => (
                <span key={s} style={{ fontSize: 36, filter: s <= getStars() ? 'none' : 'grayscale(1) opacity(0.2)', transition: 'all 0.3s' }}>⭐</span>
              ))}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { icon: '⏱️', label: 'Waktu', value: formatTime(timer) },
                { icon: '🏆', label: 'Skor', value: score },
                { icon: '🔥', label: 'Maks Combo', value: `x${combo || 1}` },
              ].map(s => (
                <div key={s.label} style={{ background: dark ? '#1e2a4a' : '#F8F9FA', borderRadius: 14, padding: '12px 8px' }}>
                  <div style={{ fontSize: 20, marginBottom: 2 }}>{s.icon}</div>
                  <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 18, color: textMain }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: textMuted, fontWeight: 700 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => newGame()}
                style={{ flex: 1, background: `linear-gradient(135deg, ${accent}, #6C5CE7)`, color: '#fff', border: 'none', borderRadius: 100, padding: '13px', fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: 'pointer', boxShadow: `0 4px 16px ${accent}44` }}>
                🔄 Acak Baru
              </button>
              <button onClick={() => { setShowConfetti(false); setCategorySelectMode(true) }}
                style={{ flex: 1, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: textMain, border: `1.5px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`, borderRadius: 100, padding: '13px', fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: 'pointer' }}>
                📂 Kategori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
