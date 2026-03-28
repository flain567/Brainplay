import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'
import { WinModal } from '../../components/GameLayout.jsx'

const TUTORIAL_STEPS = [
  { emoji:'🔢', title:'Number Sequence', desc:'Temukan pola dalam deret angka dan tebak angka berikutnya!', tip:'Perhatikan selisih, perkalian, atau pola khusus antar angka.' },
  { emoji:'📈', title:'Level Naik', desc:'Setiap 4 jawaban benar, level naik — pola semakin kompleks!', tip:'Level awal: penjumlahan sederhana. Level tinggi: fibonacci, kuadrat, campuran!' },
  { emoji:'⏱️', title:'Timer & Skor', desc:'Jawab cepat untuk bonus poin! Pilih dari 4 opsi jawaban.', tip:'Streak combo memberi multiplier hingga 3×!' },
]

// ─── Config ───────────────────────────────────────────────────────────────
const CFG = {
  easy:   { timePerQ: 20, lives: 5, correctToLevel: 4, targetLevel: 7, seqLen: 5 },
  medium: { timePerQ: 15, lives: 4, correctToLevel: 4, targetLevel: 9, seqLen: 5 },
  hard:   { timePerQ: 10, lives: 3, correctToLevel: 4, targetLevel: 11, seqLen: 6 },
}

// ─── Sequence Generators ──────────────────────────────────────────────────
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a }

function genArithmetic(len) {
  const start = randInt(1, 20)
  const diff = randInt(2, 12)
  const seq = Array.from({ length: len + 1 }, (_, i) => start + diff * i)
  return { seq: seq.slice(0, len), answer: seq[len], hint: `+${diff}` }
}

function genMultiply(len) {
  const start = randInt(1, 5)
  const ratio = randInt(2, 4)
  const seq = [start]
  for (let i = 1; i <= len; i++) seq.push(seq[i - 1] * ratio)
  return { seq: seq.slice(0, len), answer: seq[len], hint: `×${ratio}` }
}

function genSquares(len) {
  const offset = randInt(1, 5)
  const seq = Array.from({ length: len + 1 }, (_, i) => (i + offset) * (i + offset))
  return { seq: seq.slice(0, len), answer: seq[len], hint: 'n²' }
}

function genTriangular(len) {
  const seq = []
  for (let i = 1; i <= len + 1; i++) seq.push((i * (i + 1)) / 2)
  return { seq: seq.slice(0, len), answer: seq[len], hint: 'n(n+1)/2' }
}

function genFibLike(len) {
  const a = randInt(1, 5), b = randInt(1, 5)
  const seq = [a, b]
  for (let i = 2; i <= len; i++) seq.push(seq[i - 1] + seq[i - 2])
  return { seq: seq.slice(0, len), answer: seq[len], hint: 'a+b=c' }
}

function genAlternating(len) {
  const base = randInt(2, 10)
  const add1 = randInt(2, 6), add2 = randInt(3, 8)
  const seq = [base]
  for (let i = 1; i <= len; i++) seq.push(seq[i - 1] + (i % 2 === 1 ? add1 : add2))
  return { seq: seq.slice(0, len), answer: seq[len], hint: `+${add1}/+${add2}` }
}

function genPower(len) {
  const base = randInt(2, 3)
  const seq = Array.from({ length: len + 1 }, (_, i) => Math.pow(base, i + 1))
  return { seq: seq.slice(0, len), answer: seq[len], hint: `${base}ⁿ` }
}

function genArithIncDiff(len) {
  const start = randInt(1, 5)
  const diffStart = randInt(1, 3)
  const seq = [start]
  let d = diffStart
  for (let i = 1; i <= len; i++) { seq.push(seq[i - 1] + d); d++ }
  return { seq: seq.slice(0, len), answer: seq[len], hint: '+n naik' }
}

function genCubes(len) {
  const offset = randInt(1, 3)
  const seq = Array.from({ length: len + 1 }, (_, i) => Math.pow(i + offset, 3))
  return { seq: seq.slice(0, len), answer: seq[len], hint: 'n³' }
}

function genDoubleOp(len) {
  const start = randInt(1, 5)
  const mult = randInt(2, 3), add = randInt(1, 5)
  const seq = [start]
  for (let i = 1; i <= len; i++) seq.push(seq[i - 1] * mult + add)
  return { seq: seq.slice(0, len), answer: seq[len], hint: `×${mult}+${add}` }
}

