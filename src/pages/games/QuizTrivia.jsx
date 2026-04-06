import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'
import { useMatch } from '../../context/MatchContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { auth } from '../../firebase.js'
import { WinModal } from '../../components/GameLayout.jsx'
import PvpScoreBar from '../../components/PvpScoreBar.jsx'

const TUTORIAL_STEPS = [
  { emoji:'🇮🇩', title:'Quiz Trivia Indonesia', desc:'Uji pengetahuan umummu tentang Indonesia! Geografi, sejarah, budaya, dan lainnya.', tip:'Jawab secepat mungkin untuk bonus waktu!' },
  { emoji:'📚', title:'Kategori Beragam', desc:'Pertanyaan dari berbagai topik — ibukota, sejarah, makanan, tradisi, alam, dan sains.', tip:'Setiap level menambah kesulitan soal!' },
  { emoji:'🏆', title:'Skor & Bintang', desc:'Jawab semua soal, benar = poin + bonus waktu, salah = 0 poin. Akurasi ≥80% = ⭐⭐⭐!', tip:'Combo streak memberi multiplier hingga 3×!' },
]

const CFG = {
  easy:   { timePerQ: 20, totalQ: 15, star3: 80, star2: 60, star1: 40 },
  medium: { timePerQ: 15, totalQ: 20, star3: 80, star2: 60, star1: 40 },
  hard:   { timePerQ: 10, totalQ: 25, star3: 75, star2: 55, star1: 35 },
}
function calcStars(correct, total, cfg) {
  const pct = Math.round((correct / Math.max(total, 1)) * 100)
  if (pct >= cfg.star3) return 3
  if (pct >= cfg.star2) return 2
  if (pct >= cfg.star1) return 1
  return 0
}

