import { useState, useEffect, useCallback } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

// ─── Word Banks dengan Kategori ──────────────────────────────────────────────
const WORD_LIST_4 = [
  { word:'BUKU',  kategori:'📚 Benda' },
  { word:'MEJA',  kategori:'📚 Benda' },
  { word:'TOPI',  kategori:'👕 Pakaian' },
  { word:'BAJU',  kategori:'👕 Pakaian' },
  { word:'KAKI',  kategori:'🧍 Tubuh' },
  { word:'MATA',  kategori:'🧍 Tubuh' },
  { word:'GIGI',  kategori:'🧍 Tubuh' },
  { word:'BOLA',  kategori:'⚽ Olahraga' },
  { word:'KUDA',  kategori:'🐾 Hewan' },
  { word:'SAPI',  kategori:'🐾 Hewan' },
  { word:'AYAM',  kategori:'🐾 Hewan' },
  { word:'IKAN',  kategori:'🐾 Hewan' },
  { word:'NASI',  kategori:'🍚 Makanan' },
  { word:'ROTI',  kategori:'🍚 Makanan' },
  { word:'GULA',  kategori:'🍚 Makanan' },
  { word:'MADU',  kategori:'🍚 Makanan' },
  { word:'SUSU',  kategori:'🥛 Minuman' },
  { word:'TAHU',  kategori:'🍚 Makanan' },
  { word:'BUAH',  kategori:'🍎 Buah' },
  { word:'DAUN',  kategori:'🌿 Alam' },
  { word:'BATU',  kategori:'🌿 Alam' },
  { word:'EMAS',  kategori:'💎 Mineral' },
  { word:'JALAN', kategori:'🏙 Tempat' },
  { word:'RUMAH', kategori:'🏙 Tempat' },
  { word:'PINTU', kategori:'🏠 Rumah' },
  { word:'ATAP',  kategori:'🏠 Rumah' },
  { word:'LAMPU', kategori:'🏠 Rumah' },
  { word:'SABUN', kategori:'🚿 Kebersihan' },
  { word:'GURU',  kategori:'🏫 Sekolah' },
  { word:'KELAS', kategori:'🏫 Sekolah' },
  { word:'MOBIL', kategori:'🚗 Kendaraan' },
  { word:'KAPAL', kategori:'🚗 Kendaraan' },
  { word:'HUJAN', kategori:'🌦 Cuaca' },
  { word:'ANGIN', kategori:'🌦 Cuaca' },
  { word:'PETIR', kategori:'🌦 Cuaca' },
  { word:'MERAH', kategori:'🎨 Warna' },
  { word:'HIJAU', kategori:'🎨 Warna' },
  { word:'HITAM', kategori:'🎨 Warna' },
  { word:'UNGU',  kategori:'🎨 Warna' },
  { word:'PENA',  kategori:'📚 Benda' },
]

const WORD_LIST_5 = [
  { word:'MAKAN',   kategori:'🍚 Aktivitas' },
  { word:'MINUM',   kategori:'🍚 Aktivitas' },
  { word:'TIDUR',   kategori:'😴 Aktivitas' },
  { word:'LARI',    kategori:'⚽ Olahraga' },
  { word:'RENANG',  kategori:'⚽ Olahraga' },
  { word:'POHON',   kategori:'🌿 Alam' },
  { word:'SUNGAI',  kategori:'🌿 Alam' },
  { word:'GUNUNG',  kategori:'🌿 Alam' },
  { word:'PANTAI',  kategori:'🌿 Alam' },
  { word:'HUTAN',   kategori:'🌿 Alam' },
  { word:'SAWAH',   kategori:'🌿 Alam' },
  { word:'KUCING',  kategori:'🐾 Hewan' },
  { word:'ANJING',  kategori:'🐾 Hewan' },
  { word:'BURUNG',  kategori:'🐾 Hewan' },
  { word:'ULAR',    kategori:'🐾 Hewan' },
  { word:'HARIMAU', kategori:'🐾 Hewan' },
  { word:'PISANG',  kategori:'🍎 Buah' },
  { word:'JERUK',   kategori:'🍎 Buah' },
  { word:'PEPAYA',  kategori:'🍎 Buah' },
  { word:'JAMBU',   kategori:'🍎 Buah' },
  { word:'DURIAN',  kategori:'🍎 Buah' },
  { word:'SENANG',  kategori:'💭 Perasaan' },
  { word:'MARAH',   kategori:'💭 Perasaan' },
  { word:'TAKUT',   kategori:'💭 Perasaan' },
  { word:'CINTA',   kategori:'💭 Perasaan' },
  { word:'BANGGA',  kategori:'💭 Perasaan' },
  { word:'PINTAR',  kategori:'🧠 Sifat' },
  { word:'CANTIK',  kategori:'🧠 Sifat' },
  { word:'BERANI',  kategori:'🧠 Sifat' },
  { word:'JUJUR',   kategori:'🧠 Sifat' },
  { word:'MALAM',   kategori:'🕐 Waktu' },
  { word:'SIANG',   kategori:'🕐 Waktu' },
  { word:'SUBUH',   kategori:'🕐 Waktu' },
  { word:'SENJA',   kategori:'🕐 Waktu' },
  { word:'MANIS',   kategori:'👅 Rasa' },
  { word:'PEDAS',   kategori:'👅 Rasa' },
  { word:'ASIN',    kategori:'👅 Rasa' },
  { word:'GURIH',   kategori:'👅 Rasa' },
  { word:'CEPAT',   kategori:'🏃 Sifat' },
  { word:'KERAS',   kategori:'🏃 Sifat' },
]

