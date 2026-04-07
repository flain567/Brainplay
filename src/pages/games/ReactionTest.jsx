import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

const TUTORIAL_STEPS = [
  { emoji:'⚡', title:'Reaction Test', desc:'Uji kecepatan reaksimu! Seberapa cepat kamu bisa bereaksi?', tip:'Konsentrasi penuh dan jangan tekan terlalu cepat!' },
  { emoji:'🎯', title:'Mode Tap', desc:'Layar berubah hijau → tap secepat mungkin! Hati-hati, jangan tap saat masih merah.', tip:'Rata-rata reaksi manusia ~250ms. Bisa lebih cepat?' },
  { emoji:'🎨', title:'Mode Warna', desc:'Pilih warna yang benar dari pilihan! Perhatikan teks dan warnanya — bisa menipu!', tip:'Di Hard mode, teks dan warna berbeda (Stroop effect)!' },
  { emoji:'🧠', title:'Mode Sequence', desc:'Ingat urutan warna/angka yang muncul, lalu ulangi! Semakin panjang, semakin susah.', tip:'Buat pola mental untuk mengingat urutan lebih panjang.' },
]

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'
import { useMatch } from '../../context/MatchContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { auth } from '../../firebase.js'
import PvpScoreBar from '../../components/PvpScoreBar.jsx'
import { GameHeader, StatsBar, ActionButtons, WinModal, BestRecord } from '../../components/GameLayout.jsx'

const CFG = {
  easy:   { rounds: 5, seqStart: 3, seqMax: 6,  colorChoices: 3, stroopMode: false },
  medium: { rounds: 7, seqStart: 4, seqMax: 8,  colorChoices: 4, stroopMode: false },
  hard:   { rounds: 10, seqStart: 4, seqMax: 10, colorChoices: 5, stroopMode: true },
}

const MODES = [
  { id: 'tap', emoji: '🎯', name: 'Tap', desc: 'Tap saat hijau!' },
  { id: 'color', emoji: '🎨', name: 'Warna', desc: 'Pilih warna yang benar' },
  { id: 'sequence', emoji: '🧠', name: 'Sequence', desc: 'Ingat urutan warna' },
]

const SEQ_COLORS = [
  { name: 'Merah', color: '#FF6B6B' },
  { name: 'Biru', color: '#74B9FF' },
  { name: 'Hijau', color: '#00B894' },
  { name: 'Kuning', color: '#FDCB6E' },
  { name: 'Ungu', color: '#A29BFE' },
  { name: 'Pink', color: '#FD79A8' },
  { name: 'Tosca', color: '#00CEC9' },
  { name: 'Oranye', color: '#E17055' },
]

const COLOR_WORDS = ['Merah','Biru','Hijau','Kuning','Ungu','Pink','Tosca','Oranye']
const COLOR_VALUES = ['#FF6B6B','#74B9FF','#00B894','#FDCB6E','#A29BFE','#FD79A8','#00CEC9','#E17055']

