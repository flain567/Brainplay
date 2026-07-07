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

// ─── Word Database for Anagram ──────────────────────────────────────────────
const ANAGRAM_LEVELS = {
  easy: [
    {
      letters: ['A', 'K', 'U'],
      targetWords: [
        { word: 'AKU', cells: [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }] },
        { word: 'KAU', cells: [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 1 }] }
      ],
      extraWords: ['KUA', 'UA', 'KA']
    },
    {
      letters: ['A', 'P', 'I'],
      targetWords: [
        { word: 'API', cells: [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }] },
        { word: 'IPA', cells: [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 1 }] }
      ],
      extraWords: ['PIA', 'PA']
    },
    {
      letters: ['I', 'B', 'U'],
      targetWords: [
        { word: 'IBU', cells: [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }] },
        { word: 'UBI', cells: [{ r: 1, c: 2 }, { r: 2, c: 2 }, { r: 3, c: 2 }] }
      ],
      extraWords: ['BUI', 'BIU']
    },
    {
      letters: ['A', 'I', 'R'],
      targetWords: [
        { word: 'AIR', cells: [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }] },
        { word: 'RIA', cells: [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 1 }] }
      ],
      extraWords: ['ARI', 'IRA']
    },
    {
      letters: ['A', 'T', 'U', 'R'],
      targetWords: [
        { word: 'ATUR', cells: [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }] },
        { word: 'RATU', cells: [{ r: 1, c: 3 }, { r: 2, c: 3 }, { r: 3, c: 3 }, { r: 4, c: 3 }] },
        { word: 'TUA', cells: [{ r: 1, c: 1 }, { r: 2, c: 1 }, { r: 3, c: 1 }] }
      ],
      extraWords: ['RAUT', 'TAU', 'URA', 'AUR']
    }
  ],
  medium: [
    {
      letters: ['K', 'A', 'S', 'U', 'R'],
      targetWords: [
        { word: 'KASUR', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }] },
        { word: 'RUSAK', cells: [{ r: 2, c: 4 }, { r: 3, c: 4 }, { r: 4, c: 4 }, { r: 5, c: 4 }, { r: 6, c: 4 }] },
        { word: 'RUSA', cells: [{ r: 0, c: 2 }, { r: 1, c: 2 }, { r: 2, c: 2 }, { r: 3, c: 2 }] },
        { word: 'KAU', cells: [{ r: 2, c: 0 }, { r: 3, c: 0 }, { r: 4, c: 0 }] }
      ],
      extraWords: ['ASUR', 'SUAR', 'URAS', 'KAS', 'SUR', 'SAR', 'SAUT']
    },
    {
      letters: ['M', 'A', 'K', 'A', 'N'],
      targetWords: [
        { word: 'MAKAN', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }] },
        { word: 'ANAK', cells: [{ r: 0, c: 3 }, { r: 1, c: 3 }, { r: 2, c: 3 }, { r: 3, c: 3 }] },
        { word: 'NAMA', cells: [{ r: 2, c: 4 }, { r: 3, c: 4 }, { r: 4, c: 4 }, { r: 5, c: 4 }] },
        { word: 'MAKA', cells: [{ r: 2, c: 0 }, { r: 3, c: 0 }, { r: 4, c: 0 }, { r: 5, c: 0 }] }
      ],
      extraWords: ['AMAN', 'MANA', 'KANA', 'KAN', 'NAK', 'KAM', 'AMA']
    },
    {
      letters: ['B', 'U', 'N', 'G', 'A'],
      targetWords: [
        { word: 'BUNGA', cells: [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 1, c: 4 }] },
        { word: 'GUNA', cells: [{ r: 1, c: 3 }, { r: 2, c: 3 }, { r: 3, c: 3 }, { r: 4, c: 3 }] },
        { word: 'UANG', cells: [{ r: 1, c: 1 }, { r: 2, c: 1 }, { r: 3, c: 1 }, { r: 4, c: 1 }] },
        { word: 'BAU', cells: [{ r: 1, c: 0 }, { r: 2, c: 0 }, { r: 3, c: 0 }] }
      ],
      extraWords: ['BUNG', 'ABU', 'BAN', 'GUA', 'NABU', 'AGU']
    },
    {
      letters: ['P', 'I', 'N', 'T', 'U'],
      targetWords: [
        { word: 'PINTU', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }] },
        { word: 'UNIT', cells: [{ r: 2, c: 4 }, { r: 3, c: 4 }, { r: 4, c: 4 }, { r: 5, c: 4 }] },
        { word: 'TIPU', cells: [{ r: 2, c: 3 }, { r: 3, c: 3 }, { r: 4, c: 3 }, { r: 5, c: 3 }] },
        { word: 'PIN', cells: [{ r: 2, c: 0 }, { r: 3, c: 0 }, { r: 4, c: 0 }] }
      ],
      extraWords: ['TUNI', 'UIT', 'PUN', 'TUP', 'IPU', 'NIT']
    },
    {
      letters: ['D', 'U', 'N', 'I', 'A'],
      targetWords: [
        { word: 'DUNIA', cells: [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 1, c: 4 }] },
        { word: 'DAUN', cells: [{ r: 1, c: 0 }, { r: 2, c: 0 }, { r: 3, c: 0 }, { r: 4, c: 0 }] },
        { word: 'DINA', cells: [{ r: -1, c: 2 }, { r: 0, c: 2 }, { r: 1, c: 2 }, { r: 2, c: 2 }] }
      ],
      extraWords: ['UNI', 'ADI', 'DUA', 'NIA', 'ANI', 'IDAN', 'DINA']
    }
  ],
  hard: [
    {
      letters: ['T', 'U', 'K', 'A', 'R'],
      targetWords: [
        { word: 'TUKAR', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }] },
        { word: 'KARTU', cells: [{ r: 2, c: 2 }, { r: 3, c: 2 }, { r: 4, c: 2 }, { r: 5, c: 2 }, { r: 6, c: 2 }] },
        { word: 'RATU', cells: [{ r: 2, c: 4 }, { r: 3, c: 4 }, { r: 4, c: 4 }, { r: 5, c: 4 }] },
        { word: 'ATUR', cells: [{ r: 2, c: 3 }, { r: 3, c: 3 }, { r: 4, c: 3 }, { r: 5, c: 3 }] },
        { word: 'KAU', cells: [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 1 }] }
      ],
      extraWords: ['RAUT', 'KUTA', 'URA', 'TAK', 'TRUK', 'KUR', 'TAR', 'TUA']
    },
    {
      letters: ['K', 'E', 'R', 'T', 'A', 'S'],
      targetWords: [
        { word: 'KERTAS', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }, { r: 2, c: 5 }] },
        { word: 'KERAS', cells: [{ r: 2, c: 0 }, { r: 3, c: 0 }, { r: 4, c: 0 }, { r: 5, c: 0 }, { r: 6, c: 0 }] },
        { word: 'SERAT', cells: [{ r: 2, c: 5 }, { r: 3, c: 5 }, { r: 4, c: 5 }, { r: 5, c: 5 }, { r: 6, c: 5 }] },
        { word: 'REKA', cells: [{ r: 2, c: 2 }, { r: 3, c: 2 }, { r: 4, c: 2 }, { r: 5, c: 2 }] }
      ],
      extraWords: ['KERA', 'RESA', 'RAK', 'SET', 'SAR', 'SATE', 'ETA', 'ERA', 'TAS', 'KAS']
    },
    {
      letters: ['B', 'A', 'N', 'G', 'S', 'A'],
      targetWords: [
        { word: 'BANGSA', cells: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }, { r: 2, c: 5 }] },
        { word: 'ABANG', cells: [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 1 }, { r: 3, c: 1 }, { r: 4, c: 1 }] },
        { word: 'SANG', cells: [{ r: 2, c: 4 }, { r: 3, c: 4 }, { r: 4, c: 4 }, { r: 5, c: 4 }] },
        { word: 'BASA', cells: [{ r: 2, c: 0 }, { r: 3, c: 0 }, { r: 4, c: 0 }, { r: 5, c: 0 }] }
      ],
      extraWords: ['NASA', 'GASA', 'BAN', 'GAS', 'ASA', 'SABA', 'BANA', 'ANA']
    }
  ]
}

