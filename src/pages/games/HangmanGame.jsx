import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
import { useState, useEffect, useCallback } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'

const TUTORIAL_STEPS = [
  { emoji:'💀', title:'Hangman', desc:'Tebak kata tersembunyi dengan memilih huruf satu per satu sebelum nyawamu habis!', tip:'Mulai dengan huruf vokal (A, I, U, E, O) untuk membuka lebih banyak huruf.' },
  { emoji:'🔤', title:'Cara Main', desc:'Pilih huruf dari keyboard. Jika huruf ada di kata, posisinya terbuka. Jika salah, nyawa berkurang!', tip:'Perhatikan pola kata yang sudah terbuka untuk menebak lebih akurat.' },
  { emoji:'⭐', title:'Sistem Bintang', desc:'Semakin sedikit kesalahan, semakin banyak bintang! Targetkan 0-1 salah untuk 3 bintang.', tip:'Easy: ≤2 salah, Medium: ≤2 salah, Hard: ≤1 salah untuk 3 bintang.' },
]

// Indonesian word lists by difficulty
const WORDS_EASY = [
  { word: 'KUCING', hint: 'Hewan peliharaan yang suka tidur' },
  { word: 'BUNGA', hint: 'Tanaman yang indah dan harum' },
  { word: 'HUJAN', hint: 'Air yang turun dari langit' },
  { word: 'MAKAN', hint: 'Aktivitas mengisi perut' },
  { word: 'TIDUR', hint: 'Istirahat dengan menutup mata' },
  { word: 'RUMAH', hint: 'Tempat tinggal keluarga' },
  { word: 'BUKU', hint: 'Berisi halaman untuk dibaca' },
  { word: 'AWAN', hint: 'Putih dan melayang di langit' },
  { word: 'KUDA', hint: 'Hewan berkaki empat yang cepat' },
  { word: 'IKAN', hint: 'Hewan yang hidup di air' },
  { word: 'BIRU', hint: 'Warna langit yang cerah' },
  { word: 'SAPI', hint: 'Hewan ternak penghasil susu' },
  { word: 'PAGI', hint: 'Waktu setelah matahari terbit' },
  { word: 'TOPI', hint: 'Aksesoris pelindung kepala' },
  { word: 'RODA', hint: 'Bagian kendaraan yang berputar' },
  { word: 'BOLA', hint: 'Benda bundar untuk olahraga' },
  { word: 'GULA', hint: 'Pemanis untuk minuman' },
  { word: 'LAMPU', hint: 'Sumber cahaya di rumah' },
  { word: 'ANGIN', hint: 'Udara yang bergerak' },
  { word: 'SINGA', hint: 'Raja hutan yang perkasa' },
]

const WORDS_MEDIUM = [
  { word: 'KOMPUTER', hint: 'Mesin elektronik untuk bekerja' },
  { word: 'SEKOLAH', hint: 'Tempat menuntut ilmu' },
  { word: 'BERMAIN', hint: 'Aktivitas menyenangkan anak-anak' },
  { word: 'GUNUNG', hint: 'Daratan yang sangat tinggi' },
  { word: 'PANTAI', hint: 'Tempat wisata tepi laut' },
  { word: 'JENDELA', hint: 'Lubang cahaya di dinding rumah' },
  { word: 'KUPU', hint: 'Serangga indah bersayap warna-warni' },
  { word: 'PAYUNG', hint: 'Pelindung dari hujan' },
  { word: 'TANGAN', hint: 'Anggota tubuh untuk memegang' },
  { word: 'SEPEDA', hint: 'Kendaraan dikayuh dua roda' },
  { word: 'POHON', hint: 'Tanaman besar yang rindang' },
  { word: 'CERMIN', hint: 'Kaca untuk melihat wajah sendiri' },
  { word: 'PENSIL', hint: 'Alat tulis dari kayu' },
  { word: 'GELANG', hint: 'Perhiasan melingkar di tangan' },
  { word: 'LAUTAN', hint: 'Kumpulan air asin yang sangat luas' },
  { word: 'MUSIK', hint: 'Seni suara yang merdu' },
  { word: 'KERTAS', hint: 'Bahan tipis untuk menulis' },
  { word: 'SENDOK', hint: 'Alat makan untuk menyuap' },
  { word: 'BULAN', hint: 'Benda langit penerang malam' },
  { word: 'SUNGAI', hint: 'Aliran air alami yang panjang' },
]

