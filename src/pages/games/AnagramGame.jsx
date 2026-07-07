import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'
import { useHaptics } from '../../hooks/useHaptics.js'
import { useMascot } from '../../context/MascotContext.jsx'
import { WinModal, LoseModal } from '../../components/GameLayout.jsx'
import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

// ─── Word Database — Fully verified crossword grids ─────────────────────────
// Rules: 1) Shared cells MUST have the same letter from both words
//        2) All coordinates must be >= 0
//        3) Each word must spell correctly left-to-right or top-to-bottom
//
// Grid layout notation:
//   Horizontal word: cells go left→right in same row
//   Vertical word:   cells go top→bottom in same column
//   Intersection:    the letter at (r,c) must match for BOTH words

const ANAGRAM_LEVELS = {
  easy: [
    // ── Level 1: A K U ──
    // Grid:      c0  c1  c2
    //   r0        .   K   .
    //   r1        A   K   U      ← AKU horizontal (A at c0, K at c1, U at c2)
    //   r2        .   A   .
    //                 ↑
    //          KAU vertical (K at r0, A at r1... wait — AKU has K at r1c1, KAU needs A at r1c1)
    // FIX: Use simpler non-intersecting layout
    {
      letters: ['A', 'K', 'U'],
      targetWords: [
        { word: 'AKU', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] },
        { word: 'KAU', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }] }
      ],
      extraWords: ['KUA']
    },
    // ── Level 2: A P I ──
    {
      letters: ['A', 'P', 'I'],
      targetWords: [
        { word: 'API', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] },
        { word: 'IPA', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }] }
      ],
      extraWords: ['PA']
    },
    // ── Level 3: I B U ──
    {
      letters: ['I', 'B', 'U'],
      targetWords: [
        { word: 'IBU', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] },
        { word: 'UBI', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }] }
      ],
      extraWords: ['BUI']
    },
    // ── Level 4: A I R ──
    {
      letters: ['A', 'I', 'R'],
      targetWords: [
        { word: 'AIR', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] },
        { word: 'RIA', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }] }
      ],
      extraWords: ['ARI', 'IRA', 'RA']
    },
    // ── Level 5: A T U R ──
    // Grid:      c0  c1  c2  c3
    //   r0        A   T   U   R   ← ATUR horizontal
    //   r1        .   .   .   .
    //   r2        R   A   T   U   ← RATU horizontal
    //   r3        .   .   .   .
    //   r4        T   U   A   .   ← TUA horizontal
    {
      letters: ['A', 'T', 'U', 'R'],
      targetWords: [
        { word: 'ATUR', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }] },
        { word: 'RATU', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }] },
        { word: 'TUA', cells: [{ r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 }] }
      ],
      extraWords: ['RAUT', 'TAU', 'TA', 'UT']
    },
    // ── Level 6: B A K ──
    {
      letters: ['B', 'A', 'K'],
      targetWords: [
        { word: 'BAK', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] },
        { word: 'KAB', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }] }
      ],
      extraWords: ['AB', 'BA', 'AK']
    },
    // ── Level 7: M A U ──
    {
      letters: ['M', 'A', 'U'],
      targetWords: [
        { word: 'MAU', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] },
        { word: 'AMU', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }] }
      ],
      extraWords: ['MUA', 'UM']
    },
    // ── Level 8: D U A ──
    {
      letters: ['D', 'U', 'A'],
      targetWords: [
        { word: 'DUA', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] },
        { word: 'ADU', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }] }
      ],
      extraWords: ['DA', 'UD']
    },
    // ── Level 9: G A S ──
    {
      letters: ['G', 'A', 'S'],
      targetWords: [
        { word: 'GAS', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] },
        { word: 'SAG', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }] }
      ],
      extraWords: ['AG']
    },
    // ── Level 10: T A K ──
    {
      letters: ['T', 'A', 'K'],
      targetWords: [
        { word: 'TAK', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] },
        { word: 'KAT', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }] }
      ],
      extraWords: ['AT', 'AK']
    },
  ],
  medium: [
    // ── Level 1: K A S U R ──
    {
      letters: ['K', 'A', 'S', 'U', 'R'],
      targetWords: [
        { word: 'KASUR', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 }] },
        { word: 'RUSAK', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }] },
        { word: 'RUSA', cells: [{ r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 }, { r: 4, c: 3 }] }
      ],
      extraWords: ['KAS', 'SUR', 'KAU', 'SAR', 'URAS']
    },
    // ── Level 2: M A K A N ──
    {
      letters: ['M', 'A', 'K', 'A', 'N'],
      targetWords: [
        { word: 'MAKAN', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 }] },
        { word: 'ANAK', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }] },
        { word: 'NAMA', cells: [{ r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 }, { r: 4, c: 3 }] },
        { word: 'MAKA', cells: [{ r: 6, c: 0 }, { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 6, c: 3 }] }
      ],
      extraWords: ['AMAN', 'MANA', 'KAN', 'NAK', 'ANA']
    },
    // ── Level 3: B U N G A ──
    {
      letters: ['B', 'U', 'N', 'G', 'A'],
      targetWords: [
        { word: 'BUNGA', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 }] },
        { word: 'UANG', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }] },
        { word: 'GUNA', cells: [{ r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 }, { r: 4, c: 3 }] },
        { word: 'BAU', cells: [{ r: 6, c: 0 }, { r: 6, c: 1 }, { r: 6, c: 2 }] }
      ],
      extraWords: ['BUNG', 'ABU', 'BAN', 'GUA']
    },
    // ── Level 4: P I N T U ──
    {
      letters: ['P', 'I', 'N', 'T', 'U'],
      targetWords: [
        { word: 'PINTU', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 }] },
        { word: 'UNIT', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }] },
        { word: 'TIPU', cells: [{ r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 }, { r: 4, c: 3 }] },
        { word: 'PIN', cells: [{ r: 6, c: 0 }, { r: 6, c: 1 }, { r: 6, c: 2 }] }
      ],
      extraWords: ['PUN', 'NIT', 'TIP']
    },
    // ── Level 5: D U N I A ──
    {
      letters: ['D', 'U', 'N', 'I', 'A'],
      targetWords: [
        { word: 'DUNIA', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 }] },
        { word: 'DAUN', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }] },
        { word: 'UNDI', cells: [{ r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 }, { r: 4, c: 3 }] }
      ],
      extraWords: ['UNI', 'ADI', 'DUA', 'NIA', 'ANI']
    },
  ],
  hard: [
    // ── Level 1: T U K A R ──
    {
      letters: ['T', 'U', 'K', 'A', 'R'],
      targetWords: [
        { word: 'TUKAR', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 }] },
        { word: 'KARTU', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }] },
        { word: 'RATU', cells: [{ r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 }, { r: 4, c: 3 }] },
        { word: 'ATUR', cells: [{ r: 6, c: 0 }, { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 6, c: 3 }] },
        { word: 'TUA', cells: [{ r: 8, c: 0 }, { r: 8, c: 1 }, { r: 8, c: 2 }] }
      ],
      extraWords: ['RAUT', 'TAK', 'KUR', 'TAR']
    },
    // ── Level 2: K E R T A S ──
    {
      letters: ['K', 'E', 'R', 'T', 'A', 'S'],
      targetWords: [
        { word: 'KERTAS', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 }, { r: 0, c: 5 }] },
        { word: 'KERAS', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }] },
        { word: 'SERAT', cells: [{ r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 }, { r: 4, c: 3 }, { r: 4, c: 4 }] },
        { word: 'TERA', cells: [{ r: 6, c: 0 }, { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 6, c: 3 }] }
      ],
      extraWords: ['KERA', 'RAK', 'SET', 'ERA', 'TAS', 'KAS', 'ETA', 'SATE']
    },
    // ── Level 3: B A N G S A ──
    {
      letters: ['B', 'A', 'N', 'G', 'S', 'A'],
      targetWords: [
        { word: 'BANGSA', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 }, { r: 0, c: 5 }] },
        { word: 'ABANG', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }] },
        { word: 'SANG', cells: [{ r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 }, { r: 4, c: 3 }] },
        { word: 'BASA', cells: [{ r: 6, c: 0 }, { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 6, c: 3 }] }
      ],
      extraWords: ['BAN', 'GAS', 'ASA', 'ANA', 'NASA']
    },
  ]
}

