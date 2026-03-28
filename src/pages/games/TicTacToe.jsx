import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

const TUTORIAL_STEPS = [
  { emoji:'❌', title:'Tic Tac Toe', desc:'Klasik! Buat garis 3 berturut-turut secara horizontal, vertikal, atau diagonal untuk menang!', tip:'Kamu main sebagai ❌, AI sebagai ⭕' },
  { emoji:'🤖', title:'Lawan AI', desc:'Pilih tingkat kesulitan AI. Easy: random. Medium: cukup pintar. Hard: minimax sempurna!', tip:'Di mode Hard, AI tidak mungkin kalah — coba seri!' },
  { emoji:'⭐', title:'Scoring', desc:'Menang = poin besar! Seri juga dapat poin. Kalah = sedikit poin. Bermainlah secepat mungkin!', tip:'3 bintang jika menang cepat dengan sedikit langkah.' },
]

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'
import { GameHeader, StatsBar, WinModal, BestRecord, useGameTimer, formatTime } from '../../components/GameLayout.jsx'

const CFG = {
  easy:   { rounds: 5, aiDelay: 600,  aiLevel: 'random' },
  medium: { rounds: 5, aiDelay: 500,  aiLevel: 'smart' },
  hard:   { rounds: 5, aiDelay: 400,  aiLevel: 'minimax' },
}

const WINNING_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6],         // diagonals
]

function checkWin(board, player) {
  for (const line of WINNING_LINES) {
    if (line.every(i => board[i] === player)) return line
  }
  return null
}

function checkDraw(board) {
  return board.every(cell => cell !== null)
}

function getEmpty(board) {
  return board.map((v, i) => v === null ? i : -1).filter(i => i >= 0)
}

// ── AI: Random ──
function aiRandom(board) {
  const empty = getEmpty(board)
  return empty[Math.floor(Math.random() * empty.length)]
}

// ── AI: Smart (blocks wins, takes wins, prefers center/corners) ──
function aiSmart(board) {
  const empty = getEmpty(board)

  // Win if possible
  for (const i of empty) {
    const test = [...board]; test[i] = 'O'
    if (checkWin(test, 'O')) return i
  }
  // Block opponent win
  for (const i of empty) {
    const test = [...board]; test[i] = 'X'
    if (checkWin(test, 'X')) return i
  }
  // Take center
  if (board[4] === null) return 4
  // Take corners
  const corners = [0,2,6,8].filter(i => board[i] === null)
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)]
  // Random
  return aiRandom(board)
}

// ── AI: Minimax (perfect play) ──
function minimax(board, isMaximizing, alpha = -Infinity, beta = Infinity, depth = 0) {
  const oWin = checkWin(board, 'O')
  const xWin = checkWin(board, 'X')
  if (oWin) return 10 - depth
  if (xWin) return depth - 10
  if (checkDraw(board)) return 0

  const empty = getEmpty(board)

  if (isMaximizing) {
    let best = -Infinity
    for (const i of empty) {
      board[i] = 'O'
      const score = minimax(board, false, alpha, beta, depth + 1)
      board[i] = null
      best = Math.max(best, score)
      alpha = Math.max(alpha, score)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const i of empty) {
      board[i] = 'X'
      const score = minimax(board, true, alpha, beta, depth + 1)
      board[i] = null
      best = Math.min(best, score)
      beta = Math.min(beta, score)
      if (beta <= alpha) break
    }
    return best
  }
}

function aiMinimax(board) {
  const empty = getEmpty(board)
  let bestScore = -Infinity
  let bestMove = empty[0]
  for (const i of empty) {
    board[i] = 'O'
    const score = minimax(board, false)
    board[i] = null
    if (score > bestScore) {
      bestScore = score
      bestMove = i
    }
  }
  return bestMove
}

function getAIMove(board, level) {
  switch (level) {
    case 'random': return aiRandom(board)
    case 'smart': return aiSmart(board)
    case 'minimax': return aiMinimax(board)
    default: return aiRandom(board)
  }
}