export default function ReactionTest({ onBack, onHome, game, difficulty, multiplayerMatch }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()
  const matchCtx = useMatch() || {}
  const { updateMatchState, finishMatch, setActiveMatch } = matchCtx
  const { uid: userId } = useAuth()
  const tc = useThemeColors()
  const dark = tc.dark
  const bg = tc.bg
  const surface = tc.surface
  const textMain = tc.textMain
  const textMuted = tc.textMuted

  const cfg = CFG[difficulty.id]
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('bp_tut_reaction-test'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [mode, setMode] = useState(null) // null = mode select
  const [gameState, setGameState] = useState('idle') // idle, waiting, ready, early, result, done
  const [round, setRound] = useState(0)
  const [results, setResults] = useState([])
  const [resetKey, setResetKey] = useState(0)
  const [countdown, setCountdown] = useState(0) // 3,2,1,0

  // Tap mode
  const [tapPhase, setTapPhase] = useState('idle') // idle, waiting, go, early, result
  const waitTimerRef = useRef(null)
  const goTimeRef = useRef(null)

  // Color mode
  const [colorTarget, setColorTarget] = useState(null)
  const [colorChoices, setColorChoices] = useState([])
  const [colorDisplayText, setColorDisplayText] = useState('')
  const [colorDisplayColor, setColorDisplayColor] = useState('')
  const colorGoTimeRef = useRef(null)

  // Sequence mode
  const [seqPattern, setSeqPattern] = useState([])
  const [seqShowIdx, setSeqShowIdx] = useState(-1)
  const [seqUserInput, setSeqUserInput] = useState([])
  const [seqPhase, setSeqPhase] = useState('idle') // idle, showing, input, result
  const seqTimerRef = useRef(null)

  const isMultiplayer = !!multiplayerMatch
  const myUid = userId || auth.currentUser?.uid
  const opponentUid = isMultiplayer ? (multiplayerMatch.hostUid === myUid ? multiplayerMatch.guestUid : multiplayerMatch.hostUid) : null
  const opponentData = isMultiplayer ? multiplayerMatch.state?.[opponentUid] || { results: [], finished: false } : null
  const opponentProfile = isMultiplayer ? (multiplayerMatch.hostUid === myUid ? multiplayerMatch.guestProfile : multiplayerMatch.hostProfile) : null

  const bestKey = `reaction-test-best-${difficulty.id}`
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem(bestKey) || '0'))

  // Per-mode best scores
  const getBestMode = (m) => parseInt(localStorage.getItem(`rt-best-${m}-${difficulty.id}`) || '0')
  const [bestPerMode] = useState({ tap: getBestMode('tap'), color: getBestMode('color'), sequence: getBestMode('sequence') })

  // Start mode with countdown
  const startMode = (modeId) => {
    play('click')
    setCountdown(3)
    const cdInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(cdInterval)
          setMode(modeId)
          return 0
        }
        try { play('flip') } catch(e) {}
        return prev - 1
      })
    }, 700)
  }

  // Auto-start for multiplayer
  useEffect(() => {
    if (isMultiplayer && !mode) {
      startMode('sequence')
    }
  }, [isMultiplayer])

  // Sync results for multiplayer
  useEffect(() => {
    if (isMultiplayer && mode && myUid) {
      const newState = { 
        ...multiplayerMatch.state, 
        [myUid]: { 
          results, 
          round,
          finished: gameState === 'done' 
        } 
      }
      updateMatchState?.(multiplayerMatch?.id, newState)
    }
  }, [results, round, isMultiplayer, mode, gameState, myUid, multiplayerMatch?.id])

  // ═══════ TAP MODE ═══════
  const startTapRound = useCallback(() => {
    setTapPhase('waiting')
    const delay = 1500 + Math.random() * 3000
    waitTimerRef.current = setTimeout(() => {
      setTapPhase('go')
      goTimeRef.current = Date.now()
    }, delay)
  }, [])

  const handleTapClick = useCallback(() => {
    if (tapPhase === 'waiting') {
      clearTimeout(waitTimerRef.current)
      setTapPhase('early')
      try { play('mismatch') } catch(e) {}
      setTimeout(() => {
        setResults(r => [...r, { type: 'tap', time: -1, label: 'Terlalu cepat!' }])
        setRound(r => r + 1)
        setTapPhase('idle')
      }, 1200)
      return
    }
    if (tapPhase === 'go') {
      const reactionTime = Date.now() - goTimeRef.current
      try { play('match') } catch(e) {}
      const rating = reactionTime < 150 ? '⚡ Lightning!' : reactionTime < 250 ? '🔥 Fast!' : reactionTime < 350 ? '👍 Good' : reactionTime < 500 ? '😐 Slow...' : '🐢 Too slow!'
      setResults(r => [...r, { type: 'tap', time: reactionTime, label: `${reactionTime}ms`, rating }])
      setTapPhase('result')
      setTimeout(() => {
        setRound(r => r + 1)
        setTapPhase('idle')
      }, 800)
    }
  }, [tapPhase, play])

  // ═══════ COLOR MODE ═══════
  const startColorRound = useCallback(() => {
    const targetIdx = Math.floor(Math.random() * Math.min(cfg.colorChoices + 2, SEQ_COLORS.length))
    const target = SEQ_COLORS[targetIdx]

    // Stroop effect for hard mode: display text is a DIFFERENT color name, colored in the TARGET color
    let displayText = target.name
    let displayColor = target.color
    if (cfg.stroopMode && Math.random() < 0.6) {
      const otherIdx = (targetIdx + 1 + Math.floor(Math.random() * (SEQ_COLORS.length - 1))) % SEQ_COLORS.length
      displayText = SEQ_COLORS[otherIdx].name
      // The instruction is: "pilih warna yang DITAMPILKAN" (the actual color shown, not the text)
    }

    setColorTarget(target)
    setColorDisplayText(displayText)
    setColorDisplayColor(displayColor)

    // Generate choices
    const choiceSet = new Set([targetIdx])
    while (choiceSet.size < Math.min(cfg.colorChoices, SEQ_COLORS.length)) {
      choiceSet.add(Math.floor(Math.random() * SEQ_COLORS.length))
    }
    const shuffled = [...choiceSet].sort(() => Math.random() - 0.5).map(i => SEQ_COLORS[i])
    setColorChoices(shuffled)
    colorGoTimeRef.current = Date.now()
    setGameState('ready')
  }, [cfg])

  const handleColorChoice = useCallback((chosen) => {
    if (gameState !== 'ready') return
    const reactionTime = Date.now() - colorGoTimeRef.current
    const correct = chosen.name === colorTarget.name
    if (correct) {
      try { play('match') } catch(e) {}
    } else {
      try { play('mismatch') } catch(e) {}
    }
    const rating = !correct ? '❌ Miss' : reactionTime < 300 ? '⚡ Lightning!' : reactionTime < 500 ? '🔥 Fast!' : reactionTime < 800 ? '👍 Good' : '😐 Slow...'
    setResults(r => [...r, { type: 'color', time: correct ? reactionTime : -1, correct, label: correct ? `${reactionTime}ms` : 'Salah!', rating }])
    setGameState('result')
    setTimeout(() => {
      setRound(r => r + 1)
      setGameState('idle')
    }, 800)
  }, [gameState, colorTarget, play])

  // ═══════ SEQUENCE MODE ═══════
  const startSeqRound = useCallback((roundNum) => {
    const len = Math.min(cfg.seqStart + roundNum, cfg.seqMax)
    const pattern = Array.from({ length: len }, () => Math.floor(Math.random() * Math.min(5, SEQ_COLORS.length)))
    setSeqPattern(pattern)
    setSeqUserInput([])
    setSeqPhase('showing')
    setSeqShowIdx(-1)

    // Show sequence one by one
    let idx = 0
    const showNext = () => {
      if (idx < pattern.length) {
        setSeqShowIdx(pattern[idx])
        idx++
        seqTimerRef.current = setTimeout(() => {
          setSeqShowIdx(-1)
          seqTimerRef.current = setTimeout(showNext, 300)
        }, 600)
      } else {
        setSeqPhase('input')
        colorGoTimeRef.current = Date.now()
      }
    }
    seqTimerRef.current = setTimeout(showNext, 500)
  }, [cfg])

  const handleSeqInput = useCallback((colorIdx) => {
    if (seqPhase !== 'input') return
    const newInput = [...seqUserInput, colorIdx]
    setSeqUserInput(newInput)

    const correctSoFar = newInput.every((v, i) => v === seqPattern[i])
    if (!correctSoFar) {
      try { play('mismatch') } catch(e) {}
      const reactionTime = Date.now() - colorGoTimeRef.current
      setResults(r => [...r, { type: 'seq', time: -1, correct: false, label: 'Salah!' }])
      setSeqPhase('result')
      setTimeout(() => {
        setRound(r => r + 1)
        setSeqPhase('idle')
      }, 1000)
      return
    }

    try { play('flip') } catch(e) {}
    if (newInput.length === seqPattern.length) {
      // Complete!
      const reactionTime = Date.now() - colorGoTimeRef.current
      try { play('match') } catch(e) {}
      setResults(r => [...r, { type: 'seq', time: reactionTime, correct: true, seqLen: seqPattern.length, label: `${seqPattern.length} benar` }])
      setSeqPhase('result')
      setTimeout(() => {
        setRound(r => r + 1)
        setSeqPhase('idle')
      }, 800)
    }
  }, [seqPhase, seqUserInput, seqPattern, play])

  // ═══════ ROUND MANAGEMENT ═══════
  useEffect(() => {
    if (!mode) return
    if (round >= cfg.rounds) {
      // Game done!
      finishGame()
      return
    }
    if (mode === 'tap' && tapPhase === 'idle' && round < cfg.rounds) {
      startTapRound()
    }
    if (mode === 'color' && gameState === 'idle' && round < cfg.rounds) {
      setTimeout(() => startColorRound(), 400)
    }
    if (mode === 'sequence' && seqPhase === 'idle' && round < cfg.rounds) {
      setTimeout(() => startSeqRound(round), 400)
    }
  }, [round, mode, tapPhase, gameState, seqPhase])

  const finishGame = useCallback(() => {
    setGameState('done')
    const validResults = results.filter(r => r.time > 0)
    const avgTime = validResults.length > 0 ? Math.round(validResults.reduce((s, r) => s + r.time, 0) / validResults.length) : 9999
    const accuracy = results.length > 0 ? Math.round((validResults.length / results.length) * 100) : 0

    // Score: lower avg time = higher score, + accuracy bonus
    let score = Math.max(0, 2000 - avgTime * 2) + accuracy * 5
    if (mode === 'sequence') {
      const totalSeqLen = validResults.reduce((s, r) => s + (r.seqLen || 0), 0)
      score = totalSeqLen * 100 + accuracy * 3
    }
    score = Math.round(score)

    const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1
    const coinReward = { easy: 15, medium: 25, hard: 40 }
    let coinAmt = (coinReward[difficulty.id] || 15) + Math.floor(score / 100)
    if (stars === 3) coinAmt += 20
    const won = accuracy >= 50

    if (won) {
      setShowConfetti(true)
      try { play('win') } catch(e) {}
    }

    earnCoins(coinAmt, `Reaction Test ${mode} (${difficulty.id})`)
    reportGameResult({
      gameId: 'reaction-test', difficultyId: difficulty.id,
      won, score, stars, timeSec: Math.round(avgTime / 1000 * cfg.rounds),
    })

    // Save best
    if (score > bestScore) {
      localStorage.setItem(bestKey, score)
      setBestScore(score)
    }
    // Save per-mode best
    const modeKey = `rt-best-${mode}-${difficulty.id}`
    const prevModeBest = parseInt(localStorage.getItem(modeKey) || '0')
    if (score > prevModeBest) localStorage.setItem(modeKey, score)

    if (isMultiplayer) {
       // Compare performance
       let isWinner = false
       if (mode === 'sequence') {
          // Compare scores for sequence mode
          const oppValid = opponentData.results.filter(r => r.time > 0)
          const oppAcc = opponentData.results.length > 0 ? Math.round((oppValid.length / opponentData.results.length) * 100) : 0
          const oppSeqLen = oppValid.reduce((s, r) => s + (r.seqLen || 0), 0)
          const oppScore = Math.round(oppSeqLen * 100 + oppAcc * 3)
          isWinner = score > oppScore
       } else {
          // Compare avg times for other modes
          const myAvg = avgTime
          const oppResults = opponentData.results.filter(r => r.time > 0)
          const oppAvg = oppResults.length > 0 ? Math.round(oppResults.reduce((s, r) => s + r.time, 0) / oppResults.length) : 9999
          isWinner = myAvg < oppAvg
       }
       
       if (isWinner) finishMatch?.(multiplayerMatch.id, myUid)
    }
  }, [results, mode, cfg, difficulty.id, bestScore, isMultiplayer, opponentData, multiplayerMatch, userId])

  const restart = () => {
    if (isMultiplayer) {
      setActiveMatch(null)
      onBack()
      return
    }
    setMode(null)
    setRound(0)
    setResults([])
    setGameState('idle')
    setTapPhase('idle')
    setSeqPhase('idle')
    setShowConfetti(false)
    setResetKey(k => k + 1)
    clearTimeout(waitTimerRef.current)
    clearTimeout(seqTimerRef.current)
  }

  useEffect(() => {
    return () => {
      clearTimeout(waitTimerRef.current)
      clearTimeout(seqTimerRef.current)
    }
  }, [])

  // ═══════ COMPUTE FINAL STATS ═══════
  const validResults = results.filter(r => r.time > 0)
  const avgTime = validResults.length > 0 ? Math.round(validResults.reduce((s, r) => s + r.time, 0) / validResults.length) : 0
  const accuracy = results.length > 0 ? Math.round((validResults.length / results.length) * 100) : 0
  let finalScore = Math.max(0, 2000 - avgTime * 2) + accuracy * 5
  if (mode === 'sequence') {
    const totalSeqLen = validResults.reduce((s, r) => s + (r.seqLen || 0), 0)
    finalScore = totalSeqLen * 100 + accuracy * 3
  }
  finalScore = Math.round(finalScore)
  const finalStars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1
  const coinAmt = ({ easy: 15, medium: 25, hard: 40 }[difficulty.id] || 15) + Math.floor(finalScore / 100) + (finalStars === 3 ? 20 : 0)

  // ═══════ COUNTDOWN SCREEN ═══════
  if (countdown > 0) {
    return (
      <div style={{
        minHeight: '100dvh', background: bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      }}>
        <div style={{
          fontSize: 120, fontFamily: "'Fredoka One',cursive", color: '#A29BFE',
          animation: 'cdPop 0.6s ease', key: countdown,
          textShadow: '0 0 40px rgba(162,155,254,0.4)',
        }}>
          {countdown}
        </div>
        <div style={{ fontSize: 14, color: tc.textMuted, marginTop: 8 }}>Bersiap...</div>
        <style>{`@keyframes cdPop { 0% { transform: scale(2); opacity: 0; } 40% { transform: scale(0.9); opacity: 1; } 100% { transform: scale(1); } }`}</style>
      </div>
    )
  }

  // ═══════ MODE SELECT SCREEN ═══════
  if (!mode) {
    return (
      <div style={{ minHeight: '100dvh', background: bg, padding: '24px 16px 80px' }}>
        {showTutorial && (
          <TutorialModal steps={TUTORIAL_STEPS} storageKey="bp_tut_reaction-test"
            onClose={() => setShowTutorial(false)} />
        )}
        <GameHeader emoji="⚡" title="Reaction Test" subtitle="Pilih mode permainan"
          diffId={difficulty.id} onBack={onBack} dark={dark} />

        <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => startMode(m.id)}
              style={{
                background: tc.surface, border: `2px solid ${tc.borderCol}`,
                borderRadius: 20, padding: '24px 20px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left',
                transition: 'all 0.15s', position: 'relative',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#A29BFE'; e.currentTarget.style.transform = 'scale(1.02)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = tc.borderCol; e.currentTarget.style.transform = 'scale(1)' }}
            >
              <span style={{ fontSize: 40 }}>{m.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: textMain }}>{m.name}</div>
                <div style={{ fontSize: 13, color: tc.textMuted, marginTop: 2 }}>{m.desc}</div>
              </div>
              {bestPerMode[m.id] > 0 && (
                <div style={{
                  textAlign: 'right', fontSize: 11, color: '#A29BFE',
                  fontFamily: "'Fredoka One',cursive",
                }}>
                  <div style={{ fontSize: 16 }}>{bestPerMode[m.id]}</div>
                  <div style={{ fontSize: 9, color: tc.textMuted }}>best</div>
                </div>
              )}
            </button>
          ))}
        </div>

        {bestScore > 0 && (
          <BestRecord label="Skor Terbaik" value={bestScore.toLocaleString()} dark={dark} color="#A29BFE" />
        )}
      </div>
    )
  }

  // ═══════ TAP MODE SCREEN ═══════
  if (mode === 'tap' && gameState !== 'done') {
    const tapBg = tapPhase === 'waiting' ? '#C0392B' : tapPhase === 'go' ? '#00B894' : tapPhase === 'early' ? '#E17055' : tapPhase === 'result' ? '#2d3436' : bg
    const tapText = tapPhase === 'waiting' ? 'Tunggu...' : tapPhase === 'go' ? 'TAP SEKARANG!' : tapPhase === 'early' ? 'Terlalu cepat! ❌' : tapPhase === 'result' ? `${results[results.length-1]?.label || ''}` : ''

    return (
      <div onClick={handleTapClick}
        style={{
          minHeight: '100dvh', background: tapBg, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          transition: 'background 0.15s', userSelect: 'none',
        }}>
        <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={(e) => { e.stopPropagation(); restart() }} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            borderRadius: 8, padding: '6px 12px', fontSize: 14, cursor: 'pointer',
          }}>← Kembali</button>
          <span style={{ color: '#fff', fontFamily: "'Fredoka One',cursive", fontSize: 14 }}>
            {round + 1}/{cfg.rounds}
          </span>
        </div>
        {/* Round progress bar */}
        <div style={{ position: 'absolute', top: 52, left: 16, right: 16 }}>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(round / cfg.rounds) * 100}%`, background: 'rgba(255,255,255,0.6)', borderRadius: 100, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        <div style={{ fontSize: 60, marginBottom: 16 }}>
          {tapPhase === 'waiting' ? '🔴' : tapPhase === 'go' ? '🟢' : tapPhase === 'early' ? '❌' : '⚡'}
        </div>
        <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 28, color: '#fff', textAlign: 'center' }}>
          {tapText}
        </div>
        {tapPhase === 'result' && results.length > 0 && (
          <div>
            <div style={{ color: '#FFD700', fontSize: 18, fontWeight: 800, fontFamily: "'Fredoka One',cursive", marginTop: 6, animation: 'winFadeIn 0.3s ease' }}>
              {results[results.length - 1]?.rating || ''}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8 }}>
              Rata-rata: {Math.round(validResults.reduce((s,r)=>s+r.time,0) / Math.max(1, validResults.length))}ms
            </div>
            {isMultiplayer && (
               <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>REAKSI {opponentProfile?.displayName?.toUpperCase() || 'LAWAN'}</div>
                  <div style={{ color: '#FDCB6E', fontFamily: "'Fredoka One',cursive" }}>
                     {opponentData.results[round]?.label || 'Menunggu...'}
                  </div>
               </div>
            )}
          </div>
        )}

        {/* Mini results */}
        <div style={{ position: 'absolute', bottom: 30, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: '0 20px' }}>
          {results.map((r, i) => (
            <span key={i} style={{
              background: r.time > 0 ? 'rgba(0,184,148,0.3)' : 'rgba(255,107,107,0.3)',
              color: '#fff', borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 700,
            }}>
              {r.label}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // ═══════ COLOR MODE SCREEN ═══════
  if (mode === 'color' && gameState !== 'done') {
    return (
      <div style={{ minHeight: '100dvh', background: bg, padding: '24px 16px 80px' }}>
        <div style={{ position: 'relative' }}>
          <GameHeader emoji="🎨" title="Warna" subtitle={cfg.stroopMode ? 'Pilih WARNA teks (bukan kata!)' : 'Pilih warna yang ditampilkan'}
            diffId={difficulty.id} onBack={restart} dark={dark} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 8, color: tc.textMuted, fontSize: 13, fontFamily: "'Fredoka One',cursive" }}>
          Round {round + 1}/{cfg.rounds}
        </div>
        {/* Progress bar */}
        <div style={{ maxWidth: 300, margin: '0 auto 12px' }}>
          <div style={{ height: 4, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(round / cfg.rounds) * 100}%`, background: '#A29BFE', borderRadius: 100, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Display target */}
        {gameState === 'ready' && colorTarget && (
          <div style={{
            textAlign: 'center', margin: '30px auto', padding: '30px 20px',
            background: tc.surface, borderRadius: 24, maxWidth: 300,
            border: `2px solid ${tc.borderCol}`,
          }}>
            <div style={{ fontSize: 13, color: tc.textMuted, marginBottom: 8 }}>
              {cfg.stroopMode ? 'Pilih WARNA teks ini:' : 'Warna apa ini?'}
            </div>
            <div style={{
              fontFamily: "'Fredoka One',cursive", fontSize: 40,
              color: colorDisplayColor,
            }}>
              {cfg.stroopMode ? colorDisplayText : '●'}
            </div>
          </div>
        )}

        {/* Choices */}
        {gameState === 'ready' && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(colorChoices.length, 3)}, 1fr)`, gap: 12, maxWidth: 400, margin: '20px auto' }}>
            {colorChoices.map(c => (
              <button key={c.name} onClick={() => handleColorChoice(c)}
                style={{
                  background: c.color, border: 'none', borderRadius: 16,
                  padding: '20px 12px', cursor: 'pointer', transition: 'transform 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ color: '#fff', fontFamily: "'Fredoka One',cursive", fontSize: 14, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  {c.name}
                </div>
              </button>
            ))}
          </div>
        )}

        {gameState === 'result' && (
          <div style={{ textAlign: 'center', margin: '40px 0' }}>
            <div style={{ fontSize: 40 }}>{results[results.length - 1]?.correct ? '✅' : '❌'}</div>
            <div style={{ color: '#FFD700', fontSize: 16, fontWeight: 800, fontFamily: "'Fredoka One',cursive", marginTop: 6, animation: 'winFadeIn 0.3s ease' }}>
              {results[results.length - 1]?.rating || ''}
            </div>
          </div>
        )}

        {/* Mini results */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 }}>
          {results.map((r, i) => (
            <span key={i} style={{
              background: r.time > 0 ? (dark ? 'rgba(0,184,148,0.15)' : '#E8FFF0') : (dark ? 'rgba(255,107,107,0.15)' : '#FFF0F0'),
              color: r.time > 0 ? '#00B894' : '#FF6B6B',
              borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 700,
            }}>
              {r.label}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // ═══════ SEQUENCE MODE SCREEN ═══════
  if (mode === 'sequence' && gameState !== 'done') {
    const seqColors = SEQ_COLORS.slice(0, 5)
    return (
      <div style={{ minHeight: '100dvh', background: bg, padding: '24px 16px 80px' }}>
        <GameHeader emoji="🧠" title="Sequence" subtitle="Ingat urutan warna!"
          diffId={difficulty.id} onBack={restart} dark={dark} />

        <div style={{ textAlign: 'center', marginBottom: 8, color: tc.textMuted, fontSize: 13, fontFamily: "'Fredoka One',cursive" }}>
          Round {round + 1}/{cfg.rounds} — Panjang: {seqPattern.length}
        </div>
        {/* Progress bar */}
        <div style={{ maxWidth: 300, margin: '0 auto 12px' }}>
          <div style={{ height: 4, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(round / cfg.rounds) * 100}%`, background: '#A29BFE', borderRadius: 100, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Showing phase */}
        {seqPhase === 'showing' && (
          <div style={{ textAlign: 'center', margin: '40px 0' }}>
            <div style={{ fontSize: 16, color: tc.textMuted, marginBottom: 20 }}>Perhatikan urutan...</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {seqColors.map((c, i) => (
                <div key={i} style={{
                  width: 60, height: 60, borderRadius: 14,
                  background: seqShowIdx === i ? c.color : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                  border: `3px solid ${seqShowIdx === i ? c.color : 'transparent'}`,
                  transition: 'all 0.2s', transform: seqShowIdx === i ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: seqShowIdx === i ? `0 0 20px ${c.color}55` : 'none',
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Input phase */}
        {seqPhase === 'input' && (
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <div style={{ fontSize: 16, color: textMain, marginBottom: 12, fontFamily: "'Fredoka One',cursive" }}>
              Ulangi urutan! ({seqUserInput.length}/{seqPattern.length})
            </div>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
              {seqPattern.map((_, i) => (
                <div key={i} style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: i < seqUserInput.length ? SEQ_COLORS[seqPattern[i]].color : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                  transition: 'all 0.2s',
                }} />
              ))}
            </div>
            {/* Input buttons */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {seqColors.map((c, i) => (
                <button key={i} onClick={() => handleSeqInput(i)}
                  style={{
                    width: 65, height: 65, borderRadius: 16, border: 'none',
                    background: c.color, cursor: 'pointer', transition: 'transform 0.1s',
                    boxShadow: `0 4px 12px ${c.color}44`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <span style={{ color: '#fff', fontFamily: "'Fredoka One',cursive", fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                    {c.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {seqPhase === 'result' && (
          <div style={{ textAlign: 'center', fontSize: 40, margin: '40px 0' }}>
            {results[results.length - 1]?.correct ? '✅' : '❌'}
          </div>
        )}

        {/* Mini results */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 }}>
          {results.map((r, i) => (
            <span key={i} style={{
              background: r.correct ? (dark ? 'rgba(0,184,148,0.15)' : '#E8FFF0') : (dark ? 'rgba(255,107,107,0.15)' : '#FFF0F0'),
              color: r.correct ? '#00B894' : '#FF6B6B',
              borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 700,
            }}>
              {r.label}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // ═══════ DONE SCREEN ═══════
  const maxTime = Math.max(...results.map(r => r.time > 0 ? r.time : 0), 1)

  return (
    <div style={{ minHeight: '100dvh', background: bg, padding: '24px 16px 80px' }}>
      {showConfetti && <Confetti />}

      {/* Results chart behind modal */}
      {mode === 'tap' && results.length > 0 && (
        <div style={{
          maxWidth: 380, margin: '0 auto 16px', padding: '16px',
          background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: tc.textMuted, marginBottom: 12,
            fontFamily: "'Fredoka One',cursive", textAlign: 'center' }}>
            ⚡ Waktu Reaksi per Round
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, justifyContent: 'center' }}>
            {results.map((r, i) => {
              const pct = r.time > 0 ? Math.max(10, (r.time / maxTime) * 100) : 100
              const col = r.time < 0 ? '#FF6B6B' : r.time < 200 ? '#00B894' : r.time < 350 ? '#FDCB6E' : '#E17055'
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ fontSize: 9, color: tc.textMuted, marginBottom: 4, fontWeight: 700 }}>
                    {r.time > 0 ? `${r.time}` : '✗'}
                  </div>
                  <div style={{
                    width: '100%', maxWidth: 32, height: `${pct}%`, minHeight: 8,
                    background: col, borderRadius: '6px 6px 2px 2px',
                    transition: 'height 0.5s ease',
                    animation: `barGrow 0.5s ${i * 0.1}s ease both`,
                  }} />
                  <div style={{ fontSize: 9, color: tc.textMuted, marginTop: 3 }}>R{i+1}</div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 10, fontSize: 10, color: tc.textMuted }}>
            <span><span style={{ color: '#00B894' }}>●</span> &lt;200ms</span>
            <span><span style={{ color: '#FDCB6E' }}>●</span> 200-350ms</span>
            <span><span style={{ color: '#E17055' }}>●</span> &gt;350ms</span>
          </div>
        </div>
      )}

      <WinModal
        emoji={accuracy >= 70 ? '🏆' : '⚡'}
        title={accuracy >= 70 ? 'Luar Biasa!' : 'Selesai!'}
        subtitle={`Mode ${MODES.find(m => m.id === mode)?.name || mode}`}
        diffLabel={{ easy: '🟢 Mudah', medium: '🟡 Sedang', hard: '🔴 Sulit' }[difficulty.id]}
        stats={[
          { label: 'Akurasi', value: `${accuracy}%`, color: '#00B894' },
          { label: mode === 'sequence' ? 'Skor' : 'Rata-rata', value: mode === 'sequence' ? finalScore.toLocaleString() : `${avgTime}ms`, color: '#A29BFE' },
          { label: 'Round', value: `${validResults.length}/${results.length}`, color: '#FDCB6E' },
        ]}
        stars={finalStars}
        coinReward={coinAmt}
        onRestart={restart}
        onBack={onBack}
        onHome={onHome}
        dark={dark}
        gameColor="#A29BFE"
        highlight={isMultiplayer ? (multiplayerMatch.winner === myUid ? '⚔️ KAMU MENANG!' : '💀 KAMU KALAH!') : ''}
      />

      <style>{`
        @keyframes barGrow {
          from { transform: scaleY(0); transform-origin: bottom; }
          to { transform: scaleY(1); transform-origin: bottom; }
        }
      `}</style>
    </div>
  )
}