// ─── Tutorial Steps ──────────────────────────────────────────────────────────
const ANAGRAM_TUTORIAL = [
  { emoji: '🔀', title: 'Anagram Wheel', desc: 'Hubungkan huruf-huruf pada roda untuk membentuk kata tersembunyi!', tip: 'Usap kursor/jari antar huruf untuk menyambungkannya, atau ketuk satu per satu.' },
  { emoji: '🧩', title: 'Isi Teka-Teki Grid', desc: 'Targetkan kata-kata yang cocok dengan kisi kotak di atas untuk lolos level.', tip: 'Garis neon bercahaya akan digambar untuk memperlihatkan hubungan huruf.' },
  { emoji: '🪙', title: 'Kata Ekstra & Hint', desc: 'Temukan kata valid lain di luar grid untuk mendapatkan Bonus Koin ekstra!', tip: 'Gunakan tombol Hint jika kamu buntu. Setiap hint akan membuka satu huruf kosong.' }
]

// ─── Helper: get cell letter for a coordinate ────────────────────────────────
function getCellLetterFromLevel(level, foundWords, revealedCells, r, c) {
  // 1. Check if revealed by matching target word
  for (const tw of level.targetWords) {
    if (foundWords.includes(tw.word)) {
      const idx = tw.cells.findIndex(cell => cell.r === r && cell.c === c)
      if (idx !== -1) return { letter: tw.word[idx], revealed: true }
    }
  }

  // 2. Check if revealed by hint
  const hintMatch = revealedCells.find(rc => rc.r === r && rc.c === c)
  if (hintMatch) return { letter: hintMatch.letter, revealed: true, isHint: true }

  // 3. Find target letter (but keep hidden)
  for (const tw of level.targetWords) {
    const idx = tw.cells.findIndex(cell => cell.r === r && cell.c === c)
    if (idx !== -1) return { letter: tw.word[idx], revealed: false }
  }

  return null
}