// ─── Question Bank ────────────────────────────────────────────────────────
const QUESTIONS = [
  { q:'Ibukota provinsi Jawa Barat adalah?', o:['Bandung','Semarang','Surabaya','Serang'], a:0, cat:'🌍' },
  { q:'Gunung tertinggi di Indonesia adalah?', o:['Puncak Jaya','Gunung Semeru','Gunung Rinjani','Gunung Kerinci'], a:0, cat:'🏔️' },
  { q:'Pulau terbesar di Indonesia adalah?', o:['Kalimantan','Sumatra','Papua','Sulawesi'], a:0, cat:'🌍' },
  { q:'Danau terbesar di Indonesia adalah?', o:['Danau Toba','Danau Sentani','Danau Maninjau','Danau Singkarak'], a:0, cat:'🌊' },
  { q:'Provinsi paling barat Indonesia adalah?', o:['Aceh','Sumatra Barat','Riau','Bengkulu'], a:0, cat:'🌍' },
  { q:'Ibukota provinsi Sulawesi Selatan?', o:['Makassar','Manado','Palu','Kendari'], a:0, cat:'🌍' },
  { q:'Sungai terpanjang di Indonesia ada di pulau?', o:['Kalimantan','Sumatra','Papua','Jawa'], a:0, cat:'🌊' },
  { q:'Provinsi dengan jumlah pulau terbanyak?', o:['Maluku','Papua','NTT','Kepulauan Riau'], a:0, cat:'🌍' },
  { q:'Gunung Bromo terletak di provinsi?', o:['Jawa Timur','Jawa Tengah','Jawa Barat','Bali'], a:0, cat:'🏔️' },
  { q:'Ibukota provinsi Bali?', o:['Denpasar','Singaraja','Ubud','Tabanan'], a:0, cat:'🌍' },
  { q:'Indonesia merdeka pada tanggal?', o:['17 Agustus 1945','17 Agustus 1950','1 Juni 1945','10 November 1945'], a:0, cat:'📜' },
  { q:'Presiden pertama Indonesia adalah?', o:['Soekarno','Soeharto','B.J. Habibie','Megawati'], a:0, cat:'📜' },
  { q:'Peristiwa Bandung Lautan Api terjadi tahun?', o:['1946','1945','1947','1948'], a:0, cat:'📜' },
  { q:'Hari Sumpah Pemuda diperingati tanggal?', o:['28 Oktober','17 Agustus','1 Juni','10 November'], a:0, cat:'📜' },
  { q:'Siapa tokoh penggagas Pancasila?', o:['Soekarno','Mohammad Hatta','Soepomo','M. Yamin'], a:0, cat:'📜' },
  { q:'Konferensi Asia-Afrika berlangsung di?', o:['Bandung','Jakarta','Surabaya','Yogyakarta'], a:0, cat:'📜' },
  { q:'Hari Pahlawan diperingati tanggal?', o:['10 November','28 Oktober','1 Juni','17 Agustus'], a:0, cat:'📜' },
  { q:'Siapa proklamator selain Soekarno?', o:['Mohammad Hatta','Sutan Sjahrir','Soepomo','Ki Hajar Dewantara'], a:0, cat:'📜' },
  { q:'Tarian Kecak berasal dari?', o:['Bali','Jawa','Sumatra','Sulawesi'], a:0, cat:'💃' },
  { q:'Batik Indonesia diakui UNESCO tahun?', o:['2009','2010','2008','2011'], a:0, cat:'🎨' },
  { q:'Alat musik Angklung berasal dari?', o:['Jawa Barat','Jawa Tengah','Bali','Sumatra Barat'], a:0, cat:'🎵' },
  { q:'Wayang kulit paling terkenal dari daerah?', o:['Jawa','Bali','Sumatra','Kalimantan'], a:0, cat:'🎭' },
  { q:'Lagu "Indonesia Raya" diciptakan oleh?', o:['W.R. Supratman','Ismail Marzuki','Kusbini','C. Simanjuntak'], a:0, cat:'🎵' },
  { q:'Rumah adat Gadang berasal dari?', o:['Sumatra Barat','Sumatra Utara','Riau','Aceh'], a:0, cat:'🏠' },
  { q:'Tari Saman berasal dari provinsi?', o:['Aceh','Sumatra Utara','Jawa','Bali'], a:0, cat:'💃' },
  { q:'Reog Ponorogo berasal dari?', o:['Jawa Timur','Jawa Tengah','Jawa Barat','Bali'], a:0, cat:'🎭' },
  { q:'Rendang berasal dari daerah?', o:['Sumatra Barat','Jawa','Bali','Sulawesi'], a:0, cat:'🍛' },
  { q:'Gudeg adalah makanan khas?', o:['Yogyakarta','Solo','Semarang','Malang'], a:0, cat:'🍛' },
  { q:'Papeda adalah makanan khas?', o:['Papua','Maluku','NTT','Sulawesi'], a:0, cat:'🍛' },
  { q:'Pempek berasal dari?', o:['Palembang','Lampung','Bengkulu','Jambi'], a:0, cat:'🍛' },
  { q:'Soto Betawi berasal dari?', o:['Jakarta','Bandung','Surabaya','Semarang'], a:0, cat:'🍛' },
  { q:'Kerak Telor adalah makanan khas?', o:['Betawi/Jakarta','Bandung','Semarang','Surabaya'], a:0, cat:'🍛' },
  { q:'Komodo hanya ditemukan di?', o:['NTT','Bali','Jawa','Sulawesi'], a:0, cat:'🦎' },
  { q:'Rafflesia Arnoldii paling banyak di?', o:['Bengkulu','Aceh','Papua','Kalimantan'], a:0, cat:'🌺' },
  { q:'Orangutan Kalimantan termasuk hewan?', o:['Dilindungi/langka','Biasa','Invasif','Peliharaan'], a:0, cat:'🐵' },
  { q:'Candi Borobudur terletak di provinsi?', o:['Jawa Tengah','Jawa Timur','DIY','Jawa Barat'], a:0, cat:'🏛️' },
  { q:'Indonesia terletak di garis?', o:['Khatulistiwa','Balik utara','Balik selatan','Kutub'], a:0, cat:'🌍' },
  { q:'Berapa jumlah provinsi Indonesia (2024)?', o:['38','34','36','40'], a:0, cat:'🌍' },
  { q:'Mata uang Indonesia adalah?', o:['Rupiah','Ringgit','Baht','Peso'], a:0, cat:'💰' },
  { q:'Hari Kartini diperingati tanggal?', o:['21 April','17 Agustus','1 Juni','2 Mei'], a:0, cat:'📜' },
  { q:'Selat antara Jawa dan Sumatra?', o:['Selat Sunda','Selat Malaka','Selat Bali','Selat Lombok'], a:0, cat:'🌊' },
  { q:'Taman Nasional Ujung Kulon melindungi?', o:['Badak Jawa','Harimau Sumatra','Orangutan','Komodo'], a:0, cat:'🦏' },
  { q:'Bahasa daerah terbanyak penuturnya?', o:['Jawa','Sunda','Melayu','Batak'], a:0, cat:'📚' },
  { q:'Ibukota baru Indonesia bernama?', o:['Nusantara','Palangkaraya','Balikpapan','Samarinda'], a:0, cat:'🌍' },
  { q:'Candi Prambanan adalah candi agama?', o:['Hindu','Buddha','Islam','Konghucu'], a:0, cat:'🏛️' },
  { q:'Raja Ampat terletak di provinsi?', o:['Papua Barat Daya','Papua','Maluku','NTT'], a:0, cat:'🌊' },
  { q:'Gunung Krakatau terletak di?', o:['Selat Sunda','Selat Bali','Selat Lombok','Selat Malaka'], a:0, cat:'🏔️' },
  { q:'Presiden ke-3 Indonesia?', o:['B.J. Habibie','Megawati','Gus Dur','SBY'], a:0, cat:'📜' },
  { q:'Taman Laut Bunaken ada di?', o:['Sulawesi Utara','Maluku','NTT','Papua'], a:0, cat:'🌊' },
  { q:'Filosofi Pancasila sila ke-3?', o:['Persatuan Indonesia','Keadilan Sosial','Kemanusiaan','Ketuhanan'], a:0, cat:'📜' },
]

