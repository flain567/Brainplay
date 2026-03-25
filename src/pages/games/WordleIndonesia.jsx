import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

const TUTORIAL_STEPS = [
  { emoji:'💬', title:'Wordle Indonesia', desc:'Tebak kata 5 huruf bahasa Indonesia dalam percobaan terbatas!', tip:'Setiap tebakan harus kata yang valid.' },
  { emoji:'🟩', title:'Hijau = Benar', desc:'Huruf ada di kata DAN di posisi yang tepat.', tip:'Kunci untuk menang: temukan huruf hijau dulu!' },
  { emoji:'🟨', title:'Kuning = Salah Posisi', desc:'Huruf ada di kata tapi BUKAN di posisi itu.', tip:'Coba pindahkan huruf kuning ke posisi lain.' },
  { emoji:'⬛', title:'Abu = Tidak Ada', desc:'Huruf tidak ada di dalam kata sama sekali.', tip:'Hindari huruf abu-abu di tebakan selanjutnya.' },
]

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'
import { GameHeader, StatsBar, ActionButtons, WinModal, LoseModal, BestRecord } from '../../components/GameLayout.jsx'

// ─── Indonesian 5-letter word bank ──────────────────────────────────────────
// Answer words (common, recognizable)
const ANSWERS = [
  'bulan','dunia','hutan','jalan','kawan','lawan','makan','nanti','pagar','rakan',
  'salam','tanah','udara','waktu','wajah','bakar','calon','damai','galak','habis',
  'jatuh','kabar','lebar','mahal','nakal','paham','rajin','sabar','tahan','abadi',
  'bakat','cakap','dalam','erang','filem','ganas','hadir','ilham','juara','kecil',
  'layak','malam','hebat','obral','patah','minat','riset','salah','tabah','ulang',
  'badan','capek','darat','empat','fakta','gagal','harga','imbal','jamur','kasur',
  'lapas','malas','nafas','orang','bajak','rubah','sakit','taman','utama','vonis',
  'bahas','cabut','darah','elang','galau','garuk','hemat','indah','jenis','kabel',
  'lapar','masak','nasib','objek','panen','racun','saham','tahun','yakin','viral',
  'bantu','cabai','dapur','emosi','forum','gelap','hidup','intan','jawab','keras',
  'lapis','mayat','nulis','organ','pintu','radio','sains','tanam','usaha','wangi',
  'balik','cepat','datuk','belas','fokus','gelar','hitam','istri','kapal','lampu',
  'mandi','nikah','opini','pasar','ragam','siang','tanpa','untuk','wajar','batas',
  'celah','dekat','benci','gajah','hujan','iklim','jelek','karya','laras','minta',
  'nalar','pilih','pasti','ramai','siapa','tepat','urung','yakni','bawah','cinta',
  'debar','benar','garam','huruf','jelas','katup','lewat','milik','natal','kilat',
  'rapih','siswa','total','ulung','zaman','biasa','cukup','detak','beban','gagas',
  'hotel','jeruk','kesal','larut','mulai','novel','pikir','rawat','segar','tekad',
  'ambil','bijak','cuman','denah','bukit','garis','hewan','jilid','karet','lihat',
  'murni','ngeri','polri','rekan','semua','tidak','unduh','bilah','curah','depan',
  'bunga','gerak','hiasi','jujur','kasus','lilin','mulus','nyeri','polah','resah',
  'serta','tiada','ampun','bocah','culik','dewan','buruk','gesit','pesan','kacau',
  'lirik','musim','nyata','badai','resmi','suami','tikus','unsur','bobot','cubit',
  'rumah','gurun','praja','kakak','makin','wahyu','punya','rindu','suatu','timah',
  'botol','cuaca','rumit','gigih','sulit','kalah','magis','nyawa','puasa','risau',
  'suara','tolak','arung','cemas','rusak','gatal','surat','kemas','marga','sarat',
  'pucat','robek','susah','tomat','andai','dinas','saraf','gadis','sumur','kursi',
  'merah','pikun','sabun','gelak','sumbu','kotor','mesin','pohon','saldo','gempa',
  'sifat','kebal','mogok','polos','saran','gemuk','siram','kebat','molek','pompa',
  'sedih','genap','sinar','kulit','momok','pekat','sejuk','getol','sisir','kunci',
]