const WORDS_HARD = [
  { word: 'PERPUSTAKAAN', hint: 'Gedung koleksi buku untuk dibaca' },
  { word: 'KECERDASAN', hint: 'Kemampuan berpikir dan memahami' },
  { word: 'PEMANDANGAN', hint: 'Keindahan alam yang terlihat' },
  { word: 'KEBAHAGIAAN', hint: 'Perasaan senang dan puas' },
  { word: 'PENGETAHUAN', hint: 'Hasil dari belajar dan membaca' },
  { word: 'KEHIDUPAN', hint: 'Proses hidup makhluk dari lahir' },
  { word: 'PERJUANGAN', hint: 'Usaha keras untuk mencapai tujuan' },
  { word: 'PENGALAMAN', hint: 'Hal yang pernah dirasakan atau dilalui' },
  { word: 'MATAHARI', hint: 'Bintang terdekat pusat tata surya' },
  { word: 'KEINDAHAN', hint: 'Sesuatu yang enak dipandang' },
  { word: 'PERSAHABATAN', hint: 'Hubungan erat antar teman' },
  { word: 'KEMERDEKAAN', hint: 'Kebebasan dari penjajahan' },
  { word: 'PELANGI', hint: 'Lengkungan warna setelah hujan' },
  { word: 'KEBERANIAN', hint: 'Tidak takut menghadapi bahaya' },
  { word: 'PENERBANGAN', hint: 'Perjalanan menggunakan pesawat' },
  { word: 'KESEHATAN', hint: 'Kondisi tubuh yang baik' },
  { word: 'KEINGINAN', hint: 'Sesuatu yang sangat ingin dimiliki' },
  { word: 'PEKERJAAN', hint: 'Aktivitas mencari nafkah' },
  { word: 'PERJALANAN', hint: 'Berpindah dari satu tempat ke tempat lain' },
  { word: 'KEBERHASILAN', hint: 'Berhasil mencapai tujuan' },
]

const WORD_LISTS = { easy: WORDS_EASY, medium: WORDS_MEDIUM, hard: WORDS_HARD }

const MAX_WRONG = { easy: 8, medium: 7, hard: 6 }

const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
]