const WORD_LIST_6 = [
  { word:'BULAN',    kategori:'🌙 Luar Angkasa' },
  { word:'BINTANG',  kategori:'🌙 Luar Angkasa' },
  { word:'PELANGI',  kategori:'🌦 Alam' },
  { word:'GUNUNG',   kategori:'🌿 Alam' },
  { word:'SUNGAI',   kategori:'🌿 Alam' },
  { word:'DOKTER',   kategori:'💼 Profesi' },
  { word:'POLISI',   kategori:'💼 Profesi' },
  { word:'PETANI',   kategori:'💼 Profesi' },
  { word:'NELAYAN',  kategori:'💼 Profesi' },
  { word:'PEDAGANG', kategori:'💼 Profesi' },
  { word:'LIBURAN',  kategori:'✈️ Perjalanan' },
  { word:'WISATA',   kategori:'✈️ Perjalanan' },
  { word:'KEMAH',    kategori:'✈️ Perjalanan' },
  { word:'JAKARTA',  kategori:'🏙 Kota' },
  { word:'BANDUNG',  kategori:'🏙 Kota' },
  { word:'MEDAN',    kategori:'🏙 Kota' },
  { word:'BALI',     kategori:'🏙 Kota' },
  { word:'KOMPUTER', kategori:'💻 Teknologi' },
  { word:'KAMERA',   kategori:'💻 Teknologi' },
  { word:'PRINTER',  kategori:'💻 Teknologi' },
  { word:'BIOLOGI',  kategori:'📚 Pelajaran' },
  { word:'KIMIA',    kategori:'📚 Pelajaran' },
  { word:'FISIKA',   kategori:'📚 Pelajaran' },
  { word:'SEJARAH',  kategori:'📚 Pelajaran' },
  { word:'KAKAK',    kategori:'👨‍👩‍👧 Keluarga' },
  { word:'NENEK',    kategori:'👨‍👩‍👧 Keluarga' },
  { word:'KAKEK',    kategori:'👨‍👩‍👧 Keluarga' },
  { word:'SARAPAN',  kategori:'🍚 Waktu Makan' },
  { word:'JAJANAN',  kategori:'🍚 Makanan' },
  { word:'KEJUJURAN',kategori:'🧠 Nilai' },
  { word:'KEBERANIAN',kategori:'🧠 Nilai' },
  { word:'KESABARAN',kategori:'🧠 Nilai' },
  { word:'INTERNET', kategori:'💻 Teknologi' },
  { word:'OLAHRAGA', kategori:'⚽ Aktivitas' },
  { word:'MELUKIS',  kategori:'🎨 Seni' },
  { word:'BERNYANYI',kategori:'🎵 Seni' },
  { word:'MENARI',   kategori:'🎵 Seni' },
  { word:'MEMBACA',  kategori:'📚 Aktivitas' },
  { word:'MENULIS',  kategori:'📚 Aktivitas' },
  { word:'MEMASAK',  kategori:'🍳 Aktivitas' },
]