// Valid guess words (answers + extra valid words for validation)
const EXTRA_VALID = [
  'abadi','abang','acara','adang','admin','agama','ajaib','ajang','akbar','akhir',
  'akrab','aktif','alarm','album','alibi','ambal','ambil','ambon','ampun','ancam',
  'andai','angka','angin','angsa','antar','antri','april','arena','arsip','artis',
  'atlet','audit','babak','bagai','bahwa','bajak','bakti','balap','bambu','bando',
  'barat','baret','basah','batal','bayar','bebek','bedak','bekal','belah','belum',
  'benda','benua','beres','besar','betul','bibit','bibir','bidak','bikin','binal',
  'binar','biola','bubuk','bubur','budak','bugar','bujuk','bukit','bulat','bumbu',
  'bunda','bunuh','buron','bursa','butik','butir','cacar','cakar','camil','capai',
  'cikal','cilik','citra','cocok','corak','coret','cukai','cumbu','darah','debit',
  'debut','dekap','delik','demam','denim','derai','deras','derek','desak','detak',
  'diari','dinas','disko','dolar','domba','donor','drama','dukun','dungu','ember',
  'empuk','endap','entah','fajar','fatal','fiber','fiksi','final','flora','galau',
  'galur','gamer','ganda','garap','garpu','gebuk','gelap','gemas','gempa','gesek',
  'getah','gigih','gigit','gilir','gitar','gosip','gosok','grogi','gubuk','gumam',
  'gusar','hadap','hafal','hajat','halal','hamba','hamil','hantu','hapal','haram',
  'harta','harum','hasil','hasut','hayat','heboh','henti','heran','hibah','hibur',
  'hijab','hijau','hilir','hukum','humor','hutan','iblis','idola','ihwal','iklan',
  'ikrar','ikuti','imaji','impor','incar','induk','ingat','ironi','iseng','jabat',
  'jahit','jaket','jaksa','jalin','jamin','janda','jarak','jarum','jasad','jatah',
  'jebak','jegal','jemur','jenis','jerat','jerit','jihad','jinak','jiran','jubah',
  'judul','jumat','jumbo','jumpa','kadal','kafir','kajak','kaldu','kalem','kalis',
  'kamis','kapak','karam','kartu','kasih','kayak','kayuh','kebal','kebon','kecut',
  'kedap','kedok','kejar','kekal','kelam','kelar','kelas','keluh','kemah','kenal',
  'kepal','kerja','keruh','kesal','ketat','ketuk','kidal','kilas','kilat','kimia',
  'kiper','kipas','kirim','kisah','klaim','klien','klise','koboi','kokoh','kolam',
  'kolot','komik','komet','korek','korup','kuali','kuasa','kukuh','kumis','kumuh',
  'kupas','kupon','kurir','kurun','kutip','kutub','lakon','lalai','lamar','laten',
  'layar','layat','lekas','lekat','lelah','lemas','lemot','lepas','letak','level',
  'lezat','liang','licik','licin','limau','lipat','lisan','logam','lokal','lomba',
  'luang','luhur','lukai','lunak','lunas','luput','lurah','lusuh','macam','macet',
  'mahir','major','makam','makin','malah','mampu','mandi','marak','maret','masih',
  'masuk','medal','megah','mekar','merah','merek','mesra','metal','meter','migas',
  'mimik','minim','minor','mirip','misal','model','modal','modis','momen','motif',
  'motor','muara','mudah','mudik','mujur','mulut','murah','murid','murka','nanas',
  'napas','nekat','nenek','niaga','nikah','nilai','nista','nomor','norak','norma',
  'nyali','obyek','paksa','palsu','panik','panah','panas','pandu','papan','patok',
  'patuh','pecah','pecut','pedas','pelan','penuh','perak','pergi','petak','petik',
  'piala','pikat','pikul','pijat','pilar','pilot','pinta','pirus','pisau','puisi',
  'pukul','pulau','pupuk','putar','putih','putus','rakit','rapat','rawan','rebah',
  'rebut','redam','regal','rejim','remah','remuk','retak','reuni','ribet','ribut',
  'rimba','risih','roboh','rokok','rubah','rutin','sabuk','sajak','salib','salju',
  'samak','samar','sambi','sayap','sedan','sedap','selam','semat','semak','semut',
  'senam','sepak','serak','seram','serbu','sikap','silau','silet','silam','simpn',
  'sipil','siren','situp','sokol','solat','solek','sulap','sunyi','surau','surga',
  'tabir','takar','takut','talak','tamak','taman','tanda','tanah','tanpa','tarik',
  'tebar','tegak','tegas','tekuk','telak','telur','teman','tempa','tenda','tenun',
  'tepuk','teror','tetes','tebal','tiang','tinju','titik','tokek','tokoh','tular',
  'tulis','tulus','tumis','tunda','tunas','turun','tusuk','ubang','ucapn','ujian',
  'ukuir','umbar','unduk','unfur','unyil','upaya','waras','warga','wasit','wujud',
]