function getRandomWord(diffId) {
  const list = WORD_LISTS[diffId] || WORDS_EASY
  return list[Math.floor(Math.random() * list.length)]
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

const DIFF_LABEL = { easy: '🟢 Mudah', medium: '🟡 Sedang', hard: '🔴 Sulit' }

// Hangman figure SVG
function HangmanFigure({ wrongCount, maxWrong, color }) {
  const parts = []
  const headColor = color
  const bodyColor = color

  // Gallows always visible
  parts.push(
    <line key="base" x1="20" y1="180" x2="100" y2="180" stroke={bodyColor} strokeWidth="3" strokeLinecap="round" />,
    <line key="pole" x1="60" y1="180" x2="60" y2="20" stroke={bodyColor} strokeWidth="3" strokeLinecap="round" />,
    <line key="top" x1="60" y1="20" x2="140" y2="20" stroke={bodyColor} strokeWidth="3" strokeLinecap="round" />,
    <line key="rope" x1="140" y1="20" x2="140" y2="40" stroke={bodyColor} strokeWidth="3" strokeLinecap="round" />,
  )

  const bodyParts = [
    // Head
    <circle key="head" cx="140" cy="55" r="15" stroke={headColor} strokeWidth="3" fill="none" />,
    // Body
    <line key="body" x1="140" y1="70" x2="140" y2="115" stroke={bodyColor} strokeWidth="3" strokeLinecap="round" />,
    // Left arm
    <line key="larm" x1="140" y1="80" x2="115" y2="100" stroke={bodyColor} strokeWidth="3" strokeLinecap="round" />,
    // Right arm
    <line key="rarm" x1="140" y1="80" x2="165" y2="100" stroke={bodyColor} strokeWidth="3" strokeLinecap="round" />,
    // Left leg
    <line key="lleg" x1="140" y1="115" x2="115" y2="145" stroke={bodyColor} strokeWidth="3" strokeLinecap="round" />,
    // Right leg
    <line key="rleg" x1="140" y1="115" x2="165" y2="145" stroke={bodyColor} strokeWidth="3" strokeLinecap="round" />,
    // Left eye (X)
    <>
      <line key="lex1" x1="132" y1="48" x2="137" y2="53" stroke={headColor} strokeWidth="2" />
      <line key="lex2" x1="137" y1="48" x2="132" y2="53" stroke={headColor} strokeWidth="2" />
    </>,
    // Right eye (X)  
    <>
      <line key="rex1" x1="143" y1="48" x2="148" y2="53" stroke={headColor} strokeWidth="2" />
      <line key="rex2" x1="148" y1="48" x2="143" y2="53" stroke={headColor} strokeWidth="2" />
    </>,
  ]

  // Scale body parts to maxWrong
  const partsToShow = Math.min(wrongCount, bodyParts.length)
  for (let i = 0; i < partsToShow; i++) {
    parts.push(bodyParts[i])
  }

  return (
    <svg viewBox="0 0 200 190" style={{ width: '100%', maxWidth: 200 }}>
      {parts}
    </svg>
  )
}

export default function HangmanGame({ onBack, game, difficulty }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()

  const maxWrong = MAX_WRONG[difficulty.id] || 8

  const [wordData, setWordData] = useState(() => getRandomWord(difficulty.id))
  const [guessed, setGuessed] = useState(new Set())
  const [won, setWon] = useState(false)
  const [lost, setLost] = useState(false)
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('tut-hangman'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [hintUsed, setHintUsed] = useState(0)
  const [showHint, setShowHint] = useState(false)

  const word = wordData.word
  const wrongLetters = [...guessed].filter(l => !word.includes(l))
  const wrongCount = wrongLetters.length
  const isGameActive = !won && !lost
  const timerRunning = isGameActive && guessed.size > 0
  const time = useTimer(timerRunning, resetKey)

  const bestKey = `hangman-best-${difficulty.id}`
  const [bestWrong, setBestWrong] = useState(() => {
    const saved = localStorage.getItem(bestKey)
    return saved !== null ? parseInt(saved) : -1
  })

  // Check win/lose
  useEffect(() => {
    if (!isGameActive) return
    const wordLetters = new Set(word.split(''))
    const allGuessed = [...wordLetters].every(l => guessed.has(l))

    if (allGuessed && guessed.size > 0) {
      setWon(true)
      setShowConfetti(true)
      play('win')

      if (bestWrong === -1 || wrongCount < bestWrong) {
        localStorage.setItem(bestKey, wrongCount)
        setBestWrong(wrongCount)
      }

      const stars = wrongCount <= (difficulty.id === 'hard' ? 1 : 2) ? 3 : wrongCount <= (maxWrong / 2) ? 2 : 1
      reportGameResult({
        gameId: 'hangman',
        difficultyId: difficulty.id,
        won: true,
        score: Math.max(0, (maxWrong - wrongCount) * 50 + word.length * 10),
        stars,
        timeSec: time,
      })
      const coinReward = { easy: 15, medium: 25, hard: 40 }
      let coinAmount = coinReward[difficulty.id] || 15
      if (stars === 3) coinAmount += 20
      earnCoins(coinAmount, `Menang Hangman (${difficulty.id})`)
    } else if (wrongCount >= maxWrong) {
      setLost(true)
      play('gameOver')
      reportGameResult({
        gameId: 'hangman',
        difficultyId: difficulty.id,
        won: false,
        score: Math.max(0, word.split('').filter(l => guessed.has(l)).length * 10),
        stars: 0,
        timeSec: time,
      })
    }
  }, [guessed])

  const guessLetter = useCallback((letter) => {
    if (!isGameActive || guessed.has(letter)) return
    play(word.includes(letter) ? 'match' : 'mismatch')
    setGuessed(prev => new Set([...prev, letter]))
  }, [isGameActive, guessed, word, play])

  // Keyboard handler
  useEffect(() => {
    const handler = (e) => {
      const key = e.key.toUpperCase()
      if (key.length === 1 && key >= 'A' && key <= 'Z') {
        guessLetter(key)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [guessLetter])

  const useHintAction = () => {
    if (hintUsed >= 2 || !isGameActive) return
    play('click')
    if (hintUsed === 0) {
      // First hint: show the word hint
      setShowHint(true)
    } else {
      // Second hint: reveal a random unguessed letter
      const unguessedLetters = word.split('').filter(l => !guessed.has(l))
      if (unguessedLetters.length > 0) {
        const randomLetter = unguessedLetters[Math.floor(Math.random() * unguessedLetters.length)]
        setGuessed(prev => new Set([...prev, randomLetter]))
      }
    }
    setHintUsed(h => h + 1)
  }

  const restart = () => {
    play('click')
    setWordData(getRandomWord(difficulty.id))
    setGuessed(new Set())
    setWon(false)
    setLost(false)
    setShowConfetti(false)
    setHintUsed(0)
    setShowHint(false)
    setResetKey(k => k + 1)
  }

  // Theme
  const bg        = darkMode ? '#1a1a2e' : '#FFF9F0'
  const surface   = darkMode ? '#16213e' : '#fff'
  const textMain  = darkMode ? '#e8e8f0' : '#2D3436'
  const textMuted = darkMode ? '#8892b0' : '#636E72'
  const borderCol = darkMode ? '#2d3561' : '#DFE6E9'
  const accent    = '#E17055'

  const revealedWord = word.split('').map((letter, i) => ({
    letter,
    revealed: guessed.has(letter) || lost,
    index: i,
  }))

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px 60px', background: bg, minHeight: '100vh', transition: 'background 0.3s' }}>
      {showTutorial && <TutorialModal steps={TUTORIAL_STEPS} color={accent} onClose={() => { setShowTutorial(false); localStorage.setItem("tut-hangman","1") }} />}
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => { play('click'); onBack() }}
          style={{ background: surface, border: `2px solid ${borderCol}`, borderRadius: 12, padding: '8px 14px', fontSize: 18, cursor: 'pointer', color: textMain }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: textMain, lineHeight: 1 }}>
            💀 Hangman
          </h1>
          <p style={{ fontSize: 13, color: textMuted, marginTop: 2 }}>
            Tebak kata sebelum nyawa habis!
          </p>
        </div>
        <span style={{ background: difficulty.id === 'easy' ? '#E8F8F0' : difficulty.id === 'medium' ? '#FFFBF0' : '#FFF0F0', color: difficulty.id === 'easy' ? '#00b894' : difficulty.id === 'medium' ? '#f9a825' : '#FF6B6B', border: `2px solid ${difficulty.id === 'easy' ? '#00b89444' : difficulty.id === 'medium' ? '#f9a82544' : '#FF6B6B44'}`, borderRadius: 100, padding: '6px 14px', fontFamily: "'Fredoka One',cursive", fontSize: 13, whiteSpace: 'nowrap' }}>
          {DIFF_LABEL[difficulty.id]}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: '❤️ Nyawa', value: `${maxWrong - wrongCount}/${maxWrong}`, color: '#FF6B6B' },
          { label: '⏱ Waktu', value: formatTime(time), color: '#4ECDC4' },
          { label: '🔤 Huruf', value: `${guessed.size}`, color: '#A29BFE' },
        ].map(s => (
          <div key={s.label} style={{ background: surface, border: `2px solid ${s.color}33`, borderRadius: 16, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: textMuted, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Hangman Figure */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{ background: surface, borderRadius: 20, padding: 16, border: `2px solid ${borderCol}` }}>
          <HangmanFigure wrongCount={wrongCount} maxWrong={maxWrong} color={lost ? '#FF6B6B' : accent} />
        </div>
      </div>

      {/* Hint display */}
      {showHint && (
        <div style={{ background: darkMode ? '#2d2d1e' : '#FFFDE7', border: `2px solid #FFD93D44`, borderRadius: 14, padding: '10px 16px', textAlign: 'center', marginBottom: 16, fontSize: 14, color: textMuted }}>
          💡 <strong style={{ color: '#FFD93D' }}>Petunjuk:</strong> {wordData.hint}
        </div>
      )}

      {/* Word display */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {revealedWord.map((item, i) => (
          <div key={i} style={{
            width: 40, height: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderBottom: `3px solid ${item.revealed ? (lost && !guessed.has(item.letter) ? '#FF6B6B' : accent) : (darkMode ? '#4a4a6a' : '#B2BEC3')}`,
            fontFamily: "'Fredoka One',cursive",
            fontSize: 28,
            color: lost && !guessed.has(item.letter) ? '#FF6B6B' : textMain,
            transition: 'all 0.3s',
            transform: item.revealed ? 'scale(1)' : 'scale(0.8)',
            opacity: item.revealed ? 1 : 0,
          }}>
            {item.revealed ? item.letter : ''}
          </div>
        ))}
      </div>

      {/* Wrong letters */}
      {wrongLetters.length > 0 && (
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: textMuted, fontWeight: 600 }}>Salah: </span>
          {wrongLetters.map(l => (
            <span key={l} style={{ display: 'inline-block', margin: '0 3px', padding: '2px 8px', background: darkMode ? '#3a1a1a' : '#FFF0F0', color: '#FF6B6B', borderRadius: 6, fontSize: 14, fontWeight: 700, fontFamily: "'Fredoka One',cursive" }}>{l}</span>
          ))}
        </div>
      )}

      {/* Keyboard */}
      <div style={{ marginBottom: 24 }}>
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 6 }}>
            {row.map(letter => {
              const isGuessed = guessed.has(letter)
              const isCorrect = isGuessed && word.includes(letter)
              const isWrong = isGuessed && !word.includes(letter)
              return (
                <button key={letter} onClick={() => guessLetter(letter)} disabled={isGuessed || !isGameActive}
                  style={{
                    width: 34, height: 42,
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 15, fontWeight: 800,
                    fontFamily: "'Fredoka One',cursive",
                    cursor: (isGuessed || !isGameActive) ? 'default' : 'pointer',
                    background: isCorrect ? '#00b894' : isWrong ? '#FF6B6B' : (darkMode ? '#2d3561' : '#F1F3F5'),
                    color: isGuessed ? '#fff' : textMain,
                    opacity: isGuessed ? 0.7 : 1,
                    transition: 'all 0.2s',
                    transform: isGuessed ? 'scale(0.9)' : 'scale(1)',
                    boxShadow: isGuessed ? 'none' : `0 2px 8px ${darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'}`,
                  }}>
                  {letter}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={restart}
          style={{ background: accent, color: '#fff', border: 'none', borderRadius: 100, padding: '12px 28px', fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: 'pointer', boxShadow: `0 4px 14px ${accent}44` }}>
          🔄 Main Lagi
        </button>
        <button onClick={useHintAction} disabled={hintUsed >= 2 || !isGameActive}
          style={{ background: hintUsed>=2||!isGameActive ? 'rgba(255,255,255,0.05)' : 'rgba(255,211,61,0.15)', color: hintUsed>=2||!isGameActive ? textMuted : '#FFD93D', border: `2px solid ${hintUsed>=2||!isGameActive ? borderCol : '#FFD93D44'}`, borderRadius: 100, padding: '12px 18px', fontSize: 14, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: hintUsed>=2||!isGameActive ? 'default' : 'pointer' }}>
          💡 Hint ({2-hintUsed})
        </button>
        <button onClick={() => { play('click'); onBack() }}
          style={{ background: surface, color: textMuted, border: `2px solid ${borderCol}`, borderRadius: 100, padding: '12px 18px', fontSize: 14, fontWeight: 700, fontFamily: "'Fredoka One',cursive", cursor: 'pointer' }}>
          🎯 Level
        </button>
      </div>

      {/* Best record */}
      {bestWrong >= 0 && (
        <div style={{ marginTop: 20, background: darkMode ? '#1f1f3e' : '#FFF9F0', border: `2px solid ${darkMode ? '#3d3561' : '#FFE66D'}`, borderRadius: 16, padding: '12px 20px', textAlign: 'center', fontSize: 14, color: textMuted, fontWeight: 600 }}>
          🏆 Rekor {DIFF_LABEL[difficulty.id]}: <span style={{ color: accent, fontFamily: "'Fredoka One',cursive", fontSize: 16 }}>{bestWrong} salah</span>
        </div>
      )}

      {/* Win/Lose Modal */}
      {(won || lost) && (
        <ResultModal
          won={won}
          word={word}
          wrongCount={wrongCount}
          maxWrong={maxWrong}
          time={formatTime(time)}
          diffLabel={DIFF_LABEL[difficulty.id]}
          onRestart={restart}
          onBack={onBack}
          darkMode={darkMode}
          game={game}
          difficulty={difficulty}
        />
      )}
    </div>
  )
}

function ResultModal({ won, word, wrongCount, maxWrong, time, diffLabel, onRestart, onBack, darkMode, game, difficulty }) {
  const stars = won ? (wrongCount <= (difficulty.id === 'hard' ? 1 : 2) ? 3 : wrongCount <= (maxWrong / 2) ? 2 : 1) : 0
  const bg = darkMode ? '#1a1a2e' : '#fff'
  const textMain = darkMode ? '#e8e8f0' : '#2D3436'
  const textMuted = darkMode ? '#8892b0' : '#636E72'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ background: bg, borderRadius: 28, padding: '40px 36px', textAlign: 'center', maxWidth: 360, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>{won ? '🎉' : '💀'}</div>
        <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 32, color: textMain, marginBottom: 4 }}>
          {won ? 'Selamat!' : 'Game Over!'}
        </h2>
        <p style={{ color: textMuted, fontSize: 14, marginBottom: 6 }}>
          {won ? 'Kata berhasil ditebak!' : `Kata yang benar: `}
          {!won && <strong style={{ color: '#E17055', fontFamily: "'Fredoka One',cursive" }}>{word}</strong>}
        </p>
        <span style={{ display: 'inline-block', background: `${game.color}22`, color: game.color, padding: '4px 14px', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>{diffLabel}</span>

        {won && <div style={{ fontSize: 36, marginBottom: 16, letterSpacing: 4 }}>{'⭐'.repeat(stars)}{'☆'.repeat(3-stars)}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={{ background: darkMode ? '#2d1f1f' : '#FFF0F0', borderRadius: 14, padding: 12 }}>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: '#FF6B6B' }}>{wrongCount}</div>
            <div style={{ fontSize: 12, color: textMuted, fontWeight: 600 }}>Salah</div>
          </div>
          <div style={{ background: darkMode ? '#1a2d2d' : '#F0FFFE', borderRadius: 14, padding: 12 }}>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: '#4ECDC4' }}>{time}</div>
            <div style={{ fontSize: 12, color: textMuted, fontWeight: 600 }}>Waktu</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onRestart} style={{ flex: 1, background: '#E17055', color: '#fff', border: 'none', borderRadius: 100, padding: '13px 20px', fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive", cursor: 'pointer', boxShadow: '0 4px 14px #E1705544' }}>🔄 Main Lagi</button>
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
