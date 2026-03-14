import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

const TUTORIAL_STEPS_CB = [
  { emoji:'🔗', title:'Connect Blocks', desc:'Sambungkan blok angka yang sama dengan cara drag dari satu blok ke blok lain yang bersebelahan!', tip:'Kamu bisa menyambung ke 8 arah termasuk diagonal.' },
  { emoji:'👆', title:'Cara Drag', desc:'Tekan dan tahan blok, lalu geser ke blok tetangga yang angkanya sama. Lepas untuk menggabungkan!', tip:'Semakin panjang chain, semakin besar nilainya.' },
  { emoji:'🏆', title:'Level Up!', desc:'Capai target skor untuk naik level. Setiap level baru membuka blok dengan angka lebih besar!', tip:'Gabungkan chain panjang untuk menanjak level lebih cepat.' },
]

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'

const TILE_VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]
const DEFAULT_TILE_COLOR = {
  2:    { bg:'#4CAF50', dark:'#388E3C', text:'#fff' },
  4:    { bg:'#FFC107', dark:'#F9A825', text:'#333' },
  8:    { bg:'#9C27B0', dark:'#7B1FA2', text:'#fff' },
  16:   { bg:'#E91E63', dark:'#C2185B', text:'#fff' },
  32:   { bg:'#2196F3', dark:'#1565C0', text:'#fff' },
  64:   { bg:'#FF5722', dark:'#D84315', text:'#fff' },
  128:  { bg:'#00BCD4', dark:'#00838F', text:'#fff' },
  256:  { bg:'#8BC34A', dark:'#558B2F', text:'#fff' },
  512:  { bg:'#FF9800', dark:'#E65100', text:'#fff' },
  1024: { bg:'#3F51B5', dark:'#283593', text:'#fff' },
  2048: { bg:'#F44336', dark:'#B71C1C', text:'#fff' },
}

const DIFF_CFG = {
  easy:   { cols:5, rows:6, startMax:3, goal:512,  goalStep:512  },
  medium: { cols:5, rows:7, startMax:4, goal:1024, goalStep:1024 },
  hard:   { cols:5, rows:8, startMax:5, goal:2048, goalStep:2048 },
}

const makeId   = () => Math.random().toString(36).slice(2)
const randVal  = (mi) => TILE_VALUES[Math.floor(Math.random() * mi)]
const initGrid = (c, r, mi) => Array.from({length:r}, () => Array.from({length:c}, () => ({id:makeId(), value:randVal(mi)})))
const isAdj    = (a,b) => Math.abs(a.r-b.r)<=1 && Math.abs(a.c-b.c)<=1

function checkGameOver(grid, CN, RN) {
  for (let r = 0; r < RN; r++) {
    for (let c = 0; c < CN; c++) {
      if (!grid[r][c]) return false // empty cell means not over
      const val = grid[r][c].value
      // Check all 8 neighbors
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < RN && nc >= 0 && nc < CN) {
            if (grid[nr][nc] && grid[nr][nc].value === val) return false // match exists
          }
        }
      }
    }
  }
  return true // no matches anywhere
}