// Helpers
const WORDS_4 = WORD_LIST_4.map(w => w.word)
const WORDS_5 = WORD_LIST_5.map(w => w.word)
const WORDS_6 = WORD_LIST_6.map(w => w.word)

function getWordWithKategori(words, wordLists) {
  const idx  = Math.floor(Math.random() * words.length)
  const word = words[idx]
  const found = wordLists.find(w => w.word === word)
  return { word, kategori: found?.kategori || '📝 Kata' }
}

const TUTORIAL_STEPS = [
  { emoji:'💬', title:'Tebak Kata!', desc:'Tebak kata rahasia dalam 6 kesempatan. Setiap tebakan harus kata yang valid!', tip:'Kata berbeda panjangnya tergantung difficulty yang kamu pilih.' },
  { emoji:'🟩', title:'Petunjuk Warna', desc:'Hijau = huruf benar & posisi benar. Kuning = huruf ada tapi posisi salah. Abu-abu = huruf tidak ada di kata.', tip:'Gunakan warna sebagai petunjuk untuk tebakan berikutnya!' },
  { emoji:'⌨️', title:'Keyboard Virtual', desc:'Gunakan keyboard di bawah layar untuk mengetik. Warna keyboard akan berubah mengikuti petunjuk.', tip:'Kamu juga bisa ketik langsung pakai keyboard fisik di laptop/PC.' },
]

// ─── Config per difficulty ────────────────────────────────────────────────────
const DIFF_CFG = {
  easy:   { len: 4, words: WORDS_4, wordList: WORD_LIST_4, maxGuess: 6 },
  medium: { len: 5, words: WORDS_5, wordList: WORD_LIST_5, maxGuess: 6 },
  hard:   { len: 6, words: WORDS_6, wordList: WORD_LIST_6, maxGuess: 6 },
}

// ─── Keyboard layout ──────────────────────────────────────────────────────────
const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRandWord(words) {
  return words[Math.floor(Math.random() * words.length)]
}

function evaluateGuess(guess, answer) {
  const result = Array(guess.length).fill('absent')
  const ansArr = answer.split('')
  const gueArr = guess.split('')
  const used   = Array(answer.length).fill(false)

  // First pass: correct
  gueArr.forEach((ch, i) => {
    if (ch === ansArr[i]) { result[i] = 'correct'; used[i] = true }
  })
  // Second pass: present
  gueArr.forEach((ch, i) => {
    if (result[i] === 'correct') return
    const j = ansArr.findIndex((a, k) => a === ch && !used[k])
    if (j !== -1) { result[i] = 'present'; used[j] = true }
  })
  return result
}

function loadStats(diffId) {
  try { return JSON.parse(localStorage.getItem(`wordle-stats-${diffId}`)) || {} } catch { return {} }
}
function saveStats(diffId, s) {
  localStorage.setItem(`wordle-stats-${diffId}`, JSON.stringify(s))
}

// ─── Tile ─────────────────────────────────────────────────────────────────────
function Tile({ letter, state, flipDelay = 0, revealed, size }) {
  const colors = {
    correct: { bg:'#538D4E', border:'#538D4E', text:'#fff' },
    present: { bg:'#B59F3B', border:'#B59F3B', text:'#fff' },
    absent:  { bg:'#3A3A3C', border:'#3A3A3C', text:'#fff' },
    empty:   { bg:'transparent', border:'rgba(255,255,255,0.15)', text:'rgba(255,255,255,0.8)' },
    typing:  { bg:'transparent', border:'rgba(255,255,255,0.5)', text:'#fff' },
  }
  const s   = revealed ? (state || 'absent') : (letter ? 'typing' : 'empty')
  const col = colors[s]
  const fs  = size === 4 ? 26 : size === 5 ? 22 : 18

  return (
    <>
      <style>{`
        @keyframes tileFlip {
          0%   { transform: rotateX(0deg); }
          49%  { transform: rotateX(-90deg); }
          50%  { transform: rotateX(-90deg); }
          100% { transform: rotateX(0deg); }
        }
        @keyframes tilePop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        @keyframes tileShake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-6px); }
          40%     { transform: translateX(6px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(4px); }
        }
      `}</style>
      <div style={{
        width: '100%',
        aspectRatio: '1',
        border: `2.5px solid ${col.border}`,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Fredoka One', cursive",
        fontSize: fs,
        color: col.text,
        background: revealed ? col.bg : col.bg,
        fontWeight: 700,
        userSelect: 'none',
        transition: revealed ? 'none' : 'border-color 0.1s, background 0.1s',
        animation: revealed
          ? `tileFlip 0.5s ${flipDelay}s ease both`
          : letter ? 'tilePop 0.1s ease' : 'none',
        animationFillMode: 'both',
      }}>
        {letter}
      </div>
    </>
  )
}

