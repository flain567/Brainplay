import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'
import { useHaptics } from '../../hooks/useHaptics.js'
import { useMascot } from '../../context/MascotContext.jsx'
import { WinModal } from '../../components/GameLayout.jsx'
import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
import { CHAPTERS, TOTAL_LEVELS, computeWordCells, getGridBounds } from './anagramLevels.js'

// ─── Constants ───────────────────────────────────────────────────────────────
const WHEEL_SIZE = 280
const WHEEL_RADIUS = 105
const LETTER_SIZE = 56
const STORAGE_KEY = 'bp_anagram_wow_progress'
const JAR_TARGET = 5 // Extra words per jar fill

// ─── Tutorial ────────────────────────────────────────────────────────────────
const TUTORIAL_STEPS = [
  { emoji: '🔀', title: 'Roda Huruf', desc: 'Usap atau ketuk huruf di roda untuk membentuk kata.', tip: 'Tarik jari dari satu huruf ke huruf lain, lalu lepas untuk mengirim.' },
  { emoji: '🧩', title: 'Isi Grid Silang', desc: 'Kata-kata target saling bersilangan di grid. Temukan semua untuk lolos!', tip: 'Huruf yang sama di titik silang terbagi antara dua kata.' },
  { emoji: '🫙', title: 'Kata Ekstra & Jar', desc: 'Temukan kata valid lain untuk mengisi jar bonus. Setiap 5 kata = 10 koin!', tip: 'Gunakan Hint jika buntu — buka 1 huruf di grid.' },
]

// ─── Progress helpers ────────────────────────────────────────────────────────
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return { unlockedLevel: 0, stars: {}, extraJar: 0, totalExtra: 0 }
}
function saveProgress(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch (e) { /* ignore */ }
}