export default function AnagramGame({ onBack, onHome, game, difficulty }) {
  const tc = useThemeColors()
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins, spendCoins, coins } = useCoins()
  const { vibrateLight, vibrateMedium, vibrateSuccess, vibrateError } = useHaptics()
  const { triggerMascot } = useMascot()

  const diffId = difficulty?.id || 'easy'
  const levels = ANAGRAM_LEVELS[diffId] || ANAGRAM_LEVELS.easy

  // ─── Game States ───────────────────────────────────────────────────────────
  const [levelIndex, setLevelIndex] = useState(0)
  const [foundWords, setFoundWords] = useState([])
  const [extraWordsFound, setExtraWordsFound] = useState([])
  const [selectedIndices, setSelectedIndices] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [currentPointer, setCurrentPointer] = useState(null)
  
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [won, setWon] = useState(false)
  const [failed, setFailed] = useState(false)

  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('bp_tut_anagram'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [shuffledLetters, setShuffledLetters] = useState([])
  const [hintCount, setHintCount] = useState(0)
  const [revealedCells, setRevealedCells] = useState([])
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackColor, setFeedbackColor] = useState('')
  const [feedbackKey, setFeedbackKey] = useState(0)
  const [totalExtraCoins, setTotalExtraCoins] = useState(0)

  const containerRef = useRef(null)
  const timerRef = useRef(null)
  const feedbackTimeoutRef = useRef(null)

  const currentLevel = levels[levelIndex % levels.length]

  // Initialize level
  const startLevel = useCallback((index) => {
    const lvl = levels[index % levels.length]
    setFoundWords([])
    setExtraWordsFound([])
    setSelectedIndices([])
    setIsDragging(false)
    setCurrentPointer(null)
    setWon(false)
    setFailed(false)
    setShowConfetti(false)
    setRevealedCells([])
    setHintCount(0)
    setFeedbackText('')
    setTotalExtraCoins(0)
    
    // Shuffle wheel letters
    setShuffledLetters([...lvl.letters].sort(() => Math.random() - 0.5))

    // Set time based on difficulty
    const limits = { easy: 60, medium: 45, hard: 30 }
    setTimeRemaining(limits[diffId] || 60)
    setIsPlaying(true)
    
    triggerMascot({
      text: `Level ${index + 1}! Ada ${lvl.letters.length} huruf di roda. Temukan ${lvl.targetWords.length} kata target! 💪`,
      actions: ['Siapa takut!', 'Minta tips']
    }, 'happy')
  }, [levels, diffId, triggerMascot])

  // Initial Level Start
  useEffect(() => {
    if (!showTutorial) {
      startLevel(0)
    }
  }, [showTutorial, startLevel])

  // Timer logic
  useEffect(() => {
    if (!isPlaying || won || failed) return

    timerRef.current = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setFailed(true)
          setIsPlaying(false)
          play('gameOver')
          vibrateError()
          triggerMascot({
            text: 'Aduh! Waktumu habis. Jangan patah semangat, coba lagi!',
            actions: ['Main lagi']
          }, 'sad')
          return 0
        }
        if (t === 11) {
          triggerMascot({
            text: 'Awas! Waktu tinggal 10 detik! 🏃',
            actions: ['Fokus!']
          }, 'surprised')
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [isPlaying, won, failed, play, triggerMascot, vibrateError])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Trigger feedback banner
  const triggerFeedback = useCallback((text, color) => {
    setFeedbackText(text)
    setFeedbackColor(color)
    setFeedbackKey(prev => prev + 1)
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = setTimeout(() => setFeedbackText(''), 1500)
  }, [])

  // Shuffle the letter wheel
  const handleShuffle = useCallback(() => {
    play('flip')
    vibrateLight()
    setShuffledLetters(prev => [...prev].sort(() => Math.random() - 0.5))
    setSelectedIndices([])
    triggerFeedback('Roda Diacak! 🔀', '#6C5CE7')
  }, [play, vibrateLight, triggerFeedback])

  // Use a hint (costs 15 coins)
  const handleHint = useCallback(() => {
    if (coins < 15) {
      play('mismatch')
      vibrateError()
      triggerFeedback('Koin tidak cukup! 🪙', '#FF6B6B')
      return
    }

    const unrevealed = []
    currentLevel.targetWords.forEach(tw => {
      if (foundWords.includes(tw.word)) return
      tw.cells.forEach((cell, idx) => {
        const letter = tw.word[idx]
        const alreadyRevealed = revealedCells.some(rc => rc.r === cell.r && rc.c === cell.c) ||
          foundWords.some(fw => {
            const matchW = currentLevel.targetWords.find(t => t.word === fw)
            return matchW && matchW.cells.some(c => c.r === cell.r && c.c === cell.c)
          })
        if (!alreadyRevealed) {
          unrevealed.push({ cell, letter })
        }
      })
    })

    if (unrevealed.length === 0) {
      triggerFeedback('Semua huruf sudah terbuka!', '#00B894')
      return
    }

    spendCoins(15, 'Beli Hint Anagram')
    play('pop')
    vibrateMedium()
    setHintCount(prev => prev + 1)

    const randomPick = unrevealed[Math.floor(Math.random() * unrevealed.length)]
    setRevealedCells(prev => [...prev, { r: randomPick.cell.r, c: randomPick.cell.c, letter: randomPick.letter }])
    triggerFeedback('Huruf Terbuka! 💡', '#F9A825')
  }, [coins, currentLevel, foundWords, revealedCells, spendCoins, play, vibrateMedium, vibrateError, triggerFeedback])

  // Current formed word
  const currentWord = useMemo(() => {
    return selectedIndices.map(idx => shuffledLetters[idx] || '').join('')
  }, [selectedIndices, shuffledLetters])

  // Submit word
  const submitWord = useCallback(() => {
    if (currentWord.length < 2) {
      setSelectedIndices([])
      return
    }

    const wordUpper = currentWord.toUpperCase()

    if (foundWords.includes(wordUpper) || extraWordsFound.includes(wordUpper)) {
      play('mismatch')
      vibrateError()
      triggerFeedback('Sudah ditemukan!', '#FD79A8')
      setSelectedIndices([])
      return
    }

    // Check target words
    const targetMatch = currentLevel.targetWords.find(tw => tw.word === wordUpper)
    if (targetMatch) {
      play('match')
      vibrateSuccess()
      const nextFound = [...foundWords, wordUpper]
      setFoundWords(nextFound)

      if (nextFound.length === currentLevel.targetWords.length) {
        // Level complete!
        setWon(true)
        setIsPlaying(false)
        setShowConfetti(true)
        play('win')
        
        const stars = hintCount === 0 ? 3 : hintCount <= 2 ? 2 : 1
        const baseCoins = (diffId === 'easy' ? 10 : diffId === 'medium' ? 20 : 35)
        const extraBonus = extraWordsFound.length * 2
        const totalCoins = baseCoins + extraBonus

        earnCoins(totalCoins, `Menang Anagram Level ${levelIndex + 1}`)
        reportGameResult({
          gameId: 'anagram',
          difficultyId: diffId,
          won: true,
          score: 100 * (levelIndex + 1) - hintCount * 15 + extraWordsFound.length * 20,
          stars,
          timeSec: (diffId === 'easy' ? 60 : diffId === 'medium' ? 45 : 30) - timeRemaining
        })

        triggerMascot({
          text: `Hebat! Level ${levelIndex + 1} selesai! 🪙+${totalCoins}`,
          actions: ['Lanjut!']
        }, 'excited')
      } else {
        triggerMascot({
          text: `"${wordUpper}" ditemukan! ${currentLevel.targetWords.length - nextFound.length} kata lagi!`,
          actions: ['Cari lagi!']
        }, 'wink')
      }
      triggerFeedback(`✅ ${wordUpper}`, '#00B894')
      setSelectedIndices([])
      return
    }

    // Check extra words
    const extraMatch = currentLevel.extraWords.some(ew => ew.toUpperCase() === wordUpper)
    if (extraMatch) {
      play('pop')
      vibrateMedium()
      setExtraWordsFound(prev => [...prev, wordUpper])
      setTotalExtraCoins(prev => prev + 2)
      triggerFeedback('Kata Ekstra! 🪙+2', '#F9A825')
      triggerMascot({
        text: `"${wordUpper}" kata ekstra! Bonus +2 koin! 🎉`,
        actions: ['Keren!']
      }, 'excited')
      setSelectedIndices([])
      return
    }

    // Invalid
    play('mismatch')
    vibrateError()
    triggerFeedback('Bukan kata valid ❌', '#FF6B6B')
    setSelectedIndices([])
  }, [currentWord, foundWords, extraWordsFound, currentLevel, hintCount, levelIndex, diffId, earnCoins, reportGameResult, timeRemaining, play, vibrateSuccess, vibrateError, vibrateMedium, triggerMascot, triggerFeedback])

  // ─── Wheel geometry ────────────────────────────────────────────────────────
  const WHEEL_SIZE = 240
  const WHEEL_RADIUS = 88
  const LETTER_SIZE = 50

  const wheelPositions = useMemo(() => {
    const center = WHEEL_SIZE / 2
    const count = shuffledLetters.length
    if (count === 0) return []
    return shuffledLetters.map((_, i) => {
      const angle = (i * 2 * Math.PI / count) - Math.PI / 2
      return {
        x: center + WHEEL_RADIUS * Math.cos(angle),
        y: center + WHEEL_RADIUS * Math.sin(angle)
      }
    })
  }, [shuffledLetters])

  // Mouse & Touch
  const getRelativeCoords = useCallback((clientX, clientY) => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const findNearestLetter = useCallback((pos) => {
    return wheelPositions.findIndex(p => {
      const dx = pos.x - p.x, dy = pos.y - p.y
      return Math.sqrt(dx * dx + dy * dy) < LETTER_SIZE * 0.65
    })
  }, [wheelPositions])

  const handlePointerStart = useCallback((clientX, clientY) => {
    if (!isPlaying || won || failed) return
    const pos = getRelativeCoords(clientX, clientY)
    if (!pos) return
    const index = findNearestLetter(pos)
    if (index !== -1) {
      setIsDragging(true)
      setSelectedIndices([index])
      setCurrentPointer(pos)
      play('click')
      vibrateLight()
    }
  }, [isPlaying, won, failed, getRelativeCoords, findNearestLetter, play, vibrateLight])

  const handlePointerMove = useCallback((clientX, clientY) => {
    if (!isDragging) return
    const pos = getRelativeCoords(clientX, clientY)
    if (!pos) return
    setCurrentPointer(pos)

    const index = findNearestLetter(pos)
    if (index !== -1) {
      setSelectedIndices(prev => {
        // Undo: drag back to previous
        if (prev.length > 1 && prev[prev.length - 2] === index) {
          play('click')
          vibrateLight()
          return prev.slice(0, -1)
        }
        // Add new (not already selected)
        if (!prev.includes(index)) {
          play('click')
          vibrateLight()
          return [...prev, index]
        }
        return prev
      })
    }
  }, [isDragging, getRelativeCoords, findNearestLetter, play, vibrateLight])

  const handlePointerEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    setCurrentPointer(null)
    submitWord()
  }, [isDragging, submitWord])

  // Tap-to-Connect
  const handleLetterTap = useCallback((idx) => {
    if (!isPlaying || won || failed || isDragging) return
    setSelectedIndices(prev => {
      if (prev.includes(idx)) {
        if (prev[prev.length - 1] === idx) return prev.slice(0, -1)
        return prev
      }
      return [...prev, idx]
    })
    play('click')
    vibrateLight()
  }, [isPlaying, won, failed, isDragging, play, vibrateLight])

  // ─── Grid layout ───────────────────────────────────────────────────────────
  const gridLayout = useMemo(() => {
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity
    currentLevel.targetWords.forEach(tw => {
      tw.cells.forEach(c => {
        if (c.r < minR) minR = c.r
        if (c.r > maxR) maxR = c.r
        if (c.c < minC) minC = c.c
        if (c.c > maxC) maxC = c.c
      })
    })
    const rows = maxR - minR + 1
    const cols = maxC - minC + 1
    const maxCellSize = 48
    const areaWidth = Math.min(340, typeof window !== 'undefined' ? window.innerWidth - 48 : 320)
    const cellSize = Math.min(maxCellSize, Math.floor(areaWidth / cols))
    return { minR, minC, rows, cols, cellSize }
  }, [currentLevel])

  // Grid cells with correct letter data
  const gridCells = useMemo(() => {
    const cells = []
    const visited = new Set()
    currentLevel.targetWords.forEach(tw => {
      tw.cells.forEach(cell => {
        const key = `${cell.r}-${cell.c}`
        if (!visited.has(key)) {
          visited.add(key)
          const info = getCellLetterFromLevel(currentLevel, foundWords, revealedCells, cell.r, cell.c)
          if (info) cells.push({ r: cell.r, c: cell.c, ...info })
        }
      })
    })
    return cells
  }, [currentLevel, foundWords, revealedCells])

  // Handlers
  const handleNextLevel = useCallback(() => {
    const nextIdx = levelIndex + 1
    setLevelIndex(nextIdx)
    startLevel(nextIdx)
  }, [levelIndex, startLevel])

  const handleRestart = useCallback(() => {
    startLevel(levelIndex)
  }, [levelIndex, startLevel])

  const handleTutorialClose = useCallback(() => {
    localStorage.setItem('bp_tut_anagram', 'true')
    setShowTutorial(false)
  }, [])

  const dark = tc.dark

  // ─── Found words list (for visual display below grid) ──────────────────────
  const allTargetWords = currentLevel.targetWords.map(tw => tw.word)

  return (
    <div style={{
      maxWidth: 500, margin: '0 auto', padding: '16px 16px 80px',
      fontFamily: "'Inter', sans-serif", color: tc.textMain,
      display: 'flex', flexDirection: 'column', minHeight: '85vh',
    }}>
      <style>{`
        @keyframes tileCorrectPop {
          0% { transform: scale(0.6); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bubblePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes fadeSlideUp {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .anagram-cell-revealed {
          animation: tileCorrectPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .anagram-letter-btn {
          width: 50px; height: 50px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Fredoka One', cursive; font-size: 20px;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          user-select: none; -webkit-tap-highlight-color: transparent;
          cursor: pointer;
        }
        .anagram-word-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 8px;
          font-family: 'Fredoka One', cursive; font-size: 12px;
          transition: all 0.2s;
        }
      `}</style>

      {showConfetti && <Confetti active={showConfetti} />}

      {showTutorial && (
        <TutorialModal steps={ANAGRAM_TUTORIAL} onClose={handleTutorialClose} />
      )}

      {/* ── Header ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <button onClick={() => { play('click'); onBack() }}
            style={{
              background: tc.surface, border: `2px solid ${tc.borderCol}`,
              borderRadius: 12, padding: '8px 14px', fontSize: 18,
              cursor: 'pointer', color: tc.textMain, transition: 'all 0.15s',
            }}>←</button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, color: tc.textMain, margin: 0 }}>
              🔀 Anagram
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{
                background: dark ? 'rgba(253,203,110,0.15)' : '#FFF9E6',
                color: '#F9A825', border: '1.5px solid #FDCB6E33',
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 7
              }}>Lv {levelIndex + 1}</span>
              <span style={{ fontSize: 10, color: tc.textMuted, fontWeight: 600 }}>
                {diffId === 'easy' ? '🟢 Mudah' : diffId === 'medium' ? '🟡 Sedang' : '🔴 Sulit'}
              </span>
            </div>
          </div>
          {/* Timer */}
          <div style={{
            background: timeRemaining <= 10 ? 'rgba(239,68,68,0.15)' : tc.surface,
            border: `2px solid ${timeRemaining <= 10 ? '#EF4444' : tc.borderCol}`,
            borderRadius: 14, padding: '6px 12px', textAlign: 'center', minWidth: 56,
          }}>
            <div style={{ fontSize: 8, color: timeRemaining <= 10 ? '#EF4444' : tc.textMuted, fontWeight: 700 }}>WAKTU</div>
            <div style={{
              fontFamily: "'Fredoka One', cursive", fontSize: 18,
              color: timeRemaining <= 10 ? '#EF4444' : tc.textMain
            }}>{timeRemaining}s</div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: tc.surface, border: `1.5px solid ${tc.borderCol}`,
          borderRadius: 14, padding: '8px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 15 }}>🎯</span>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{foundWords.length}/{currentLevel.targetWords.length}</span>
          </div>
          {extraWordsFound.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #F9A825, #F57F17)',
              color: '#FFF', fontSize: 9, fontWeight: 800,
              padding: '3px 8px', borderRadius: 7,
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <span>⭐</span><span>+{extraWordsFound.length}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 14 }}>🪙</span>
            <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "'Fredoka One', cursive" }}>{coins}</span>
          </div>
        </div>
      </div>

      {/* ── Word Grid Area ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px 0', minHeight: 120, position: 'relative',
        background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
        borderRadius: 20, border: `1px dashed ${tc.borderCol}`, marginBottom: 12,
      }}>
        <div style={{
          position: 'relative',
          width: gridLayout.cols * gridLayout.cellSize,
          height: gridLayout.rows * gridLayout.cellSize,
        }}>
          {gridCells.map((cell) => {
            const left = (cell.c - gridLayout.minC) * gridLayout.cellSize
            const top = (cell.r - gridLayout.minR) * gridLayout.cellSize
            return (
              <div
                key={`cell-${cell.r}-${cell.c}`}
                className={cell.revealed ? 'anagram-cell-revealed' : ''}
                style={{
                  position: 'absolute',
                  left: left + 2, top: top + 2,
                  width: gridLayout.cellSize - 4, height: gridLayout.cellSize - 4,
                  borderRadius: 8,
                  border: `2px solid ${cell.revealed ? (cell.isHint ? '#F9A825' : (tc.accent || '#6C5CE7')) : tc.borderCol}`,
                  background: cell.revealed
                    ? (cell.isHint
                      ? (dark ? 'rgba(249,168,37,0.12)' : 'rgba(249,168,37,0.08)')
                      : (dark ? 'rgba(108,92,231,0.12)' : 'rgba(108,92,231,0.06)'))
                    : tc.surface,
                  boxShadow: cell.revealed ? `0 2px 8px ${(tc.accent || '#6C5CE7')}22` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: gridLayout.cellSize * 0.42,
                  color: cell.revealed ? (cell.isHint ? '#F9A825' : (tc.accent || '#6C5CE7')) : 'transparent',
                  transition: 'all 0.3s',
                }}
              >
                {cell.letter}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Target Words Chips ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center',
        marginBottom: 12, padding: '0 8px',
      }}>
        {allTargetWords.map((word) => {
          const isFound = foundWords.includes(word)
          return (
            <div key={word} className="anagram-word-chip" style={{
              background: isFound ? (dark ? 'rgba(0,184,148,0.15)' : 'rgba(0,184,148,0.08)') : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
              border: `1.5px solid ${isFound ? '#00B89444' : tc.borderCol}`,
              color: isFound ? '#00B894' : tc.textMuted,
              textDecoration: isFound ? 'none' : 'none',
            }}>
              {isFound ? '✅' : '❓'}
              <span>{isFound ? word : word.replace(/./g, '＿')}</span>
            </div>
          )
        })}
      </div>

      {/* ── Word Composition Preview ── */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12, position: 'relative',
      }}>
        {currentWord ? (
          <div style={{
            background: tc.accent || '#6C5CE7', color: '#FFF',
            fontFamily: "'Fredoka One', cursive", fontSize: 18,
            padding: '7px 20px', borderRadius: 100,
            boxShadow: `0 6px 20px ${(tc.accent || '#6C5CE7')}44`,
            letterSpacing: '2px',
            animation: 'bubblePulse 1.2s infinite',
          }}>
            {currentWord}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: tc.textMuted, fontStyle: 'italic' }}>
            Hubungkan huruf di roda untuk membentuk kata
          </div>
        )}
        {feedbackText && (
          <div key={feedbackKey} style={{
            position: 'absolute', background: feedbackColor, color: '#FFF',
            fontWeight: 800, fontSize: 12, padding: '5px 14px', borderRadius: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            animation: 'fadeSlideUp 0.3s ease forwards', zIndex: 10,
          }}>
            {feedbackText}
          </div>
        )}
      </div>

      {/* ── Tap Controls ── */}
      {selectedIndices.length > 0 && !isDragging && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 12, animation: 'fadeSlideUp 0.2s ease' }}>
          <button onClick={() => { play('click'); setSelectedIndices([]) }}
            style={{
              background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)',
              color: '#EF4444', padding: '6px 14px', borderRadius: 10,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>Reset ❌</button>
          <button onClick={() => { play('click'); submitWord() }}
            style={{
              background: tc.accent || '#6C5CE7', border: 'none',
              color: '#FFF', padding: '6px 18px', borderRadius: 10,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(108,92,231,0.2)',
            }}>Kirim ✔️</button>
        </div>
      )}

      {/* ── Wheel + Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        {/* Shuffle */}
        <button onClick={handleShuffle} disabled={won || failed}
          style={{
            width: 44, height: 44, borderRadius: 14,
            border: `2px solid ${tc.borderCol}`, background: tc.surface,
            color: tc.textMain, fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 6px rgba(0,0,0,0.05)',
            opacity: won || failed ? 0.5 : 1, transition: 'all 0.15s',
          }}>🔀</button>

        {/* Wheel */}
        <div ref={containerRef}
          onMouseDown={e => handlePointerStart(e.clientX, e.clientY)}
          onMouseMove={e => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerEnd}
          onMouseLeave={() => { if (isDragging) handlePointerEnd() }}
          onTouchStart={e => { if (e.touches.length > 0) handlePointerStart(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchMove={e => { e.preventDefault(); if (e.touches.length > 0) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchEnd={handlePointerEnd}
          style={{
            width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: '50%',
            background: dark ? '#161B30' : '#E8EEF8',
            border: `4px solid ${dark ? '#252C48' : '#D0DBEB'}`,
            position: 'relative', touchAction: 'none',
            boxShadow: dark ? 'inset 0 4px 12px rgba(0,0,0,0.4)' : 'inset 0 4px 10px rgba(0,0,0,0.06)',
            userSelect: 'none', flexShrink: 0,
          }}
        >
          {/* Center button */}
          <div onClick={() => { if (selectedIndices.length > 0) submitWord() }}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 58, height: 58, borderRadius: '50%',
              background: selectedIndices.length > 0 ? (tc.accent || '#6C5CE7') : (dark ? '#202640' : '#DBE4F2'),
              border: `3px solid ${dark ? '#2E365C' : '#C7D5EB'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: selectedIndices.length > 0 ? '0 4px 12px rgba(108,92,231,0.4)' : 'none',
              fontFamily: "'Fredoka One', cursive", fontSize: 18,
              color: selectedIndices.length > 0 ? '#FFF' : tc.textMuted,
              cursor: selectedIndices.length > 0 ? 'pointer' : 'default',
              transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              zIndex: 5,
            }}>
            {selectedIndices.length > 0 ? '✔️' : '🧠'}
          </div>

          {/* SVG connection lines */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
            <defs>
              <filter id="glow-line" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {selectedIndices.map((idx, i) => {
              if (i === 0 || !wheelPositions[selectedIndices[i - 1]] || !wheelPositions[idx]) return null
              const p1 = wheelPositions[selectedIndices[i - 1]]
              const p2 = wheelPositions[idx]
              return (
                <line key={`line-${i}`}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={tc.accent || '#6C5CE7'} strokeWidth="6" strokeLinecap="round"
                  filter="url(#glow-line)"
                />
              )
            })}
            {isDragging && selectedIndices.length > 0 && currentPointer && wheelPositions[selectedIndices[selectedIndices.length - 1]] && (
              <line
                x1={wheelPositions[selectedIndices[selectedIndices.length - 1]].x}
                y1={wheelPositions[selectedIndices[selectedIndices.length - 1]].y}
                x2={currentPointer.x} y2={currentPointer.y}
                stroke={tc.accent || '#6C5CE7'} strokeWidth="4"
                strokeDasharray="6,4" strokeLinecap="round" opacity={0.6}
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
              <div key={`lb-${i}`}
                onClick={() => handleLetterTap(i)}
                className="anagram-letter-btn"
                style={{
                  position: 'absolute',
                  left: pos.x - LETTER_SIZE / 2, top: pos.y - LETTER_SIZE / 2,
                  background: isSelected ? (tc.accent || '#6C5CE7') : (dark ? '#2C3558' : '#FFF'),
                  color: isSelected ? '#FFF' : tc.textMain,
                  border: `3px solid ${isSelected ? '#FFF' : (dark ? '#3C497B' : '#C7D5EB')}`,
                  boxShadow: isSelected ? `0 0 14px ${(tc.accent || '#6C5CE7')}` : '0 3px 8px rgba(0,0,0,0.06)',
                  transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                  zIndex: isSelected ? 6 : 4,
                }}>
                {letter}
                {isSelected && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6,
                    background: '#FFF', color: tc.accent || '#6C5CE7',
                    width: 18, height: 18, borderRadius: '50%',
                    fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  }}>{selOrder}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Hint */}
        <button onClick={handleHint} disabled={won || failed}
          style={{
            width: 44, height: 44, borderRadius: 14,
            border: `2px solid ${tc.borderCol}`, background: tc.surface,
            color: tc.textMain, fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 6px rgba(0,0,0,0.05)',
            opacity: won || failed ? 0.5 : 1, transition: 'all 0.15s',
            position: 'relative',
          }}>
          💡
          <span style={{
            position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
            fontSize: 8, color: '#F9A825', fontWeight: 800, whiteSpace: 'nowrap',
          }}>🪙15</span>
        </button>
      </div>

      {/* ── Extra Words Found ── */}
      {extraWordsFound.length > 0 && (
        <div style={{
          marginTop: 16, padding: '10px 14px',
          background: dark ? 'rgba(249,168,37,0.06)' : 'rgba(249,168,37,0.04)',
          border: `1.5px solid rgba(249,168,37,0.2)`, borderRadius: 14,
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#F9A825', marginBottom: 6 }}>
            ⭐ KATA EKSTRA ({extraWordsFound.length}) — Bonus 🪙+{totalExtraCoins}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {extraWordsFound.map(w => (
              <span key={w} style={{
                background: dark ? 'rgba(249,168,37,0.12)' : 'rgba(249,168,37,0.08)',
                color: '#F9A825', fontFamily: "'Fredoka One', cursive",
                fontSize: 11, padding: '3px 8px', borderRadius: 6,
              }}>{w}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Win Modal ── */}
      {won && (
        <WinModal
          emoji="🏆"
          title={`Level ${levelIndex + 1} Selesai!`}
          subtitle="Semua kata target berhasil ditemukan!"
          diffLabel={diffId === 'easy' ? 'Mudah' : diffId === 'medium' ? 'Sedang' : 'Sulit'}
          stats={[
            { label: 'Waktu Sisa', value: `${timeRemaining}s`, color: '#00B894' },
            { label: 'Hint', value: hintCount, color: '#F9A825' },
            { label: 'Ekstra', value: extraWordsFound.length, color: '#A29BFE' }
          ]}
          stars={hintCount === 0 ? 3 : hintCount <= 2 ? 2 : 1}
          coinReward={(diffId === 'easy' ? 10 : diffId === 'medium' ? 20 : 35) + totalExtraCoins}
          onRestart={levelIndex + 1 < levels.length ? handleNextLevel : handleRestart}
          onBack={onBack}
          onHome={onHome}
          dark={dark}
          gameColor={game?.color || '#FDCB6E'}
          restartLabel={levelIndex + 1 < levels.length ? '➡️ Level Berikutnya' : '🔄 Main Lagi'}
          backLabel="🎯 Ganti Level"
        />
      )}

      {/* ── Lose Modal ── */}
      {failed && (
        <LoseModal
          emoji="⏰"
          title="Waktu Habis!"
          subtitle="Jangan menyerah! Coba lagi ya."
          stats={[
            { label: 'Ditemukan', value: `${foundWords.length}/${currentLevel.targetWords.length}`, color: '#FF6B6B' },
            { label: 'Ekstra', value: extraWordsFound.length, color: '#F9A825' }
          ]}
          onRestart={handleRestart}
          onBack={onBack}
          onHome={onHome}
          dark={dark}
          gameColor={game?.color || '#FDCB6E'}
        />
      )}
    </div>
  )
}