const GENERATORS_BY_LEVEL = [
  [genArithmetic],
  [genArithmetic, genMultiply],
  [genMultiply, genSquares, genAlternating],
  [genSquares, genFibLike, genAlternating],
  [genFibLike, genTriangular, genArithIncDiff],
  [genTriangular, genPower, genArithIncDiff],
  [genPower, genCubes, genDoubleOp],
  [genCubes, genDoubleOp, genFibLike],
  [genDoubleOp, genPower, genCubes, genArithIncDiff],
  [genPower, genCubes, genDoubleOp, genFibLike, genTriangular],
  [genCubes, genDoubleOp, genPower, genFibLike, genSquares],
]

function generateQuestion(level, seqLen) {
  const pool = GENERATORS_BY_LEVEL[Math.min(level - 1, GENERATORS_BY_LEVEL.length - 1)]
  const gen = pool[Math.floor(Math.random() * pool.length)]
  const { seq, answer, hint } = gen(seqLen)

  const wrongSet = new Set()
  while (wrongSet.size < 3) {
    const dev = Math.max(3, Math.floor(Math.abs(answer) * 0.25))
    let w = answer + randInt(-dev, dev)
    if (w === answer) w += randInt(1, dev)
    if (w !== answer && !wrongSet.has(w)) wrongSet.add(w)
  }
  const options = [answer, ...wrongSet]
  for (let i = options.length - 1; i > 0; i--) { const j = randInt(0, i);[options[i], options[j]] = [options[j], options[i]] }

  return { seq, answer, options, hint }
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function getComboMulti(s) { return s >= 10 ? 3 : s >= 5 ? 2 : s >= 3 ? 1.5 : 1 }
function getComboLabel(s) {
  if (s >= 10) return '🔥 UNSTOPPABLE ×3'
  if (s >= 5) return '⚡ ON FIRE ×2'
  if (s >= 3) return '✨ COMBO ×1.5'
  return ''
}
function getComboColor(s) { return s >= 10 ? '#FF3838' : s >= 5 ? '#E17055' : s >= 3 ? '#FDCB6E' : '#888' }
const LEVEL_NAMES = ['','Pemula','Dasar','Terampil','Mahir','Ahli','Master','Grandmaster','Genius','Legenda','Mythic','Transcendent']

// ─── Component ────────────────────────────────────────────────────────────
export default function NumberSequence({ onBack, onHome, game, difficulty }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()
  const tc = useThemeColors()
  const diff = CFG[difficulty?.id] || CFG.easy

  const [phase, setPhase] = useState('tutorial')
  const [level, setLevel] = useState(1)
  const [lives, setLives] = useState(diff.lives)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [correctInLevel, setCorrectInLevel] = useState(0)
  const [question, setQuestion] = useState(null)
  const [timeLeft, setTimeLeft] = useState(diff.timePerQ)
  const [feedback, setFeedback] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [gameOverReason, setGameOverReason] = useState('')
  const timerRef = useRef(null)
  const fbRef = useRef(null)
  const lvRef = useRef(null)

  const bestKey = `number-sequence-best-${difficulty?.id || 'easy'}`
  const [bestScore, setBestScore] = useState(() => { try { return parseInt(localStorage.getItem(bestKey)) || 0 } catch { return 0 } })

  useEffect(() => () => { clearInterval(timerRef.current); clearTimeout(fbRef.current); clearTimeout(lvRef.current) }, [])

  const nextQ = useCallback((lvl) => {
    const q = generateQuestion(lvl ?? level, diff.seqLen)
    setQuestion(q); setTimeLeft(diff.timePerQ); setSelectedAnswer(null); setFeedback(null)
    clearInterval(timerRef.current)
    const start = Date.now()
    timerRef.current = setInterval(() => {
      const rem = diff.timePerQ - (Date.now() - start) / 1000
      if (rem <= 0) { clearInterval(timerRef.current); setTimeLeft(0); handleTimeout(q) }
      else setTimeLeft(rem)
    }, 50)
  }, [level, diff])

  const handleTimeout = useCallback((q) => {
    clearInterval(timerRef.current); play('error')
    setFeedback({ type: 'timeout', answer: q.answer, hint: q.hint }); setStreak(0); setTotalAnswered(a => a + 1)
    setLives(p => { const n = p - 1; if (n <= 0) fbRef.current = setTimeout(() => endGame('lives'), 1200); else fbRef.current = setTimeout(() => nextQ(), 1200); return n })
  }, [play, nextQ])

  const handleAnswer = useCallback((sel) => {
    if (feedback || selectedAnswer !== null) return
    clearInterval(timerRef.current); setSelectedAnswer(sel)
    const correct = sel === question.answer
    const tb = Math.round(timeLeft * 10)
    if (correct) {
      play('success'); const ns = streak + 1; const m = getComboMulti(ns)
      const pts = Math.round((100 * level + tb) * m)
      setStreak(ns); setBestStreak(p => Math.max(p, ns)); setScore(p => p + pts)
      setTotalCorrect(p => p + 1); setTotalAnswered(p => p + 1)
      setFeedback({ type: 'correct', points: pts, multi: m, hint: question.hint })
      const newCIL = correctInLevel + 1; setCorrectInLevel(newCIL)
      if (newCIL >= diff.correctToLevel) {
        const nl = level + 1
        if (nl > diff.targetLevel) fbRef.current = setTimeout(() => endGame('target'), 1000)
        else fbRef.current = setTimeout(() => { setLevel(nl); setCorrectInLevel(0); setShowLevelUp(true); play('levelUp'); lvRef.current = setTimeout(() => { setShowLevelUp(false); nextQ(nl) }, 1500) }, 800)
      } else fbRef.current = setTimeout(() => nextQ(), 800)
    } else {
      play('error'); setStreak(0); setTotalAnswered(p => p + 1)
      setFeedback({ type: 'wrong', answer: question.answer, hint: question.hint })
      setLives(p => { const n = p - 1; if (n <= 0) fbRef.current = setTimeout(() => endGame('lives'), 1200); else fbRef.current = setTimeout(() => nextQ(), 1200); return n })
    }
  }, [feedback, selectedAnswer, question, streak, level, correctInLevel, timeLeft, play, diff, nextQ])

  const endGame = useCallback((reason) => {
    clearInterval(timerRef.current); clearTimeout(fbRef.current)
    setGameOverReason(reason); setPhase('result')
    if (reason === 'target') { setShowConfetti(true); play('win') } else play('gameOver')
  }, [play])

  const won = gameOverReason === 'target'
  const stars = won ? (lives >= diff.lives ? 3 : lives >= Math.ceil(diff.lives / 2) ? 2 : 1) : 0
  const coinReward = won ? Math.floor(score / 50) + stars * 5 : Math.floor(score / 100)
  const isNewBest = score > bestScore

  useEffect(() => {
    if (phase !== 'result') return
    if (isNewBest) { localStorage.setItem(bestKey, score.toString()); setBestScore(score) }
    if (coinReward > 0) earnCoins(coinReward, 'Number Sequence')
    reportGameResult({ gameId: 'number-sequence', difficultyId: difficulty?.id || 'easy', score, stars, won, timeSec: 0 })
  }, [phase])

  const startGame = useCallback(() => {
    setPhase('playing'); setLevel(1); setLives(diff.lives); setScore(0); setStreak(0); setBestStreak(0)
    setTotalCorrect(0); setTotalAnswered(0); setCorrectInLevel(0); setFeedback(null); setSelectedAnswer(null)
    setShowConfetti(false); setShowLevelUp(false); setGameOverReason(''); nextQ(1)
  }, [diff, nextQ])

  const accent = '#E17055'; const accentLight = '#FAB1A0'
  const bg = tc.bg; const surface = tc.surface; const textMain = tc.text; const textMuted = tc.muted
  const timerPct = (timeLeft / diff.timePerQ) * 100
  const timerColor = timerPct > 50 ? '#00B894' : timerPct > 25 ? '#FDCB6E' : '#FF6B6B'

  if (phase === 'tutorial') return <TutorialModal steps={TUTORIAL_STEPS} onClose={() => setPhase('ready')} />

  if (phase === 'ready') return (
    <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ fontSize:72, marginBottom:12 }}>🔢</div>
        <h1 style={{ fontFamily:"'Fredoka One',cursive", color:accent, fontSize:28, margin:'0 0 8px' }}>Number Sequence</h1>
        <p style={{ color:textMuted, fontSize:14, marginBottom:24, lineHeight:1.5 }}>Temukan pola deret angka!<br/>Capai Level {diff.targetLevel} untuk menang.</p>
        <div style={{ display:'flex', gap:16, justifyContent:'center', marginBottom:24, flexWrap:'wrap' }}>
          <div style={{ background:surface, borderRadius:12, padding:'12px 20px', textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:700, color:accent }}>{diff.timePerQ}s</div>
            <div style={{ fontSize:11, color:textMuted }}>per soal</div>
          </div>
          <div style={{ background:surface, borderRadius:12, padding:'12px 20px', textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:700, color:'#FF6B6B' }}>{'❤️'.repeat(diff.lives)}</div>
            <div style={{ fontSize:11, color:textMuted }}>{diff.lives} nyawa</div>
          </div>
        </div>
        {bestScore > 0 && <div style={{ color:textMuted, fontSize:13, marginBottom:16 }}>🏆 Best: {bestScore.toLocaleString()}</div>}
        <button onClick={startGame} style={{ fontFamily:"'Fredoka One',cursive", fontSize:18, padding:'14px 48px', background:`linear-gradient(135deg,${accent},${accentLight})`, color:'#fff', border:'none', borderRadius:14, cursor:'pointer', boxShadow:`0 4px 20px ${accent}44` }}>MULAI! 🚀</button>
        <div style={{ marginTop:16 }}><button onClick={onBack} style={{ background:'none', border:'none', color:textMuted, cursor:'pointer', fontSize:14 }}>← Kembali</button></div>
      </div>
    </div>
  )

  if (phase === 'result') {
    const accuracy = totalAnswered > 0 ? Math.round(totalCorrect / totalAnswered * 100) : 0
    const diffLabel = { easy: '🟢 Mudah', medium: '🟡 Sedang', hard: '🔴 Sulit' }[difficulty?.id] || '🟢 Mudah'
    return (
      <div style={{ minHeight:'100dvh', background:bg }}>
        {showConfetti && <Confetti />}
        <WinModal
          emoji={won ? '🎉' : '💔'}
          title={won ? 'LUAR BIASA!' : 'Game over'}
          subtitle={won ? 'Kamu master pola angka!' : `Level ${level} — ${LEVEL_NAMES[level] || ''}`}
          diffLabel={diffLabel}
          stats={[
            { label: 'Skor', value: score.toLocaleString(), color: '#6C5CE7' },
            { label: 'Level', value: `${level} — ${LEVEL_NAMES[level] || ''}`, color: '#A29BFE' },
            { label: 'Benar', value: `${totalCorrect}/${totalAnswered}`, color: '#00B894' },
            { label: 'Akurasi', value: `${accuracy}%`, color: '#FDCB6E' },
            { label: 'Best streak', value: String(bestStreak), color: '#FD79A8' },
          ]}
          stars={won ? stars : 0}
          coinReward={coinReward}
          highlight={isNewBest ? '🏆 Skor baru terbaik!' : ''}
          onRestart={() => setPhase('ready')}
          onBack={onBack}
          onHome={onHome}
          dark={darkMode}
          gameColor={accent}
        />
      </div>
    )
  }

  // ─── Playing ────────────────────────────────────────────────────────────
  const comboLabel = getComboLabel(streak)
  const progPct = (correctInLevel / diff.correctToLevel) * 100

  return (
    <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', gap:8 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:textMuted, fontSize:20, cursor:'pointer' }}>←</button>
        <div style={{ display:'flex', gap:4 }}>{Array.from({ length: diff.lives }, (_, i) => <span key={i} style={{ fontSize:18, opacity:i<lives?1:0.2, transition:'opacity 0.3s' }}>❤️</span>)}</div>
        <div style={{ fontFamily:"'Fredoka One',cursive", color:accent, fontSize:16 }}>{score.toLocaleString()}</div>
      </div>

      <div style={{ height:6, background:surface, margin:'0 16px', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${timerPct}%`, background:timerColor, borderRadius:3, transition:feedback?'none':'width 0.1s linear' }} />
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px 4px' }}>
        <div style={{ fontSize:13, color:textMuted }}><span style={{ fontWeight:700, color:accent }}>Level {level}</span> {LEVEL_NAMES[level]||''}</div>
        <div style={{ fontSize:12, color:textMuted }}>{correctInLevel}/{diff.correctToLevel} → Lv{level+1}</div>
      </div>
      <div style={{ height:4, background:surface, margin:'0 16px 8px', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${progPct}%`, background:accentLight, borderRadius:2, transition:'width 0.3s' }} />
      </div>

      <div style={{ textAlign:'center', height:28, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {comboLabel && <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:16, color:getComboColor(streak), animation:'nsPulse 0.6s ease infinite alternate' }}>{comboLabel}</div>}
        {streak > 0 && streak < 3 && <div style={{ fontSize:13, color:textMuted }}>🔥 Streak: {streak}</div>}
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 20px', gap:20 }}>
        {showLevelUp && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ textAlign:'center', animation:'nsBounce 0.5s ease' }}>
              <div style={{ fontSize:64 }}>📈</div>
              <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:32, color:'#FDCB6E', marginTop:8 }}>LEVEL UP!</div>
              <div style={{ fontSize:18, color:'#fff', marginTop:4 }}>Level {level}</div>
            </div>
          </div>
        )}

        {question && (
          <>
            {/* Sequence display */}
            <div style={{ background:surface, borderRadius:20, padding:'24px 20px', width:'100%', maxWidth:400, textAlign:'center',
              border: feedback?.type==='correct'?'2px solid #00B894' : feedback?.type==='wrong'||feedback?.type==='timeout'?'2px solid #FF6B6B' : `2px solid ${tc.border}`,
              animation: feedback?.type==='wrong'||feedback?.type==='timeout'?'nsShake 0.4s ease' : feedback?.type==='correct'?'nsPop 0.3s ease' : 'none',
            }}>
              <div style={{ fontSize:11, color:textMuted, marginBottom:12, textTransform:'uppercase', letterSpacing:2 }}>Temukan Pola</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, flexWrap:'wrap' }}>
                {question.seq.map((n, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ fontFamily:"'Fredoka One',cursive", fontSize: question.seq.length > 5 ? 22 : 28, color:textMain, background:tc.dark?'#1a1a3e':'#f0effe', borderRadius:10, padding:'8px 14px', minWidth:44, textAlign:'center' }}>
                      {n.toLocaleString()}
                    </div>
                    {i < question.seq.length - 1 && <span style={{ color:textMuted, fontSize:14 }}>→</span>}
                  </div>
                ))}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:textMuted, fontSize:14 }}>→</span>
                  <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:accent, background:`${accent}18`, borderRadius:10, padding:'8px 14px', minWidth:44, textAlign:'center', border:`2px dashed ${accent}` }}>
                    ?
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <div style={{ textAlign:'center', animation:'nsFadeIn 0.3s ease' }}>
                {feedback.type === 'correct' && <div style={{ color:'#00B894', fontWeight:700, fontSize:16 }}>✓ Benar! +{feedback.points} {feedback.multi > 1 ? `(×${feedback.multi})` : ''}</div>}
                {feedback.type === 'wrong' && <div style={{ color:'#FF6B6B', fontWeight:700, fontSize:16 }}>✗ Salah! Jawaban: {feedback.answer} <span style={{ fontSize:12, opacity:0.8 }}>({feedback.hint})</span></div>}
                {feedback.type === 'timeout' && <div style={{ color:'#FF6B6B', fontWeight:700, fontSize:16 }}>⏰ Waktu habis! Jawaban: {feedback.answer} <span style={{ fontSize:12, opacity:0.8 }}>({feedback.hint})</span></div>}
              </div>
            )}

            {/* Options */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, width:'100%', maxWidth:380 }}>
              {question.options.map((opt, i) => {
                const isSel = selectedAnswer === opt; const isAns = opt === question.answer
                let btnBg = surface, btnColor = textMain, btnBorder = tc.border
                if (feedback) {
                  if (isAns) { btnBg = '#00B894'; btnColor = '#fff'; btnBorder = '#00B894' }
                  else if (isSel) { btnBg = '#FF6B6B'; btnColor = '#fff'; btnBorder = '#FF6B6B' }
                  else { btnColor = textMuted }
                }
                return (
                  <button key={i} onClick={() => handleAnswer(opt)} disabled={!!feedback}
                    style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, padding:'16px 8px', background:btnBg, color:btnColor, border:`2px solid ${btnBorder}`, borderRadius:14, cursor:feedback?'default':'pointer', transition:'all 0.15s', opacity:feedback&&!isAns&&!isSel?0.5:1, transform:isSel?'scale(0.95)':'scale(1)' }}>
                    {opt.toLocaleString()}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes nsShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes nsPop { 0%{transform:scale(1)} 50%{transform:scale(1.04)} 100%{transform:scale(1)} }
        @keyframes nsPulse { from{transform:scale(1)} to{transform:scale(1.08)} }
        @keyframes nsFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes nsBounce { 0%{opacity:0;transform:scale(0.5)} 60%{transform:scale(1.1)} 100%{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  )
}
