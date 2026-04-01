// LetterTiles.jsx — Word puzzle game using Kenney letter-tile assets
// Arrange shuffled letter tiles to form the correct word
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'
import { WinModal, LoseModal } from '../../components/GameLayout.jsx'
import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

// ─── Word banks per length (STRICTLY LENGTH-VERIFIED) ───────────────────────
const WORDS_3 = [
  'AIR','API','ARI','ASI','AYU','BAK','BAU','BOR','BUS','CAP',
  'DIA','DUA','EKO','FAN','GAS','HAL','IGA','JAM','KAS','LAS',
  'MAU','NAK','OPA','PAS','RES','SAK','TAK','UBI','VIA','WAK',
  'ZAT','ALI','BAB','CAT','DAS','ERA','FIN','GAP','HIS','IKA',
  'JAB','KAP','LAP','MAP','NAP','OBA','PAK','RAK','SAP','TAP',
]
const WORDS_4 = [
  'BUKU','MEJA','PENA','TOPI','BAJU','KAKI','MATA','GIGI','BOLA','KUDA',
  'SAPI','AYAM','IKAN','KAYU','BATU','EMAS','NASI','ROTI','GULA','MADU',
  'SUSU','TAHU','JAMU','DANA','GURU','OBAT','RASA','TAMU','WALI','YOGA',
  'LAGU','PADI','RAJA','UANG','CUKA','DIAM','GAJI','JIWA','KOPI','LABA',
  'MASA','NAGA','PETA','SENI','TARI','BESI','DESA','HARI','KAIN','RODA',
]
const WORDS_5 = [
  'BUNGA','POHON','MURID','LAPAR','DUDUK','LEMBU','ORGAN','HUJAN','ANGIN',
  'PANAS','BADAI','SALJU','MERAH','KULIT','BULAN','SURAT','RUMAH','MOBIL',
  'PINTU','KASUR','PAGAR','TUBUH','MAWAR','BAKSO','CUKUP','DUNIA','EMPAT',
  'FAJAR','GELAR','HARTA','INDAH','JUARA','KARYA','MINAT','NYATA','PIKIR',
  'REKAN','SABAR','TEPAT','UMRAH','VALAS','WAJAH','MAKAN','MINUM','TIDUR',
  'LAWAN','JALUR','PESTA','ZAKAT','KURSI','SAWAH','TANAH','ASPAL','TIMUR',
]
const WORDS_6 = [
  'BERAPA','DATANG','GLOBAL','JANGAN','KARENA','LASKAR','PALING','RAHMAT',
  'SAMPAI','TAMBAH','ZIARAH','BANGSA','CAHAYA','DAMPAK','FAKTOR','GALANG',
  'HARIAN','IKHLAS','JUTAAN','KACANG','NEGARA','PATUNG','RAMBUT','TARIAN',
  'BELAJAR','HADIAH','JUMLAH','KONTOL','MUSYIK','LAPANG','PARANG','SUMBER',
  'TUJUAN','UTUSAN','WADAHI','BARANG','CETAKAN','DERITA','FORMASI',
].filter(w => w.length === 6) // safety filter
const WORDS_7 = [
  'BELAJAR','MEMBACA','MENULIS','BERMAIN','BERLARI','BERTAMU','DATARAN',
  'EDUKASI','FANTASI','GERAKAN','HARAPAN','ILMUWAN','JUTAWAN','LAMARAN',
  'MANAJER','NASEHAT','PANDUAN','UCAPKAN','BERKALA','CAHALAN','DAMPAKI',
  'FORMASI','GAPUKAN','HITUNGI','JADIKAN','KELUHAN','LUAPKAN','MANDIRI',
  'NASABAH','PAKAIAN','RINDUAN','SELATAN','TEMUKAN','USAHAAN','WARISKAN',
].filter(w => w.length === 7) // safety filter

// ─── Level system (30 levels) ───────────────────────────────────────────────
function generateLevels() {
  const levels = []
  const banks = [
    { words: WORDS_3, len: 3 },
    { words: WORDS_4, len: 4 },
    { words: WORDS_5, len: 5 },
    { words: WORDS_6, len: 6 },
    { words: WORDS_7, len: 7 },
  ]
  // 6 levels per word-length group
  banks.forEach(({ words, len }) => {
    // Extra safety: only use words that match expected length
    const validWords = words.filter(w => w.length === len)
    if (validWords.length === 0) return
    const shuffled = [...validWords].sort(() => Math.random() - 0.5)
    for (let i = 0; i < 6; i++) {
      levels.push({
        word: shuffled[i % shuffled.length].toUpperCase(),
        len,
        levelNum: levels.length + 1,
      })
    }
  })
  return levels
}

