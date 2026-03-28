import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

const TUTORIAL_STEPS = [
  { emoji:'🧮', title:'Math Challenge', desc:'Uji kecepatan hitungmu! Jawab soal matematika secepat mungkin sebelum waktu habis.', tip:'Semakin cepat jawab, semakin banyak poin bonus!' },
  { emoji:'📈', title:'Level Naik', desc:'Setiap 5 jawaban benar, level naik dan soal semakin sulit — dari penjumlahan hingga operasi campuran.', tip:'Di level tinggi, akan ada perkalian, pembagian, dan soal multi-langkah!' },
  { emoji:'🔥', title:'Combo & Bonus', desc:'Jawab benar berturut-turut untuk membangun combo multiplier hingga 3×! Jawaban cepat = bonus waktu.', tip:'Jaga combo tetap hidup untuk skor maksimal!' },
]

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'
import { GameHeader, StatsBar, ActionButtons, WinModal, BestRecord } from '../../components/GameLayout.jsx'

// ─── Configuration ──────────────────────────────────────────────────────────
const CFG = {
  easy:   { timePerQ: 15, lives: 5, startLevel: 1, correctToLevel: 5, targetLevel: 8 },
  medium: { timePerQ: 10, lives: 4, startLevel: 1, correctToLevel: 5, targetLevel: 10 },
  hard:   { timePerQ: 7,  lives: 3, startLevel: 2, correctToLevel: 5, targetLevel: 12 },
}

// ─── Question Generator ──────────────────────────────────────────────────────
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function generateQuestion(level) {
  let a, b, c, op, answer, display

  if (level <= 2) {
    // Addition & subtraction, single/small double digit
    a = level === 1 ? randInt(1, 9) : randInt(10, 50)
    b = level === 1 ? randInt(1, 9) : randInt(1, 30)
    if (Math.random() < 0.5) {
      op = '+'; answer = a + b; display = `${a} + ${b}`
    } else {
      if (a < b) [a, b] = [b, a]
      op = '−'; answer = a - b; display = `${a} − ${b}`
    }
  } else if (level <= 4) {
    // Multiplication + division enters at level 4
    const r = Math.random()
    if (r < 0.3) {
      a = randInt(10, 99); b = randInt(1, 50)
      if (Math.random() < 0.5) { answer = a + b; display = `${a} + ${b}` }
      else { if (a < b) [a, b] = [b, a]; answer = a - b; display = `${a} − ${b}` }
    } else if (r < 0.7 || level < 4) {
      a = randInt(2, 12); b = randInt(2, 12)
      answer = a * b; display = `${a} × ${b}`
    } else {
      b = randInt(2, 12); answer = randInt(2, 12); a = b * answer
      display = `${a} ÷ ${b}`
    }
  } else if (level <= 6) {
    // Mixed harder: bigger multiplication, division, double digit
    const r = Math.random()
    if (r < 0.25) {
      a = randInt(11, 25); b = randInt(2, 9)
      answer = a * b; display = `${a} × ${b}`
    } else if (r < 0.5) {
      b = randInt(3, 15); answer = randInt(2, 15); a = b * answer
      display = `${a} ÷ ${b}`
    } else if (r < 0.75) {
      a = randInt(50, 200); b = randInt(20, 99)
      if (Math.random() < 0.5) { answer = a + b; display = `${a} + ${b}` }
      else { if (a < b) [a, b] = [b, a]; answer = a - b; display = `${a} − ${b}` }
    } else {
      // Two-step: a × b + c
      a = randInt(2, 9); b = randInt(2, 9); c = randInt(1, 20)
      if (Math.random() < 0.5) { answer = a * b + c; display = `${a} × ${b} + ${c}` }
      else { answer = a * b - c; if (answer < 0) { c = randInt(1, a*b-1); answer = a*b-c }; display = `${a} × ${b} − ${c}` }
    }
  } else {
    // Level 7+: Multi-step, all operations, challenging
    const r = Math.random()
    if (r < 0.3) {
      a = randInt(10, 30); b = randInt(2, 9); c = randInt(10, 50)
      answer = a * b + c; display = `${a} × ${b} + ${c}`
    } else if (r < 0.5) {
      a = randInt(10, 30); b = randInt(2, 9); c = randInt(1, 30)
      const product = a * b
      if (product > c) { answer = product - c; display = `${a} × ${b} − ${c}` }
      else { answer = product + c; display = `${a} × ${b} + ${c}` }
    } else if (r < 0.7) {
      // a² + b
      a = randInt(5, 15); b = randInt(1, 30)
      answer = a * a + b; display = `${a}² + ${b}`
    } else if (r < 0.85) {
      // (a + b) × c
      a = randInt(5, 20); b = randInt(3, 15); c = randInt(2, 6)
      answer = (a + b) * c; display = `(${a} + ${b}) × ${c}`
    } else {
      // Larger division
      b = randInt(5, 25); answer = randInt(3, 20); a = b * answer
      display = `${a} ÷ ${b}`
    }
  }

  // Generate 3 wrong answers
  const wrongAnswers = new Set()
  while (wrongAnswers.size < 3) {
    let wrong
    const deviation = Math.max(3, Math.floor(Math.abs(answer) * 0.3))
    wrong = answer + randInt(-deviation, deviation)
    if (wrong === answer) wrong = answer + (Math.random() < 0.5 ? 1 : -1) * randInt(1, deviation)
    if (wrong !== answer && !wrongAnswers.has(wrong)) wrongAnswers.add(wrong)
  }

  const options = [answer, ...wrongAnswers]
  // Shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]]
  }

  return { display, answer, options }
}