// Combine for valid guesses
const ALL_VALID = new Set([...ANSWERS, ...EXTRA_VALID].map(w => w.toUpperCase()))

const CFG = {
  easy:   { maxGuesses: 7, hintLimit: 3 },
  medium: { maxGuesses: 6, hintLimit: 2 },
  hard:   { maxGuesses: 5, hintLimit: 1 },
}

const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
]

function pickWord() {
  // Filter to only clean 5-letter alpha words
  const valid = ANSWERS.filter(w => /^[a-z]{5}$/.test(w))
  return valid[Math.floor(Math.random() * valid.length)].toUpperCase()
}

function evaluateGuess(guess, answer) {
  const result = Array(5).fill('absent')
  const ansArr = answer.split('')
  const guessArr = guess.split('')
  const used = Array(5).fill(false)

  // First pass: correct position (green)
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === ansArr[i]) {
      result[i] = 'correct'
      used[i] = true
    }
  }
  // Second pass: present but wrong position (yellow)
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guessArr[i] === ansArr[j]) {
        result[i] = 'present'
        used[j] = true
        break
      }
    }
  }
  return result
}

export default function WordleIndonesia({ onBack, game, difficulty }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()
  const tc = useThemeColors()
  const dark = tc.dark

  const cfg = CFG[difficulty.id]
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('bp_tut_wordle'))
  const [showConfetti, setShowConfetti] = useState(false)

  const [answer, setAnswer] = useState(() => pickWord())
  const [guesses, setGuesses] = useState([]) // [{word, result}]
  const [currentGuess, setCurrentGuess] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [shake, setShake] = useState(false)
  const [revealRow, setRevealRow] = useState(-1)
  const [bounceRow, setBounceRow] = useState(-1)
  const [popCol, setPopCol] = useState(-1)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [message, setMessage] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const [showStats, setShowStats] = useState(false)
  const [copied, setCopied] = useState(false)
  const msgTimeout = useRef(null)

  // Keyboard letter states
  const [letterStates, setLetterStates] = useState({})

  // Best score from localStorage
  const storageKey = `bp_wordle_best_${difficulty.id}`
  const [bestStreak, setBestStreak] = useState(() => {
    try { return parseInt(localStorage.getItem(storageKey)) || 0 } catch { return 0 }
  })

  // Stats persistence
  const statsKey = `bp_wordle_stats_${difficulty.id}`
  const [stats, setStats] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(statsKey))
      return saved || { played: 0, won: 0, dist: [0,0,0,0,0,0,0], curStreak: 0, maxStreak: 0 }
    } catch { return { played: 0, won: 0, dist: [0,0,0,0,0,0,0], curStreak: 0, maxStreak: 0 } }
  })

  const showMsg = useCallback((msg, duration = 1500) => {
    setMessage(msg)
    if (msgTimeout.current) clearTimeout(msgTimeout.current)
    msgTimeout.current = setTimeout(() => setMessage(''), duration)
  }, [])

  // Hard mode validation
  const validateHardMode = useCallback((guess) => {
    if (difficulty.id !== 'hard' || guesses.length === 0) return null
    const lastGuess = guesses[guesses.length - 1]
    for (let i = 0; i < 5; i++) {
      if (lastGuess.result[i] === 'correct' && guess[i] !== lastGuess.word[i]) {
        return `Posisi ${i+1} harus "${lastGuess.word[i]}" (hijau)`
      }
    }
    for (let i = 0; i < 5; i++) {
      if (lastGuess.result[i] === 'present') {
        if (!guess.includes(lastGuess.word[i])) {
          return `Harus mengandung "${lastGuess.word[i]}" (kuning)`
        }
      }
    }
    return null
  }, [guesses, difficulty.id])

  // Handle keyboard input
  const handleKey = useCallback((key) => {
    if (gameOver) return
    if (key === 'ENTER') {
      if (currentGuess.length !== 5) {
        showMsg('Harus 5 huruf!')
        setShake(true)
        setTimeout(() => setShake(false), 500)
        play('error')
        return
      }
      if (!ALL_VALID.has(currentGuess)) {
        showMsg('Kata tidak ada di kamus!')
        setShake(true)
        setTimeout(() => setShake(false), 500)
        play('error')
        return
      }
      // Hard mode check
      const hardErr = validateHardMode(currentGuess)
      if (hardErr) {
        showMsg(hardErr)
        setShake(true)
        setTimeout(() => setShake(false), 500)
        play('error')
        return
      }

      const result = evaluateGuess(currentGuess, answer)
      const newGuess = { word: currentGuess, result }
      const newGuesses = [...guesses, newGuess]

      // Animate reveal
      setRevealRow(newGuesses.length - 1)
      setTimeout(() => setRevealRow(-1), 600)

      // Update letter states
      setLetterStates(prev => {
        const next = { ...prev }
        for (let i = 0; i < 5; i++) {
          const letter = currentGuess[i]
          const state = result[i]
          if (state === 'correct') next[letter] = 'correct'
          else if (state === 'present' && next[letter] !== 'correct') next[letter] = 'present'
          else if (!next[letter]) next[letter] = 'absent'
        }
        return next
      })

      setGuesses(newGuesses)
      setCurrentGuess('')

      const isWin = currentGuess === answer
      const isLose = !isWin && newGuesses.length >= cfg.maxGuesses

      if (isWin) {
        play('win')
        setShowConfetti(true)
        // Bounce winning row after flip
        setTimeout(() => {
          setBounceRow(newGuesses.length - 1)
          setTimeout(() => setBounceRow(-1), 800)
        }, 600)
        setTimeout(() => {
          setGameOver(true)
          setWon(true)
        }, 1200)
      } else if (isLose) {
        play('lose')
        setTimeout(() => {
          setGameOver(true)
          setWon(false)
        }, 700)
      } else {
        play('click')
      }
      return
    }
    if (key === '⌫' || key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1))
      return
    }
    if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
      setCurrentGuess(prev => {
        const next = prev + key
        // Pop animation
        setPopCol(next.length - 1)
        setTimeout(() => setPopCol(-1), 150)
        return next
      })
      play('click')
    }
  }, [gameOver, currentGuess, guesses, answer, cfg.maxGuesses, play, showMsg, validateHardMode])

  // Physical keyboard listener
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.toUpperCase()
      if (key === 'ENTER') handleKey('ENTER')
      else if (key === 'BACKSPACE') handleKey('⌫')
      else if (/^[A-Z]$/.test(key)) handleKey(key)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleKey])

  // Hint
  const useHint = () => {
    if (hintsUsed >= cfg.hintLimit || gameOver) return
    const known = new Set()
    guesses.forEach(g => {
      g.result.forEach((r, i) => { if (r === 'correct') known.add(i) })
    })
    const unknowns = [0,1,2,3,4].filter(i => !known.has(i))
    if (unknowns.length === 0) return
    const pos = unknowns[Math.floor(Math.random() * unknowns.length)]
    showMsg(`Posisi ${pos + 1}: huruf "${answer[pos]}"`, 2500)
    setHintsUsed(h => h + 1)
    play('hint')
  }

  // Share results
  const shareResults = () => {
    const emojiMap = { correct: '🟩', present: '🟨', absent: '⬛' }
    const grid = guesses.map(g => g.result.map(r => emojiMap[r]).join('')).join('\n')
    const text = `BrainPlay Wordle 🇮🇩\n${won ? guesses.length : 'X'}/${cfg.maxGuesses} (${difficulty.id})\n\n${grid}`
    try {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      showMsg('Hasil disalin! 📋', 2000)
    } catch {
      showMsg(text, 4000)
    }
  }

  // Report result + update stats
  useEffect(() => {
    if (!gameOver) return
    const attempts = guesses.length
    const stars = won
      ? (attempts <= Math.ceil(cfg.maxGuesses * 0.4) ? 3
        : attempts <= Math.ceil(cfg.maxGuesses * 0.7) ? 2 : 1)
      : 0

    let coinAmt = won ? 15 : 5
    if (stars === 3) coinAmt += 20
    else if (stars === 2) coinAmt += 10
    if (difficulty.id === 'hard') coinAmt += 10
    if (hintsUsed > 0) coinAmt = Math.max(5, coinAmt - hintsUsed * 5)

    earnCoins(coinAmt, `Wordle Indonesia (${difficulty.id})`)
    reportGameResult({
      gameId: 'wordle', difficultyId: difficulty.id,
      won, score: won ? (cfg.maxGuesses - attempts + 1) * 100 + (3 - hintsUsed) * 50 : 0,
      stars, timeSec: attempts * 10,
    })

    // Update stats
    setStats(prev => {
      const next = { ...prev, played: prev.played + 1 }
      if (won) {
        next.won = prev.won + 1
        next.dist = [...prev.dist]
        next.dist[attempts - 1] = (next.dist[attempts - 1] || 0) + 1
        next.curStreak = prev.curStreak + 1
        next.maxStreak = Math.max(prev.maxStreak, next.curStreak)
      } else {
        next.curStreak = 0
      }
      localStorage.setItem(statsKey, JSON.stringify(next))
      return next
    })

    if (won) {
      setBestStreak(s => {
        const ns = s + 1
        localStorage.setItem(storageKey, String(ns))
        return ns
      })
    } else {
      setBestStreak(0)
      localStorage.setItem(storageKey, '0')
    }
  }, [gameOver])

  // Reset
  const restart = () => {
    setAnswer(pickWord())
    setGuesses([])
    setCurrentGuess('')
    setGameOver(false)
    setWon(false)
    setShake(false)
    setRevealRow(-1)
    setBounceRow(-1)
    setPopCol(-1)
    setHintsUsed(0)
    setMessage('')
    setLetterStates({})
    setResetKey(k => k + 1)
    setShowConfetti(false)
    setShowStats(false)
    setCopied(false)
  }

  // ─── Colors ──────────────────────────────────────────────────────────────
  const GAME_COLOR = '#55EFC4'
  const colors = {
    correct: '#27AE60',
    present: '#F39C12',
    absent: dark ? '#3B3B3B' : '#787C7E',
    empty: dark ? '#2A2A2E' : '#EDEFF1',
    border: dark ? '#444' : '#D3D6DA',
    tileText: '#FFFFFF',
    keyBg: dark ? '#555' : '#D3D6DA',
    keyText: dark ? '#FFF' : '#1A1A2E',
  }

  // ─── Render Grid ─────────────────────────────────────────────────────────
  const renderGrid = () => {
    const rows = []
    for (let r = 0; r < cfg.maxGuesses; r++) {
      const isCurrentRow = r === guesses.length && !gameOver
      const guessData = guesses[r]
      const isRevealing = r === revealRow
      const isBouncing = r === bounceRow

      const cells = []
      for (let c = 0; c < 5; c++) {
        let letter = ''
        let bgColor = colors.empty
        let borderColor = colors.border
        let textColor = dark ? '#FFF' : '#1A1A2E'
        let scale = 1
        let delay = c * 0.1
        let isPop = isCurrentRow && c === popCol

        if (guessData) {
          letter = guessData.word[c]
          const state = guessData.result[c]
          bgColor = colors[state]
          textColor = colors.tileText
          borderColor = 'transparent'
        } else if (isCurrentRow && c < currentGuess.length) {
          letter = currentGuess[c]
          borderColor = dark ? '#888' : '#878A8C'
        }

        cells.push(
          <div key={c} style={{
            width: 54, height: 54,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800,
            fontFamily: "'Fredoka One',cursive",
            background: bgColor,
            border: `2px solid ${borderColor}`,
            borderRadius: 10,
            color: textColor,
            transition: 'all 0.15s ease',
            animation: isRevealing
              ? `wordleFlip 0.5s ease ${delay}s both`
              : isBouncing
                ? `wordleBounce 0.4s ease ${c * 0.08}s both`
                : isPop
                  ? 'wordlePop 0.15s ease both'
                  : 'none',
          }}>
            {letter}
          </div>
        )
      }

      rows.push(
        <div key={r} style={{
          display: 'flex', gap: 6, justifyContent: 'center',
          animation: (isCurrentRow && shake) ? 'wordleShake 0.5s ease' : 'none',
        }}>
          {cells}
        </div>
      )
    }
    return rows
  }

  // ─── Render Keyboard ─────────────────────────────────────────────────────
  const renderKeyboard = () => {
    return KEYBOARD_ROWS.map((row, ri) => (
      <div key={ri} style={{
        display: 'flex', gap: 4, justifyContent: 'center',
        marginBottom: 4,
      }}>
        {row.map(key => {
          const isWide = key === 'ENTER' || key === '⌫'
          const state = letterStates[key]
          let bg = colors.keyBg
          let textCol = colors.keyText
          if (state === 'correct') { bg = colors.correct; textCol = '#FFF' }
          else if (state === 'present') { bg = colors.present; textCol = '#FFF' }
          else if (state === 'absent') { bg = colors.absent; textCol = '#FFF' }

          return (
            <button key={key} onClick={() => handleKey(key)}
              style={{
                minWidth: isWide ? 56 : 32, height: 46,
                borderRadius: 8, border: 'none',
                background: bg, color: textCol,
                fontSize: isWide ? 12 : 16, fontWeight: 700,
                fontFamily: "'Fredoka One',cursive",
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
                WebkitTapHighlightColor: 'transparent',
                padding: isWide ? '0 8px' : 0,
              }}
            >
              {key}
            </button>
          )
        })}
      </div>
    ))
  }

  // ─── Stats Modal ─────────────────────────────────────────────────────────
  const renderStatsModal = () => {
    const winPct = stats.played > 0 ? Math.round(stats.won / stats.played * 100) : 0
    const maxDist = Math.max(...stats.dist, 1)

    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 998, padding: 24, animation: 'winFadeIn 0.3s ease',
      }} onClick={() => setShowStats(false)}>
        <div onClick={e => e.stopPropagation()} style={{
          background: dark ? '#1E1E2E' : '#FFF', borderRadius: 20,
          padding: '28px 24px', maxWidth: 360, width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          animation: 'winPopIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <h3 style={{ textAlign: 'center', fontFamily: "'Fredoka One',cursive",
            fontSize: 18, color: dark ? '#FFF' : '#1A1A2E', marginBottom: 16 }}>
            📊 Statistik
          </h3>

          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
            {[
              { v: stats.played, l: 'Main' },
              { v: winPct, l: 'Win %' },
              { v: stats.curStreak, l: 'Streak' },
              { v: stats.maxStreak, l: 'Maks' },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Fredoka One',cursive",
                  color: dark ? '#FFF' : '#1A1A2E' }}>{s.v}</div>
                <div style={{ fontSize: 10, color: dark ? '#888' : '#999' }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Distribution */}
          <div style={{ fontSize: 12, fontWeight: 700, color: dark ? '#AAA' : '#666', marginBottom: 8 }}>
            Distribusi Tebakan
          </div>
          {stats.dist.slice(0, cfg.maxGuesses).map((count, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ width: 14, fontSize: 12, fontWeight: 700, color: dark ? '#AAA' : '#666' }}>{i+1}</span>
              <div style={{
                minWidth: 20, width: `${Math.max(8, count / maxDist * 100)}%`,
                background: (gameOver && won && guesses.length === i + 1) ? colors.correct : (dark ? '#444' : '#DDD'),
                color: '#FFF', padding: '2px 8px', borderRadius: 4,
                fontSize: 12, fontWeight: 700, textAlign: 'right',
              }}>{count}</div>
            </div>
          ))}

          {gameOver && (
            <button onClick={shareResults} style={{
              width: '100%', marginTop: 16, padding: '12px',
              background: GAME_COLOR, color: '#1A1A2E', border: 'none',
              borderRadius: 100, fontSize: 14, fontWeight: 800,
              fontFamily: "'Fredoka One',cursive", cursor: 'pointer',
            }}>
              {copied ? '✅ Disalin!' : '📤 Bagikan Hasil'}
            </button>
          )}

          <button onClick={() => setShowStats(false)} style={{
            width: '100%', marginTop: 8, padding: '10px',
            background: 'transparent', color: dark ? '#888' : '#999',
            border: `1px solid ${dark ? '#444' : '#DDD'}`,
            borderRadius: 100, fontSize: 13, fontWeight: 700,
            fontFamily: "'Fredoka One',cursive", cursor: 'pointer',
          }}>Tutup</button>
        </div>
      </div>
    )
  }

  // ─── Stats for modals ────────────────────────────────────────────────────
  const attempts = guesses.length
  const finalStars = won
    ? (attempts <= Math.ceil(cfg.maxGuesses * 0.4) ? 3
      : attempts <= Math.ceil(cfg.maxGuesses * 0.7) ? 2 : 1)
    : 0
  const finalScore = won ? (cfg.maxGuesses - attempts + 1) * 100 + (3 - hintsUsed) * 50 : 0
  let coinAmt = won ? 15 : 5
  if (finalStars === 3) coinAmt += 20
  else if (finalStars === 2) coinAmt += 10
  if (difficulty.id === 'hard') coinAmt += 10
  if (hintsUsed > 0) coinAmt = Math.max(5, coinAmt - hintsUsed * 5)

  return (
    <>
      {showConfetti && <Confetti />}
      {showTutorial && (
        <TutorialModal
          steps={TUTORIAL_STEPS}
          storageKey="bp_tut_wordle"
          onClose={() => setShowTutorial(false)}
        />
      )}

      <div style={{
        minHeight: '100dvh',
        background: dark
          ? `linear-gradient(180deg, ${tc.bg} 0%, #0D1117 100%)`
          : `linear-gradient(180deg, #F0FFF4 0%, #E8FFF0 100%)`,
        padding: '16px 12px 24px',
        position: 'relative',
      }}>
        <GameHeader
          emoji="💬" title="Wordle Indonesia"
          subtitle={`Tebak kata 5 huruf! (${cfg.maxGuesses - guesses.length} sisa)`}
          diffId={difficulty.id} onBack={onBack} dark={dark}
        />

        <StatsBar stats={[
          { icon: '🎯', label: 'Tebakan', value: `${guesses.length}/${cfg.maxGuesses}` },
          { icon: '💡', label: 'Hint', value: `${cfg.hintLimit - hintsUsed}` },
          { icon: '🔥', label: 'Streak', value: bestStreak },
        ]} dark={dark} />

        {/* Message toast */}
        {message && (
          <div style={{
            position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
            background: dark ? '#333' : '#1A1A2E',
            color: '#FFF', padding: '10px 24px', borderRadius: 12,
            fontWeight: 700, fontSize: 14, zIndex: 999,
            animation: 'winFadeIn 0.2s ease',
            fontFamily: "'Fredoka One',cursive",
          }}>
            {message}
          </div>
        )}

        {/* Grid */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          alignItems: 'center',
          margin: '16px auto',
          maxWidth: 320,
        }}>
          {renderGrid()}
        </div>

        {/* Action Buttons */}
        {!gameOver && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            {hintsUsed < cfg.hintLimit && (
              <button onClick={useHint} style={{
                padding: '8px 18px', borderRadius: 12, border: 'none',
                background: `${GAME_COLOR}22`, color: GAME_COLOR,
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                fontFamily: "'Fredoka One',cursive",
              }}>
                💡 Hint ({cfg.hintLimit - hintsUsed})
              </button>
            )}
            <button onClick={() => setShowStats(true)} style={{
              padding: '8px 18px', borderRadius: 12, border: 'none',
              background: dark ? '#333' : '#F0F0F0',
              color: dark ? '#AAA' : '#666',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              fontFamily: "'Fredoka One',cursive",
            }}>
              📊 Stats
            </button>
            <button onClick={() => setShowTutorial(true)} style={{
              padding: '8px 18px', borderRadius: 12, border: 'none',
              background: dark ? '#333' : '#F0F0F0',
              color: dark ? '#AAA' : '#666',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              fontFamily: "'Fredoka One',cursive",
            }}>
              ❓
            </button>
          </div>
        )}

        {/* Hard mode indicator */}
        {difficulty.id === 'hard' && !gameOver && guesses.length > 0 && (
          <div style={{
            textAlign: 'center', fontSize: 11, color: '#E17055',
            fontWeight: 700, marginBottom: 8,
            fontFamily: "'Fredoka One',cursive",
          }}>
            🔒 Hard Mode — huruf hijau & kuning wajib dipakai
          </div>
        )}

        {/* Keyboard */}
        <div style={{ maxWidth: 420, margin: '0 auto', padding: '8px 4px' }}>
          {renderKeyboard()}
        </div>

        <BestRecord label="Win Streak Terbaik" value={bestStreak} dark={dark} color={GAME_COLOR} />

        {/* Stats Modal */}
        {showStats && renderStatsModal()}

        {/* Win Modal */}
        {gameOver && won && (
          <WinModal
            emoji="🎉"
            title={attempts <= 2 ? 'LUAR BIASA!' : attempts <= 4 ? 'Hebat!' : 'Berhasil!'}
            subtitle={`"${answer}" dalam ${attempts} percobaan!`}
            diffLabel={difficulty.id === 'hard' ? '🔒 HARD' : difficulty.id.toUpperCase()}
            stats={[
              { label: 'Percobaan', value: attempts },
              { label: 'Hint', value: hintsUsed },
              { label: 'Skor', value: finalScore },
            ]}
            stars={finalStars}
            coinReward={coinAmt}
            onRestart={restart}
            onBack={onBack}
            dark={dark}
            gameColor={GAME_COLOR}
          />
        )}
        {/* Share + Stats buttons after win/lose */}
        {gameOver && (
          <div style={{
            position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 8, zIndex: 1000,
          }}>
            <button onClick={shareResults} style={{
              padding: '10px 20px', borderRadius: 100, border: 'none',
              background: GAME_COLOR, color: '#1A1A2E',
              fontWeight: 800, fontSize: 13, cursor: 'pointer',
              fontFamily: "'Fredoka One',cursive",
              boxShadow: '0 4px 16px rgba(85,239,196,0.4)',
            }}>
              {copied ? '✅ Disalin!' : '📤 Share'}
            </button>
            <button onClick={() => setShowStats(true)} style={{
              padding: '10px 20px', borderRadius: 100,
              border: '1.5px solid rgba(255,255,255,0.2)',
              background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              color: dark ? '#FFF' : '#1A1A2E',
              fontWeight: 800, fontSize: 13, cursor: 'pointer',
              fontFamily: "'Fredoka One',cursive",
            }}>
              📊 Stats
            </button>
          </div>
        )}

        {/* Lose Modal */}
        {gameOver && !won && (
          <LoseModal
            emoji="😢"
            title="Gagal!"
            subtitle={`Jawabannya: "${answer}"`}
            stats={[
              { label: 'Percobaan', value: attempts },
              { label: 'Hint', value: hintsUsed },
            ]}
            coinReward={coinAmt}
            onRestart={restart}
            onBack={onBack}
            dark={dark}
            gameColor={GAME_COLOR}
          />
        )}
      </div>

      <style>{`
        @keyframes wordleFlip {
          0% { transform: scaleY(1); }
          50% { transform: scaleY(0); }
          100% { transform: scaleY(1); }
        }
        @keyframes wordleShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes wordleBounce {
          0% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
          50% { transform: translateY(0); }
          70% { transform: translateY(-4px); }
          100% { transform: translateY(0); }
        }
        @keyframes wordlePop {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes winFadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes winPopIn {
          from { transform: scale(0.7); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  )
}