// ─── Difficulty configs ─────────────────────────────────────────────────────
const DIFF_CFG = {
  easy:   { maxLevels: 10, timeLimitPerLevel: 60, hintsAllowed: 3, label: '🟢 Mudah',   startLen: 3 },
  medium: { maxLevels: 20, timeLimitPerLevel: 45, hintsAllowed: 2, label: '🟡 Sedang',  startLen: 3 },
  hard:   { maxLevels: 30, timeLimitPerLevel: 30, hintsAllowed: 1, label: '🔴 Sulit',   startLen: 3 },
}

// ─── Tutorial steps ─────────────────────────────────────────────────────────
const TUTORIAL_STEPS = [
  { emoji: '🔤', title: 'Letter Tiles', desc: 'Susun huruf-huruf acak untuk membentuk kata yang benar!', tip: 'Ketuk huruf di bawah untuk memindahkannya ke slot jawaban. Ketuk huruf di slot untuk mengembalikannya.' },
  { emoji: '⏱️', title: 'Waktu & Level', desc: 'Setiap level punya batas waktu. Mulai dari kata 3 huruf dan naik sampai 7 huruf!', tip: 'Jawaban akan dicek otomatis saat semua slot terisi. Gunakan Hint kalau bingung!' },
  { emoji: '⭐', title: 'Skor & Bintang', desc: 'Skor berdasarkan kecepatan dan penggunaan hint. Dapatkan 3 bintang untuk performa terbaik!', tip: 'Selesaikan tanpa hint dan sisa waktu banyak untuk skor tertinggi.' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Get tile image path from kenney assets (Wood style)
function getTileImage(letter) {
  return `/kenney_letter-tiles/PNG/Wood/letter_${letter.toUpperCase()}.png`
}

// ─── Tile Component ─────────────────────────────────────────────────────────
function LetterTile({ letter, index, isSelected, isCorrect, isWrong, onClick, size }) {
  const tileSize = size <= 3 ? 80 : size <= 4 ? 72 : size <= 5 ? 64 : size <= 6 ? 56 : 50

  return (
    <div
      onClick={() => onClick(index)}
      style={{
        width: tileSize,
        height: tileSize,
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: isSelected ? 'scale(1.15) translateY(-8px)' : isCorrect ? 'scale(1.05)' : isWrong ? 'translateX(0)' : 'scale(1)',
        filter: isSelected ? 'brightness(1.2) drop-shadow(0 8px 16px rgba(0,0,0,0.35))' : isCorrect ? 'brightness(1.1) hue-rotate(80deg)' : 'none',
        animation: isWrong ? 'tileShake 0.5s ease' : isCorrect ? 'tileCorrectPop 0.4s ease' : 'none',
        zIndex: isSelected ? 10 : 1,
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <img
        src={getTileImage(letter)}
        alt={letter}
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          borderRadius: 6,
          boxShadow: isSelected
            ? '0 8px 24px rgba(162,155,254,0.5), 0 0 0 3px #A29BFE'
            : '0 3px 10px rgba(0,0,0,0.2)',
        }}
      />
      {/* Selection ring */}
      {isSelected && (
        <div style={{
          position: 'absolute', inset: -3, borderRadius: 10,
          border: '3px solid #A29BFE',
          boxShadow: '0 0 16px rgba(162,155,254,0.6)',
          pointerEvents: 'none',
          animation: 'tilePulse 1s ease infinite',
        }} />
      )}
    </div>
  )
}

// ─── Empty Slot ─────────────────────────────────────────────────────────────
function EmptySlot({ index, hasLetter, letter, onClick, isRevealed, size, isCorrectPos, isWrongPos }) {
  const tileSize = size <= 3 ? 80 : size <= 4 ? 72 : size <= 5 ? 64 : size <= 6 ? 56 : 50

  return (
    <div
      onClick={() => onClick(index)}
      style={{
        width: tileSize,
        height: tileSize,
        borderRadius: 10,
        border: hasLetter
          ? isCorrectPos ? '3px solid #00B894' : isWrongPos ? '3px solid #FF6B6B' : 'none'
          : '3px dashed rgba(162,155,254,0.4)',
        background: hasLetter ? 'transparent' : 'rgba(162,155,254,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: hasLetter ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
    >
      {hasLetter && letter && (
        <img
          src={getTileImage(letter)}
          alt={letter}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            borderRadius: 6,
            boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
            opacity: isRevealed ? 0.7 : 1,
          }}
        />
      )}
      {isRevealed && (
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          background: '#FFD93D', borderRadius: '50%',
          width: 16, height: 16, fontSize: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>💡</div>
      )}
      {!hasLetter && (
        <span style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: 18,
          color: 'rgba(162,155,254,0.3)',
        }}>
          {index + 1}
        </span>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function LetterTiles({ onBack, onHome, game, difficulty }) {
  const cfg = DIFF_CFG[difficulty?.id] || DIFF_CFG.easy
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()
  const tc = useThemeColors()

  // ── State ───────────────────────────────────────────────────────────────
  const [levels] = useState(() => generateLevels())
  const [currentLevel, setCurrentLevel] = useState(0)
  const [phase, setPhase] = useState('tutorial') // tutorial | ready | playing | correct | levelComplete | won | lost
  const [shuffledLetters, setShuffledLetters] = useState([]) // letters in the shufflable pool
  const [answerSlots, setAnswerSlots] = useState([]) // { letter, fromIndex, revealed }
  const [selectedTile, setSelectedTile] = useState(null) // index of selected tile in pool
  const [timeLeft, setTimeLeft] = useState(cfg.timeLimitPerLevel)
  const [totalScore, setTotalScore] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [totalHintsUsed, setTotalHintsUsed] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [shakeAnswer, setShakeAnswer] = useState(false)
  const [correctAnim, setCorrectAnim] = useState(false)
  const [levelsCompleted, setLevelsCompleted] = useState(0)
  const [toast, setToast] = useState('')
  const [wrongSlots, setWrongSlots] = useState([]) // indices of wrong-positioned slots
  const [correctSlots, setCorrectSlots] = useState([]) // indices of correct-positioned slots
  const timerRef = useRef(null)
  const autoCheckRef = useRef(false)

  const level = levels[currentLevel]
  const maxLevels = Math.min(cfg.maxLevels, levels.length)

  // ── Toast helper ──────────────────────────────────────────────────────
  const showToast = useCallback((msg, duration = 2000) => {
    setToast(msg)
    setTimeout(() => setToast(''), duration)
  }, [])

  // ── Timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') {
      clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          play('gameOver')
          setPhase('lost')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, play])

  // ── Start a level ─────────────────────────────────────────────────────
  const startLevel = useCallback((lvlIndex) => {
    const lvl = levels[lvlIndex]
    if (!lvl) return
    const letters = lvl.word.split('')
    let shuffled = shuffleArray(letters)
    // Ensure shuffled !== original
    while (shuffled.join('') === letters.join('') && letters.length > 1) {
      shuffled = shuffleArray(letters)
    }
    setShuffledLetters(shuffled)
    setAnswerSlots(Array(lvl.word.length).fill(null))
    setSelectedTile(null)
    setTimeLeft(cfg.timeLimitPerLevel)
    setHintsUsed(0)
    setShakeAnswer(false)
    setCorrectAnim(false)
    setWrongSlots([])
    setCorrectSlots([])
    setToast('')
    autoCheckRef.current = false
    setPhase('playing')
  }, [levels, cfg.timeLimitPerLevel])

  // ── Check answer (called automatically when all slots filled) ─────────
  const checkAnswer = useCallback((slots) => {
    if (phase !== 'playing') return
    const filled = slots.every(s => s !== null)
    if (!filled) return

    const formed = slots.map(s => s.letter).join('')

    if (formed === level.word) {
      // ✅ CORRECT!
      play('match')
      clearInterval(timerRef.current)
      setCorrectAnim(true)
      setCorrectSlots(slots.map((_, i) => i))
      setWrongSlots([])
      showToast('✅ Benar! 🎉', 1500)

      // Score calculation: base + time bonus - hint penalty
      const baseScore = level.len * 100
      const timeBonus = Math.round(timeLeft / cfg.timeLimitPerLevel * 200)
      const hintPenalty = hintsUsed * 50
      const levelScore = Math.max(50, baseScore + timeBonus - hintPenalty)
      setTotalScore(prev => prev + levelScore)
      setLevelsCompleted(prev => prev + 1)

      setTimeout(() => {
        if (currentLevel + 1 >= maxLevels) {
          // All levels done — WIN!
          play('win')
          setShowConfetti(true)
          setPhase('won')
        } else {
          setPhase('levelComplete')
        }
      }, 1200)
    } else {
      // ❌ WRONG — show clear feedback
      play('mismatch')
      setShakeAnswer(true)

      // Mark which slots are correct/wrong
      const wrong = []
      const correct = []
      slots.forEach((slot, i) => {
        if (slot.letter === level.word[i]) {
          correct.push(i)
        } else {
          wrong.push(i)
        }
      })
      setWrongSlots(wrong)
      setCorrectSlots(correct)

      showToast('❌ Kata salah! Coba susun ulang', 2000)
      setTimeout(() => {
        setShakeAnswer(false)
        setWrongSlots([])
        setCorrectSlots([])
      }, 1500)
    }
  }, [phase, level, timeLeft, cfg.timeLimitPerLevel, hintsUsed, currentLevel, maxLevels, play, showToast])

  // ── Auto-check when all slots are filled ──────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    const filled = answerSlots.every(s => s !== null)
    if (filled && !autoCheckRef.current) {
      autoCheckRef.current = true
      // Small delay so user sees the last tile placed
      setTimeout(() => {
        checkAnswer(answerSlots)
        // Reset auto-check after feedback
        setTimeout(() => { autoCheckRef.current = false }, 1600)
      }, 300)
    }
  }, [answerSlots, phase, checkAnswer])

  // ── Handle tile click in pool ─────────────────────────────────────────
  const handlePoolTileClick = useCallback((index) => {
    if (phase !== 'playing') return
    play('click')

    if (selectedTile === index) {
      // Deselect
      setSelectedTile(null)
      return
    }

    if (selectedTile !== null) {
      // Swap two tiles in the pool
      play('flip')
      setShuffledLetters(prev => {
        const next = [...prev];
        [next[selectedTile], next[index]] = [next[index], next[selectedTile]]
        return next
      })
      setSelectedTile(null)
      return
    }

    // Place in first empty answer slot
    const emptyIdx = answerSlots.findIndex(s => s === null)
    if (emptyIdx !== -1) {
      play('flip')
      setAnswerSlots(prev => {
        const next = [...prev]
        next[emptyIdx] = { letter: shuffledLetters[index], poolIndex: index }
        return next
      })
      setShuffledLetters(prev => {
        const next = [...prev]
        next[index] = null // mark as used
        return next
      })
      setSelectedTile(null)
    }
  }, [phase, selectedTile, answerSlots, shuffledLetters, play])

  // ── Handle answer slot click (return letter to pool) ──────────────────
  const handleSlotClick = useCallback((index) => {
    if (phase !== 'playing') return
    const slot = answerSlots[index]
    if (!slot || slot.revealed) return

    play('click')
    // Return letter to pool
    setShuffledLetters(prev => {
      const next = [...prev]
      // Find first null spot or add back
      const emptyIdx = next.findIndex(l => l === null)
      if (emptyIdx !== -1) {
        next[emptyIdx] = slot.letter
      } else {
        next.push(slot.letter)
      }
      return next
    })
    setAnswerSlots(prev => {
      const next = [...prev]
      next[index] = null
      return next
    })
    // Clear feedback markers
    setWrongSlots([])
    setCorrectSlots([])
  }, [phase, answerSlots, play])

  // ── Manual Submit (backup) ────────────────────────────────────────────
  const submitAnswer = useCallback(() => {
    if (phase !== 'playing') return
    const filled = answerSlots.every(s => s !== null)
    if (!filled) {
      play('mismatch')
      setShakeAnswer(true)
      showToast('⚠️ Isi semua slot terlebih dahulu!', 1500)
      setTimeout(() => setShakeAnswer(false), 600)
      return
    }
    checkAnswer(answerSlots)
  }, [phase, answerSlots, play, checkAnswer, showToast])

  // ── Shuffle tiles ─────────────────────────────────────────────────────
  const handleShuffle = useCallback(() => {
    if (phase !== 'playing') return
    play('flip')
    // Return all answer letters to pool first
    const returnedLetters = []
    answerSlots.forEach(slot => {
      if (slot && !slot.revealed) {
        returnedLetters.push(slot.letter)
      }
    })

    const poolLetters = shuffledLetters.filter(l => l !== null)
    const allLetters = [...poolLetters, ...returnedLetters]
    const shuffled = shuffleArray(allLetters)

    setShuffledLetters(shuffled)
    setAnswerSlots(prev => prev.map(slot => (slot && slot.revealed) ? slot : null))
    setSelectedTile(null)
    setWrongSlots([])
    setCorrectSlots([])
  }, [phase, shuffledLetters, answerSlots, play])

  // ── Hint ──────────────────────────────────────────────────────────────
  const handleHint = useCallback(() => {
    if (phase !== 'playing') return
    if (hintsUsed >= cfg.hintsAllowed) return

    // Find first position where answer is not correctly placed
    let hintIdx = -1
    for (let i = 0; i < level.word.length; i++) {
      const slot = answerSlots[i]
      if (!slot || !slot.revealed) {
        hintIdx = i
        break
      }
    }
    if (hintIdx === -1) return

    const correctLetter = level.word[hintIdx]
    play('match')

    // If slot has a wrong letter, return it to pool
    const currentSlot = answerSlots[hintIdx]
    if (currentSlot && !currentSlot.revealed) {
      setShuffledLetters(prev => {
        const next = [...prev]
        const emptyIdx = next.findIndex(l => l === null)
        if (emptyIdx !== -1) next[emptyIdx] = currentSlot.letter
        else next.push(currentSlot.letter)
        return next
      })
    }

    // Remove the correct letter from pool
    setShuffledLetters(prev => {
      const next = [...prev]
      const idx = next.findIndex(l => l === correctLetter)
      if (idx !== -1) next[idx] = null
      return next
    })

    // Place it in the answer
    setAnswerSlots(prev => {
      const next = [...prev]
      next[hintIdx] = { letter: correctLetter, revealed: true }
      return next
    })

    setHintsUsed(h => h + 1)
    setTotalHintsUsed(h => h + 1)
    showToast(`💡 Huruf ke-${hintIdx + 1}: ${correctLetter}`, 1200)
  }, [phase, hintsUsed, cfg.hintsAllowed, answerSlots, level, play, showToast])

  // ── Next Level ────────────────────────────────────────────────────────
  const nextLevel = useCallback(() => {
    play('click')
    setCurrentLevel(prev => prev + 1)
    startLevel(currentLevel + 1)
  }, [play, currentLevel, startLevel])

  // ── Restart ───────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    play('click')
    setCurrentLevel(0)
    setTotalScore(0)
    setTotalHintsUsed(0)
    setLevelsCompleted(0)
    setShowConfetti(false)
    setPhase('ready')
  }, [play])

  // ── Report results ────────────────────────────────────────────────────
  const stars = totalScore > 2000 ? 3 : totalScore > 1000 ? 2 : 1
  const coinReward = Math.floor(totalScore / 100) + stars * 5
  const didReport = useRef(false)

  useEffect(() => {
    if (phase === 'won' && !didReport.current) {
      didReport.current = true
      if (coinReward > 0) earnCoins(coinReward, 'Letter Tiles')
      reportGameResult({
        gameId: 'letter-tiles',
        difficultyId: difficulty?.id || 'easy',
        score: totalScore,
        stars,
        won: true,
        timeSec: levelsCompleted * cfg.timeLimitPerLevel,
      })
      // Dispatch event for analytics
      window.dispatchEvent(new CustomEvent('bp-game-result', {
        detail: {
          gameId: 'letter-tiles',
          difficultyId: difficulty?.id || 'easy',
          score: totalScore,
          stars,
          timeSec: levelsCompleted * cfg.timeLimitPerLevel,
          coinEarned: coinReward,
          xpEarned: totalScore,
        },
      }))
    }
  }, [phase])

  // ── Colors ────────────────────────────────────────────────────────────
  const accent = '#A29BFE'
  const accentAlt = '#6C5CE7'
  const bg = tc.bg
  const surface = tc.surface
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const borderCol = tc.borderCol
  const dark = tc.dark

  // ── Tutorial ──────────────────────────────────────────────────────────
  if (phase === 'tutorial') {
    return (
      <TutorialModal
        steps={TUTORIAL_STEPS}
        color={accent}
        onClose={() => setPhase('ready')}
        storageKey="tut-letter-tiles"
      />
    )
  }

  // ── Ready screen ──────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div style={{ minHeight: '100dvh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <style>{`
          @keyframes floatTile { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-12px) rotate(3deg)} }
          @keyframes readyPulse { 0%,100%{box-shadow:0 6px 24px ${accent}44} 50%{box-shadow:0 6px 32px ${accent}66} }
        `}</style>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          {/* Floating tile preview */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            {['L','E','T','T','E','R'].map((l, i) => (
              <img
                key={i}
                src={getTileImage(l)}
                alt={l}
                style={{
                  width: 44, height: 44, borderRadius: 6,
                  animation: `floatTile 2s ${i * 0.2}s ease-in-out infinite`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              />
            ))}
          </div>

          <h1 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 32, color: accent, margin: '0 0 4px' }}>
            🔤 Letter Tiles
          </h1>
          <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: 12, color: accentAlt, margin: '0 0 4px', letterSpacing: 1 }}>
            Aksa Interactive
          </p>
          <p style={{ fontSize: 11, color: textMuted, margin: '0 0 20px', fontStyle: 'italic' }}>
            by Dwi Agus Hidayat
          </p>

          <div style={{
            background: surface, borderRadius: 16, padding: '16px 20px',
            border: `2px solid ${borderCol}`, marginBottom: 20,
          }}>
            <div style={{ fontSize: 14, color: textMain, fontWeight: 700, marginBottom: 8 }}>
              {cfg.label} — {cfg.maxLevels} Level
            </div>
            <div style={{ fontSize: 12, color: textMuted, lineHeight: 1.6 }}>
              ⏱️ {cfg.timeLimitPerLevel}s per level · 💡 {cfg.hintsAllowed} hint
            </div>
          </div>

          <button
            onClick={() => { play('click'); startLevel(0) }}
            style={{
              fontFamily: "'Fredoka One', cursive", fontSize: 20,
              padding: '15px 52px',
              background: `linear-gradient(135deg, ${accent}, ${accentAlt})`,
              color: '#fff', border: 'none', borderRadius: 16,
              cursor: 'pointer',
              boxShadow: `0 6px 24px ${accent}44`,
              animation: 'readyPulse 2s ease infinite',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            MULAI! 🚀
          </button>

          <div style={{ marginTop: 16 }}>
            <button onClick={() => { play('click'); onBack() }} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: 14 }}>
              ← Kembali
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Level Complete screen ─────────────────────────────────────────────
  if (phase === 'levelComplete') {
    const baseScore = level.len * 100
    const timeBonus = Math.round(timeLeft / cfg.timeLimitPerLevel * 200)
    const hintPenalty = hintsUsed * 50
    const levelScore = Math.max(50, baseScore + timeBonus - hintPenalty)

    return (
      <div style={{ minHeight: '100dvh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <style>{`
          @keyframes levelClearBounce { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
          @keyframes lcSlideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        `}</style>
        <div style={{
          background: surface, borderRadius: 28, padding: '32px 28px',
          textAlign: 'center', maxWidth: 380, width: '100%',
          boxShadow: `0 24px 80px rgba(0,0,0,0.2), 0 0 0 2px ${accent}22`,
          animation: 'levelClearBounce 0.5s ease',
        }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>✅</div>
          <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 26, color: textMain, marginBottom: 4 }}>
            Benar!
          </h2>
          <p style={{ color: accent, fontSize: 20, fontFamily: "'Fredoka One', cursive", marginBottom: 16 }}>
            {level.word}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20, animation: 'lcSlideUp 0.4s 0.2s ease both' }}>
            <div style={{ background: `${accent}15`, borderRadius: 14, padding: '10px 8px' }}>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: accent }}>{levelScore}</div>
              <div style={{ fontSize: 10, color: textMuted, fontWeight: 600 }}>Skor</div>
            </div>
            <div style={{ background: '#FFD93D15', borderRadius: 14, padding: '10px 8px' }}>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: '#F9A825' }}>{timeLeft}s</div>
              <div style={{ fontSize: 10, color: textMuted, fontWeight: 600 }}>Sisa</div>
            </div>
            <div style={{ background: '#00CEC915', borderRadius: 14, padding: '10px 8px' }}>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: '#00CEC9' }}>{currentLevel + 1}/{maxLevels}</div>
              <div style={{ fontSize: 10, color: textMuted, fontWeight: 600 }}>Level</div>
            </div>
          </div>

          <button
            onClick={nextLevel}
            style={{
              fontFamily: "'Fredoka One', cursive", fontSize: 18,
              padding: '14px 44px', width: '100%',
              background: `linear-gradient(135deg, ${accent}, ${accentAlt})`,
              color: '#fff', border: 'none', borderRadius: 14,
              cursor: 'pointer', boxShadow: `0 4px 16px ${accent}44`,
              animation: 'lcSlideUp 0.4s 0.4s ease both',
            }}
          >
            Level Berikutnya →
          </button>
        </div>
      </div>
    )
  }

  // ── Won / Lost modals ─────────────────────────────────────────────────
  if (phase === 'won') {
    return (
      <div style={{ minHeight: '100dvh', background: bg }}>
        <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
        <WinModal
          emoji="🏆"
          title="Game Selesai!"
          subtitle={`${levelsCompleted} level selesai`}
          diffLabel={cfg.label}
          stats={[
            { label: 'Total Skor', value: totalScore, color: accent },
            { label: 'Level', value: `${levelsCompleted}/${maxLevels}`, color: '#00CEC9' },
            { label: 'Hint', value: totalHintsUsed, color: '#FFD93D' },
          ]}
          stars={stars}
          coinReward={coinReward}
          onRestart={restart}
          onBack={() => { play('click'); onBack() }}
          onHome={onHome}
          dark={dark}
          gameColor={accent}
        />
      </div>
    )
  }

  if (phase === 'lost') {
    return (
      <div style={{ minHeight: '100dvh', background: bg }}>
        <LoseModal
          emoji="⏰"
          title="Waktu Habis!"
          subtitle={`Kata: ${level.word}`}
          diffLabel={cfg.label}
          stats={[
            { label: 'Total Skor', value: totalScore, color: accent },
            { label: 'Level', value: `${levelsCompleted}/${maxLevels}`, color: '#00CEC9' },
          ]}
          coinReward={0}
          onRestart={restart}
          onBack={() => { play('click'); onBack() }}
          onHome={onHome}
          dark={dark}
          gameColor="#FF6B6B"
        />
      </div>
    )
  }

  // ── Playing ───────────────────────────────────────────────────────────
  const timerPercent = (timeLeft / cfg.timeLimitPerLevel) * 100
  const timerColor = timerPercent > 50 ? '#00B894' : timerPercent > 25 ? '#F9A825' : '#FF6B6B'

  return (
    <div style={{ minHeight: '100dvh', background: bg, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes tileShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        @keyframes tileCorrectPop { 0%{transform:scale(1)} 40%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes tilePulse { 0%,100%{box-shadow:0 0 8px rgba(162,155,254,0.4)} 50%{box-shadow:0 0 16px rgba(162,155,254,0.7)} }
        @keyframes timerPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes slideDown { from{transform:translateY(-20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes toastIn { from{opacity:0;transform:translateY(-12px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes toastOut { from{opacity:1} to{opacity:0;transform:translateY(-6px)} }
      `}</style>

      {/* ── Toast Notification ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200,
          background: toast.includes('❌') ? '#FF6B6B' : toast.includes('✅') ? '#00B894' : dark ? '#2d2d3f' : '#333',
          color: '#fff',
          padding: '12px 28px', borderRadius: 100,
          fontSize: 15, fontWeight: 700,
          fontFamily: "'Fredoka One', cursive",
          animation: 'toastIn 0.25s ease',
          whiteSpace: 'nowrap',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}

      {/* ── Header Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: `1px solid ${borderCol}`,
        animation: 'slideDown 0.3s ease',
      }}>
        <button
          onClick={() => { play('click'); onBack() }}
          style={{
            background: surface, border: `2px solid ${borderCol}`,
            borderRadius: 10, padding: '7px 13px', color: textMuted,
            fontSize: 16, cursor: 'pointer', fontWeight: 700,
          }}
        >
          ←
        </button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 16, color: accent }}>
            Level {currentLevel + 1}/{maxLevels}
          </div>
          <div style={{ fontSize: 11, color: textMuted, fontWeight: 700 }}>
            {level.len} huruf
          </div>
        </div>

        <div style={{
          fontFamily: "'Fredoka One', cursive", fontSize: 16,
          color: timerColor,
          background: `${timerColor}15`, padding: '6px 14px',
          borderRadius: 10,
          animation: timeLeft <= 10 ? 'timerPulse 0.8s ease infinite' : 'none',
        }}>
          ⏱️ {timeLeft}s
        </div>
      </div>

      {/* ── Timer Bar ── */}
      <div style={{ height: 4, background: `${timerColor}22`, position: 'relative' }}>
        <div style={{
          height: '100%', background: timerColor,
          width: `${timerPercent}%`,
          transition: 'width 1s linear, background 0.5s',
          borderRadius: '0 2px 2px 0',
        }} />
      </div>

      {/* ── Stats Row ── */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 16,
        padding: '10px 16px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 16, color: accent }}>{totalScore}</span>
          <div style={{ fontSize: 10, color: textMuted, fontWeight: 600 }}>Skor</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 16, color: '#FFD93D' }}>
            💡 {cfg.hintsAllowed - hintsUsed}
          </span>
          <div style={{ fontSize: 10, color: textMuted, fontWeight: 600 }}>Hint</div>
        </div>
      </div>

      {/* ── Main Game Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 16px', gap: 28 }}>

        {/* Answer Slots */}
        <div>
          <div style={{ fontSize: 12, color: textMuted, fontWeight: 700, textAlign: 'center', marginBottom: 10, letterSpacing: 1 }}>
            SUSUN KATA
          </div>
          <div
            style={{
              display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
              animation: shakeAnswer ? 'tileShake 0.5s ease' : correctAnim ? 'tileCorrectPop 0.4s ease' : 'none',
              padding: '12px 16px',
              background: shakeAnswer ? 'rgba(255,107,107,0.08)' : correctAnim ? 'rgba(0,184,148,0.08)' : `${accent}08`,
              borderRadius: 16,
              border: shakeAnswer ? '2px solid rgba(255,107,107,0.3)' : correctAnim ? '2px solid rgba(0,184,148,0.3)' : `2px solid ${accent}22`,
              transition: 'background 0.3s, border-color 0.3s',
            }}
          >
            {answerSlots.map((slot, i) => (
              <EmptySlot
                key={i}
                index={i}
                hasLetter={!!slot}
                letter={slot?.letter}
                isRevealed={slot?.revealed}
                onClick={handleSlotClick}
                size={level.len}
                isCorrectPos={correctSlots.includes(i)}
                isWrongPos={wrongSlots.includes(i)}
              />
            ))}
          </div>
          {/* Helper text */}
          <div style={{ fontSize: 11, color: textMuted, textAlign: 'center', marginTop: 6, opacity: 0.6 }}>
            Ketuk huruf di atas untuk mengembalikan
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 60, height: 3, borderRadius: 2, background: `${accent}22` }} />

        {/* Tile Pool */}
        <div>
          <div style={{ fontSize: 12, color: textMuted, fontWeight: 700, textAlign: 'center', marginBottom: 10, letterSpacing: 1 }}>
            HURUF TERSEDIA
          </div>
          <div style={{
            display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
            padding: '12px 16px',
            background: surface,
            borderRadius: 16,
            border: `2px solid ${borderCol}`,
            minHeight: 60,
          }}>
            {shuffledLetters.map((letter, i) => (
              letter !== null ? (
                <LetterTile
                  key={`${i}-${letter}`}
                  letter={letter}
                  index={i}
                  isSelected={selectedTile === i}
                  isCorrect={false}
                  isWrong={false}
                  onClick={handlePoolTileClick}
                  size={level.len}
                />
              ) : (
                <div key={`empty-${i}`} style={{
                  width: level.len <= 3 ? 80 : level.len <= 4 ? 72 : level.len <= 5 ? 64 : level.len <= 6 ? 56 : 50,
                  height: level.len <= 3 ? 80 : level.len <= 4 ? 72 : level.len <= 5 ? 64 : level.len <= 6 ? 56 : 50,
                  borderRadius: 10,
                  border: `2px dashed ${borderCol}`,
                  opacity: 0.3,
                }} />
              )
            ))}
          </div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 10,
        padding: '16px 16px 28px',
        flexWrap: 'wrap',
      }}>
        {/* Shuffle */}
        <button
          onClick={handleShuffle}
          style={{
            fontFamily: "'Fredoka One', cursive", fontSize: 14,
            padding: '12px 20px',
            background: surface, color: textMuted,
            border: `2px solid ${borderCol}`, borderRadius: 100,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#F9A825'; e.currentTarget.style.color = '#F9A825' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = borderCol; e.currentTarget.style.color = textMuted }}
        >
          🔀 Acak
        </button>

        {/* Submit */}
        <button
          onClick={submitAnswer}
          style={{
            fontFamily: "'Fredoka One', cursive", fontSize: 16,
            padding: '12px 32px',
            background: `linear-gradient(135deg, ${accent}, ${accentAlt})`,
            color: '#fff', border: 'none', borderRadius: 100,
            cursor: 'pointer',
            boxShadow: `0 4px 16px ${accent}44`,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          ✅ Submit
        </button>

        {/* Hint */}
        <button
          onClick={handleHint}
          disabled={hintsUsed >= cfg.hintsAllowed}
          style={{
            fontFamily: "'Fredoka One', cursive", fontSize: 14,
            padding: '12px 20px',
            background: hintsUsed >= cfg.hintsAllowed ? `${borderCol}` : '#FFD93D22',
            color: hintsUsed >= cfg.hintsAllowed ? textMuted : '#F9A825',
            border: `2px solid ${hintsUsed >= cfg.hintsAllowed ? borderCol : '#FFD93D44'}`,
            borderRadius: 100,
            cursor: hintsUsed >= cfg.hintsAllowed ? 'not-allowed' : 'pointer',
            opacity: hintsUsed >= cfg.hintsAllowed ? 0.5 : 1,
            transition: 'all 0.15s',
          }}
        >
          💡 Hint ({cfg.hintsAllowed - hintsUsed})
        </button>
      </div>
    </div>
  )
}