// ─── Get absolute level index ────────────────────────────────────────────────
function getAbsoluteLevel(chapterIdx, levelInChapter) {
  let abs = 0
  for (let i = 0; i < chapterIdx; i++) abs += CHAPTERS[i].levels.length
  return abs + levelInChapter
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function AnagramGame({ onBack, onHome, game }) {
  const tc = useThemeColors()
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins, spendCoins, coins } = useCoins()
  const { vibrateLight, vibrateMedium, vibrateSuccess, vibrateError } = useHaptics()
  const { triggerMascot } = useMascot()

  // ─── Screen: chapters | levels | playing ─────────────────────────────────
  const [screen, setScreen] = useState('chapters')
  const [selChapter, setSelChapter] = useState(0)
  const [selLevelAbs, setSelLevelAbs] = useState(0)
  const [progress, setProgress] = useState(loadProgress)

  // ─── Game state ──────────────────────────────────────────────────────────
  const [foundWords, setFoundWords] = useState([])
  const [extraWordsFound, setExtraWordsFound] = useState([])
  const [selectedIndices, setSelectedIndices] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [currentPointer, setCurrentPointer] = useState(null)
  const [won, setWon] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [shuffledLetters, setShuffledLetters] = useState([])
  const [hintCount, setHintCount] = useState(0)
  const [revealedCells, setRevealedCells] = useState([])
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackColor, setFeedbackColor] = useState('')
  const [feedbackKey, setFeedbackKey] = useState(0)
  const [jarProgress, setJarProgress] = useState(0)
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('bp_tut_anagram_wow'))
  const [revealingWord, setRevealingWord] = useState(null) // word being animated
  const [shuffleKey, setShuffleKey] = useState(0)

  const containerRef = useRef(null)
  const feedbackTimeoutRef = useRef(null)

  // Current level data
  const currentLevelData = useMemo(() => {
    let abs = selLevelAbs, ci = 0
    for (ci = 0; ci < CHAPTERS.length; ci++) {
      if (abs < CHAPTERS[ci].levels.length) return { chapter: CHAPTERS[ci], chapterIdx: ci, levelIdx: abs, level: CHAPTERS[ci].levels[abs] }
      abs -= CHAPTERS[ci].levels.length
    }
    return null
  }, [selLevelAbs])

  const currentLevel = currentLevelData?.level
  const currentChapter = currentLevelData?.chapter

  const dark = tc.dark

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const triggerFeedback = useCallback((text, color) => {
    setFeedbackText(text)
    setFeedbackColor(color)
    setFeedbackKey(p => p + 1)
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = setTimeout(() => setFeedbackText(''), 1500)
  }, [])

  useEffect(() => () => { if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current) }, [])

  // ─── Start level ─────────────────────────────────────────────────────────
  const startLevel = useCallback((absLevel) => {
    let ci = 0, li = absLevel
    for (ci = 0; ci < CHAPTERS.length; ci++) {
      if (li < CHAPTERS[ci].levels.length) break
      li -= CHAPTERS[ci].levels.length
    }
    if (ci >= CHAPTERS.length) return
    const lvl = CHAPTERS[ci].levels[li]

    setSelLevelAbs(absLevel)
    setSelChapter(ci)
    setFoundWords([])
    setExtraWordsFound([])
    setSelectedIndices([])
    setIsDragging(false)
    setCurrentPointer(null)
    setWon(false)
    setShowConfetti(false)
    setRevealedCells([])
    setHintCount(0)
    setFeedbackText('')
    setJarProgress(0)
    setRevealingWord(null)
    setShuffledLetters([...lvl.letters].sort(() => Math.random() - 0.5))
    setScreen('playing')

    triggerMascot({
      text: `Level ${absLevel + 1}! Ada ${lvl.letters.length} huruf — temukan ${lvl.words.length} kata! 💪`,
      actions: ['Siap!']
    }, 'happy')
  }, [triggerMascot])

  // ─── Computed grid ───────────────────────────────────────────────────────
  const gridInfo = useMemo(() => {
    if (!currentLevel) return null
    const bounds = getGridBounds(currentLevel)
    const allCells = new Map()
    currentLevel.words.forEach(w => {
      computeWordCells(w.word, w.dir, w.r, w.c).forEach(cell => {
        const key = `${cell.r},${cell.c}`
        if (!allCells.has(key)) allCells.set(key, { ...cell, words: [] })
        allCells.get(key).words.push(w.word)
      })
    })

    const maxCellSize = 42
    const areaWidth = Math.min(380, typeof window !== 'undefined' ? window.innerWidth - 32 : 320)
    const cellSize = Math.min(maxCellSize, Math.floor(areaWidth / bounds.cols))

    return { bounds, cells: Array.from(allCells.values()), cellSize }
  }, [currentLevel])

  // Cell reveal state
  const getCellState = useCallback((r, c) => {
    if (!currentLevel) return { letter: '', revealed: false }
    // Check found words
    for (const w of currentLevel.words) {
      if (!foundWords.includes(w.word)) continue
      const cells = computeWordCells(w.word, w.dir, w.r, w.c)
      const match = cells.find(cell => cell.r === r && cell.c === c)
      if (match) return { letter: match.letter, revealed: true, isHint: false }
    }
    // Check hints
    const hint = revealedCells.find(rc => rc.r === r && rc.c === c)
    if (hint) return { letter: hint.letter, revealed: true, isHint: true }
    // Hidden
    const allCells = []
    currentLevel.words.forEach(w => {
      computeWordCells(w.word, w.dir, w.r, w.c).forEach(cell => {
        if (cell.r === r && cell.c === c) allCells.push(cell)
      })
    })
    return { letter: allCells[0]?.letter || '', revealed: false }
  }, [currentLevel, foundWords, revealedCells])

  // ─── Wheel geometry ──────────────────────────────────────────────────────
  const wheelPositions = useMemo(() => {
    const center = WHEEL_SIZE / 2
    const count = shuffledLetters.length
    if (count === 0) return []
    return shuffledLetters.map((_, i) => {
      const angle = (i * 2 * Math.PI / count) - Math.PI / 2
      return { x: center + WHEEL_RADIUS * Math.cos(angle), y: center + WHEEL_RADIUS * Math.sin(angle) }
    })
  }, [shuffledLetters])

  // ─── Word formed from selection ──────────────────────────────────────────
  const currentWord = useMemo(() => selectedIndices.map(i => shuffledLetters[i] || '').join(''), [selectedIndices, shuffledLetters])

  // ─── Pointer handlers ────────────────────────────────────────────────────
  const getRelativeCoords = useCallback((cx, cy) => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    return { x: cx - rect.left, y: cy - rect.top }
  }, [])

  const findNearest = useCallback((pos) => {
    return wheelPositions.findIndex(p => {
      const dx = pos.x - p.x, dy = pos.y - p.y
      return Math.sqrt(dx * dx + dy * dy) < LETTER_SIZE * 0.7
    })
  }, [wheelPositions])

  // ─── Submit word ─────────────────────────────────────────────────────────
  const submitWord = useCallback(() => {
    if (currentWord.length < 2) { setSelectedIndices([]); return }
    const word = currentWord.toUpperCase()

    if (foundWords.includes(word) || extraWordsFound.includes(word)) {
      play('mismatch'); vibrateError()
      triggerFeedback('Sudah ditemukan!', '#FD79A8')
      setSelectedIndices([]); return
    }

    // Target word?
    const target = currentLevel?.words.find(w => w.word === word)
    if (target) {
      play('match'); vibrateSuccess()
      const nextFound = [...foundWords, word]
      setFoundWords(nextFound)
      setRevealingWord(word)
      setTimeout(() => setRevealingWord(null), 600)

      if (nextFound.length === currentLevel.words.length) {
        // WIN!
        setTimeout(() => {
          setWon(true)
          setShowConfetti(true)
          play('win')

          const stars = hintCount === 0 ? 3 : hintCount <= 2 ? 2 : 1
          const extraBonus = extraWordsFound.length * 2
          const baseCoins = 10 + Math.floor(selLevelAbs / 10) * 5
          const totalCoins = baseCoins + extraBonus

          earnCoins(totalCoins, `Anagram Level ${selLevelAbs + 1}`)
          reportGameResult({ gameId: 'anagram', difficultyId: 'adventure', won: true, score: (selLevelAbs + 1) * 100 - hintCount * 15 + extraWordsFound.length * 20, stars, timeSec: 0 })

          // Save progress
          setProgress(prev => {
            const next = { ...prev }
            next.stars = { ...prev.stars, [selLevelAbs]: Math.max(stars, prev.stars[selLevelAbs] || 0) }
            if (selLevelAbs >= prev.unlockedLevel) next.unlockedLevel = selLevelAbs + 1
            saveProgress(next)
            return next
          })

          triggerMascot({ text: `Hebat! Level ${selLevelAbs + 1} selesai! 🪙+${totalCoins}`, actions: ['Lanjut!'] }, 'excited')
        }, 700)
      } else {
        triggerMascot({ text: `"${word}" ditemukan! ${currentLevel.words.length - nextFound.length} kata lagi!`, actions: ['Cari lagi!'] }, 'wink')
      }
      triggerFeedback(`✅ ${word}`, '#00B894')
      setSelectedIndices([]); return
    }

    // Extra word?
    if (currentLevel?.extraWords.some(ew => ew.toUpperCase() === word)) {
      play('pop'); vibrateMedium()
      setExtraWordsFound(prev => [...prev, word])
      const newJar = jarProgress + 1
      if (newJar >= JAR_TARGET) {
        earnCoins(10, 'Jar Ekstra Penuh! 🫙')
        setJarProgress(0)
        triggerFeedback('🫙 Jar Penuh! 🪙+10', '#F9A825')
      } else {
        setJarProgress(newJar)
        triggerFeedback(`Kata Ekstra! 🫙 ${newJar}/${JAR_TARGET}`, '#F9A825')
      }
      setProgress(prev => {
        const next = { ...prev, totalExtra: (prev.totalExtra || 0) + 1 }
        saveProgress(next)
        return next
      })
      setSelectedIndices([]); return
    }

    // Invalid
    play('mismatch'); vibrateError()
    triggerFeedback('Bukan kata valid ❌', '#FF6B6B')
    setSelectedIndices([])
  }, [currentWord, foundWords, extraWordsFound, currentLevel, hintCount, selLevelAbs, jarProgress, earnCoins, reportGameResult, play, vibrateSuccess, vibrateError, vibrateMedium, triggerMascot, triggerFeedback])

  // ─── Pointer event handlers ──────────────────────────────────────────────
  const handlePointerStart = useCallback((cx, cy) => {
    if (won) return
    const pos = getRelativeCoords(cx, cy)
    if (!pos) return
    const idx = findNearest(pos)
    if (idx !== -1) {
      setIsDragging(true); setSelectedIndices([idx]); setCurrentPointer(pos)
      play('click'); vibrateLight()
    }
  }, [won, getRelativeCoords, findNearest, play, vibrateLight])

  const handlePointerMove = useCallback((cx, cy) => {
    if (!isDragging) return
    const pos = getRelativeCoords(cx, cy)
    if (!pos) return
    setCurrentPointer(pos)
    const idx = findNearest(pos)
    if (idx !== -1) {
      setSelectedIndices(prev => {
        if (prev.length > 1 && prev[prev.length - 2] === idx) { play('click'); vibrateLight(); return prev.slice(0, -1) }
        if (!prev.includes(idx)) { play('click'); vibrateLight(); return [...prev, idx] }
        return prev
      })
    }
  }, [isDragging, getRelativeCoords, findNearest, play, vibrateLight])

  const handlePointerEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false); setCurrentPointer(null)
    submitWord()
  }, [isDragging, submitWord])

  const handleLetterTap = useCallback((idx) => {
    if (won || isDragging) return
    setSelectedIndices(prev => {
      if (prev.includes(idx)) {
        if (prev[prev.length - 1] === idx) return prev.slice(0, -1)
        return prev
      }
      return [...prev, idx]
    })
    play('click'); vibrateLight()
  }, [won, isDragging, play, vibrateLight])

  // ─── Shuffle ─────────────────────────────────────────────────────────────
  const handleShuffle = useCallback(() => {
    play('flip'); vibrateLight()
    setShuffledLetters(prev => [...prev].sort(() => Math.random() - 0.5))
    setSelectedIndices([])
    setShuffleKey(k => k + 1)
  }, [play, vibrateLight])

  // ─── Hint: reveal a letter ───────────────────────────────────────────────
  const handleHint = useCallback(() => {
    if (coins < 10) {
      play('mismatch'); vibrateError()
      triggerFeedback('Koin tidak cukup! 🪙', '#FF6B6B')
      return
    }
    if (!currentLevel) return

    const unrevealed = []
    currentLevel.words.forEach(w => {
      if (foundWords.includes(w.word)) return
      computeWordCells(w.word, w.dir, w.r, w.c).forEach(cell => {
        const alreadyRevealed = revealedCells.some(rc => rc.r === cell.r && rc.c === cell.c)
        const alreadyFromWord = foundWords.some(fw => {
          const matchW = currentLevel.words.find(t => t.word === fw)
          if (!matchW) return false
          return computeWordCells(matchW.word, matchW.dir, matchW.r, matchW.c).some(c => c.r === cell.r && c.c === cell.c)
        })
        if (!alreadyRevealed && !alreadyFromWord) unrevealed.push(cell)
      })
    })

    if (unrevealed.length === 0) { triggerFeedback('Semua huruf sudah terbuka!', '#00B894'); return }

    spendCoins(10, 'Hint Anagram')
    play('pop'); vibrateMedium()
    setHintCount(p => p + 1)
    const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)]
    setRevealedCells(prev => [...prev, pick])
    triggerFeedback('Huruf Terbuka! 💡', '#F9A825')
  }, [coins, currentLevel, foundWords, revealedCells, spendCoins, play, vibrateMedium, vibrateError, triggerFeedback])

  // ─── Navigation ──────────────────────────────────────────────────────────
  const handleNextLevel = useCallback(() => {
    if (selLevelAbs + 1 < TOTAL_LEVELS) startLevel(selLevelAbs + 1)
    else { setScreen('chapters') }
  }, [selLevelAbs, startLevel])

  const handleTutorialClose = useCallback(() => {
    localStorage.setItem('bp_tut_anagram_wow', 'true')
    setShowTutorial(false)
  }, [])

  // Chapter progress info
  const getChapterProgress = useCallback((chapterIdx) => {
    let startAbs = 0
    for (let i = 0; i < chapterIdx; i++) startAbs += CHAPTERS[i].levels.length
    const count = CHAPTERS[chapterIdx].levels.length
    let completed = 0, totalStars = 0
    for (let i = 0; i < count; i++) {
      const s = progress.stars[startAbs + i]
      if (s) { completed++; totalStars += s }
    }
    const unlocked = progress.unlockedLevel >= startAbs
    return { startAbs, count, completed, totalStars, unlocked, maxStars: count * 3 }
  }, [progress])

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════

  // ─── CHAPTER SELECT ──────────────────────────────────────────────────────
  if (screen === 'chapters') {
    return (
      <div style={{
        minHeight: '100dvh', fontFamily: "'Inter', sans-serif",
        background: dark ? 'linear-gradient(180deg, #0a0a1a 0%, #141428 50%, #1a1a30 100%)' : 'linear-gradient(180deg, #e8f0f8 0%, #d0e0f0 50%, #c0d4e8 100%)',
      }}>
        <style>{globalStyles(dark)}</style>
        {showTutorial && <TutorialModal steps={TUTORIAL_STEPS} onClose={handleTutorialClose} />}

        <div style={{ maxWidth: 500, margin: '0 auto', padding: '16px 16px 100px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={() => { play('click'); onBack() }} className="wow-btn-back">←</button>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: tc.textMain, margin: 0, letterSpacing: -0.5 }}>🔀 Anagram</h1>
              <div style={{ fontSize: 11, color: tc.textMuted, fontWeight: 600, marginTop: 3 }}>
                Words of Wonders Style • {TOTAL_LEVELS} Level
              </div>
            </div>
            <div className="wow-coin-badge">🪙 {coins}</div>
          </div>

          {/* Chapter Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {CHAPTERS.map((ch, ci) => {
              const info = getChapterProgress(ci)
              const isLocked = !info.unlocked
              return (
                <div
                  key={ch.id}
                  onClick={() => { if (!isLocked) { play('click'); vibrateLight(); setSelChapter(ci); setScreen('levels') } }}
                  className={`wow-chapter-card ${isLocked ? 'locked' : ''}`}
                  style={{
                    background: isLocked
                      ? (dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)')
                      : ch.theme.bgScene || ch.theme.gradient,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Scenic overlay */}
                  {!isLocked && ch.theme.bgOverlay && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: ch.theme.bgOverlay,
                      pointerEvents: 'none',
                    }} />
                  )}

                  <div style={{ fontSize: 40, zIndex: 2, filter: isLocked ? 'grayscale(1)' : 'none' }}>
                    {isLocked ? '🔒' : ch.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, zIndex: 2 }}>
                    <div style={{
                      fontFamily: "'Fredoka One',cursive", fontSize: 17,
                      color: isLocked ? tc.textMuted : '#FFF',
                      textShadow: isLocked ? 'none' : '0 2px 8px rgba(0,0,0,0.5)',
                    }}>
                      {ch.name}
                    </div>
                    <div style={{
                      fontSize: 11, marginTop: 2,
                      color: isLocked ? tc.textMuted : 'rgba(255,255,255,0.85)',
                      textShadow: isLocked ? 'none' : '0 1px 4px rgba(0,0,0,0.4)',
                    }}>
                      {ch.description}
                    </div>
                    {!isLocked && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 10, fontWeight: 700 }}>
                        <span style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', padding: '3px 10px', borderRadius: 8, color: '#FFF' }}>
                          {info.completed}/{info.count} ✅
                        </span>
                        <span style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', padding: '3px 10px', borderRadius: 8, color: '#FFD700' }}>
                          ⭐ {info.totalStars}/{info.maxStars}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 22, color: isLocked ? tc.textMuted : '#FFF', opacity: 0.7, zIndex: 2, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                    {isLocked ? '' : '›'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Total progress */}
          <div style={{
            marginTop: 24,
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            backdropFilter: 'blur(12px)',
            border: `1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            borderRadius: 20, padding: '14px 20px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: tc.textMuted, marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Total Progress
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: tc.textMain }}>{progress.unlockedLevel}</div>
                <div style={{ fontSize: 9, color: tc.textMuted, fontWeight: 700 }}>Level</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: '#FFD700' }}>
                  {Object.values(progress.stars).reduce((s, v) => s + v, 0)}
                </div>
                <div style={{ fontSize: 9, color: tc.textMuted, fontWeight: 700 }}>⭐ Bintang</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: '#F9A825' }}>{progress.totalExtra || 0}</div>
                <div style={{ fontSize: 9, color: tc.textMuted, fontWeight: 700 }}>🫙 Ekstra</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── LEVEL SELECT ────────────────────────────────────────────────────────
  if (screen === 'levels') {
    const ch = CHAPTERS[selChapter]
    const info = getChapterProgress(selChapter)
    const theme = ch.theme

    return (
      <div style={{
        minHeight: '100dvh', fontFamily: "'Inter', sans-serif",
        background: theme.bgScene || theme.gradient,
        position: 'relative',
      }}>
        {/* Scenic overlay */}
        {theme.bgOverlay && (
          <div style={{ position: 'absolute', inset: 0, background: theme.bgOverlay, pointerEvents: 'none' }} />
        )}

        <style>{globalStyles(dark)}</style>

        <div style={{ maxWidth: 500, margin: '0 auto', padding: '16px 16px 100px', position: 'relative', zIndex: 2 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button onClick={() => { play('click'); setScreen('chapters') }} className="wow-btn-back" style={{
              background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.15)', color: '#FFF',
            }}>←</button>
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontFamily: "'Fredoka One',cursive", fontSize: 22, color: '#FFF', margin: 0,
                textShadow: '0 2px 10px rgba(0,0,0,0.4)',
              }}>
                {ch.emoji} {ch.name}
              </h1>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                {info.completed}/{info.count} Level • ⭐ {info.totalStars}/{info.maxStars}
              </div>
            </div>
            <div className="wow-coin-badge" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(249,168,37,0.4)' }}>
              🪙 {coins}
            </div>
          </div>

          {/* Chapter banner */}
          <div style={{
            background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(12px)',
            borderRadius: 20, padding: '20px 18px',
            marginBottom: 24, position: 'relative', overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: 0.15, filter: 'blur(2px)' }}>{ch.emoji}</div>
            <div style={{
              fontFamily: "'Fredoka One',cursive", fontSize: 15, color: '#FFF',
              marginBottom: 4, textShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}>
              Chapter {selChapter + 1}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{ch.description}</div>
            {/* Progress bar */}
            <div style={{ marginTop: 14, background: 'rgba(0,0,0,0.3)', borderRadius: 100, height: 8, overflow: 'hidden' }}>
              <div style={{
                width: `${(info.completed / info.count) * 100}%`, height: '100%',
                background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}CC)`,
                borderRadius: 100, transition: 'width 0.5s',
                boxShadow: `0 0 12px ${theme.accent}66`,
              }} />
            </div>
          </div>

          {/* Level path */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            {ch.levels.map((_, li) => {
              const absIdx = info.startAbs + li
              const isUnlocked = absIdx <= progress.unlockedLevel
              const isCompleted = !!progress.stars[absIdx]
              const isCurrent = absIdx === progress.unlockedLevel
              const stars = progress.stars[absIdx] || 0

              return (
                <div key={li} style={{ width: '100%', position: 'relative' }}>
                  {/* Connecting line */}
                  {li > 0 && (
                    <div style={{
                      position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                      width: 3, height: 16,
                      background: isUnlocked
                        ? `linear-gradient(180deg, ${theme.accent}88, ${theme.accent})`
                        : 'rgba(255,255,255,0.1)',
                      borderRadius: 2,
                    }} />
                  )}

                  {/* Level node */}
                  <div style={{
                    display: 'flex', justifyContent: 'center',
                    padding: '10px 0',
                    marginLeft: li % 3 === 0 ? '-25%' : li % 3 === 1 ? '0%' : '25%',
                  }}>
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        onClick={() => { if (isUnlocked) { play('click'); vibrateLight(); startLevel(absIdx) } }}
                        className={`wow-level-node ${isCurrent ? 'current' : ''} ${!isUnlocked ? 'locked' : ''}`}
                        style={{
                          background: !isUnlocked ? 'rgba(255,255,255,0.06)'
                            : isCompleted ? theme.accent
                            : `linear-gradient(135deg, ${theme.accent}CC, ${theme.accent})`,
                          borderColor: !isUnlocked ? 'rgba(255,255,255,0.1)' : theme.accent,
                          cursor: isUnlocked ? 'pointer' : 'not-allowed',
                          boxShadow: isCurrent
                            ? `0 0 24px ${theme.accent}88, 0 0 48px ${theme.accent}44`
                            : isCompleted
                            ? `0 4px 16px ${theme.accent}44`
                            : 'none',
                        }}
                      >
                        {!isUnlocked ? (
                          <span style={{ fontSize: 16, opacity: 0.4 }}>🔒</span>
                        ) : (
                          <span style={{
                            fontFamily: "'Fredoka One',cursive", fontSize: 17,
                            color: '#FFF',
                            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                          }}>
                            {li + 1}
                          </span>
                        )}
                      </div>

                      {/* Stars */}
                      {isCompleted && (
                        <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                          {[1, 2, 3].map(s => (
                            <span key={s} style={{
                              fontSize: 12, opacity: s <= stars ? 1 : 0.2,
                              filter: s <= stars ? 'drop-shadow(0 1px 3px rgba(255,215,0,0.6))' : 'none',
                            }}>⭐</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ─── PLAYING SCREEN ──────────────────────────────────────────────────────
  if (!currentLevel || !gridInfo) return null
  const theme = currentChapter?.theme || CHAPTERS[0].theme

  return (
    <div style={{
      minHeight: '100dvh', fontFamily: "'Inter', sans-serif",
      background: theme.bgScene || theme.gradient,
      position: 'relative',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Scenic overlay */}
      {theme.bgOverlay && (
        <div style={{ position: 'absolute', inset: 0, background: theme.bgOverlay, pointerEvents: 'none', zIndex: 0 }} />
      )}

      <style>{globalStyles(dark)}</style>
      {showConfetti && <Confetti active={showConfetti} />}

      {/* ── Floating Header ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px 8px',
      }}>
        <button onClick={() => { play('click'); setScreen('levels') }} className="wow-btn-back" style={{
          background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)',
          border: '2px solid rgba(255,255,255,0.12)', color: '#FFF',
        }}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: "'Fredoka One',cursive", fontSize: 18, color: '#FFF', margin: 0,
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}>
            {currentChapter?.emoji} Level {selLevelAbs + 1}
          </h1>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            {currentChapter?.name} • {foundWords.length}/{currentLevel.words.length} kata
          </div>
        </div>

        {/* Jar */}
        <div className="wow-jar" title={`Kata Ekstra: ${jarProgress}/${JAR_TARGET}`}>
          <span style={{ fontSize: 20 }}>🫙</span>
          <div className="wow-jar-fill" style={{ height: `${(jarProgress / JAR_TARGET) * 100}%`, background: '#F9A825' }} />
          <span style={{ fontSize: 8, fontWeight: 800, color: '#F9A825', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{jarProgress}/{JAR_TARGET}</span>
        </div>

        {/* Coins */}
        <div className="wow-coin-badge" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(249,168,37,0.4)' }}>
          🪙 {coins}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ padding: '0 14px', position: 'relative', zIndex: 10, marginBottom: 4 }}>
        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 100, height: 5, overflow: 'hidden' }}>
          <div style={{
            width: `${(foundWords.length / currentLevel.words.length) * 100}%`, height: '100%',
            background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}CC)`,
            borderRadius: 100, transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: `0 0 10px ${theme.accent}66`,
          }} />
        </div>
      </div>

      {/* ── Crossword Grid ── */}
      <div style={{
        flex: '1 1 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px 0', position: 'relative', zIndex: 5,
        minHeight: 120,
      }}>
        <div style={{
          position: 'relative',
          width: gridInfo.bounds.cols * gridInfo.cellSize,
          height: gridInfo.bounds.rows * gridInfo.cellSize,
        }}>
          {gridInfo.cells.map((cell) => {
            const state = getCellState(cell.r, cell.c)
            const left = (cell.c - gridInfo.bounds.minC) * gridInfo.cellSize
            const top = (cell.r - gridInfo.bounds.minR) * gridInfo.cellSize
            const revealingWordData = revealingWord && currentLevel.words.find(w => w.word === revealingWord)
            const isPartOfRevealing = revealingWordData &&
              computeWordCells(revealingWord, revealingWordData.dir, revealingWordData.r, revealingWordData.c)
                .some(c => c.r === cell.r && c.c === cell.c)

            // Cascade delay for revealing animation
            let cascadeDelay = 0
            if (isPartOfRevealing) {
              const revCells = computeWordCells(revealingWord, revealingWordData.dir, revealingWordData.r, revealingWordData.c)
              const cellIdx = revCells.findIndex(c => c.r === cell.r && c.c === cell.c)
              cascadeDelay = cellIdx * 0.08
            }

            return (
              <div
                key={`${cell.r}-${cell.c}`}
                style={{
                  position: 'absolute',
                  left: left + 2, top: top + 2,
                  width: gridInfo.cellSize - 4, height: gridInfo.cellSize - 4,
                  borderRadius: 6,
                  border: state.revealed
                    ? `2.5px solid ${state.isHint ? '#F9A825' : theme.tileBorder || theme.accent}`
                    : '2px solid rgba(255,255,255,0.12)',
                  background: state.revealed
                    ? (state.isHint
                      ? 'rgba(249,168,37,0.2)'
                      : (theme.tileColor || theme.accent))
                    : 'rgba(0,0,0,0.3)',
                  backdropFilter: state.revealed ? 'none' : 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: gridInfo.cellSize * 0.48,
                  fontWeight: 700,
                  color: state.revealed
                    ? (state.isHint ? '#F9A825' : (theme.tileText || '#FFF'))
                    : 'transparent',
                  transition: 'all 0.3s cubic-bezier(0.175,0.885,0.32,1.275)',
                  animation: isPartOfRevealing ? `wowCellReveal 0.5s ${cascadeDelay}s cubic-bezier(0.175,0.885,0.32,1.275) both` : 'none',
                  boxShadow: state.revealed
                    ? `0 3px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`
                    : 'inset 0 1px 3px rgba(0,0,0,0.2)',
                  textShadow: state.revealed ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {state.letter}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Current Word Preview ── */}
      <div style={{
        height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 10,
      }}>
        {currentWord ? (
          <div className="wow-word-preview" style={{
            background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}CC)`,
            boxShadow: `0 6px 24px ${theme.accent}55, 0 2px 8px rgba(0,0,0,0.2)`,
            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}>
            {currentWord}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            Hubungkan huruf untuk membentuk kata
          </div>
        )}
        {feedbackText && (
          <div key={feedbackKey} className="wow-feedback" style={{ background: feedbackColor }}>
            {feedbackText}
          </div>
        )}
      </div>

      {/* ── Tap Controls ── */}
      {selectedIndices.length > 0 && !isDragging && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 6, position: 'relative', zIndex: 10 }}>
          <button onClick={() => { play('click'); setSelectedIndices([]) }}
            className="wow-tap-btn" style={{
              background: 'rgba(239,68,68,0.15)', backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(239,68,68,0.4)', color: '#FF6B6B',
            }}>
            Reset ❌
          </button>
          <button onClick={() => { play('click'); submitWord() }}
            className="wow-tap-btn" style={{
              background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}CC)`,
              border: 'none', color: '#FFF',
              boxShadow: `0 4px 14px ${theme.accent}44`,
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}>
            Kirim ✔️
          </button>
        </div>
      )}

      {/* ── Wheel + Controls ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
        padding: '8px 0 24px', position: 'relative', zIndex: 10,
        flexShrink: 0,
      }}>
        {/* Shuffle */}
        <button onClick={handleShuffle} disabled={won} className="wow-side-btn" style={{
          opacity: won ? 0.4 : 1,
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
          border: '2px solid rgba(255,255,255,0.12)', color: '#FFF',
        }}>🔀</button>

        {/* Wheel */}
        <div
          ref={containerRef}
          onMouseDown={e => handlePointerStart(e.clientX, e.clientY)}
          onMouseMove={e => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerEnd}
          onMouseLeave={() => { if (isDragging) handlePointerEnd() }}
          onTouchStart={e => { if (e.touches.length > 0) handlePointerStart(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchMove={e => { e.preventDefault(); if (e.touches.length > 0) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchEnd={handlePointerEnd}
          className="wow-wheel"
          style={{
            width: WHEEL_SIZE, height: WHEEL_SIZE,
            background: theme.wheelBg || (dark ? '#161B30' : '#EDF0F7'),
            border: `4px solid ${theme.wheelBorder || (dark ? '#252C48' : '#D0DBEB')}`,
          }}
        >
          {/* Center glow ring */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: WHEEL_SIZE * 0.45, height: WHEEL_SIZE * 0.45,
            borderRadius: '50%',
            border: `2px solid ${theme.accent}22`,
            pointerEvents: 'none', zIndex: 1,
          }} />

          {/* Center submit */}
          <div
            onClick={() => { if (selectedIndices.length > 0) submitWord() }}
            className="wow-wheel-center"
            style={{
              background: selectedIndices.length > 0
                ? `linear-gradient(135deg, ${theme.accent}, ${theme.accent}CC)`
                : 'rgba(255,255,255,0.06)',
              border: `3px solid ${selectedIndices.length > 0 ? `${theme.accent}88` : 'rgba(255,255,255,0.1)'}`,
              color: selectedIndices.length > 0 ? '#FFF' : 'rgba(255,255,255,0.3)',
              boxShadow: selectedIndices.length > 0 ? `0 4px 16px ${theme.accent}66, 0 0 30px ${theme.accent}33` : 'none',
              cursor: selectedIndices.length > 0 ? 'pointer' : 'default',
            }}
          >
            {selectedIndices.length > 0 ? '✔️' : '🧠'}
          </div>

          {/* SVG lines */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
            <defs>
              <filter id="wow-line-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <linearGradient id="wow-line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={theme.accent} stopOpacity="0.8" />
                <stop offset="100%" stopColor={theme.accent} stopOpacity="1" />
              </linearGradient>
            </defs>
            {selectedIndices.map((idx, i) => {
              if (i === 0 || !wheelPositions[selectedIndices[i - 1]] || !wheelPositions[idx]) return null
              const p1 = wheelPositions[selectedIndices[i - 1]]
              const p2 = wheelPositions[idx]
              return (
                <line key={`l-${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={theme.accent} strokeWidth="8" strokeLinecap="round" filter="url(#wow-line-glow)" />
              )
            })}
            {isDragging && selectedIndices.length > 0 && currentPointer && wheelPositions[selectedIndices[selectedIndices.length - 1]] && (
              <line
                x1={wheelPositions[selectedIndices[selectedIndices.length - 1]].x}
                y1={wheelPositions[selectedIndices[selectedIndices.length - 1]].y}
                x2={currentPointer.x} y2={currentPointer.y}
                stroke={theme.accent} strokeWidth="5" strokeDasharray="8,5" strokeLinecap="round" opacity={0.5}
                filter="url(#wow-line-glow)"
              />
            )}
          </svg>

          {/* Letter buttons */}
          {shuffledLetters.map((letter, i) => {
            const pos = wheelPositions[i]
            if (!pos) return null
            const isSelected = selectedIndices.includes(i)
            const selOrder = isSelected ? selectedIndices.indexOf(i) + 1 : 0
            return (
              <div key={`lb-${shuffleKey}-${i}`}
                onClick={() => handleLetterTap(i)}
                className="wow-letter-btn"
                style={{
                  position: 'absolute',
                  left: pos.x - LETTER_SIZE / 2, top: pos.y - LETTER_SIZE / 2,
                  width: LETTER_SIZE, height: LETTER_SIZE,
                  background: isSelected
                    ? `linear-gradient(135deg, ${theme.accent}, ${theme.accent}DD)`
                    : 'rgba(255,255,255,0.12)',
                  color: isSelected ? '#FFF' : '#FFF',
                  border: `3px solid ${isSelected ? `${theme.accent}` : 'rgba(255,255,255,0.2)'}`,
                  boxShadow: isSelected
                    ? `0 0 20px ${theme.accent}88, 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)`
                    : '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
                  transform: isSelected ? 'scale(1.18)' : 'scale(1)',
                  zIndex: isSelected ? 6 : 4,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  backdropFilter: isSelected ? 'none' : 'blur(8px)',
                }}
              >
                {letter}
                {isSelected && (
                  <span className="wow-letter-order" style={{
                    background: '#FFF',
                    color: theme.accent,
                    boxShadow: `0 2px 6px rgba(0,0,0,0.2)`,
                  }}>
                    {selOrder}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Hint */}
        <button onClick={handleHint} disabled={won} className="wow-side-btn" style={{
          opacity: won ? 0.4 : 1, position: 'relative',
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
          border: '2px solid rgba(255,255,255,0.12)', color: '#FFF',
        }}>
          💡
          <span style={{
            position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
            fontSize: 8, color: '#F9A825', fontWeight: 800, whiteSpace: 'nowrap',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}>🪙10</span>
        </button>
      </div>

      {/* ── Extra Words ── */}
      {extraWordsFound.length > 0 && (
        <div style={{
          margin: '0 14px 16px', padding: '8px 14px',
          background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)',
          border: '1.5px solid rgba(249,168,37,0.25)', borderRadius: 14,
          position: 'relative', zIndex: 10,
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#F9A825', marginBottom: 4, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            ⭐ KATA EKSTRA ({extraWordsFound.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {extraWordsFound.map(w => (
              <span key={w} className="wow-extra-chip">{w}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Win Modal ── */}
      {won && (
        <WinModal
          emoji="🏆"
          title={`Level ${selLevelAbs + 1} Selesai!`}
          subtitle={`${currentChapter?.emoji} ${currentChapter?.name}`}
          diffLabel={`Chapter ${(currentLevelData?.chapterIdx || 0) + 1}`}
          stats={[
            { label: 'Hint', value: hintCount, color: '#F9A825' },
            { label: 'Ekstra', value: extraWordsFound.length, color: '#A29BFE' },
          ]}
          stars={hintCount === 0 ? 3 : hintCount <= 2 ? 2 : 1}
          coinReward={10 + Math.floor(selLevelAbs / 10) * 5 + extraWordsFound.length * 2}
          onRestart={selLevelAbs + 1 < TOTAL_LEVELS ? handleNextLevel : () => setScreen('chapters')}
          onBack={() => setScreen('levels')}
          onHome={onHome}
          dark={dark}
          gameColor={theme.accent}
          restartLabel={selLevelAbs + 1 < TOTAL_LEVELS ? '➡️ Level Berikutnya' : '🏠 Kembali'}
          backLabel="📋 Pilih Level"
        />
      )}
    </div>
  )
}

// ─── Global Styles ─────────────────────────────────────────────────────────
function globalStyles() {
  return `
    @keyframes wowCellReveal {
      0% { transform: scale(0.3) rotateY(90deg); opacity: 0; }
      50% { transform: scale(1.15) rotateY(0deg); opacity: 1; }
      100% { transform: scale(1) rotateY(0deg); opacity: 1; }
    }
    @keyframes wowCellPop {
      0% { transform: scale(0.5); opacity: 0; }
      60% { transform: scale(1.2); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes wowPulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,215,0,0.4); }
      50% { transform: scale(1.1); box-shadow: 0 0 24px 6px rgba(255,215,0,0.3); }
    }
    @keyframes wowBubble {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.06); }
    }
    @keyframes wowFadeUp {
      0% { opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.9); }
      100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
    }
    @keyframes wowShimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes wowFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
    .wow-btn-back {
      background: rgba(0,0,0,0.2); border: 2px solid rgba(255,255,255,0.15);
      border-radius: 14px; padding: 8px 14px; font-size: 18px; cursor: pointer;
      color: #FFF; transition: all 0.15s; backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .wow-btn-back:active { transform: scale(0.92); }
    .wow-coin-badge {
      background: rgba(0,0,0,0.25); backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1.5px solid rgba(249,168,37,0.35); border-radius: 12px;
      padding: 5px 12px; font-family: 'Fredoka One', cursive;
      font-size: 13px; color: #F9A825; font-weight: 700;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    .wow-chapter-card {
      display: flex; align-items: center; gap: 14; padding: 18px 20px;
      border-radius: 20px; transition: all 0.2s; position: relative; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
    .wow-chapter-card:not(.locked):hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
    .wow-chapter-card:not(.locked):active { transform: scale(0.98); }
    .wow-chapter-card.locked { opacity: 0.55; }
    .wow-level-node {
      width: 56px; height: 56px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 3px solid; transition: all 0.25s;
      position: relative;
    }
    .wow-level-node.current { animation: wowPulse 2s ease infinite; }
    .wow-level-node.locked { border-width: 2px; }
    .wow-level-node:not(.locked):active { transform: scale(0.9); }
    .wow-cell-revealed { animation: wowCellReveal 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }
    .wow-word-chip {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 3px 8px; border-radius: 7px;
      font-family: 'Fredoka One', cursive; font-size: 11px;
      transition: all 0.2s;
    }
    .wow-word-preview {
      color: #FFF; font-family: 'Fredoka One', cursive; font-size: 20px;
      padding: 8px 24px; border-radius: 100px; letter-spacing: 3px;
      animation: wowBubble 1.2s infinite;
    }
    .wow-feedback {
      position: absolute; left: 50%; transform: translateX(-50%);
      color: #FFF; font-weight: 800; font-size: 12px;
      padding: 6px 16px; border-radius: 100px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      animation: wowFadeUp 0.3s ease forwards; z-index: 10;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3);
      white-space: nowrap;
    }
    .wow-tap-btn {
      padding: 7px 16px; border-radius: 12px; font-size: 12px;
      font-weight: 700; cursor: pointer; transition: all 0.15s;
    }
    .wow-tap-btn:active { transform: scale(0.93); }
    .wow-side-btn {
      width: 50px; height: 50px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.25); color: #FFF;
      font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: all 0.15s;
    }
    .wow-side-btn:active { transform: scale(0.88); }
    .wow-wheel {
      border-radius: 50%; position: relative; touch-action: none;
      box-shadow: 0 8px 32px rgba(0,0,0,0.35), inset 0 2px 8px rgba(255,255,255,0.05);
      user-select: none; flex-shrink: 0;
    }
    .wow-wheel-center {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
      width: 58px; height: 58px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Fredoka One', cursive; font-size: 20px;
      transition: all 0.25s cubic-bezier(0.175,0.885,0.32,1.275); z-index: 5;
    }
    .wow-letter-btn {
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-family: 'Fredoka One', cursive; font-size: 22px;
      transition: all 0.2s cubic-bezier(0.175,0.885,0.32,1.275);
      user-select: none; -webkit-tap-highlight-color: transparent; cursor: pointer;
    }
    .wow-letter-order {
      position: absolute; top: -5px; right: -5px;
      width: 20px; height: 20px; border-radius: 50%;
      font-size: 10px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
    .wow-jar {
      position: relative; display: flex; flex-direction: column; align-items: center;
      gap: 2px; width: 40px;
    }
    .wow-jar-fill {
      position: absolute; bottom: 22px; left: 6px; right: 6px;
      border-radius: 4px; transition: height 0.5s cubic-bezier(0.34,1.56,0.64,1);
      opacity: 0.35;
    }
    .wow-extra-chip {
      background: rgba(249,168,37,0.15);
      color: #F9A825; font-family: 'Fredoka One', cursive;
      font-size: 10px; padding: 3px 8px; border-radius: 6px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
  `
}