export default function TicTacToe({ onBack, onHome, game, difficulty }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()
  const tc = useThemeColors()
  const dark = tc.dark

  const cfg = CFG[difficulty.id]
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('bp_tut_tic-tac-toe'))
  const [showConfetti, setShowConfetti] = useState(false)

  const [board, setBoard] = useState(Array(9).fill(null))
  const [turn, setTurn] = useState('X') // X = player, O = AI
  const [winLine, setWinLine] = useState(null)
  const [gameStatus, setGameStatus] = useState('playing') // playing, won, lost, draw
  const [roundNum, setRoundNum] = useState(1)
  const [roundResults, setRoundResults] = useState([]) // { result: 'win'|'lose'|'draw', moves: n }
  const [moveCount, setMoveCount] = useState(0)
  const [lastPlaced, setLastPlaced] = useState(-1)
  const [animCells, setAnimCells] = useState([]) // cells being animated
  const [gamePhase, setGamePhase] = useState('playing') // playing, roundEnd, gameDone
  const [resetKey, setResetKey] = useState(0)

  const timerRunning = gamePhase === 'playing' && gameStatus === 'playing'
  const time = useGameTimer(timerRunning, resetKey)

  const bestKey = `tic-tac-toe-best-${difficulty.id}`
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem(bestKey) || '0'))

  const aiTimerRef = useRef(null)

  // ── AI Move ──
  useEffect(() => {
    if (turn !== 'O' || gameStatus !== 'playing') return
    aiTimerRef.current = setTimeout(() => {
      const move = getAIMove([...board], cfg.aiLevel)
      if (move === undefined || move === null) return
      const newBoard = [...board]
      newBoard[move] = 'O'
      setBoard(newBoard)
      setLastPlaced(move)
      setMoveCount(m => m + 1)
      setAnimCells(a => [...a, move])

      // Check result
      const win = checkWin(newBoard, 'O')
      if (win) {
        setWinLine(win)
        setGameStatus('lost')
        try { play('mismatch') } catch(e) {}
        return
      }
      if (checkDraw(newBoard)) {
        setGameStatus('draw')
        try { play('flip') } catch(e) {}
        return
      }
      setTurn('X')
      try { play('flip') } catch(e) {}
    }, cfg.aiDelay)

    return () => clearTimeout(aiTimerRef.current)
  }, [turn, board, gameStatus, cfg])

  // ── Handle round end ──
  useEffect(() => {
    if (gameStatus === 'playing') return
    const result = gameStatus === 'won' ? 'win' : gameStatus === 'lost' ? 'lose' : 'draw'
    const timer = setTimeout(() => {
      setRoundResults(r => [...r, { result, moves: moveCount }])
      if (roundNum >= cfg.rounds) {
        setGamePhase('gameDone')
        finishGame([...roundResults, { result, moves: moveCount }])
      } else {
        setGamePhase('roundEnd')
      }
    }, 1200)
    return () => clearTimeout(timer)
  }, [gameStatus])

  // ── Player move ──
  const handleCellClick = useCallback((idx) => {
    if (turn !== 'X' || gameStatus !== 'playing' || board[idx] !== null) return
    try { play('click') } catch(e) {}
    const newBoard = [...board]
    newBoard[idx] = 'X'
    setBoard(newBoard)
    setLastPlaced(idx)
    setMoveCount(m => m + 1)
    setAnimCells(a => [...a, idx])

    const win = checkWin(newBoard, 'X')
    if (win) {
      setWinLine(win)
      setGameStatus('won')
      try { play('win') } catch(e) {}
      return
    }
    if (checkDraw(newBoard)) {
      setGameStatus('draw')
      try { play('flip') } catch(e) {}
      return
    }
    setTurn('O')
  }, [turn, board, gameStatus, play])

  // ── Next round ──
  const nextRound = () => {
    setBoard(Array(9).fill(null))
    setTurn('X')
    setWinLine(null)
    setGameStatus('playing')
    setMoveCount(0)
    setLastPlaced(-1)
    setAnimCells([])
    setGamePhase('playing')
    setRoundNum(r => r + 1)
  }

  // ── Finish game ──
  const finishGame = useCallback((allResults) => {
    const wins = allResults.filter(r => r.result === 'win').length
    const draws = allResults.filter(r => r.result === 'draw').length
    const losses = allResults.filter(r => r.result === 'lose').length
    const totalMoves = allResults.reduce((s, r) => s + r.moves, 0)

    let score = wins * 200 + draws * 50 - losses * 30 + Math.max(0, 500 - totalMoves * 10)
    score = Math.max(0, Math.round(score))

    const won = wins > losses
    const stars = wins >= cfg.rounds ? 3 : wins >= Math.ceil(cfg.rounds / 2) ? 2 : wins > 0 ? 1 : 0

    if (won) {
      setShowConfetti(true)
    }

    const coinReward = { easy: 15, medium: 25, hard: 50 }
    let coinAmt = (coinReward[difficulty.id] || 15) + wins * 10
    if (stars === 3) coinAmt += 25
    earnCoins(coinAmt, `Tic Tac Toe (${difficulty.id})`)

    reportGameResult({
      gameId: 'tic-tac-toe', difficultyId: difficulty.id,
      won, score, stars: Math.max(stars, won ? 1 : 0), timeSec: time,
    })

    if (score > bestScore) {
      localStorage.setItem(bestKey, score)
      setBestScore(score)
    }
  }, [cfg, difficulty.id, time, bestScore])

  // ── Restart ──
  const restart = () => {
    clearTimeout(aiTimerRef.current)
    setBoard(Array(9).fill(null))
    setTurn('X')
    setWinLine(null)
    setGameStatus('playing')
    setRoundNum(1)
    setRoundResults([])
    setMoveCount(0)
    setLastPlaced(-1)
    setAnimCells([])
    setGamePhase('playing')
    setShowConfetti(false)
    setResetKey(k => k + 1)
  }

  useEffect(() => () => clearTimeout(aiTimerRef.current), [])

  // ── Final stats ──
  const allResults = gamePhase === 'gameDone' ? roundResults : []
  const totalWins = allResults.filter(r => r.result === 'win').length
  const totalDraws = allResults.filter(r => r.result === 'draw').length
  const totalLosses = allResults.filter(r => r.result === 'lose').length
  const totalMoves = allResults.reduce((s, r) => s + r.moves, 0)
  let finalScore = totalWins * 200 + totalDraws * 50 - totalLosses * 30 + Math.max(0, 500 - totalMoves * 10)
  finalScore = Math.max(0, Math.round(finalScore))
  const finalStars = totalWins >= cfg.rounds ? 3 : totalWins >= Math.ceil(cfg.rounds / 2) ? 2 : totalWins > 0 ? 1 : 0
  const finalWon = totalWins > totalLosses
  const finalCoin = ({ easy: 15, medium: 25, hard: 50 }[difficulty.id] || 15) + totalWins * 10 + (finalStars === 3 ? 25 : 0)

  const bg = tc.bg
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const surface = tc.surface
  const borderCol = tc.borderCol

  const AI_LABELS = { easy: '🤖 Random', medium: '🧠 Smart', hard: '💀 Minimax' }

  // ═══════ GAME DONE ═══════
  if (gamePhase === 'gameDone') {
    return (
      <div style={{ minHeight: '100vh', background: bg }}>
        {showConfetti && <Confetti />}
        <WinModal
          emoji={finalWon ? '🏆' : totalDraws >= Math.ceil(cfg.rounds / 2) ? '🤝' : '😢'}
          title={finalWon ? 'Kamu Menang!' : totalDraws >= Math.ceil(cfg.rounds / 2) ? 'Seri!' : 'AI Menang!'}
          subtitle={`${cfg.rounds} ronde vs ${AI_LABELS[cfg.aiLevel]}`}
          diffLabel={{ easy: '🟢 Mudah', medium: '🟡 Sedang', hard: '🔴 Sulit' }[difficulty.id]}
          stats={[
            { label: 'Menang', value: `${totalWins}`, color: '#00B894' },
            { label: 'Seri', value: `${totalDraws}`, color: '#FDCB6E' },
            { label: 'Kalah', value: `${totalLosses}`, color: '#FF6B6B' },
          ]}
          stars={Math.max(finalStars, finalWon ? 1 : 0)}
          coinReward={finalCoin}
          onRestart={restart}
          onBack={onBack}
          onHome={onHome}
          dark={dark}
          gameColor="#E17055"
        />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '24px 16px 80px' }}>
      {showTutorial && (
        <TutorialModal steps={TUTORIAL_STEPS} storageKey="bp_tut_tic-tac-toe"
          onClose={() => setShowTutorial(false)} />
      )}
      {showConfetti && <Confetti />}

      <GameHeader emoji="❌" title="Tic Tac Toe" subtitle={`vs ${AI_LABELS[cfg.aiLevel]}`}
        diffId={difficulty.id} onBack={onBack} dark={dark} />

      {/* Stats */}
      <StatsBar dark={dark} stats={[
        { label: 'Ronde', value: `${roundNum}/${cfg.rounds}`, color: '#A29BFE' },
        { label: 'Waktu', value: formatTime(time), color: '#00B894' },
        { label: 'Menang', value: roundResults.filter(r => r.result === 'win').length, color: '#FDCB6E' },
        { label: 'Kalah', value: roundResults.filter(r => r.result === 'lose').length, color: '#FF6B6B' },
      ]} />

      {/* Turn indicator */}
      <div style={{
        textAlign: 'center', marginBottom: 16,
        fontFamily: "'Fredoka One',cursive", fontSize: 16, color: textMain,
      }}>
        {gameStatus === 'playing' ? (
          turn === 'X' ? '🎯 Giliranmu (❌)' : '🤖 AI berpikir...'
        ) : gameStatus === 'won' ? (
          '🎉 Kamu menang!'
        ) : gameStatus === 'lost' ? (
          '😅 AI menang!'
        ) : '🤝 Seri!'}
      </div>

      {/* Board */}
      <div style={{
        maxWidth: 320, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: 8,
      }}>
        {board.map((cell, i) => {
          const isWinCell = winLine && winLine.includes(i)
          const isLast = lastPlaced === i
          const isAnimating = animCells.includes(i)

          return (
            <button key={i} onClick={() => handleCellClick(i)}
              style={{
                aspectRatio: '1', borderRadius: 16,
                background: isWinCell
                  ? (gameStatus === 'won' ? 'rgba(0,184,148,0.2)' : 'rgba(255,107,107,0.2)')
                  : surface,
                border: `3px solid ${isWinCell
                  ? (gameStatus === 'won' ? '#00B894' : '#FF6B6B')
                  : borderCol}`,
                cursor: cell === null && turn === 'X' && gameStatus === 'playing' ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, fontWeight: 800,
                transition: 'all 0.2s',
                animation: isAnimating ? 'tttPop 0.3s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
                transform: isLast ? 'scale(1)' : 'scale(1)',
              }}
              onMouseEnter={e => {
                if (cell === null && turn === 'X' && gameStatus === 'playing') {
                  e.currentTarget.style.borderColor = '#A29BFE'
                  e.currentTarget.style.transform = 'scale(1.04)'
                }
              }}
              onMouseLeave={e => {
                if (!isWinCell) e.currentTarget.style.borderColor = borderCol
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              {cell === 'X' && (
                <span style={{
                  color: '#FF6B6B',
                  textShadow: isWinCell ? '0 0 15px rgba(255,107,107,0.5)' : 'none',
                  fontFamily: "'Fredoka One',cursive",
                }}>✕</span>
              )}
              {cell === 'O' && (
                <span style={{
                  color: '#A29BFE',
                  textShadow: isWinCell ? '0 0 15px rgba(162,155,254,0.5)' : 'none',
                  fontFamily: "'Fredoka One',cursive",
                }}>○</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Round results indicators */}
      {roundResults.length > 0 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
          {roundResults.map((r, i) => (
            <div key={i} style={{
              width: 32, height: 32, borderRadius: '50%',
              background: r.result === 'win' ? 'rgba(0,184,148,0.2)' : r.result === 'lose' ? 'rgba(255,107,107,0.2)' : 'rgba(253,203,110,0.2)',
              border: `2px solid ${r.result === 'win' ? '#00B894' : r.result === 'lose' ? '#FF6B6B' : '#FDCB6E'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>
              {r.result === 'win' ? '✓' : r.result === 'lose' ? '✗' : '—'}
            </div>
          ))}
          {Array.from({ length: cfg.rounds - roundResults.length }).map((_, i) => (
            <div key={`e${i}`} style={{
              width: 32, height: 32, borderRadius: '50%',
              background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              border: `2px solid ${borderCol}`,
            }} />
          ))}
        </div>
      )}

      {/* Round end overlay */}
      {gamePhase === 'roundEnd' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
          animation: 'tttFadeIn 0.2s ease',
        }}>
          <div style={{
            background: dark ? '#1a1a3e' : '#fff', borderRadius: 24, padding: '32px 28px',
            textAlign: 'center', maxWidth: 320, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'tttPop 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>
              {gameStatus === 'won' ? '🎉' : gameStatus === 'lost' ? '😅' : '🤝'}
            </div>
            <h3 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, color: textMain, marginBottom: 4 }}>
              {gameStatus === 'won' ? 'Kamu Menang!' : gameStatus === 'lost' ? 'AI Menang!' : 'Seri!'}
            </h3>
            <p style={{ color: textMuted, fontSize: 13, marginBottom: 16 }}>
              Ronde {roundNum}/{cfg.rounds}
            </p>
            <button onClick={nextRound} style={{
              background: '#A29BFE', color: '#fff', border: 'none', borderRadius: 100,
              padding: '12px 32px', fontSize: 15, fontWeight: 800, cursor: 'pointer',
              fontFamily: "'Fredoka One',cursive",
            }}>
              ▶ Ronde Berikutnya
            </button>
          </div>
        </div>
      )}

      {bestScore > 0 && gamePhase === 'playing' && (
        <BestRecord label="Skor Terbaik" value={bestScore.toLocaleString()} dark={dark} color="#E17055" />
      )}

      <style>{`
        @keyframes tttPop    { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes tttFadeIn { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  )
}