export default function Game2048({ onBack, game, difficulty }) {
  const cfg  = DIFF_CFG[difficulty.id]
  const CN   = cfg.cols, RN = cfg.rows
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { darkMode } = useSettings()
  const { earnCoins, getActiveTileColors } = useCoins()
  const TILE_COLOR = (getActiveTileColors ? getActiveTileColors() : null) || DEFAULT_TILE_COLOR
  const getColor = v => TILE_COLOR[v] || { bg:'#607D8B', dark:'#37474F', text:'#fff' }
  const dark = darkMode

  const [level,   setLevel]   = useState(1)
  const [maxIdx,  setMaxIdx]  = useState(cfg.startMax)
  const [goal,    setGoal]    = useState(cfg.goal)
  const [score,   setScore]   = useState(0)
  const [best,    setBest]    = useState(() => parseInt(localStorage.getItem(`cb-best-${difficulty.id}`)||'0'))
  const [grid,    setGrid]    = useState(() => initGrid(CN, RN, cfg.startMax))
  const [chain,   setChain]   = useState([])
  const [dragging,setDragging]= useState(false)
  const [phase,   setPhase]   = useState('playing')
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('tut-connect'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [invalidFlash, setInvalidFlash] = useState(false)
  const [luInfo,  setLuInfo]  = useState(null)
  const [mergeKeys,setMergeKeys]= useState([])
  const [newIds,  setNewIds]  = useState([])

  const boardRef = useRef(null)
  const gridRef  = useRef(grid);  gridRef.current  = grid
  const chainRef = useRef(chain); chainRef.current = chain
  const maxIdxRef= useRef(maxIdx);maxIdxRef.current= maxIdx
  const goalRef  = useRef(goal);  goalRef.current  = goal
  const levelRef = useRef(level); levelRef.current = level

  const [cellSize, setCellSize] = useState(58)
  useEffect(() => {
    const upd = () => {
      const w = Math.min(window.innerWidth, 500)
      setCellSize(Math.min(Math.floor((w-28)/CN)-4, 70))
    }
    upd(); window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [CN])

  const gap = 4

  const getCellAt = useCallback((cx, cy) => {
    const b = boardRef.current; if (!b) return null
    const rect = b.getBoundingClientRect()
    const total = cellSize + gap
    const c = Math.floor((cx - rect.left  - 8) / total)
    const r = Math.floor((cy - rect.top   - 8) / total)
    if (r<0||r>=RN||c<0||c>=CN) return null
    return {r,c}
  }, [cellSize, RN, CN])

  const startDrag = useCallback((cx,cy) => {
    if (phase !== 'playing') return
    const cell = getCellAt(cx,cy); if (!cell) return
    setDragging(true); setChain([cell]); play('flip')
  }, [getCellAt, play, phase])

  const moveDrag = useCallback((cx,cy) => {
    if (!dragging) return
    const cell = getCellAt(cx,cy); if (!cell) return
    const cur = chainRef.current, g = gridRef.current
    if (!cur.length) return
    const headVal = g[cur[0].r]?.[cur[0].c]?.value
    const cellVal = g[cell.r]?.[cell.c]?.value
    if (cellVal !== headVal) return
    if (cur.length>=2 && cur[cur.length-2].r===cell.r && cur[cur.length-2].c===cell.c) {
      setChain(c=>c.slice(0,-1)); return
    }
    if (cur.some(p=>p.r===cell.r&&p.c===cell.c)) return
    if (!isAdj(cur[cur.length-1], cell)) return
    play('flip'); setChain(c=>[...c,cell])
  }, [dragging, getCellAt, play])

  const endDrag = useCallback(() => {
    if (!dragging) return
    setDragging(false)
    const cur = chainRef.current
    if (cur.length < 2) { setChain([]); if (cur.length === 1) { setInvalidFlash(true); setTimeout(()=>setInvalidFlash(false),400) } return }

    const g      = gridRef.current
    const val    = g[cur[0].r][cur[0].c].value
    const sum    = val * cur.length
    const target = cur[cur.length-1]

    play(sum >= 64 ? 'win' : 'match')

    const keys = cur.map(p=>`${p.r}-${p.c}`)
    setMergeKeys(keys)
    setTimeout(()=>setMergeKeys([]), 320)

    const mi  = maxIdxRef.current
    const gl  = goalRef.current
    const lv  = levelRef.current

    setGrid(prev => {
      const next = prev.map(row=>row.map(t=>({...t})))
      cur.slice(0,-1).forEach(p=>{ next[p.r][p.c]=null })
      next[target.r][target.c] = {id:makeId(), value:sum}
      const freshIds = []
      for (let c=0; c<CN; c++) {
        let col = next.map(row=>row[c]).filter(Boolean)
        const miss = RN - col.length
        const fresh = Array.from({length:miss}, ()=>{
          const t={id:makeId(), value:randVal(mi)}; freshIds.push(t.id); return t
        })
        col = [...fresh, ...col]
        col.forEach((t,r)=>{ next[r][c]=t })
      }
      setNewIds(freshIds); setTimeout(()=>setNewIds([]),260)
      return next
    })

    setScore(s => {
      const ns = s + sum
      if (ns > best) { setBest(ns); localStorage.setItem(`cb-best-${difficulty.id}`,ns) }
      return ns
    })

    if (sum >= gl) {
      const nGoal  = gl + (DIFF_CFG[difficulty.id].goalStep)
      const nLevel = lv + 1
      const nMax   = Math.min(mi+1, TILE_VALUES.length-1)
      setLuInfo({ tile: TILE_VALUES[nMax-1], reward: nLevel*5 })
      setPhase('levelup'); play('levelUp')
      setShowConfetti(true); setTimeout(()=>setShowConfetti(false), 100)
      setLevel(nLevel); setGoal(nGoal); setMaxIdx(nMax)

      // Report to global progress on every level up
      const currentScore = score + sum
      reportGameResult({
        gameId: '2048',
        difficultyId: difficulty.id,
        won: true,
        score: currentScore,
        stars: nLevel >= 5 ? 3 : nLevel >= 3 ? 2 : 1,
        timeSec: 0,
      })
      // Coin reward for level up
      earnCoins(30, `Level Up! (Lv.${nLevel})`)
    }
    setChain([])
  }, [dragging, best, CN, RN, play])

  const restart = () => {
    play('click')
    setGrid(initGrid(CN,RN,cfg.startMax))
    setChain([]); setScore(0); setLevel(1)
    setMaxIdx(cfg.startMax); setGoal(cfg.goal)
    setPhase('playing'); setDragging(false)
  }

  // Check for game over after every grid change
  useEffect(() => {
    if (phase !== 'playing') return
    // Delay check slightly so new tiles are in place
    const t = setTimeout(() => {
      if (checkGameOver(grid, CN, RN)) {
        play('gameOver')
        setPhase('gameover')
        reportGameResult({
          gameId: '2048',
          difficultyId: difficulty.id,
          won: false,
          score,
          stars: score >= 2000 ? 2 : 1,
          timeSec: 0,
        })
      }
    }, 350)
    return () => clearTimeout(t)
  }, [grid, phase])

  const chainVal = chain.length && gridRef.current[chain[0].r]?.[chain[0].c]?.value
  const progPct  = Math.min(100, Math.floor((score / (goal * level)) * 100))
  const DLABEL   = {easy:'🟢 Mudah',medium:'🟡 Sedang',hard:'🔴 Sulit'}
  const boardPx  = (cellSize+gap)*CN - gap + 16

  return (
    <div style={{minHeight:'100vh',background:'#111',color:'#fff',display:'flex',flexDirection:'column',alignItems:'center',padding:'18px 12px 40px',userSelect:'none'}}>
      {showTutorial && <TutorialModal steps={TUTORIAL_STEPS_CB} color="#A29BFE" onClose={()=>{ setShowTutorial(false); localStorage.setItem("tut-connect","1") }} />}
      <Confetti active={showConfetti} onDone={()=>setShowConfetti(false)} />
      <style>{`
        @keyframes tileNew   {from{transform:scale(0) translateY(-20px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
        @keyframes tileMerge {0%{transform:scale(1)}35%{transform:scale(1.3)}70%{transform:scale(0.93)}100%{transform:scale(1)}}
        @keyframes popIn     {from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes fadeIn    {from{opacity:0}to{opacity:1}}
        @keyframes shimmer   {from{background-position:-200% 0}to{background-position:200% 0}}
      `}</style>

      {/* Header */}
      <div style={{width:'100%',maxWidth:boardPx,display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <button onClick={()=>{play('click');onBack()}} style={{background:'rgba(255,255,255,0.07)',border:'1.5px solid rgba(255,255,255,0.12)',borderRadius:10,padding:'7px 14px',color:'rgba(255,255,255,0.6)',fontSize:15,cursor:'pointer',fontWeight:700,fontFamily:"'Nunito',sans-serif"}}>←</button>
        <div style={{flex:1,fontFamily:"'Fredoka One',cursive",fontSize:20,background:'linear-gradient(135deg,#4CAF50,#FFC107)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Connect Blocks 🔗</div>
        <div style={{textAlign:'right'}}>
          <div style={{fontFamily:"'Fredoka One',cursive",fontSize:16,color:'#FFC107'}}>Level {level}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',fontWeight:700}}>{DLABEL[difficulty.id]}</div>
        </div>
      </div>

      {/* Scores */}
      <div style={{width:'100%',maxWidth:boardPx,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
        {[{label:'SKOR',value:score,color:'#4CAF50'},{label:'REKOR',value:best,color:'#FFC107'}].map(s=>(
          <div key={s.label} style={{background:'rgba(255,255,255,0.05)',border:`1.5px solid ${s.color}33`,borderRadius:12,padding:'8px 12px',textAlign:'center'}}>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:s.color,lineHeight:1}}>{s.value.toLocaleString()}</div>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontWeight:700,letterSpacing:'0.5px',marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div style={{width:'100%',maxWidth:boardPx,marginBottom:10}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:700}}>
          <span>Target: <span style={{color:'#4CAF50'}}>{goal.toLocaleString()}</span></span>
          <span style={{color:'#FFC107'}}>Lv{level} → Lv{level+1}</span>
        </div>
        <div style={{height:9,background:'rgba(255,255,255,0.07)',borderRadius:100,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${progPct}%`,background:'linear-gradient(90deg,#4CAF50,#FFC107,#FF5722)',borderRadius:100,transition:'width 0.4s ease',backgroundSize:'200% 100%',animation:'shimmer 2s linear infinite'}}/>
        </div>
      </div>

      {/* Chain indicator */}
      <div style={{height:34,marginBottom:6,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {chain.length>=2 && chainVal && (()=>{
          const col=getColor(chainVal), sum=chainVal*chain.length
          return <span style={{background:`${col.bg}25`,border:`1.5px solid ${col.bg}66`,borderRadius:100,padding:'5px 18px',fontFamily:"'Fredoka One',cursive",fontSize:15,color:col.bg}}>
            {chain.length}× {chainVal} = {sum} {sum>=goal?'🏆':''}
          </span>
        })()}
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        onTouchStart={e=>{e.preventDefault();const t=e.touches[0];startDrag(t.clientX,t.clientY)}}
        onTouchMove={e=>{e.preventDefault();const t=e.touches[0];moveDrag(t.clientX,t.clientY)}}
        onTouchEnd={e=>{e.preventDefault();endDrag()}}
        onMouseDown={e=>startDrag(e.clientX,e.clientY)}
        onMouseMove={e=>moveDrag(e.clientX,e.clientY)}
        onMouseUp={endDrag} onMouseLeave={endDrag}
        style={{display:'grid',gridTemplateColumns:`repeat(${CN},${cellSize}px)`,gap,padding:8,background:'rgba(255,255,255,0.04)',borderRadius:20,border:`1.5px solid ${invalidFlash ? '#ff6b6b' : 'rgba(255,255,255,0.07)'}`,transition:'border-color 0.2s',touchAction:'none',cursor:'grab',position:'relative'}}
      >
        {grid.map((row,r)=>row.map((cell,c)=>{
          if (!cell) return <div key={`${r}-${c}-null`} style={{width:cellSize,height:cellSize}}/>
          const col    = getColor(cell.value)
          const inCh   = chain.some(p=>p.r===r&&p.c===c)
          const isMrg  = mergeKeys.includes(`${r}-${c}`)
          const isNew  = newIds.includes(cell.id)
          const chIdx  = chain.findIndex(p=>p.r===r&&p.c===c)
          const fs     = cell.value>=1000?cellSize*0.23:cell.value>=100?cellSize*0.27:cellSize*0.33

          return (
            <div key={`${r}-${c}-${cell.id}`} style={{
              width:cellSize, height:cellSize, borderRadius:14,
              background: inCh?`linear-gradient(135deg,${col.bg},${col.dark})`:col.bg,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:"'Fredoka One',cursive", fontSize:fs, color:col.text,
              border: inCh?'3px solid rgba(255,255,255,0.9)':`2px solid ${col.dark}`,
              boxShadow: inCh?`0 0 18px ${col.bg}99,inset 0 0 8px rgba(255,255,255,0.15)`:`0 3px 8px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.2)`,
              transform: inCh?'scale(1.09)':'scale(1)',
              transition:'transform 0.1s,box-shadow 0.1s',
              animation: isMrg?'tileMerge 0.3s ease':isNew?'tileNew 0.22s ease':'none',
              position:'relative', zIndex:inCh?3:1, cursor:'inherit',
            }}>
              {inCh && chIdx>0 && <div style={{position:'absolute',top:3,right:5,fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.75)',lineHeight:1}}>{chIdx+1}</div>}
              <div style={{position:'absolute',top:4,left:6,width:'44%',height:'30%',background:'rgba(255,255,255,0.22)',borderRadius:5,pointerEvents:'none'}}/>
              {cell.value}
            </div>
          )
        }))}

        {/* Connection lines */}
        {chain.length>=2&&(
          <svg style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:10,overflow:'visible'}} width="100%" height="100%">
            {chain.map((p,i)=>{
              if (i===0) return null
              const prev=chain[i-1], sz=cellSize+gap
              const x1=prev.c*sz+cellSize/2+8, y1=prev.r*sz+cellSize/2+8
              const x2=p.c  *sz+cellSize/2+8, y2=p.r  *sz+cellSize/2+8
              const bg=getColor(chainVal)?.bg||'#fff'
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={bg} strokeWidth={7} strokeLinecap="round" opacity={0.8}/>
            })}
          </svg>
        )}
      </div>

      <button onClick={restart} style={{marginTop:16,background:'rgba(255,255,255,0.05)',border:'1.5px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'9px 26px',color:'rgba(255,255,255,0.45)',fontSize:12,fontWeight:800,fontFamily:"'Fredoka One',cursive",cursor:'pointer'}}>
        🔄 Restart
      </button>

      {/* Level Up Modal */}
      {phase==='levelup'&&luInfo&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.82)',backdropFilter:'blur(10px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:20,animation:'fadeIn 0.3s ease'}}>
          <div style={{background:'linear-gradient(160deg,#1a237e,#0d47a1)',border:'2px solid rgba(100,150,255,0.4)',borderRadius:28,padding:'32px 24px',maxWidth:310,width:'100%',textAlign:'center',boxShadow:'0 0 80px rgba(63,81,181,0.5)',animation:'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)'}}>
            <div style={{fontSize:13,fontWeight:800,color:'rgba(255,255,255,0.5)',letterSpacing:'2px',marginBottom:6}}>LEVEL UP!</div>
            <div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.55)',marginBottom:14}}>NEW BLOCK UNLOCK</div>

            <div style={{margin:'0 auto 14px',width:96,height:96,borderRadius:20,background:getColor(luInfo.tile).bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Fredoka One',cursive",fontSize:28,color:'#fff',boxShadow:`0 0 40px ${getColor(luInfo.tile).bg}88`,border:'3px solid rgba(255,255,255,0.3)',animation:'tileMerge 0.5s ease',position:'relative'}}>
              <span style={{position:'absolute',top:-14,fontSize:24}}>👑</span>
              {luInfo.tile}
            </div>

            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:18,fontSize:14,color:'rgba(255,255,255,0.75)'}}>
              Your Reward
              <span style={{background:'rgba(156,39,176,0.3)',border:'1.5px solid rgba(156,39,176,0.5)',borderRadius:100,padding:'3px 12px',color:'#CE93D8',fontWeight:800,fontFamily:"'Fredoka One',cursive"}}>
                💎 +{luInfo.reward}
              </span>
            </div>

            <div style={{display:'flex',gap:3,justifyContent:'center',marginBottom:22}}>
              {['x2','x3','x4','x5','x4','x3','x2'].map((x,i)=>{
                const cs=['#F44336','#FF5722','#FF9800','#4CAF50','#FF9800','#FF5722','#F44336']
                const active=i===6
                return <div key={i} style={{background:active?cs[i]:cs[i]+'99',borderRadius:6,padding:'4px 7px',fontSize:11,fontWeight:800,color:'#fff',boxShadow:active?`0 0 10px ${cs[i]}`:'none',transform:active?'scale(1.12)':'scale(1)'}}>{x}</div>
              })}
            </div>

            <button onClick={()=>{setPhase('playing');setLuInfo(null)}} style={{width:'100%',background:'linear-gradient(135deg,#4CAF50,#8BC34A)',color:'#fff',border:'none',borderRadius:100,padding:'13px',fontSize:16,fontWeight:800,fontFamily:"'Fredoka One',cursive",cursor:'pointer',boxShadow:'0 0 24px rgba(76,175,80,0.4)',marginBottom:8}}>
              ▶ Lanjut Main
            </button>
            <div onClick={()=>{setPhase('playing');setLuInfo(null)}} style={{color:'rgba(255,255,255,0.35)',fontSize:13,cursor:'pointer',padding:4}}>No Thanks</div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {phase==='gameover'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.82)',backdropFilter:'blur(10px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:20,animation:'fadeIn 0.3s ease'}}>
          <div style={{background:dark?'#1a1a2e':'#fff',borderRadius:28,padding:'32px 24px',maxWidth:340,width:'100%',textAlign:'center',boxShadow:'0 24px 60px rgba(0,0,0,0.3)',animation:'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)'}}>
            <div style={{fontSize:56,marginBottom:8}}>😔</div>
            <h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:26,color:dark?'#FF6B6B':'#E53935',marginBottom:6}}>Game Over!</h2>
            <p style={{fontSize:13,color:dark?'#8892b0':'#636E72',marginBottom:20}}>Tidak ada lagi blok yang bisa disambungkan</p>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:22}}>
              <div style={{background:dark?'#16213e':'#F8F9FA',borderRadius:14,padding:'14px 10px'}}>
                <div style={{fontFamily:"'Fredoka One',cursive",fontSize:22,color:'#A29BFE'}}>{score.toLocaleString()}</div>
                <div style={{fontSize:11,color:dark?'#8892b0':'#636E72',fontWeight:700}}>Skor</div>
              </div>
              <div style={{background:dark?'#16213e':'#F8F9FA',borderRadius:14,padding:'14px 10px'}}>
                <div style={{fontFamily:"'Fredoka One',cursive",fontSize:22,color:'#4ECDC4'}}>Lv.{level}</div>
                <div style={{fontSize:11,color:dark?'#8892b0':'#636E72',fontWeight:700}}>Level</div>
              </div>
            </div>

            {score >= best && score > 0 && (
              <div style={{background:'#FDCB6E22',border:'1.5px solid #FDCB6E44',borderRadius:12,padding:'8px 14px',marginBottom:16,fontFamily:"'Fredoka One',cursive",fontSize:14,color:'#FDCB6E'}}>
                🏆 Rekor Baru!
              </div>
            )}

            <div style={{display:'flex',gap:10}}>
              <button onClick={restart} style={{flex:1,background:'linear-gradient(135deg,#A29BFE,#6C5CE7)',color:'#fff',border:'none',borderRadius:100,padding:'13px',fontSize:15,fontWeight:800,fontFamily:"'Fredoka One',cursive",cursor:'pointer',boxShadow:'0 4px 16px rgba(162,155,254,0.4)'}}>
                🔄 Main Lagi
              </button>
              <button onClick={()=>{play('click');onBack()}} style={{flex:1,background:dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)',color:dark?'#e8e8f0':'#2D3436',border:`1.5px solid ${dark?'rgba(255,255,255,0.15)':'rgba(0,0,0,0.15)'}`,borderRadius:100,padding:'13px',fontSize:15,fontWeight:800,fontFamily:"'Fredoka One',cursive",cursor:'pointer'}}>
                🎯 Level
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