// ─── Tutorial Steps ──────────────────────────────────────────────────────────
const ANAGRAM_TUTORIAL = [
  { emoji: '🔀', title: 'Anagram Wheel', desc: 'Hubungkan huruf-huruf pada roda untuk membentuk kata tersembunyi!', tip: 'Usap kursor/jari antar huruf untuk menyambungkannya, atau ketuk satu per satu.' },
  { emoji: '🧩', title: 'Isi Teka-Teki Grid', desc: 'Targetkan kata-kata yang cocok dengan kisi kotak di atas untuk lolos level.', tip: 'Garis neon bercahaya akan digambar untuk memperlihatkan hubungan huruf.' },
  { emoji: '🪙', title: 'Kata Ekstra & Hint', desc: 'Temukan kata valid lain di luar grid untuk mendapatkan Bonus Koin ekstra!', tip: 'Gunakan tombol Hint jika kamu buntu. Setiap hint akan membuka satu huruf kosong.' }
]

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
  const [revealedCells, setRevealedCells] = useState([]) // cells coordinates dynamically opened by hint
  const [score, setScore] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackColor, setFeedbackColor] = useState('')
  const [feedbackKey, setFeedbackKey] = useState(0)

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
    setScore(0)
    setFeedbackText('')
    
    // Set shuffled wheel letters
    setShuffledLetters([...lvl.letters].sort(() => Math.random() - 0.5))

    // Set time based on difficulty config
    const limits = { easy: 60, medium: 45, hard: 30 }
    setTimeRemaining(limits[diffId] || 60)
    setIsPlaying(true)
    
    // Mascot greet
    triggerMascot({
      text: `Selamat datang di Level ${index + 1}! Roda huruf ini memiliki ${lvl.letters.length} huruf. Hubungkan menjadi kata ya!`,
      actions: ['Siapa takut!', 'Minta tips', 'Kembali']
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
            text: 'Aduh! Waktumu habis. Jangan patah semangat, mari coba lagi!',
            actions: ['Main lagi', 'Ubah Level']
          }, 'sad')
          return 0
        }
        
        // Mascot triggers warn at 10 seconds
        if (t === 11) {
          triggerMascot({
            text: 'Awas! Waktu tinggal 10 detik! Cepat temukan kata target!',
            actions: ['Fokus!']
          }, 'surprised')
        }

        return t - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [isPlaying, won, failed, play, triggerMascot, vibrateError])

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    }
  }, [])

  // Trigger feedback banner
  const triggerFeedback = (text, color) => {
    setFeedbackText(text)
    setFeedbackColor(color)
    setFeedbackKey(prev => prev + 1)
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackText('')
    }, 1500)
  }

  // Shuffle the letter wheel
  const handleShuffle = () => {
    play('flip')
    vibrateLight()
    setShuffledLetters(prev => [...prev].sort(() => Math.random() - 0.5))
    triggerFeedback('Roda Diacak! 🔀', '#6C5CE7')
  }

  // Use a hint (costs 15 coins)
  const handleHint = () => {
    if (coins < 15) {
      play('mismatch')
      vibrateError()
      triggerFeedback('Koin tidak cukup! 🪙', '#FF6B6B')
      triggerMascot('Koin kamu kurang nih untuk beli Hint. Selesaikan game lain dulu ya!', 'shy')
      return
    }

    // Find a grid cell that is not yet revealed
    const unrevealed = []
    currentLevel.targetWords.forEach(tw => {
      if (foundWords.includes(tw.word)) return
      // check each cell
      tw.cells.forEach((cell, idx) => {
        const letter = tw.word[idx]
        const isRevealed = revealedCells.some(rc => rc.r === cell.r && rc.c === cell.c) ||
          foundWords.some(fw => {
            const matchW = currentLevel.targetWords.find(t => t.word === fw)
            return matchW && matchW.cells.some(c => c.r === cell.r && c.c === cell.c)
          })
        if (!isRevealed) {
          unrevealed.push({ cell, letter })
        }
      })
    })

    if (unrevealed.length === 0) {
      triggerFeedback('Semua huruf sudah terbuka!', '#00B894')
      return
    }

    // Spend coins & reveal a random cell
    spendCoins(15, 'Beli Hint Anagram')
    play('pop')
    vibrateMedium()
    setHintCount(prev => prev + 1)

    const randomPick = unrevealed[Math.floor(Math.random() * unrevealed.length)]
    setRevealedCells(prev => [...prev, { r: randomPick.cell.r, c: randomPick.cell.c, letter: randomPick.letter }])
    triggerFeedback('Huruf Terbuka! 💡', '#F9A825')
  }

  // Current formed word based on selection
  const currentWord = useMemo(() => {
    return selectedIndices.map(idx => shuffledLetters[idx]).join('')
  }, [selectedIndices, shuffledLetters])

  // Check if a word is valid and submit it
  const submitWord = useCallback(() => {
    if (currentWord.length < 2) {
      setSelectedIndices([])
      return
    }

    const wordUpper = currentWord.toUpperCase()

    // 1. Check if word is already found in target
    if (foundWords.includes(wordUpper)) {
      play('mismatch')
      vibrateError()
      triggerFeedback('Sudah Ditemukan!', '#FD79A8')
      setSelectedIndices([])
      return
    }

    // 2. Check if word is already found in extra
    if (extraWordsFound.includes(wordUpper)) {
      play('mismatch')
      vibrateError()
      triggerFeedback('Kata Ekstra Sudah Ditemukan!', '#FD79A8')
      setSelectedIndices([])
      return
    }

    // 3. Find if it matches a target word
    const targetMatch = currentLevel.targetWords.find(tw => tw.word === wordUpper)
    if (targetMatch) {
      play('match')
      vibrateSuccess()
      setFoundWords(prev => {
        const next = [...prev, wordUpper]
        // Check if level completed
        if (next.length === currentLevel.targetWords.length) {
          setWon(true)
          setIsPlaying(false)
          setShowConfetti(true)
          play('win')
          
          // Calculate stats
          const stars = hintCount === 0 ? 3 : hintCount <= 2 ? 2 : 1
          const xpGained = (diffId === 'easy' ? 20 : diffId === 'medium' ? 40 : 65)
          const baseCoins = (diffId === 'easy' ? 10 : diffId === 'medium' ? 20 : 35)
          const extraCoinsBonus = extraWordsFound.length * 2
          const totalEarnedCoins = baseCoins + extraCoinsBonus
          
          earnCoins(totalEarnedCoins, `Menang Anagram Level ${levelIndex + 1}`)
          reportGameResult({
            gameId: 'anagram',
            difficultyId: diffId,
            won: true,
            score: 100 * (levelIndex + 1) - hintCount * 15 + extraWordsFound.length * 20,
            stars,
            timeSec: (diffId === 'easy' ? 60 : diffId === 'medium' ? 45 : 30) - timeRemaining
          })

          triggerMascot({
            text: `Hebat sekali! Level ${levelIndex + 1} selesai! Kamu mendapat 🪙+${totalEarnedCoins} (${extraWordsFound.length} kata ekstra). Siap ke level berikutnya?`,
            actions: ['Lanjutkan!', 'Ubah Level']
          }, 'excited')
        } else {
          // Regular target match mascot comment
          triggerMascot({
            text: `Mantap! "${wordUpper}" berhasil ditemukan di grid! Cari kata lainnya!`,
            actions: ['Cari lagi!']
          }, 'wink')
        }
        return next
      })
      triggerFeedback('Bagus! 🟢', '#00B894')
      setSelectedIndices([])
      return
    }

    // 4. Find if it matches an extra word
    const extraMatch = currentLevel.extraWords.some(ew => ew === wordUpper)
    if (extraMatch) {
      play('pop')
      vibrateMedium()
      setExtraWordsFound(prev => [...prev, wordUpper])
      triggerFeedback('Kata Ekstra! 🪙+2', '#F9A825')
      triggerMascot({
        text: `Wah, kamu jeli! "${wordUpper}" adalah kata ekstra. Dapat bonus +2 koin di akhir level!`,
        actions: ['Keren!']
      }, 'excited')
      setSelectedIndices([])
      return
    }

    // 5. Wrong word
    play('mismatch')
    vibrateError()
    triggerFeedback('Bukan Kata Valid! ❌', '#FF6B6B')
    setSelectedIndices([])
  }, [currentWord, foundWords, extraWordsFound, currentLevel, hintCount, levelIndex, diffId, earnCoins, reportGameResult, timeRemaining, play, vibrateSuccess, vibrateError, vibrateMedium, triggerMascot])

  // Get wheel coordinates of letter index
  const getLetterCoords = useCallback((idx) => {
    const diameter = 240
    const radius = 90
    const center = diameter / 2
    const angleStep = (2 * Math.PI) / shuffledLetters.length
    const angle = idx * angleStep - Math.PI / 2
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    }
  }, [shuffledLetters])

  // Letter Wheel layout positions helper
  const wheelPositions = useMemo(() => {
    return shuffledLetters.map((letter, i) => getLetterCoords(i))
  }, [shuffledLetters, getLetterCoords])

  // Mouse & Touch Interaction Helpers
  const getRelativeCoords = (clientX, clientY) => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const handlePointerStart = (clientX, clientY) => {
    if (!isPlaying || won || failed) return
    const pos = getRelativeCoords(clientX, clientY)
    if (!pos) return

    // Find if clicked near any letter
    const index = wheelPositions.findIndex((p) => {
      const dx = pos.x - p.x
      const dy = pos.y - p.y
      return Math.sqrt(dx * dx + dy * dy) < 32
    })

    if (index !== -1) {
      setIsDragging(true)
      setSelectedIndices([index])
      setCurrentPointer(pos)
      play('click')
      vibrateLight()
    }
  }

  const handlePointerMove = (clientX, clientY) => {
    if (!isDragging) return
    const pos = getRelativeCoords(clientX, clientY)
    if (!pos) return
    setCurrentPointer(pos)

    // Find if dragged near another letter
    const index = wheelPositions.findIndex((p) => {
      const dx = pos.x - p.x
      const dy = pos.y - p.y
      return Math.sqrt(dx * dx + dy * dy) < 32
    })

    if (index !== -1) {
      // If user drags back to second-to-last item, pop the last one (undo)
      if (selectedIndices.length > 1 && selectedIndices[selectedIndices.length - 2] === index) {
        setSelectedIndices(prev => prev.slice(0, -1))
        play('click')
        vibrateLight()
      } else if (!selectedIndices.includes(index)) {
        setSelectedIndices(prev => [...prev, index])
        play('click')
        vibrateLight()
      }
    }
  }

  const handlePointerEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    setCurrentPointer(null)
    submitWord()
  }

  // Tap-to-Connect support (fallback for buttons)
  const handleLetterTap = (idx) => {
    if (!isPlaying || won || failed || isDragging) return

    if (selectedIndices.includes(idx)) {
      // If already selected, check if it's the last selected one to undo
      if (selectedIndices[selectedIndices.length - 1] === idx) {
        setSelectedIndices(prev => prev.slice(0, -1))
        play('click')
        vibrateLight()
      }
    } else {
      setSelectedIndices(prev => [...prev, idx])
      play('click')
      vibrateLight()
    }
  }

  // Crossword Grid dimensions
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
    
    // Size cell responsive dynamically
    const maxCellSize = 54
    const areaWidth = Math.min(360, window.innerWidth - 40)
    const cellSize = Math.min(maxCellSize, areaWidth / cols)

    return { minR, maxR, minC, maxC, rows, cols, cellSize }
  }, [currentLevel])

  // Get letter displayed at cell coordinate
  const getCellLetter = (r, c) => {
    // 1. Check if revealed by matching target word
    let wordLetter = ''
    currentLevel.targetWords.forEach(tw => {
      if (foundWords.includes(tw.word)) {
        const idx = tw.cells.findIndex(cell => cell.r === r && cell.c === c)
        if (idx !== -1) wordLetter = tw.word[idx]
      }
    })
    if (wordLetter) return { letter: wordLetter, revealed: true }

    // 2. Check if revealed by hint
    const hintMatch = revealedCells.find(rc => rc.r === r && rc.c === c)
    if (hintMatch) return { letter: hintMatch.letter, revealed: true }

    // 3. Find target letter (but keep hidden)
    let hiddenLetter = ''
    currentLevel.targetWords.forEach(tw => {
      const idx = tw.cells.findIndex(cell => cell.r === r && cell.c === c)
      if (idx !== -1) hiddenLetter = tw.word[idx]
    })
    
    return hiddenLetter ? { letter: hiddenLetter, revealed: false } : null
  }

  // Grid Cells render list
  const gridCells = useMemo(() => {
    const cells = []
    const visited = new Set()
    currentLevel.targetWords.forEach(tw => {
      tw.cells.forEach(cell => {
        const key = `${cell.r}-${cell.c}`
        if (!visited.has(key)) {
          visited.add(key)
          const info = getCellLetter(cell.r, cell.c)
          if (info) {
            cells.push({ r: cell.r, c: cell.c, ...info })
          }
        }
      })
    })
    return cells
  }, [currentLevel, foundWords, revealedCells])

  // Complete level next handler
  const handleNextLevel = () => {
    const nextIdx = levelIndex + 1
    setLevelIndex(nextIdx)
    startLevel(nextIdx)
  }

  // Complete restart handler
  const handleRestart = () => {
    startLevel(levelIndex)
  }

  // Tutorial complete handler
  const handleTutorialClose = () => {
    localStorage.setItem('bp_tut_anagram', 'true')
    setShowTutorial(false)
    startLevel(0)
  }

  const dark = tc.dark

  return (
    <div style={{
      maxWidth: 500, margin: '0 auto', padding: '16px 16px 80px',
      fontFamily: "'Inter', sans-serif", color: tc.textMain,
      display: 'flex', flexDirection: 'column', minHeight: '85vh',
      justifyContent: 'space-between',
    }}>
      <style>{`
        /* Core animations */
        @keyframes tileCorrectPop {
          0% { transform: scale(0.6); opacity: 0; filter: brightness(1.8); }
          50% { transform: scale(1.15); filter: brightness(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes tileShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }

        @keyframes bubblePulse {
          0% { transform: scale(1); box-shadow: 0 4px 15px rgba(108,92,231,0.2); }
          50% { transform: scale(1.05); box-shadow: 0 4px 25px rgba(108,92,231,0.4); }
          100% { transform: scale(1); box-shadow: 0 4px 15px rgba(108,92,231,0.2); }
        }

        .correct-cell {
          animation: tileCorrectPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .anagram-letter-btn {
          width: 50px; height: 50px; border-radius: 50%;
          display: flex; alignItems: center; justify-content: center;
          font-family: 'Fredoka One', cursive; font-size: 20px;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          user-select: none; -webkit-tap-highlight-color: transparent;
        }

        .extra-badge {
          background: linear-gradient(135deg, #F9A825, #F57F17);
          color: #FFF; font-size: 10px; font-weight: 800;
          padding: 3px 8px; border-radius: 8px;
          display: flex; align-items: center; gap: 4px;
          box-shadow: 0 2px 8px rgba(249,168,37,0.3);
        }
      `}</style>

      {/* Confetti celebration */}
      {showConfetti && <Confetti active={showConfetti} />}

      {/* Tutorial Modal */}
      {showTutorial && (
        <TutorialModal
          steps={ANAGRAM_TUTORIAL}
          onClose={handleTutorialClose}
        />
      )}

      {/* Top Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={() => { play('click'); onBack() }}
            style={{
              background: tc.surface, border: `2px solid ${tc.borderCol}`,
              borderRadius: 12, padding: '8px 14px', fontSize: 18,
              cursor: 'pointer', color: tc.textMain, transition: 'all 0.15s',
            }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: tc.textMain, margin: 0 }}>
              🔀 Anagram
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{
                background: dark ? 'rgba(253,203,110,0.15)' : '#FFF9E6',
                color: '#F9A825', border: '1.5px solid #FDCB6E33',
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8
              }}>
                Day 25 Game
              </span>
              <span style={{ fontSize: 11, color: tc.textMuted, fontWeight: 600 }}>
                Level {levelIndex + 1} ({diffId === 'easy' ? '🟢 Mudah' : diffId === 'medium' ? '🟡 Sedang' : '🔴 Sulit'})
              </span>
            </div>
          </div>

          {/* Time Remaining display */}
          <div style={{
            background: timeRemaining <= 10 ? 'rgba(239, 68, 68, 0.15)' : tc.surface,
            border: `2px solid ${timeRemaining <= 10 ? '#EF4444' : tc.borderCol}`,
            borderRadius: 14, padding: '8px 12px', textAlign: 'center', minWidth: 64,
          }}>
            <div style={{ fontSize: 9, color: timeRemaining <= 10 ? '#EF4444' : tc.textMuted, fontWeight: 700 }}>WAKTU</div>
            <div style={{
              fontFamily: "'Fredoka One', cursive", fontSize: 18,
              color: timeRemaining <= 10 ? '#EF4444' : tc.textMain
            }}>
              {timeRemaining}s
            </div>
          </div>
        </div>

        {/* Level metrics bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: tc.surface, border: `1.5px solid ${tc.borderCol}`,
          borderRadius: 16, padding: '10px 14px', marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18 }}>🎯</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              Grid: {foundWords.length}/{currentLevel.targetWords.length}
            </span>
          </div>
          {extraWordsFound.length > 0 && (
            <div className="extra-badge">
              <span>⭐ Extra:</span>
              <span style={{ fontWeight: 800 }}>+{extraWordsFound.length}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 15 }}>🪙</span>
            <span style={{ fontSize: 12, fontWeight: 800, fontFamily: "'Fredoka One', cursive" }}>{coins}</span>
          </div>
        </div>
      </div>

      {/* Word Grid Area */}
      <div style={{
        display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center',
        padding: '24px 0', minHeight: 240, position: 'relative',
        background: dark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
        borderRadius: 24, border: `1px dashed ${tc.borderCol}`, marginBottom: 20
      }}>
        {/* Dynamic centered Grid container */}
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
                className={cell.revealed ? "correct-cell" : ""}
                style={{
                  position: 'absolute',
                  left: left + 2,
                  top: top + 2,
                  width: gridLayout.cellSize - 4,
                  height: gridLayout.cellSize - 4,
                  borderRadius: 8,
                  border: `2px solid ${cell.revealed ? (tc.accent || '#6C5CE7') : tc.borderCol}`,
                  background: cell.revealed
                    ? (dark ? 'rgba(108,92,231,0.12)' : 'rgba(108,92,231,0.06)')
                    : tc.surface,
                  boxShadow: cell.revealed
                    ? `0 2px 8px ${(tc.accent || '#6C5CE7')}33`
                    : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: gridLayout.cellSize * 0.42,
                  color: cell.revealed ? (tc.accent || '#6C5CE7') : 'transparent',
                  transition: 'all 0.3s',
                }}
              >
                {cell.letter}
              </div>
            )
          })}
        </div>
      </div>

      {/* Word Composition Preview Bubble */}
      <div style={{
        height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, position: 'relative'
      }}>
        {currentWord && (
          <div
            key={currentWord}
            style={{
              background: tc.accent || '#6C5CE7',
              color: '#FFF',
              fontFamily: "'Fredoka One', cursive",
              fontSize: 18,
              padding: '8px 20px',
              borderRadius: 100,
              boxShadow: '0 8px 24px rgba(108,92,231,0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              letterSpacing: '1px',
              animation: 'bubblePulse 1.2s infinite'
            }}
          >
            {selectedIndices.map(idx => shuffledLetters[idx]).join(' • ')}
          </div>
        )}
        
        {/* Verification banner overlays */}
        {feedbackText && (
          <div
            key={feedbackKey}
            style={{
              position: 'absolute',
              background: feedbackColor,
              color: '#FFF',
              fontWeight: 800,
              fontSize: 12,
              padding: '6px 16px',
              borderRadius: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              animation: 'tileCorrectPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
              zIndex: 10
            }}
          >
            {feedbackText}
          </div>
        )}
      </div>

      {/* Controls & Wheel Section */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16
      }}>
        {/* Tap fallback manual controls */}
        {selectedIndices.length > 0 && (
          <div style={{
            display: 'flex', gap: 12, animation: 'tileCorrectPop 0.25s ease'
          }}>
            <button
              onClick={() => { play('click'); setSelectedIndices([]) }}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1.5px solid rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
                padding: '6px 14px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reset ❌
            </button>
            <button
              onClick={() => { play('click'); submitWord() }}
              style={{
                background: tc.accent || '#6C5CE7',
                border: 'none',
                color: '#FFF',
                padding: '6px 18px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(108,92,231,0.2)'
              }}
            >
              Kirim ✔️
            </button>
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
          position: 'relative', width: '100%'
        }}>
          {/* Left Button: Shuffle */}
          <button
            onClick={handleShuffle}
            disabled={won || failed}
            style={{
              width: 44, height: 44, borderRadius: 14,
              border: `2px solid ${tc.borderCol}`, background: tc.surface,
              color: tc.textMain, fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 6px rgba(0,0,0,0.05)',
              opacity: won || failed ? 0.5 : 1, transition: 'all 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = tc.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = tc.borderCol}
          >
            🔀
          </button>

          {/* Wheel Container */}
          <div
            ref={containerRef}
            onMouseDown={(e) => handlePointerStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
            onMouseUp={handlePointerEnd}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                handlePointerStart(e.touches[0].clientX, e.touches[0].clientY)
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length > 0) {
                handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)
              }
            }}
            onTouchEnd={handlePointerEnd}
            style={{
              width: 240, height: 240, borderRadius: '50%',
              background: dark ? '#161B30' : '#E8EEF8',
              border: `4px solid ${dark ? '#252C48' : '#D0DBEB'}`,
              position: 'relative', touchAction: 'none',
              boxShadow: dark ? 'inset 0 4px 12px rgba(0,0,0,0.4)' : 'inset 0 4px 10px rgba(0,0,0,0.06)',
              userSelect: 'none'
            }}
          >
            {/* Center wheel circle button (Submit Checkmark or Mascot Core) */}
            <div
              onClick={() => {
                if (selectedIndices.length > 0) submitWord()
              }}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 64, height: 64, borderRadius: '50%',
                background: selectedIndices.length > 0 ? (tc.accent || '#6C5CE7') : (dark ? '#202640' : '#DBE4F2'),
                border: `3px solid ${dark ? '#2E365C' : '#C7D5EB'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: selectedIndices.length > 0 ? '0 4px 12px rgba(108,92,231,0.4)' : 'none',
                fontFamily: "'Fredoka One', cursive", fontSize: 20,
                color: selectedIndices.length > 0 ? '#FFF' : tc.textMuted,
                cursor: selectedIndices.length > 0 ? 'pointer' : 'default',
                transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                zIndex: 5
              }}
            >
              {selectedIndices.length > 0 ? '✔️' : '🧠'}
            </div>

            {/* SVG lines overlay */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {selectedIndices.map((idx, i) => {
                if (i === 0) return null
                const prevIdx = selectedIndices[i - 1]
                const p1 = wheelPositions[prevIdx]
                const p2 = wheelPositions[idx]
                return (
                  <line
                    key={`line-${i}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={tc.accent || '#6C5CE7'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    filter="url(#glow)"
                  />
                )
              })}
              {isDragging && selectedIndices.length > 0 && currentPointer && (
                <line
                  x1={wheelPositions[selectedIndices[selectedIndices.length - 1]].x}
                  y1={wheelPositions[selectedIndices[selectedIndices.length - 1]].y}
                  x2={currentPointer.x}
                  y2={currentPointer.y}
                  stroke={tc.accent || '#6C5CE7'}
                  strokeWidth="5"
                  strokeDasharray="4,4"
                  strokeLinecap="round"
                />
              )}
            </svg>

            {/* Letter buttons around wheel */}
            {shuffledLetters.map((letter, i) => {
              const pos = wheelPositions[i]
              const isSelected = selectedIndices.includes(i)
              return (
                <div
                  key={`letter-btn-${i}`}
                  onClick={() => handleLetterTap(i)}
                  className="anagram-letter-btn"
                  style={{
                    position: 'absolute',
                    left: pos.x - 25,
                    top: pos.y - 25,
                    background: isSelected
                      ? (tc.accent || '#6C5CE7')
                      : (dark ? '#2C3558' : '#FFF'),
                    color: isSelected ? '#FFF' : tc.textMain,
                    border: `3px solid ${isSelected ? '#FFF' : (dark ? '#3C497B' : '#C7D5EB')}`,
                    boxShadow: isSelected
                      ? `0 0 14px ${(tc.accent || '#6C5CE7')}`
                      : '0 3px 8px rgba(0,0,0,0.06)',
                    transform: isSelected ? 'scale(1.18)' : 'scale(1)',
                    zIndex: 4,
                    cursor: 'pointer'
                  }}
                >
                  {letter}
                </div>
              )
            })}
          </div>

          {/* Right Button: Hint */}
          <button
            onClick={handleHint}
            disabled={won || failed}
            style={{
              width: 44, height: 44, borderRadius: 14,
              border: `2px solid ${tc.borderCol}`, background: tc.surface,
              color: tc.textMain, fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 6px rgba(0,0,0,0.05)',
              opacity: won || failed ? 0.5 : 1, transition: 'all 0.15s',
              position: 'relative'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = tc.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = tc.borderCol}
          >
            💡
            <span style={{
              position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)',
              fontSize: 8, color: '#F9A825', fontWeight: 800, whiteSpace: 'nowrap'
            }}>
              🪙15
            </span>
          </button>
        </div>
      </div>

      {/* Win Modal overlay */}
      {won && (
        <WinModal
          emoji="🏆"
          title={`Level ${levelIndex + 1} Selesai!`}
          subtitle={`Kamu menemukan semua kata target dengan sangat baik.`}
          diffLabel={diffId === 'easy' ? 'Mudah' : diffId === 'medium' ? 'Sedang' : 'Sulit'}
          stats={[
            { label: 'Waktu Sisa', value: `${timeRemaining}s`, color: '#00B894' },
            { label: 'Hint Dipakai', value: hintCount, color: '#F9A825' },
            { label: 'Kata Ekstra', value: extraWordsFound.length, color: '#A29BFE' }
          ]}
          stars={hintCount === 0 ? 3 : hintCount <= 2 ? 2 : 1}
          coinReward={
            (diffId === 'easy' ? 10 : diffId === 'medium' ? 20 : 35) +
            extraWordsFound.length * 2
          }
          onRestart={handleRestart}
          onBack={onBack}
          onHome={onHome}
          dark={dark}
          gameColor={game?.color || '#FDCB6E'}
          restartLabel="Main Lagi"
          backLabel="Selesai"
        />
      )}

      {/* Lose Modal overlay */}
      {failed && (
        <LoseModal
          emoji="😢"
          title="Waktu Habis!"
          subtitle="Jangan menyerah! Tekanan waktu melatih refleks kognitif."
          stats={[
            { label: 'Kata Ditemukan', value: `${foundWords.length}/${currentLevel.targetWords.length}`, color: '#FF6B6B' },
            { label: 'Kata Ekstra', value: extraWordsFound.length, color: '#F9A825' }
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