// ─── Combo config ──────────────────────────────────────────────────────────
function getComboMultiplier(streak) {
  if (streak >= 10) return 3
  if (streak >= 5)  return 2
  if (streak >= 3)  return 1.5
  return 1
}
function getComboLabel(streak) {
  if (streak >= 10) return '🔥 UNSTOPPABLE ×3'
  if (streak >= 5)  return '⚡ ON FIRE ×2'
  if (streak >= 3)  return '✨ COMBO ×1.5'
  return ''
}
const COMBO_COLORS = { 3: '#FDCB6E', 5: '#E17055', 10: '#FF3838' }
function getComboColor(streak) {
  if (streak >= 10) return '#FF3838'
  if (streak >= 5)  return '#E17055'
  if (streak >= 3)  return '#FDCB6E'
  return '#888'
}

// ─── Level names ──────────────────────────────────────────────────────────
const LEVEL_NAMES = [
  '', 'Pemula', 'Dasar', 'Terampil', 'Mahir',
  'Ahli', 'Master', 'Grandmaster', 'Genius',
  'Legenda', 'Mythic', 'Transcendent', 'Infinity'
]

export default function MathChallenge({ onBack, onHome, game, difficulty }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()
  const tc = useThemeColors()
  const diff = CFG[difficulty?.id] || CFG.easy

  // ─── State ──────────────────────────────────────────────────────────
  const [phase, setPhase] = useState('tutorial') // tutorial | ready | playing | result
  const [level, setLevel] = useState(diff.startLevel)
  const [lives, setLives] = useState(diff.lives)
  const [score, setScore] = useState(0)
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [correctInLevel, setCorrectInLevel] = useState(0)
  const [question, setQuestion] = useState(null)
  const [timeLeft, setTimeLeft] = useState(diff.timePerQ)
  const [feedback, setFeedback] = useState(null) // { type: 'correct'|'wrong', points, answer }
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [gameOverReason, setGameOverReason] = useState('') // 'lives' | 'target'

  const timerRef = useRef(null)
  const feedbackTimerRef = useRef(null)
  const levelUpTimerRef = useRef(null)

  // ─── Best scores from localStorage ──────────────────────────────────
  const bestKey = `math-challenge-best-${difficulty?.id || 'easy'}`
  const [bestScore, setBestScore] = useState(() => {
    try { return parseInt(localStorage.getItem(bestKey)) || 0 } catch { return 0 }
  })
  const [bestLevel, setBestLevel] = useState(() => {
    try { return parseInt(localStorage.getItem(`${bestKey}-level`)) || 0 } catch { return 0 }
  })

  // ─── Cleanup ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(feedbackTimerRef.current)
      clearTimeout(levelUpTimerRef.current)
    }
  }, [])

  // ─── Generate new question ──────────────────────────────────────────
  const nextQuestion = useCallback((lvl) => {
    const q = generateQuestion(lvl ?? level)
    setQuestion(q)
    setTimeLeft(diff.timePerQ)
    setSelectedAnswer(null)
    setFeedback(null)

    clearInterval(timerRef.current)
    const start = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000
      const remaining = diff.timePerQ - elapsed
      if (remaining <= 0) {
        clearInterval(timerRef.current)
        setTimeLeft(0)
        // Time's up = wrong answer
        handleTimeout(q)
      } else {
        setTimeLeft(remaining)
      }
    }, 50)
  }, [level, diff.timePerQ])

  // ─── Handle timeout ──────────────────────────────────────────────────
  const handleTimeout = useCallback((q) => {
    clearInterval(timerRef.current)
    play('error')
    setFeedback({ type: 'timeout', points: 0, answer: q.answer })
    setStreak(0)
    setTotalAnswered(ta => ta + 1)
    setLives(prev => {
      const next = prev - 1
      if (next <= 0) {
        clearTimeout(feedbackTimerRef.current)
        feedbackTimerRef.current = setTimeout(() => endGame('lives'), 1200)
      } else {
        feedbackTimerRef.current = setTimeout(() => nextQuestion(), 1200)
      }
      return next
    })
  }, [play, nextQuestion])

  // ─── Handle answer selection ────────────────────────────────────────
  const handleAnswer = useCallback((selected) => {
    if (feedback || selectedAnswer !== null) return
    clearInterval(timerRef.current)
    setSelectedAnswer(selected)

    const isCorrect = selected === question.answer
    const timeBonus = Math.round(timeLeft * 10)

    if (isCorrect) {
      play('success')
      const newStreak = streak + 1
      const multi = getComboMultiplier(newStreak)
      const basePoints = 100 * level
      const points = Math.round((basePoints + timeBonus) * multi)

      setStreak(newStreak)
      setBestStreak(prev => Math.max(prev, newStreak))
      setScore(prev => prev + points)
      setTotalCorrect(prev => prev + 1)
      setTotalAnswered(prev => prev + 1)
      setFeedback({ type: 'correct', points, timeBonus, multi })

      const newCorrectInLevel = correctInLevel + 1
      setCorrectInLevel(newCorrectInLevel)

      if (newCorrectInLevel >= diff.correctToLevel) {
        // Level up!
        const newLevel = level + 1
        if (newLevel > diff.targetLevel) {
          // Won!
          feedbackTimerRef.current = setTimeout(() => endGame('target'), 1000)
        } else {
          feedbackTimerRef.current = setTimeout(() => {
            setLevel(newLevel)
            setCorrectInLevel(0)
            setShowLevelUp(true)
            play('levelUp')
            levelUpTimerRef.current = setTimeout(() => {
              setShowLevelUp(false)
              nextQuestion(newLevel)
            }, 1500)
          }, 800)
        }
      } else {
        feedbackTimerRef.current = setTimeout(() => nextQuestion(), 800)
      }
    } else {
      play('error')
      setStreak(0)
      setTotalAnswered(prev => prev + 1)
      setFeedback({ type: 'wrong', points: 0, answer: question.answer })
      setLives(prev => {
        const next = prev - 1
        if (next <= 0) {
          feedbackTimerRef.current = setTimeout(() => endGame('lives'), 1200)
        } else {
          feedbackTimerRef.current = setTimeout(() => nextQuestion(), 1200)
        }
        return next
      })
    }
  }, [feedback, selectedAnswer, question, streak, level, correctInLevel, timeLeft, play, diff, nextQuestion])

  // ─── End game ────────────────────────────────────────────────────────
  const endGame = useCallback((reason) => {
    clearInterval(timerRef.current)
    clearTimeout(feedbackTimerRef.current)
    setGameOverReason(reason)
    setPhase('result')
    if (reason === 'target') {
      setShowConfetti(true)
      play('win')
    } else {
      play('gameOver')
    }
  }, [play])

  // ─── Calculate rewards ──────────────────────────────────────────────
  const won = gameOverReason === 'target'
  const stars = won ? (lives >= diff.lives ? 3 : lives >= Math.ceil(diff.lives / 2) ? 2 : 1) : 0
  const coinReward = won ? Math.floor(score / 50) + stars * 5 : Math.floor(score / 100)
  const isNewBest = score > bestScore
  const isNewBestLevel = level > bestLevel

  // ─── Report results ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'result') return
    if (isNewBest) {
      localStorage.setItem(bestKey, score.toString())
      setBestScore(score)
    }
    if (isNewBestLevel) {
      localStorage.setItem(`${bestKey}-level`, level.toString())
      setBestLevel(level)
    }
    if (coinReward > 0) earnCoins(coinReward, 'Math Challenge')
    reportGameResult({
      gameId: 'math-challenge', difficultyId: difficulty?.id || 'easy',
      score, stars, won, timeSec: 0,
    })
  }, [phase])

  // ─── Start game ──────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    setPhase('playing')
    setLevel(diff.startLevel)
    setLives(diff.lives)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setTotalCorrect(0)
    setTotalAnswered(0)
    setCorrectInLevel(0)
    setFeedback(null)
    setSelectedAnswer(null)
    setShowConfetti(false)
    setShowLevelUp(false)
    setGameOverReason('')
    nextQuestion(diff.startLevel)
  }, [diff, nextQuestion])

  const restart = useCallback(() => {
    setPhase('ready')
  }, [])

  // ─── Styles ──────────────────────────────────────────────────────────
  const bg = tc.bg
  const surface = tc.surface
  const textMain = tc.text
  const textMuted = tc.muted
  const accent = '#6C5CE7'
  const accentLight = '#A29BFE'

  const timerPct = (timeLeft / diff.timePerQ) * 100
  const timerColor = timerPct > 50 ? '#00B894' : timerPct > 25 ? '#FDCB6E' : '#FF6B6B'

  // ─── Tutorial phase ──────────────────────────────────────────────────
  if (phase === 'tutorial') {
    return (
      <TutorialModal
        steps={TUTORIAL_STEPS}
        gameName="Math Challenge"
        onClose={() => setPhase('ready')}
      />
    )
  }

  // ─── Ready screen ────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div style={{ textAlign:'center', maxWidth:400 }}>
          <div style={{ fontSize:72, marginBottom:12 }}>🧮</div>
          <h1 style={{ fontFamily:"'Fredoka One',cursive", color:accent, fontSize:28, margin:'0 0 8px' }}>Math Challenge</h1>
          <p style={{ color:textMuted, fontSize:14, marginBottom:24, lineHeight:1.5 }}>
            Jawab soal matematika secepat mungkin!<br/>
            Capai Level {diff.targetLevel} untuk menang.
          </p>
          <div style={{ display:'flex', gap:16, justifyContent:'center', marginBottom:24, flexWrap:'wrap' }}>
            <div style={{ background:surface, borderRadius:12, padding:'12px 20px', textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:700, color:accent }}>{diff.timePerQ}s</div>
              <div style={{ fontSize:11, color:textMuted }}>per soal</div>
            </div>
            <div style={{ background:surface, borderRadius:12, padding:'12px 20px', textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:700, color:'#FF6B6B' }}>{'❤️'.repeat(diff.lives)}</div>
              <div style={{ fontSize:11, color:textMuted }}>{diff.lives} nyawa</div>
            </div>
            <div style={{ background:surface, borderRadius:12, padding:'12px 20px', textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:700, color:'#00B894' }}>Lv{diff.targetLevel}</div>
              <div style={{ fontSize:11, color:textMuted }}>target</div>
            </div>
          </div>
          {bestScore > 0 && (
            <div style={{ color:textMuted, fontSize:13, marginBottom:16 }}>
              🏆 Best: {bestScore.toLocaleString()} pts · Level {bestLevel}
            </div>
          )}
          <button onClick={startGame} style={{
            fontFamily:"'Fredoka One',cursive", fontSize:18, padding:'14px 48px',
            background:`linear-gradient(135deg, ${accent}, ${accentLight})`, color:'#fff',
            border:'none', borderRadius:14, cursor:'pointer', boxShadow:`0 4px 20px ${accent}44`,
          }}>
            MULAI! 🚀
          </button>
          <div style={{ marginTop:16 }}>
            <button onClick={onBack} style={{ background:'none', border:'none', color:textMuted, cursor:'pointer', fontSize:14 }}>
              ← Kembali
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Result screen ──────────────────────────────────────────────────
  if (phase === 'result') {
    const accuracy = totalAnswered > 0 ? Math.round(totalCorrect / totalAnswered * 100) : 0
    const diffLabel = { easy: '🟢 Mudah', medium: '🟡 Sedang', hard: '🔴 Sulit' }[difficulty?.id] || '🟢 Mudah'
    return (
      <div style={{ minHeight:'100dvh', background:bg }}>
        {showConfetti && <Confetti />}
        <WinModal
          emoji={won ? '🎉' : '💔'}
          title={won ? 'Luar biasa!' : 'Game over'}
          subtitle={won ? `Kamu mencapai level ${diff.targetLevel}!` : `Berhenti di level ${level} — ${LEVEL_NAMES[level] || 'Level ' + level}`}
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
          onRestart={restart}
          onBack={onBack}
          onHome={onHome}
          dark={darkMode}
          gameColor={accent}
        />
      </div>
    )
  }

  // ─── Playing phase ──────────────────────────────────────────────────
  const comboLabel = getComboLabel(streak)
  const comboColor = getComboColor(streak)
  const progressInLevel = (correctInLevel / diff.correctToLevel) * 100

  return (
    <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column' }}>
      {/* Top bar: back, lives, score */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', gap:8 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:textMuted, fontSize:20, cursor:'pointer', padding:4 }}>←</button>
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          {Array.from({ length: diff.lives }, (_, i) => (
            <span key={i} style={{ fontSize:18, opacity: i < lives ? 1 : 0.2, transition:'opacity 0.3s', filter: i < lives ? 'none' : 'grayscale(1)' }}>❤️</span>
          ))}
        </div>
        <div style={{ fontFamily:"'Fredoka One',cursive", color:accent, fontSize:16 }}>
          {score.toLocaleString()}
        </div>
      </div>

      {/* Timer bar */}
      <div style={{ height:6, background:surface, margin:'0 16px', borderRadius:3, overflow:'hidden' }}>
        <div style={{
          height:'100%', width:`${timerPct}%`, background:timerColor, borderRadius:3,
          transition: feedback ? 'none' : 'width 0.1s linear',
        }} />
      </div>

      {/* Level & progress */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px 4px', gap:8 }}>
        <div style={{ fontSize:13, color:textMuted }}>
          <span style={{ fontWeight:700, color:accent }}>Level {level}</span>
          <span style={{ marginLeft:4 }}>{LEVEL_NAMES[level] || ''}</span>
        </div>
        <div style={{ fontSize:12, color:textMuted }}>{correctInLevel}/{diff.correctToLevel} → Lv{level+1}</div>
      </div>
      <div style={{ height:4, background:surface, margin:'0 16px 8px', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${progressInLevel}%`, background:accentLight, borderRadius:2, transition:'width 0.3s ease' }} />
      </div>

      {/* Combo indicator */}
      <div style={{ textAlign:'center', height:28, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {comboLabel && (
          <div style={{
            fontFamily:"'Fredoka One',cursive", fontSize:16, color:comboColor,
            animation:'comboPulse 0.6s ease infinite alternate',
          }}>
            {comboLabel}
          </div>
        )}
        {streak > 0 && streak < 3 && (
          <div style={{ fontSize:13, color:textMuted }}>🔥 Streak: {streak}</div>
        )}
      </div>

      {/* Question area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 20px', gap:24 }}>
        {/* Level up overlay */}
        {showLevelUp && (
          <div style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:100,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <div style={{
              textAlign:'center', animation:'levelUpBounce 0.5s ease',
            }}>
              <div style={{ fontSize:64 }}>📈</div>
              <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:32, color:'#FDCB6E', marginTop:8 }}>
                LEVEL UP!
              </div>
              <div style={{ fontSize:18, color:'#fff', marginTop:4 }}>
                Level {level} — {LEVEL_NAMES[level] || ''}
              </div>
            </div>
          </div>
        )}

        {/* Equation display */}
        {question && (
          <>
            <div style={{
              background:surface, borderRadius:20, padding:'28px 36px', width:'100%', maxWidth:380,
              textAlign:'center', position:'relative',
              boxShadow: feedback?.type === 'correct' ? '0 0 30px #00B89444' : feedback?.type === 'wrong' || feedback?.type === 'timeout' ? '0 0 30px #FF6B6B44' : 'none',
              animation: feedback?.type === 'wrong' || feedback?.type === 'timeout' ? 'shakeX 0.4s ease' : feedback?.type === 'correct' ? 'popCorrect 0.3s ease' : 'none',
              border: feedback?.type === 'correct' ? '2px solid #00B894' : feedback?.type === 'wrong' || feedback?.type === 'timeout' ? '2px solid #FF6B6B' : `2px solid ${tc.border}`,
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}>
              <div style={{
                fontFamily:"'Fredoka One',cursive", fontSize: question.display.length > 12 ? 32 : 42,
                color:textMain, letterSpacing:2,
              }}>
                {question.display}
              </div>
              <div style={{ fontSize:14, color:textMuted, marginTop:4 }}>= ?</div>
            </div>

            {/* Feedback text */}
            {feedback && (
              <div style={{
                textAlign:'center', animation:'fadeInUp 0.3s ease',
              }}>
                {feedback.type === 'correct' && (
                  <div style={{ color:'#00B894', fontWeight:700, fontSize:16 }}>
                    ✓ Benar! +{feedback.points} {feedback.multi > 1 ? `(×${feedback.multi})` : ''}
                  </div>
                )}
                {feedback.type === 'wrong' && (
                  <div style={{ color:'#FF6B6B', fontWeight:700, fontSize:16 }}>
                    ✗ Salah! Jawaban: {feedback.answer}
                  </div>
                )}
                {feedback.type === 'timeout' && (
                  <div style={{ color:'#FF6B6B', fontWeight:700, fontSize:16 }}>
                    ⏰ Waktu habis! Jawaban: {feedback.answer}
                  </div>
                )}
              </div>
            )}

            {/* Answer buttons */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, width:'100%', maxWidth:380 }}>
              {question.options.map((opt, i) => {
                const isSelected = selectedAnswer === opt
                const isCorrectAnswer = opt === question.answer
                let btnBg = surface
                let btnColor = textMain
                let btnBorder = tc.border

                if (feedback) {
                  if (isCorrectAnswer) {
                    btnBg = '#00B894'
                    btnColor = '#fff'
                    btnBorder = '#00B894'
                  } else if (isSelected && !isCorrectAnswer) {
                    btnBg = '#FF6B6B'
                    btnColor = '#fff'
                    btnBorder = '#FF6B6B'
                  } else {
                    btnBg = surface
                    btnColor = textMuted
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    disabled={!!feedback}
                    style={{
                      fontFamily:"'Fredoka One',cursive", fontSize:22, padding:'16px 8px',
                      background:btnBg, color:btnColor, border:`2px solid ${btnBorder}`,
                      borderRadius:14, cursor: feedback ? 'default' : 'pointer',
                      transition:'all 0.15s ease', opacity: feedback && !isCorrectAnswer && !isSelected ? 0.5 : 1,
                      transform: isSelected ? 'scale(0.95)' : 'scale(1)',
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes popCorrect {
          0% { transform: scale(1); }
          50% { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        @keyframes comboPulse {
          from { transform: scale(1); }
          to { transform: scale(1.08); }
        }
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(8px); }
          to { opacity:1; transform:translateY(0); }
        }
        @keyframes levelUpBounce {
          0% { opacity:0; transform: scale(0.5); }
          60% { transform: scale(1.1); }
          100% { opacity:1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
