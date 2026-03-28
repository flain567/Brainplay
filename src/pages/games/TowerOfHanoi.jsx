import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'
import { WinModal } from '../../components/GameLayout.jsx'

const TUTORIAL_STEPS = [
  { emoji:'🗼', title:'Tower of Hanoi', desc:'Pindahkan semua disk dari tiang kiri ke tiang kanan!', tip:'Klik tiang sumber, lalu klik tiang tujuan untuk memindah disk.' },
  { emoji:'📏', title:'Aturan', desc:'1) Hanya boleh pindah 1 disk (paling atas) per langkah.\n2) Disk besar TIDAK boleh ditaruh di atas disk kecil.', tip:'Minimum langkah = 2ⁿ − 1 (n = jumlah disk).' },
  { emoji:'🧠', title:'Level', desc:'Setiap level menambah 1 disk. Selesaikan semua level untuk menang!', tip:'Pola kunci: pindah n-1 disk ke perantara, pindah terbesar, lalu pindah kembali.' },
]

const CFG = {
  easy:   { startDisks: 3, maxDisks: 5, timeLimit: 300 },
  medium: { startDisks: 4, maxDisks: 7, timeLimit: 600 },
  hard:   { startDisks: 5, maxDisks: 8, timeLimit: 900 },
}

const DISK_COLORS = ['#FF6B6B','#FDCB6E','#00B894','#74B9FF','#A29BFE','#FD79A8','#E17055','#00CEC9','#6C5CE7','#55EFC4']