// ─── Key button ───────────────────────────────────────────────────────────────
function Key({ k, state, onPress, darkMode }) {
  const colors = {
    correct: { bg:'#538D4E', text:'#fff' },
    present: { bg:'#B59F3B', text:'#fff' },
    absent:  { bg:'#3A3A3C', text:'#888' },
  }
  const wide = k === 'ENTER' || k === '⌫'
  const col  = colors[state] || { bg: darkMode ? '#818384' : '#d3d6da', text: darkMode ? '#fff' : '#1a1a1b' }

  return (
    <button
      onClick={() => onPress(k)}
      style={{
        height: 56,
        minWidth: wide ? 64 : 40,
        flex: wide ? '1.6 1 0' : '1 1 0',
        maxWidth: wide ? 72 : 46,
        borderRadius: 6,
        border: 'none',
        background: col.bg,
        color: col.text,
        fontFamily: "'Fredoka One', cursive",
        fontSize: wide ? 12 : 15,
        fontWeight: 800,
        cursor: 'pointer',
        transition: 'background 0.25s, transform 0.1s',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onPointerDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
      onPointerUp={e   => e.currentTarget.style.transform = 'scale(1)'}
      onPointerLeave={e=> e.currentTarget.style.transform = 'scale(1)'}
    >
      {k}
    </button>
  )
}

// ─── Share result ─────────────────────────────────────────────────────────────
function buildShareText(guesses, evaluations, answer, won, wordLen) {
  const emoji = { correct:'🟩', present:'🟨', absent:'⬛' }
  const rows  = evaluations.map(ev => ev.map(s => emoji[s]).join('')).join('\n')
  const title = won
    ? `BrainPlay Wordle ${wordLen} huruf ✅ ${guesses.length}/6`
    : `BrainPlay Wordle ${wordLen} huruf ❌`
  return `${title}\n\n${rows}\n\nMain di BrainPlay! 🎮`
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WordleGame({ onBack, game, difficulty }) {
  const cfg = DIFF_CFG[difficulty.id]
  const { play }    = useSound()
  const { darkMode } = useSettings()
  const dark = darkMode

  const [wordData,    setWordData]    = useState(() => getWordWithKategori(cfg.words, cfg.wordList))
  const answer = wordData.word
  const kategori = wordData.kategori
  const [guesses,     setGuesses]     = useState([])        // string[]
  const [evaluations, setEvaluations] = useState([])        // state[][]
  const [current,     setCurrent]     = useState('')        // current input
  const [phase,       setPhase]       = useState('playing') // playing|won|lost
  const [shake,       setShake]       = useState(false)
  const [revealRow,   setRevealRow]   = useState(-1)
  const [showTutorial,setShowTutorial]= useState(() => !localStorage.getItem('tut-wordle'))
  const [showConfetti,setShowConfetti]= useState(false)
  const [showStats,   setShowStats]   = useState(false)
  const [toast,       setToast]       = useState('')
  const [stats,       setStats]       = useState(() => loadStats(difficulty.id))

  // Key colors from evaluations
  const keyStates = {}
  evaluations.forEach((ev, gi) => {
    guesses[gi].split('').forEach((ch, ci) => {
      const prev = keyStates[ch]
      const cur  = ev[ci]
      if (!prev || cur === 'correct' || (cur === 'present' && prev === 'absent')) {
        keyStates[ch] = cur
      }
    })
  })

  // Show toast
  const showToast = (msg, duration = 1800) => {
    setToast(msg)
    setTimeout(() => setToast(''), duration)
  }

  // Submit guess
  const submitGuess = useCallback(() => {
    if (current.length !== cfg.len) {
      setShake(true); setTimeout(() => setShake(false), 600)
      showToast(`Kata harus ${cfg.len} huruf!`)
      play('mismatch'); return
    }

    const upper = current.toUpperCase()
    const ev    = evaluateGuess(upper, answer)
    const newGuesses = [...guesses, upper]
    const newEvals   = [...evaluations, ev]

    setRevealRow(newGuesses.length - 1)
    setGuesses(newGuesses)
    setEvaluations(newEvals)
    setCurrent('')

    const won = ev.every(s => s === 'correct')

    // Wait for flip animation then check result
    setTimeout(() => {
      if (won) {
        play('win')
        setPhase('won')
        setShowConfetti(true)
        const msgs = ['Luar biasa! 🔥','Keren banget! 🎉','Mantap! 💪','Bagus sekali! ⭐','Hebat! 🏆','Pas! 😅']
        showToast(msgs[Math.min(newGuesses.length - 1, msgs.length - 1)], 2500)
        // Update stats
        setStats(st => {
          const ns = {
            ...st,
            played:    (st.played   || 0) + 1,
            won:       (st.won      || 0) + 1,
            streak:    (st.streak   || 0) + 1,
            maxStreak: Math.max(st.maxStreak || 0, (st.streak || 0) + 1),
            dist:      { ...(st.dist||{}), [newGuesses.length]: ((st.dist||{})[newGuesses.length]||0)+1 },
          }
          saveStats(difficulty.id, ns); return ns
        })
      } else if (newGuesses.length >= cfg.maxGuess) {
        play('gameOver')
        setPhase('lost')
        showToast(`Jawabannya: ${answer}`, 4000)
        setStats(st => {
          const ns = { ...st, played:(st.played||0)+1, streak:0 }
          saveStats(difficulty.id, ns); return ns
        })
      }
    }, cfg.len * 300 + 200)
  }, [current, guesses, evaluations, answer, cfg, play])

  // Key press handler
  const handleKey = useCallback((k) => {
    if (phase !== 'playing') return
    if (k === 'ENTER') { submitGuess(); return }
    if (k === '⌫' || k === 'Backspace') {
      setCurrent(c => c.slice(0, -1)); return
    }
    if (/^[A-Za-z]$/.test(k) && current.length < cfg.len) {
      play('flip')
      setCurrent(c => c + k.toUpperCase())
    }
  }, [phase, current, cfg.len, submitGuess, play])

  // Physical keyboard
  useEffect(() => {
    const fn = e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      handleKey(e.key === 'Backspace' ? '⌫' : e.key === 'Enter' ? 'ENTER' : e.key)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [handleKey])

  // New game
  const newGame = () => {
    play('click')
    setWordData(getWordWithKategori(cfg.words, cfg.wordList))
    setGuesses([]); setEvaluations([])
    setCurrent(''); setPhase('playing')
    setRevealRow(-1); setShowConfetti(false)
  }

  // Share
  const shareResult = () => {
    const text = buildShareText(guesses, evaluations, answer, phase === 'won', cfg.len)
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text)
      showToast('Disalin ke clipboard! 📋')
    }
  }

  // Build grid rows
  const totalRows  = cfg.maxGuess
  const gridRows   = []
  for (let r = 0; r < totalRows; r++) {
    const isSubmitted = r < guesses.length
    const isCurrent   = r === guesses.length
    const word        = isSubmitted ? guesses[r] : isCurrent ? current : ''
    const ev          = isSubmitted ? evaluations[r] : null
    const isRevealing = isSubmitted && r === revealRow

    gridRows.push(
      <div key={r}
        style={{ display:'grid', gridTemplateColumns:`repeat(${cfg.len},1fr)`, gap:6,
          animation: isCurrent && shake ? 'tileShake 0.5s ease' : 'none' }}
      >
        {Array.from({ length: cfg.len }).map((_, c) => (
          <Tile
            key={c}
            letter={word[c] || ''}
            state={ev?.[c]}
            revealed={isSubmitted}
            flipDelay={isRevealing ? c * 0.3 : 0}
            size={cfg.len}
          />
        ))}
      </div>
    )
  }

  const bg      = dark ? '#121213' : '#fff'
  const textMain  = dark ? '#fff' : '#1a1a1b'
  const textMuted = dark ? '#818384' : '#787c7e'
  const boardMax  = cfg.len === 4 ? 280 : cfg.len === 5 ? 330 : 370
  const DLABEL    = { easy:'🟢 4 Huruf', medium:'🟡 5 Huruf', hard:'🔴 6 Huruf' }

  return (
    <div style={{ minHeight:'100vh', background:bg, display:'flex', flexDirection:'column', alignItems:'center', transition:'background 0.3s' }}>
      <style>{`
        @keyframes tileShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes toastIn   { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes statsIn   { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
      `}</style>

      {showTutorial && (
        <TutorialModal steps={TUTORIAL_STEPS} color="#538D4E" onClose={() => { setShowTutorial(false); localStorage.setItem('tut-wordle','1') }} />
      )}
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:80, left:'50%', transform:'translateX(-50%)', zIndex:100, background:textMain, color:bg, padding:'10px 22px', borderRadius:100, fontSize:14, fontWeight:700, fontFamily:"'Fredoka One',cursive", animation:'toastIn 0.2s ease', whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ width:'100%', maxWidth:480, display:'flex', alignItems:'center', padding:'14px 16px 10px', borderBottom:`1px solid ${dark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)'}`, gap:10 }}>
        <button onClick={() => { play('click'); onBack() }}
          style={{ background:'transparent', border:`1.5px solid ${dark?'rgba(255,255,255,0.15)':'rgba(0,0,0,0.15)'}`, borderRadius:10, padding:'7px 13px', color:textMuted, fontSize:15, cursor:'pointer', fontWeight:700, fontFamily:"'Nunito',sans-serif" }}>
          ←
        </button>
        <div style={{ flex:1, textAlign:'center' }}>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:textMain, lineHeight:1 }}>Wordle 🇮🇩</div>
          <div style={{ fontSize:11, color:textMuted, fontWeight:700 }}>{DLABEL[difficulty.id]}</div>
        </div>
        <button onClick={() => setShowStats(true)}
          style={{ background:'transparent', border:`1.5px solid ${dark?'rgba(255,255,255,0.15)':'rgba(0,0,0,0.15)'}`, borderRadius:10, padding:'7px 13px', color:textMuted, fontSize:16, cursor:'pointer' }}>
          📊
        </button>
      </div>

      {/* ── Kategori Clue ── */}
      <div style={{ width:'100%', maxWidth:480, padding:'10px 16px 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, background: dark?'rgba(83,141,78,0.12)':'rgba(83,141,78,0.08)', border:'1.5px solid rgba(83,141,78,0.3)', borderRadius:14, padding:'10px 16px' }}>
          <span style={{ fontSize:20 }}>💡</span>
          <div>
            <div style={{ fontSize:11, color:'#538D4E', fontWeight:800, letterSpacing:'0.5px', marginBottom:1 }}>KATEGORI KATA</div>
            <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:16, color:textMain }}>{kategori}</div>
          </div>
        </div>

        {/* How to play guide */}
        <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
          {[
            { color:'#538D4E', label:'Huruf benar & posisi tepat' },
            { color:'#B59F3B', label:'Huruf ada, posisi salah' },
            { color:'#3A3A3C', label:'Huruf tidak ada' },
          ].map(g => (
            <div key={g.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:textMuted }}>
              <div style={{ width:14, height:14, borderRadius:3, background:g.color, flexShrink:0 }}/>
              {g.label}
            </div>
          ))}
        </div>
      </div>

      {/* Board */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'12px 16px 10px', width:'100%', maxWidth:480 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:6, width:'100%', maxWidth:boardMax }}>
          {gridRows}
        </div>
      </div>

      {/* Keyboard */}
      <div style={{ width:'100%', maxWidth:480, padding:'8px 6px 24px' }}>
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} style={{ display:'flex', justifyContent:'center', gap:5, marginBottom:6 }}>
            {row.map(k => (
              <Key key={k} k={k} state={keyStates[k]} onPress={handleKey} darkMode={dark} />
            ))}
          </div>
        ))}
      </div>

      {/* ── Won/Lost overlay ── */}
      {(phase === 'won' || phase === 'lost') && (
        <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, zIndex:50, padding:'20px 20px 32px', background: dark?'rgba(18,18,19,0.97)':'rgba(255,255,255,0.97)', backdropFilter:'blur(12px)', borderTop:`1px solid ${dark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.08)'}`, animation:'statsIn 0.3s ease' }}>
          <div style={{ textAlign:'center', marginBottom:16 }}>
            {phase === 'won' ? (
              <>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:'#538D4E', marginBottom:4 }}>🎉 Benar!</div>
                <div style={{ fontSize:13, color:textMuted }}>{guesses.length} dari 6 percobaan</div>
              </>
            ) : (
              <>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:'#ff6b6b', marginBottom:4 }}>😔 Belum tepat</div>
                <div style={{ fontSize:15, fontWeight:700, color:textMain }}>Jawabannya: <span style={{ color:'#538D4E', fontFamily:"'Fredoka One',cursive", fontSize:20 }}>{answer}</span></div>
              </>
            )}
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={newGame}
              style={{ flex:1, background:'linear-gradient(135deg,#538D4E,#4CAF50)', color:'#fff', border:'none', borderRadius:100, padding:'13px', fontSize:15, fontWeight:800, fontFamily:"'Fredoka One',cursive", cursor:'pointer', boxShadow:'0 4px 16px rgba(83,141,78,0.4)' }}>
              🔄 Main Lagi
            </button>
            <button onClick={shareResult}
              style={{ flex:1, background: dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)', color:textMain, border:`1.5px solid ${dark?'rgba(255,255,255,0.15)':'rgba(0,0,0,0.15)'}`, borderRadius:100, padding:'13px', fontSize:15, fontWeight:800, fontFamily:"'Fredoka One',cursive", cursor:'pointer' }}>
              📤 Share
            </button>
          </div>
        </div>
      )}

      {/* ── Stats Modal ── */}
      {showStats && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background: dark?'#1a1a1b':'#fff', borderRadius:24, padding:'28px 24px', maxWidth:340, width:'100%', boxShadow:'0 24px 60px rgba(0,0,0,0.3)', animation:'statsIn 0.3s ease' }}>
            <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:textMain, textAlign:'center', marginBottom:20 }}>📊 Statistik</h2>

            {/* Numbers */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
              {[
                { label:'Dimainkan', value:stats.played||0   },
                { label:'Menang %', value: stats.played ? Math.round((stats.won||0)/stats.played*100)+'%' : '0%' },
                { label:'Streak',   value:stats.streak||0    },
                { label:'Maks Streak', value:stats.maxStreak||0 },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:26, color:textMain, lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:10, color:textMuted, marginTop:3, fontWeight:700, lineHeight:1.3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Distribution */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:textMuted, marginBottom:10, letterSpacing:'0.5px' }}>DISTRIBUSI TEBAKAN</div>
              {[1,2,3,4,5,6].map(n => {
                const count = (stats.dist||{})[n] || 0
                const max   = Math.max(1, ...Object.values(stats.dist||{}))
                const pct   = Math.round((count/max)*100)
                const isLast = phase==='won' && guesses.length === n
                return (
                  <div key={n} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:13, color:textMuted, fontWeight:700, width:14, textAlign:'right' }}>{n}</span>
                    <div style={{ flex:1, height:22, background: dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.max(pct,5)}%`, background: isLast?'#538D4E':'#818384', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:6, transition:'width 0.6s ease' }}>
                        <span style={{ fontSize:12, color:'#fff', fontWeight:800 }}>{count}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowStats(false)}
                style={{ flex:1, background:'linear-gradient(135deg,#538D4E,#4CAF50)', color:'#fff', border:'none', borderRadius:100, padding:'12px', fontSize:15, fontWeight:800, fontFamily:"'Fredoka One',cursive", cursor:'pointer' }}>
                Tutup
              </button>
              {(phase==='won'||phase==='lost') && (
                <button onClick={shareResult}
                  style={{ flex:1, background: dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)', color:textMain, border:`1.5px solid ${dark?'rgba(255,255,255,0.15)':'rgba(0,0,0,0.15)'}`, borderRadius:100, padding:'12px', fontSize:15, fontWeight:800, fontFamily:"'Fredoka One',cursive", cursor:'pointer' }}>
                  📤 Share
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