// Seeded PRNG for deterministic PvP questions
function seededRng(seed) {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}

function shuffleWithSeed(arr, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function shuffleArray(arr) {
  const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }; return a
}

function prepareQuestions(count, seed) {
  const rng = seed ? seededRng(seed) : null
  const shuffled = rng ? shuffleWithSeed(QUESTIONS, rng) : shuffleArray(QUESTIONS)
  return shuffled.slice(0, count).map(q => {
    const correctText = q.o[q.a]
    const shuffledOpts = rng ? shuffleWithSeed(q.o, rng) : shuffleArray(q.o)
    return { ...q, o: shuffledOpts, a: shuffledOpts.indexOf(correctText) }
  })
}

function getComboMulti(s) { return s >= 10 ? 3 : s >= 5 ? 2 : s >= 3 ? 1.5 : 1 }
function getComboLabel(s) { return s >= 10 ? '🔥 UNSTOPPABLE ×3' : s >= 5 ? '⚡ ON FIRE ×2' : s >= 3 ? '✨ COMBO ×1.5' : '' }
function getComboColor(s) { return s >= 10 ? '#FF3838' : s >= 5 ? '#E17055' : s >= 3 ? '#FDCB6E' : '#888' }

export default function QuizTrivia({ onBack, onHome, game, difficulty, multiplayerMatch }) {
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()
  const tc = useThemeColors()
  const matchCtx = useMatch() || {}
  const { updateMatchState, finishMatch, setActiveMatch } = matchCtx
  const { uid: userId } = useAuth()
  const diff = CFG[difficulty?.id] || CFG.easy

  // ── PvP state ──
  const isMultiplayer = !!multiplayerMatch
  const myUid = userId || auth.currentUser?.uid
  const opponentUid = isMultiplayer ? (multiplayerMatch.hostUid === myUid ? multiplayerMatch.guestUid : multiplayerMatch.hostUid) : null
  const opponentData = isMultiplayer ? (multiplayerMatch.state?.[opponentUid] || { score: 0, finished: false }) : null
  const opponentProfile = isMultiplayer
    ? (multiplayerMatch.hostUid === myUid ? multiplayerMatch.guestProfile : multiplayerMatch.hostProfile)
    : null

  const [phase, setPhase] = useState('tutorial')
  const [questions, setQuestions] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [totalWrong, setTotalWrong] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [timeLeft, setTimeLeft] = useState(diff.timePerQ)
  const [feedback, setFeedback] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [gameOverReason, setGameOverReason] = useState('')
  const timerRef = useRef(null)
  const fbRef = useRef(null)
  const scoreRef = useRef(0) // For PvP sync without stale closure

  const bestKey = `quiz-trivia-best-${difficulty?.id || 'easy'}`
  const [bestScore, setBestScore] = useState(() => { try { return parseInt(localStorage.getItem(bestKey)) || 0 } catch { return 0 } })

  useEffect(() => () => { clearInterval(timerRef.current); clearTimeout(fbRef.current) }, [])

  // ── PvP: auto-start when match becomes active ──
  useEffect(() => {
    if (isMultiplayer && phase === 'tutorial') setPhase('ready')
    if (isMultiplayer && phase === 'ready') startGame()
  }, [isMultiplayer, phase])

  // ── PvP: sync score to Firestore ──
  useEffect(() => {
    scoreRef.current = score
    if (!isMultiplayer || !multiplayerMatch?.id || phase !== 'playing') return
    const newState = {
      ...multiplayerMatch.state,
      [myUid]: { score, correct: totalCorrect, qIndex, finished: false }
    }
    updateMatchState?.(multiplayerMatch.id, newState)
  }, [score, totalCorrect, qIndex])

  // ── PvP: monitor opponent finish ──
  useEffect(() => {
    if (!isMultiplayer || phase !== 'playing') return
    if (opponentData?.finished && multiplayerMatch?.status === 'active') {
      // Opponent finished — keep playing, but show indicator
    }
    if (multiplayerMatch?.status === 'cancelled') {
      endGame('opponent_quit')
    }
  }, [opponentData?.finished, multiplayerMatch?.status])

  const startTimer = useCallback((q) => {
    clearInterval(timerRef.current)
    setTimeLeft(diff.timePerQ)
    const start = Date.now()
    timerRef.current = setInterval(() => {
      const rem = diff.timePerQ - (Date.now() - start) / 1000
      if (rem <= 0) { clearInterval(timerRef.current); setTimeLeft(0); handleWrong(q, true) }
      else setTimeLeft(rem)
    }, 50)
  }, [diff.timePerQ])

  const advance = useCallback(() => {
    setQIndex(i => {
      const next = i + 1
      if (next >= questions.length) { endGame('complete'); return i }
      setFeedback(null); setSelectedAnswer(null)
      setTimeout(() => startTimer(questions[next]), 50)
      return next
    })
  }, [questions, startTimer])

  const handleWrong = useCallback((q, timeout = false) => {
    clearInterval(timerRef.current); play('error')
    setFeedback({ type: timeout ? 'timeout' : 'wrong', answer: q.o[q.a] })
    setStreak(0)
    setTotalWrong(p => p + 1)
    fbRef.current = setTimeout(() => advance(), 1400)
  }, [play, advance])

  const handleAnswer = useCallback((idx) => {
    if (feedback || selectedAnswer !== null) return
    clearInterval(timerRef.current); setSelectedAnswer(idx)
    const q = questions[qIndex]
    if (idx === q.a) {
      play('success'); const ns = streak + 1; const m = getComboMulti(ns)
      const pts = Math.round((200 + Math.round(timeLeft * 15)) * m)
      setStreak(ns); setBestStreak(p => Math.max(p, ns)); setScore(p => p + pts); setTotalCorrect(p => p + 1)
      setFeedback({ type: 'correct', points: pts, multi: m })
      fbRef.current = setTimeout(() => advance(), 800)
    } else handleWrong(q)
  }, [feedback, selectedAnswer, questions, qIndex, streak, timeLeft, play, advance, handleWrong])

  const endGame = useCallback((reason) => {
    clearInterval(timerRef.current); clearTimeout(fbRef.current)
    setGameOverReason(reason); setPhase('result')

    // PvP: sync final state
    if (isMultiplayer && multiplayerMatch?.id) {
      const finalScore = scoreRef.current
      const newState = {
        ...multiplayerMatch.state,
        [myUid]: { score: finalScore, correct: totalCorrect, qIndex, finished: true }
      }
      updateMatchState?.(multiplayerMatch.id, newState)

      // If opponent also finished, determine winner
      if (opponentData?.finished) {
        const winner = finalScore > opponentData.score ? myUid
          : finalScore < opponentData.score ? opponentUid : 'draw'
        finishMatch?.(multiplayerMatch.id, winner)
      }
    }

    if (reason === 'complete') { setShowConfetti(true); play('win') } else play('gameOver')
  }, [play, isMultiplayer, multiplayerMatch, myUid, opponentUid, opponentData, totalCorrect, qIndex])

  // PvP: if opponent finishes after us, determine winner
  useEffect(() => {
    if (phase !== 'result' || !isMultiplayer) return
    if (opponentData?.finished && multiplayerMatch?.status === 'active') {
      const winner = score > opponentData.score ? myUid
        : score < opponentData.score ? opponentUid : 'draw'
      finishMatch?.(multiplayerMatch.id, winner)
    }
  }, [opponentData?.finished])

  const won = gameOverReason === 'complete'
  const totalAnswered = won ? diff.totalQ : qIndex + 1
  const accuracy = Math.round((totalCorrect / Math.max(totalAnswered, 1)) * 100)
  const stars = won ? calcStars(totalCorrect, diff.totalQ, diff) : 0
  const coinReward = isMultiplayer ? 0 : Math.floor(score / 50) + stars * 5
  const isNewBest = score > bestScore

  // PvP result
  const pvpWon = isMultiplayer && multiplayerMatch?.winner === myUid
  const pvpDraw = isMultiplayer && multiplayerMatch?.winner === 'draw'
  const pvpLost = isMultiplayer && multiplayerMatch?.winner && multiplayerMatch.winner !== myUid && multiplayerMatch.winner !== 'draw'

  useEffect(() => {
    if (phase !== 'result' || isMultiplayer) return
    if (isNewBest) { localStorage.setItem(bestKey, score.toString()); setBestScore(score) }
    if (coinReward > 0) earnCoins(coinReward, 'Quiz Trivia')
    reportGameResult({ gameId: 'quiz-trivia', difficultyId: difficulty?.id || 'easy', score, stars, won, timeSec: 0 })
  }, [phase])

  const startGame = useCallback(() => {
    const seed = isMultiplayer ? multiplayerMatch?.seed : null
    const qs = prepareQuestions(diff.totalQ, seed)
    setQuestions(qs); setQIndex(0); setTotalWrong(0); setScore(0); setStreak(0); setBestStreak(0)
    setTotalCorrect(0); setFeedback(null); setSelectedAnswer(null); setShowConfetti(false); setGameOverReason('')
    setPhase('playing')
    setTimeout(() => startTimer(qs[0]), 100)
  }, [diff, startTimer, isMultiplayer, multiplayerMatch?.seed])

  const accent = '#0984E3'; const accentLight = '#74B9FF'
  const bg = tc.bg; const surface = tc.surface; const textMain = tc.text; const textMuted = tc.muted
  const timerPct = (timeLeft / diff.timePerQ) * 100
  const timerColor = timerPct > 50 ? '#00B894' : timerPct > 25 ? '#FDCB6E' : '#FF6B6B'

  if (phase === 'tutorial') return <TutorialModal steps={TUTORIAL_STEPS} onClose={() => setPhase('ready')} />

  if (phase === 'ready') return (
    <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ fontSize:72, marginBottom:12 }}>🇮🇩</div>
        <h1 style={{ fontFamily:"'Fredoka One',cursive", color:accent, fontSize:26, margin:'0 0 8px' }}>Quiz Trivia Indonesia</h1>
        <p style={{ color:textMuted, fontSize:14, marginBottom:24, lineHeight:1.5 }}>Jawab semua soal, raih skor terbaik!<br/>⭐⭐⭐ = akurasi ≥{diff.star3}%</p>
        <div style={{ display:'flex', gap:16, justifyContent:'center', marginBottom:24, flexWrap:'wrap' }}>
          <div style={{ background:surface, borderRadius:12, padding:'12px 20px', textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:700, color:accent }}>{diff.totalQ}</div>
            <div style={{ fontSize:11, color:textMuted }}>soal</div>
          </div>
          <div style={{ background:surface, borderRadius:12, padding:'12px 20px', textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:700, color:'#00B894' }}>≥{diff.star3}%</div>
            <div style={{ fontSize:11, color:textMuted }}>target ⭐⭐⭐</div>
          </div>
          <div style={{ background:surface, borderRadius:12, padding:'12px 20px', textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:700, color:'#FDCB6E' }}>{diff.timePerQ}s</div>
            <div style={{ fontSize:11, color:textMuted }}>per soal</div>
          </div>
        </div>
        {bestScore > 0 && <div style={{ color:textMuted, fontSize:13, marginBottom:16 }}>🏆 Best: {bestScore.toLocaleString()}</div>}
        <button onClick={startGame} style={{ fontFamily:"'Fredoka One',cursive", fontSize:18, padding:'14px 48px', background:`linear-gradient(135deg,${accent},${accentLight})`, color:'#fff', border:'none', borderRadius:14, cursor:'pointer' }}>MULAI! 🚀</button>
        <div style={{ marginTop:16 }}><button onClick={onBack} style={{ background:'none', border:'none', color:textMuted, cursor:'pointer', fontSize:14 }}>← Kembali</button></div>
      </div>
    </div>
  )

  if (phase === 'result') {
    const diffLabel = { easy: '🟢 Mudah', medium: '🟡 Sedang', hard: '🔴 Sulit' }[difficulty?.id] || '🟢 Mudah'

    // PvP result override
    if (isMultiplayer) {
      const waiting = !multiplayerMatch?.winner
      return (
        <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>
          {showConfetti && <Confetti />}
          <div style={{ textAlign:'center', maxWidth:400, background:surface, borderRadius:24, padding:32, border:`2px solid ${tc.border}` }}>
            <div style={{ fontSize:64, marginBottom:12 }}>
              {waiting ? '⏳' : pvpWon ? '🏆' : pvpDraw ? '🤝' : '😔'}
            </div>
            <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:24, color:textMain, margin:'0 0 8px' }}>
              {waiting ? 'Menunggu lawan selesai...' : pvpWon ? 'KAMU MENANG!' : pvpDraw ? 'SERI!' : 'KAMU KALAH!'}
            </h2>
            <div style={{ display:'flex', justifyContent:'center', gap:24, margin:'20px 0' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:11, fontWeight:800, color:'#6C5CE7' }}>SKOR KAMU</div>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:'#00B894' }}>{score.toLocaleString()}</div>
              </div>
              <div style={{ fontSize:24, alignSelf:'center' }}>VS</div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:11, fontWeight:800, color:'#FF6B6B' }}>{opponentProfile?.displayName || 'LAWAN'}</div>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:'#FF6B6B' }}>{(opponentData?.score || 0).toLocaleString()}</div>
              </div>
            </div>
            <button onClick={() => { setActiveMatch?.(null); onHome() }} style={{
              fontFamily:"'Fredoka One',cursive", fontSize:16, padding:'12px 36px',
              background:'linear-gradient(135deg,#6C5CE7,#A29BFE)', color:'#fff',
              border:'none', borderRadius:14, cursor:'pointer', marginTop:12
            }}>
              KEMBALI
            </button>
          </div>
        </div>
      )
    }

    return (
      <div style={{ minHeight:'100dvh', background:bg }}>
        {showConfetti && <Confetti />}
        <WinModal
          emoji={stars >= 3 ? '🏆' : stars >= 2 ? '🎉' : stars >= 1 ? '😊' : '😔'}
          title={stars >= 3 ? 'LUAR BIASA!' : stars >= 2 ? 'BAGUS!' : stars >= 1 ? 'LUMAYAN!' : 'KEEP TRYING!'}
          subtitle={won ? `Akurasi ${accuracy}% — ${totalCorrect} dari ${diff.totalQ} benar!` : `Selesai! ${totalCorrect} dari ${diff.totalQ} benar.`}
          diffLabel={diffLabel}
          stats={[
            { label: 'Skor', value: score.toLocaleString(), color: '#6C5CE7' },
            { label: 'Benar', value: `${totalCorrect}/${won ? diff.totalQ : qIndex + 1}`, color: '#00B894' },
            { label: 'Akurasi', value: `${accuracy}%`, color: '#FDCB6E' },
            { label: 'Best streak', value: String(bestStreak), color: '#FD79A8' },
            { label: 'Salah', value: String(totalWrong), color: '#FF6B6B' },
          ]}
          stars={stars} coinReward={coinReward}
          highlight={isNewBest ? '🏆 Skor baru terbaik!' : ''}
          onRestart={() => setPhase('ready')} onBack={onBack} onHome={onHome}
          dark={tc.dark} gameColor={accent}
        />
      </div>
    )
  }

  // ─── Playing ────────────────────────────────────────────────────────────
  const q = questions[qIndex]
  if (!q) return null
  const comboLabel = getComboLabel(streak)
  const progPct = ((qIndex) / diff.totalQ) * 100

  return (
    <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column' }}>
      {/* PvP Score Bar */}
      {isMultiplayer && (
        <PvpScoreBar
          opponentProfile={opponentProfile}
          opponentScore={opponentData?.score || 0}
          opponentExtra={`${opponentData?.correct || 0} benar`}
          opponentFinished={opponentData?.finished}
          myScore={score}
          onQuit={() => { matchCtx.quitMatch?.(multiplayerMatch?.id); setActiveMatch?.(null); onHome() }}
        />
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', gap:8 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:textMuted, fontSize:20, cursor:'pointer' }}>←</button>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#00B894' }}>✓ {totalCorrect}</span>
          <span style={{ fontSize:12, color:tc.muted }}>|</span>
          <span style={{ fontSize:13, fontWeight:700, color:'#FF6B6B' }}>✗ {totalWrong}</span>
        </div>
        <div style={{ fontFamily:"'Fredoka One',cursive", color:accent, fontSize:16 }}>{score.toLocaleString()}</div>
      </div>

      <div style={{ height:6, background:surface, margin:'0 16px', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${timerPct}%`, background:timerColor, borderRadius:3, transition:feedback?'none':'width 0.1s linear' }} />
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px 4px' }}>
        <div style={{ fontSize:13, color:textMuted }}>Soal <span style={{ fontWeight:700, color:accent }}>{qIndex + 1}</span>/{diff.totalQ}</div>
        <div style={{ fontSize:12, color:textMuted }}>{q.cat}</div>
      </div>
      <div style={{ height:4, background:surface, margin:'0 16px 8px', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${progPct}%`, background:accentLight, borderRadius:2, transition:'width 0.3s' }} />
      </div>

      <div style={{ textAlign:'center', height:24, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {comboLabel && <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:15, color:getComboColor(streak), animation:'qtPulse 0.6s ease infinite alternate' }}>{comboLabel}</div>}
        {streak > 0 && streak < 3 && <div style={{ fontSize:13, color:textMuted }}>🔥 Streak: {streak}</div>}
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 20px', gap:16 }}>
        <div style={{ background:surface, borderRadius:20, padding:'24px 20px', width:'100%', maxWidth:420, textAlign:'center',
          border: feedback?.type==='correct'?'2px solid #00B894' : feedback?.type==='wrong'||feedback?.type==='timeout'?'2px solid #FF6B6B' : `2px solid ${tc.border}`,
          animation: feedback?.type==='wrong'||feedback?.type==='timeout'?'qtShake 0.4s ease' : feedback?.type==='correct'?'qtPop 0.3s ease' : 'none',
        }}>
          <div style={{ fontSize:32, marginBottom:8 }}>{q.cat}</div>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:16, fontWeight:700, color:textMain, lineHeight:1.5 }}>{q.q}</div>
        </div>

        {feedback && (
          <div style={{ textAlign:'center', animation:'qtFade 0.3s ease' }}>
            {feedback.type === 'correct' && <div style={{ color:'#00B894', fontWeight:700, fontSize:16 }}>✓ Benar! +{feedback.points} {feedback.multi > 1 ? `(×${feedback.multi})` : ''}</div>}
            {feedback.type === 'wrong' && <div style={{ color:'#FF6B6B', fontWeight:700, fontSize:16 }}>✗ Salah! Jawaban: {feedback.answer}</div>}
            {feedback.type === 'timeout' && <div style={{ color:'#FF6B6B', fontWeight:700, fontSize:16 }}>⏰ Waktu habis! Jawaban: {feedback.answer}</div>}
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:420 }}>
          {q.o.map((opt, i) => {
            const isSel = selectedAnswer === i; const isAns = i === q.a
            let btnBg = surface, btnColor = textMain, btnBorder = tc.border
            if (feedback) {
              if (isAns) { btnBg = '#00B894'; btnColor = '#fff'; btnBorder = '#00B894' }
              else if (isSel) { btnBg = '#FF6B6B'; btnColor = '#fff'; btnBorder = '#FF6B6B' }
              else { btnColor = textMuted }
            }
            return (
              <button key={i} onClick={() => handleAnswer(i)} disabled={!!feedback}
                style={{ fontFamily:"'Nunito',sans-serif", fontSize:15, fontWeight:700, padding:'14px 16px', background:btnBg, color:btnColor, border:`2px solid ${btnBorder}`, borderRadius:14, cursor:feedback?'default':'pointer', transition:'all 0.15s', opacity:feedback&&!isAns&&!isSel?0.5:1, textAlign:'left' }}>
                <span style={{ marginRight:8, opacity:0.6 }}>{String.fromCharCode(65+i)}.</span> {opt}
              </button>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes qtShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes qtPop { 0%{transform:scale(1)} 50%{transform:scale(1.03)} 100%{transform:scale(1)} }
        @keyframes qtPulse { from{transform:scale(1)} to{transform:scale(1.08)} }
        @keyframes qtFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