export default function TowerOfHanoi({ onBack, onHome, game, difficulty }) {
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()
  const tc = useThemeColors()
  const diff = CFG[difficulty?.id] || CFG.easy

  const [phase, setPhase] = useState('tutorial')
  const [pegs, setPegs] = useState([[], [], []])
  const [diskCount, setDiskCount] = useState(diff.startDisks)
  const [currentLevel, setCurrentLevel] = useState(1)
  const [moves, setMoves] = useState(0)
  const [totalMoves, setTotalMoves] = useState(0)
  const [selectedPeg, setSelectedPeg] = useState(null)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [gameOverReason, setGameOverReason] = useState('')
  const timerRef = useRef(null)

  const bestKey = `tower-hanoi-best-${difficulty?.id || 'easy'}`
  const [bestMoves, setBestMoves] = useState(() => { try { return parseInt(localStorage.getItem(bestKey)) || 0 } catch { return 0 } })

  useEffect(() => () => clearInterval(timerRef.current), [])

  const initLevel = useCallback((disks) => {
    const initial = Array.from({ length: disks }, (_, i) => disks - i) // biggest at bottom
    setPegs([initial, [], []])
    setMoves(0)
    setSelectedPeg(null)
  }, [])

  const startGame = useCallback(() => {
    setDiskCount(diff.startDisks)
    setCurrentLevel(1)
    setTotalMoves(0)
    setTimeElapsed(0)
    setShowConfetti(false)
    setShowLevelUp(false)
    setGameOverReason('')
    initLevel(diff.startDisks)
    setPhase('playing')
    clearInterval(timerRef.current)
    const start = Date.now()
    timerRef.current = setInterval(() => setTimeElapsed(Math.floor((Date.now() - start) / 1000)), 200)
  }, [diff, initLevel])

  const handlePegClick = useCallback((pegIdx) => {
    if (phase !== 'playing') return

    if (selectedPeg === null) {
      // Select peg (must have disks)
      if (pegs[pegIdx].length === 0) return
      play('click')
      setSelectedPeg(pegIdx)
    } else {
      if (pegIdx === selectedPeg) {
        // Deselect
        setSelectedPeg(null)
        return
      }
      // Try to move
      const sourcePeg = pegs[selectedPeg]
      const targetPeg = pegs[pegIdx]
      const disk = sourcePeg[sourcePeg.length - 1]

      if (targetPeg.length > 0 && targetPeg[targetPeg.length - 1] < disk) {
        // Invalid move
        play('error')
        setSelectedPeg(null)
        return
      }

      // Valid move
      play('success')
      setPegs(prev => {
        const next = prev.map(p => [...p])
        next[selectedPeg].pop()
        next[pegIdx].push(disk)

        // Check if level complete (all disks on peg 2)
        if (next[2].length === diskCount) {
          const newTotal = totalMoves + moves + 1
          setTotalMoves(newTotal)

          if (diskCount >= diff.maxDisks) {
            // Game won!
            clearInterval(timerRef.current)
            setTimeout(() => {
              setGameOverReason('complete')
              setShowConfetti(true)
              play('win')
              setPhase('result')
            }, 500)
          } else {
            // Level up
            setTimeout(() => {
              setShowLevelUp(true)
              play('levelUp')
              setTimeout(() => {
                setShowLevelUp(false)
                const nd = diskCount + 1
                setDiskCount(nd)
                setCurrentLevel(l => l + 1)
                initLevel(nd)
              }, 1500)
            }, 500)
          }
        }
        return next
      })
      setMoves(m => m + 1)
      setSelectedPeg(null)
    }
  }, [phase, selectedPeg, pegs, diskCount, moves, totalMoves, diff.maxDisks, play, initLevel])

  const totalLevels = diff.maxDisks - diff.startDisks + 1
  const won = gameOverReason === 'complete'
  const optimalTotal = Array.from({ length: totalLevels }, (_, i) => Math.pow(2, diff.startDisks + i) - 1).reduce((a, b) => a + b, 0)
  const finalMoves = totalMoves || (moves + totalMoves)
  const stars = won ? (finalMoves <= optimalTotal * 1.2 ? 3 : finalMoves <= optimalTotal * 2 ? 2 : 1) : 0
  const score = won ? Math.max(100, Math.round(3000 * (optimalTotal / Math.max(finalMoves, 1)))) : 0
  const coinReward = won ? Math.floor(score / 50) + stars * 5 : 0
  const isNewBest = won && (bestMoves === 0 || finalMoves < bestMoves)

  useEffect(() => {
    if (phase !== 'result') return
    if (isNewBest) { localStorage.setItem(bestKey, finalMoves.toString()); setBestMoves(finalMoves) }
    if (coinReward > 0) earnCoins(coinReward, 'Tower of Hanoi')
    reportGameResult({ gameId: 'tower-hanoi', difficultyId: difficulty?.id || 'easy', score, stars, won: true, timeSec: timeElapsed })
  }, [phase])

  const fmtTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const accent = '#F39C12'; const accentLight = '#FDCB6E'
  const bg = tc.bg; const surface = tc.surface; const textMain = tc.text; const textMuted = tc.muted
  const optimalForLevel = Math.pow(2, diskCount) - 1

  if (phase === 'tutorial') return <TutorialModal steps={TUTORIAL_STEPS} onClose={() => setPhase('ready')} />

  if (phase === 'ready') return (
    <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ fontSize:72, marginBottom:12 }}>🗼</div>
        <h1 style={{ fontFamily:"'Fredoka One',cursive", color:accent, fontSize:28, margin:'0 0 8px' }}>Tower of Hanoi</h1>
        <p style={{ color:textMuted, fontSize:14, marginBottom:24, lineHeight:1.5 }}>Pindahkan semua disk ke tiang kanan!<br/>Mulai {diff.startDisks} disk → {diff.maxDisks} disk.</p>
        <div style={{ display:'flex', gap:16, justifyContent:'center', marginBottom:24, flexWrap:'wrap' }}>
          <div style={{ background:surface, borderRadius:12, padding:'12px 20px', textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:700, color:accent }}>{totalLevels}</div>
            <div style={{ fontSize:11, color:textMuted }}>level</div>
          </div>
          <div style={{ background:surface, borderRadius:12, padding:'12px 20px', textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:700, color:'#6C5CE7' }}>{diff.startDisks}→{diff.maxDisks}</div>
            <div style={{ fontSize:11, color:textMuted }}>disk</div>
          </div>
        </div>
        {bestMoves > 0 && <div style={{ color:textMuted, fontSize:13, marginBottom:16 }}>🏆 Best: {bestMoves} total langkah</div>}
        <button onClick={startGame} style={{ fontFamily:"'Fredoka One',cursive", fontSize:18, padding:'14px 48px', background:`linear-gradient(135deg,${accent},${accentLight})`, color:'#fff', border:'none', borderRadius:14, cursor:'pointer' }}>MULAI! 🚀</button>
        <div style={{ marginTop:16 }}><button onClick={onBack} style={{ background:'none', border:'none', color:textMuted, cursor:'pointer', fontSize:14 }}>← Kembali</button></div>
      </div>
    </div>
  )

  if (phase === 'result') {
    const diffLabel = { easy: '🟢 Mudah', medium: '🟡 Sedang', hard: '🔴 Sulit' }[difficulty?.id] || '🟢 Mudah'
    return (
      <div style={{ minHeight:'100dvh', background:bg }}>
        {showConfetti && <Confetti />}
        <WinModal
          emoji="🎉"
          title="Menara selesai!"
          subtitle="Semua disk sampai ke tiang tujuan."
          diffLabel={diffLabel}
          stats={[
            { label: 'Langkah', value: finalMoves, color: '#F39C12' },
            { label: 'Optimal', value: optimalTotal, color: '#A29BFE' },
            { label: 'Waktu', value: fmtTime(timeElapsed), color: '#00CEC9' },
            { label: 'Level', value: `${totalLevels}/${totalLevels}`, color: '#6C5CE7' },
            { label: 'Skor', value: score, color: '#FF6B6B' },
          ]}
          stars={stars}
          coinReward={coinReward}
          highlight={isNewBest ? '🏆 Rekor langkah baru!' : ''}
          onRestart={() => setPhase('ready')}
          onBack={onBack}
          onHome={onHome}
          dark={tc.dark}
          gameColor={accent}
        />
      </div>
    )
  }

  // ─── Playing ────────────────────────────────────────────────────────────
  const maxDisk = diskCount
  const pegWidth = Math.min(Math.floor((window.innerWidth - 48) / 3), 130)
  const diskMaxW = pegWidth - 8
  const diskH = Math.min(28, Math.floor(220 / maxDisk))

  return (
    <div style={{ minHeight:'100dvh', background:bg, display:'flex', flexDirection:'column' }}>
      {showLevelUp && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ textAlign:'center', animation:'thBounce 0.5s ease' }}>
            <div style={{ fontSize:64 }}>📈</div>
            <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:32, color:'#FDCB6E', marginTop:8 }}>LEVEL UP!</div>
            <div style={{ fontSize:18, color:'#fff', marginTop:4 }}>{diskCount + 1} disk</div>
          </div>
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:textMuted, fontSize:20, cursor:'pointer' }}>←</button>
        <div style={{ fontFamily:"'Fredoka One',cursive", color:accent, fontSize:14 }}>Level {currentLevel}/{totalLevels} · {diskCount} disk</div>
        <div style={{ fontFamily:"'Fredoka One',cursive", color:textMuted, fontSize:14 }}>⏱️ {fmtTime(timeElapsed)}</div>
      </div>

      <div style={{ textAlign:'center', padding:'0 16px', fontSize:12, color:textMuted }}>
        Langkah: <b style={{ color:accent }}>{moves}</b> / optimal: {optimalForLevel} · Total: {totalMoves + moves}
      </div>

      <div style={{ flex:1, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'20px 8px 0', gap:8 }}>
        {[0, 1, 2].map(pegIdx => (
          <button key={pegIdx} onClick={() => handlePegClick(pegIdx)}
            style={{
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end',
              width:pegWidth, height:280, position:'relative', cursor:'pointer',
              background: selectedPeg === pegIdx ? `${accent}18` : 'transparent',
              border: selectedPeg === pegIdx ? `2px solid ${accent}` : `2px solid transparent`,
              borderRadius:16, padding:'0 4px 8px', transition:'all 0.2s',
            }}>
            {/* Peg rod */}
            <div style={{ position:'absolute', bottom:40, left:'50%', transform:'translateX(-50%)', width:6, height:200, background:tc.dark?'#444':'#ccc', borderRadius:3 }} />
            {/* Peg base */}
            <div style={{ position:'absolute', bottom:32, left:'10%', width:'80%', height:6, background:tc.dark?'#555':'#bbb', borderRadius:3 }} />
            {/* Disks */}
            <div style={{ position:'absolute', bottom:38, display:'flex', flexDirection:'column-reverse', alignItems:'center', gap:2 }}>
              {pegs[pegIdx].map((disk, i) => {
                const w = 24 + ((disk / maxDisk) * (diskMaxW - 24))
                const isTop = i === pegs[pegIdx].length - 1
                return (
                  <div key={`${disk}-${i}`} style={{
                    width:w, height:diskH, borderRadius:diskH/2,
                    background: DISK_COLORS[(disk - 1) % DISK_COLORS.length],
                    border: isTop && selectedPeg === pegIdx ? '2px solid #fff' : 'none',
                    boxShadow: isTop && selectedPeg === pegIdx ? '0 0 12px rgba(255,255,255,0.5)' : '0 2px 4px rgba(0,0,0,0.2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:diskH > 20 ? 12 : 10, fontWeight:700, color:'#fff', textShadow:'0 1px 2px rgba(0,0,0,0.3)',
                    transition:'all 0.15s',
                    animation: isTop && selectedPeg === pegIdx ? 'thFloat 0.6s ease infinite alternate' : 'none',
                  }}>
                    {disk}
                  </div>
                )
              })}
            </div>
            {/* Label */}
            <div style={{ position:'absolute', bottom:8, fontSize:10, color:textMuted, fontWeight:700 }}>
              {pegIdx === 0 ? 'A' : pegIdx === 1 ? 'B' : 'C'}
            </div>
          </button>
        ))}
      </div>

      <div style={{ textAlign:'center', padding:'8px 16px 20px', fontSize:12, color:textMuted }}>
        {selectedPeg !== null ? `Pilih tiang tujuan untuk disk ${pegs[selectedPeg]?.[pegs[selectedPeg].length-1] || ''}` : 'Klik tiang untuk memilih disk'}
      </div>

      <style>{`
        @keyframes thFloat { from{transform:translateY(0)} to{transform:translateY(-6px)} }
        @keyframes thBounce { 0%{opacity:0;transform:scale(0.5)} 60%{transform:scale(1.1)} 100%{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  )
}
