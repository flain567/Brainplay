import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

const TUTORIAL_STEPS = [
  { emoji:'🧠', title:'Memory Pattern Pro', desc:'Game premium BrainPlay! Ingat pola yang muncul di grid, lalu ulangi dengan urutan yang tepat.', tip:'Ini game flagship — siapkan konsentrasi penuhmu!' },
  { emoji:'👀', title:'Cara Main', desc:'Sel-sel akan menyala satu per satu membentuk pola. Perhatikan urutannya, lalu tap sel dengan urutan yang sama!', tip:'Fokus pada POSISI sel, bukan warna — polanya selalu berubah!' },
  { emoji:'⚡', title:'Boss Level', desc:'Setiap 5 level, hadapi Boss Level! Pola lebih cepat, efek distraksi, dan skor bonus besar!', tip:'Di Boss Level, tetap tenang — jangan terburu-buru saat input!' },
  { emoji:'🔥', title:'Combo & Replay', desc:'Jawab benar berturut-turut untuk combo multiplier hingga 5×! Gunakan tombol Replay untuk melihat ulang pola.', tip:'2 replay gratis per level, setelah itu -100 poin per replay.' },
]

import { useEffect, useRef, useState } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'

const CFG = {
  easy:   { lives:4, maxLevel:15, showTime:700, showGap:220, bossShowTime:500, bossGap:160, replayFree:3 },
  medium: { lives:3, maxLevel:20, showTime:550, showGap:180, bossShowTime:380, bossGap:120, replayFree:2 },
  hard:   { lives:2, maxLevel:25, showTime:400, showGap:140, bossShowTime:280, bossGap:100, replayFree:1 },
}

const NC = { cyan:'#00F5FF', purple:'#A29BFE', green:'#00B894', pink:'#FF6B9D', gold:'#FFD700', red:'#FF4757', orange:'#FF6348' }
const BG = '#060620'
const CELL_BG = '#12123a'
const CELL_BD = '#2a2a5a'
const GCOLS = [NC.cyan, NC.pink, NC.green, '#FDCB6E', NC.purple, '#55EFC4', '#FF6B6B', '#FD79A8']
const BCOLS = [NC.orange, NC.red, '#FF6B6B', '#E17055']

const rand = (a,b) => a+Math.random()*(b-a)
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v))
const lerp = (a,b,t) => a+(b-a)*t
const PI2 = Math.PI*2

function rrect(ctx,x,y,w,h,r){
  w=Math.max(w,1);h=Math.max(h,1);r=Math.max(0,Math.min(r||0,w/2,h/2))
  if(r<1){ctx.rect(x,y,w,h);return}
  ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()
}

function lvlCfg(level){
  if(level<=4) return {grid:3, pat:clamp(3+Math.floor((level-1)*0.6),3,5)}
  if(level<=9) return {grid:4, pat:clamp(4+Math.floor((level-5)*0.5),4,7)}
  if(level<=14) return {grid:5, pat:clamp(6+Math.floor((level-10)*0.6),6,9)}
  if(level<=20) return {grid:6, pat:clamp(8+Math.floor((level-15)*0.6),8,12)}
  return {grid:6, pat:clamp(10+Math.floor((level-20)*0.5),10,14)}
}

export default function MemoryPatternPro({onBack,game,difficulty}){
  const canvasRef=useRef(null), wrapRef=useRef(null), gRef=useRef(null), animRef=useRef(null), phRef=useRef('idle')
  const {play}=useSound(), {reportGameResult}=useProgress(), {earnCoins}=useCoins()
  const cfg=CFG[difficulty.id]

  const [phase,_setPhase]=useState('idle')
  const [showTut,setShowTut]=useState(()=>!localStorage.getItem('bp_tut_memory-pattern'))
  const [showConf,setShowConf]=useState(false)
  const [uiScore,setUiScore]=useState(0)
  const [uiLives,setUiLives]=useState(cfg.lives)
  const [uiLevel,setUiLevel]=useState(1)
  const [uiCombo,setUiCombo]=useState(0)

  const setPh=(p)=>{phRef.current=p;_setPhase(p)}

  function sizeCanvas(){
    const c=canvasRef.current; if(!c) return {w:300,h:500}
    const p=wrapRef.current||c.parentElement; if(!p) return {w:300,h:500}
    const r=p.getBoundingClientRect()
    const dpr=Math.min(window.devicePixelRatio||1,2)
    const w=Math.max(Math.floor(r.width),200), h=Math.max(Math.floor(r.height),300)
    c.width=w*dpr; c.height=h*dpr; c.style.width=w+'px'; c.style.height=h+'px'
    const ctx=c.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0)
    return {w,h}
  }

  function buildGrid(W,H,gs){
    const padX=20, padTop=65, padBot=55
    const aW=Math.max(W-padX*2,80), aH=Math.max(H-padTop-padBot,80)
    const mx=Math.min(aW,aH), gap=Math.max(4,10-gs)
    const cs=Math.max(16,(mx-(gs-1)*gap)/gs)
    const tW=gs*cs+(gs-1)*gap, offX=(W-tW)/2, offY=padTop+(aH-tW)/2
    const cells=[]
    for(let r=0;r<gs;r++) for(let c=0;c<gs;c++){
      const x=offX+c*(cs+gap), y=offY+r*(cs+gap)
      cells.push({x,y,w:cs,h:cs,cx:x+cs/2,cy:y+cs/2,idx:r*gs+c,
        glowA:0,pulse:Math.random()*PI2,hlA:0,hlColor:NC.cyan,tapS:1,okF:0,errF:0})
    }
    return {size:gs,cells,cs,gap,offX,offY,tW}
  }

  function genPat(gs,len){ const tot=gs*gs,pat=[]
    for(let i=0;i<len;i++){let idx; do{idx=Math.floor(Math.random()*tot)}while(pat.length>0&&pat[pat.length-1]===idx); pat.push(idx)}
    return pat
  }

  function initGame(W,H){ const lc=lvlCfg(1)
    return {W,H,level:1,score:0,lives:cfg.lives,combo:0,maxCombo:0,
      grid:buildGrid(W,H,lc.grid),pattern:genPat(lc.grid,lc.pat),
      pInput:[],showIdx:-1,showT:0,isBoss:false,repCnt:0,
      repBtn:{x:0,y:0,w:0,h:0,vis:false},
      pts:[],rings:[],floats:[],
      bgD:Array.from({length:25},()=>({x:rand(0,W),y:rand(0,H),dx:rand(-0.2,0.2),dy:rand(-0.2,0.2),r:rand(1,2.5),a:rand(0.04,0.12),color:GCOLS[Math.floor(Math.random()*GCOLS.length)]})),
      shake:0,bGlow:0,lvlA:0,lvlT:'',bIntro:0,inpStart:0,bFlick:0}
  }

  useEffect(()=>{
    const {w:W,h:H}=sizeCanvas()
    const c=canvasRef.current; if(!c) return
    const ctx=c.getContext('2d')
    const g=initGame(W,H); gRef.current=g
    setUiScore(0);setUiLives(cfg.lives);setUiLevel(1);setUiCombo(0)

    function spawnP(x,y,col,n){for(let i=0;i<n;i++){const a=PI2*Math.random(),s=rand(1.5,4);g.pts.push({x,y,dx:Math.cos(a)*s,dy:Math.sin(a)*s,life:rand(20,35),ml:35,r:rand(2,4),color:col})}}
    function spawnR(x,y,mr,col){g.rings.push({x,y,r:5,mr,a:0.8,color:col,lw:2.5})}
    function spawnF(x,y,t,col){g.floats.push({x,y,text:t,color:col,life:55,ml:55,dy:-1.2})}

    function startLvl(){
      const lc=lvlCfg(g.level)
      g.isBoss=g.level%5===0&&g.level>1
      g.grid=buildGrid(W,H,lc.grid); g.pattern=genPat(lc.grid,lc.pat)
      g.pInput=[]; g.showIdx=-1; g.showT=0; g.repCnt=0; g.repBtn.vis=false
      if(g.isBoss){g.bIntro=1;setPh('bossIntro')}
      else{g.lvlT=g.level===1?'START!':`LEVEL ${g.level}`;g.lvlA=1;setPh('levelUp')}
    }
    function beginShow(){g.showIdx=0;g.showT=0;setPh('showing')}
    function beginInp(){
      g.pInput=[];g.inpStart=Date.now()
      const by=g.grid.offY+g.grid.tW+10
      g.repBtn={x:W/2-50,y:by,w:100,h:32,vis:true}
      if(g.isBoss) g.bFlick=20
      setPh('input')
    }
    function doRep(){
      g.repCnt++; if(g.repCnt>cfg.replayFree){g.score=Math.max(0,g.score-100);spawnF(W/2,g.repBtn.y-10,'-100',NC.red)}
      g.showIdx=0;g.showT=0;g.pInput=[];setPh('showing');try{play('flip')}catch(e){}
    }
    function handleInp(ci){
      const exp=g.pattern[g.pInput.length], cell=g.grid.cells[ci]
      if(cell){cell.tapS=1.12;cell.hlA=1;cell.hlColor=NC.cyan;spawnR(cell.cx,cell.cy,35,'#fff')}
      if(ci===exp){
        g.pInput.push(ci); if(cell){cell.okF=1;spawnP(cell.cx,cell.cy,NC.green,4)}
        try{play('flip')}catch(e){}
        if(g.pInput.length===g.pattern.length) onDone()
      } else onWrong(ci,exp)
    }
    function onDone(){
      g.combo++;g.maxCombo=Math.max(g.maxCombo,g.combo)
      const mult=Math.min(1+g.combo*0.4,5)
      const spd=Math.max(0,3000-(Date.now()-g.inpStart))/100
      const p=Math.round((100+spd+g.level*10+(g.isBoss?200:0))*mult)
      g.score+=p
      spawnF(W/2,g.grid.offY-12,`+${p}`,NC.gold)
      if(g.combo>=3)spawnF(W/2,g.grid.offY-35,`🔥 ${g.combo}× COMBO`,NC.gold)
      for(const i of g.pattern){const cc=g.grid.cells[i];if(cc)spawnP(cc.cx,cc.cy,NC.cyan,2)}
      spawnR(W/2,g.grid.offY+g.grid.tW/2,g.isBoss?160:90,g.isBoss?NC.gold:NC.cyan)
      try{play(g.isBoss?'win':'match')}catch(e){}
      setUiScore(g.score);setUiCombo(g.combo)
      if(g.level+1>cfg.maxLevel){setTimeout(()=>{setPh('won');setShowConf(true);finish(true)},500)}
      else{g.level++;setUiLevel(g.level);setTimeout(startLvl,700)}
    }
    function onWrong(wi,ci){
      g.combo=0;g.lives--;setUiCombo(0);setUiLives(g.lives)
      const wc=g.grid.cells[wi];if(wc){wc.errF=1;spawnP(wc.cx,wc.cy,NC.red,7)}
      const cc=g.grid.cells[ci];if(cc){cc.okF=1;cc.hlA=1;cc.hlColor=NC.green}
      g.shake=10;spawnF(W/2,g.grid.offY+g.grid.tW/2,'❌ SALAH!',NC.red)
      try{play('mismatch')}catch(e){}
      if(g.lives<=0)setTimeout(()=>{setPh('lost');finish(false)},800)
      else setTimeout(startLvl,1200)
    }
    function finish(won){
      const st=won?(g.lives>=cfg.lives?3:g.lives>=cfg.lives-1?2:1):0
      const cb={easy:25,medium:45,hard:70}
      let co=(cb[difficulty.id]||25)+Math.floor(g.score/200);if(st===3)co+=35;if(!won)co=Math.max(5,Math.floor(g.score/150))
      earnCoins(co,`Memory Pattern Pro (${difficulty.id})`)
      reportGameResult({gameId:'memory-pattern',difficultyId:difficulty.id,won,score:g.score,stars:Math.max(st,won?1:0),timeSec:0})
      const bk=`memory-pattern-best-${difficulty.id}`
      const pv=parseInt(localStorage.getItem(bk)||'0');if(g.score>pv)localStorage.setItem(bk,g.score)
    }

    function tapAt(cx,cy){
      const p=phRef.current
      if(p==='idle'){startLvl();return}
      if(p!=='input') return
      const b=g.repBtn; if(b.vis&&cx>=b.x&&cx<=b.x+b.w&&cy>=b.y&&cy<=b.y+b.h){doRep();return}
      for(const cell of g.grid.cells){if(cx>=cell.x&&cx<=cell.x+cell.w&&cy>=cell.y&&cy<=cell.y+cell.h){handleInp(cell.idx);return}}
    }
    const onM=(e)=>{const r=c.getBoundingClientRect();tapAt(e.clientX-r.left,e.clientY-r.top)}
    const onT=(e)=>{e.preventDefault();const t=e.touches[0],r=c.getBoundingClientRect();tapAt(t.clientX-r.left,t.clientY-r.top)}
    c.addEventListener('click',onM);c.addEventListener('touchstart',onT,{passive:false})

    let lastT=0
    function loop(ts){
      try{
        const dt=Math.min((ts-lastT)/16.667,2.5);lastT=ts;const p=phRef.current
        for(const d of g.bgD){d.x+=d.dx*dt;d.y+=d.dy*dt;if(d.x<-5)d.x=W+5;if(d.x>W+5)d.x=-5;if(d.y<-5)d.y=H+5;if(d.y>H+5)d.y=-5}
        for(const c of g.grid.cells){c.pulse+=0.02*dt;c.glowA=0.03+Math.sin(c.pulse)*0.02;c.tapS=lerp(c.tapS,1,0.15*dt);c.hlA=lerp(c.hlA,0,0.06*dt);c.okF=lerp(c.okF,0,0.04*dt);c.errF=lerp(c.errF,0,0.04*dt)}
        for(let i=g.pts.length-1;i>=0;i--){const pt=g.pts[i];pt.x+=pt.dx*dt;pt.y+=pt.dy*dt;pt.dy+=0.08*dt;pt.dx*=0.98;pt.life-=dt;if(pt.life<=0)g.pts.splice(i,1)}
        for(let i=g.rings.length-1;i>=0;i--){const r=g.rings[i];r.r+=2.5*dt;r.a=0.8*(1-r.r/r.mr);r.lw*=0.98;if(r.r>=r.mr)g.rings.splice(i,1)}
        for(let i=g.floats.length-1;i>=0;i--){const f=g.floats[i];f.y+=f.dy*dt;f.life-=dt;if(f.life<=0)g.floats.splice(i,1)}
        if(g.shake>0){g.shake*=(1-0.08*dt);if(g.shake<0.3)g.shake=0}
        g.bGlow=(g.isBoss&&(p==='showing'||p==='input'||p==='bossIntro'))?0.12+Math.sin(ts/300)*0.08:lerp(g.bGlow,0,0.05*dt)

        if(p==='levelUp'){g.lvlA-=0.02*dt;if(g.lvlA<=0)beginShow()}
        if(p==='bossIntro'){g.bIntro-=0.014*dt;if(g.bIntro<=0)beginShow()}
        if(p==='showing'){
          const sT=(g.isBoss?cfg.bossShowTime:cfg.showTime)/16.667, gT=(g.isBoss?cfg.bossGap:cfg.showGap)/16.667
          if(g.showIdx<g.pattern.length){
            g.showT+=dt;const ci=g.pattern[g.showIdx],cell=g.grid.cells[ci]
            if(cell&&g.showT<sT){cell.hlA=1;cell.hlColor=g.isBoss?BCOLS[g.showIdx%BCOLS.length]:GCOLS[g.showIdx%GCOLS.length]
              if(g.showT<2){spawnP(cell.cx,cell.cy,cell.hlColor,5);spawnR(cell.cx,cell.cy,g.grid.cs*1.1,cell.hlColor)}}
            if(g.showT>=sT+gT){g.showT=0;g.showIdx++}
          }else beginInp()
        }
        if(p==='input'&&g.isBoss&&g.bFlick>0){g.bFlick-=dt;if(Math.random()<0.1){const rc=g.grid.cells[Math.floor(Math.random()*g.grid.cells.length)];if(rc){rc.hlA=0.2;rc.hlColor=BCOLS[Math.floor(Math.random()*BCOLS.length)]}}}

        draw(ctx,ts)
      }catch(err){console.error('MPP loop:',err)}
      animRef.current=requestAnimationFrame(loop)
    }

    function draw(ctx,ts){
      const sx=g.shake>0?(Math.random()-0.5)*g.shake*2:0, sy=g.shake>0?(Math.random()-0.5)*g.shake*2:0
      ctx.save();ctx.translate(sx,sy)
      ctx.fillStyle=BG;ctx.fillRect(-5,-5,W+10,H+10)
      if(g.bGlow>0.01){ctx.fillStyle=`rgba(255,67,87,${g.bGlow})`;ctx.fillRect(-5,-5,W+10,H+10)}
      ctx.strokeStyle='rgba(162,155,254,0.03)';ctx.lineWidth=0.5
      for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
      for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
      for(const d of g.bgD){ctx.globalAlpha=d.a;ctx.fillStyle=d.color;ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,PI2);ctx.fill()}
      ctx.globalAlpha=1

      const cr=Math.max(4,g.grid.cs*0.12)
      for(const cc of g.grid.cells){
        ctx.save()
        if(cc.tapS!==1){ctx.translate(cc.cx,cc.cy);ctx.scale(cc.tapS,cc.tapS);ctx.translate(-cc.cx,-cc.cy)}
        ctx.fillStyle=CELL_BG;ctx.strokeStyle=CELL_BD;ctx.lineWidth=1.5;ctx.beginPath();rrect(ctx,cc.x,cc.y,cc.w,cc.h,cr);ctx.fill();ctx.stroke()
        ctx.fillStyle=`rgba(162,155,254,${cc.glowA})`;ctx.beginPath();rrect(ctx,cc.x,cc.y,cc.w,cc.h,cr);ctx.fill()
        if(cc.hlA>0.02){
          ctx.globalAlpha=cc.hlA*0.8;ctx.fillStyle=cc.hlColor;ctx.shadowColor=cc.hlColor;ctx.shadowBlur=18*cc.hlA
          ctx.beginPath();rrect(ctx,cc.x+2,cc.y+2,cc.w-4,cc.h-4,Math.max(1,cr-1));ctx.fill()
          ctx.shadowBlur=0;ctx.globalAlpha=1
          ctx.fillStyle=`rgba(255,255,255,${cc.hlA*0.3})`;ctx.beginPath();rrect(ctx,cc.x+cc.w*0.15,cc.y+cc.h*0.1,cc.w*0.7,cc.h*0.3,cr*0.4);ctx.fill()
        }
        if(cc.okF>0.02){ctx.globalAlpha=cc.okF*0.5;ctx.fillStyle=NC.green;ctx.shadowColor=NC.green;ctx.shadowBlur=12;ctx.beginPath();rrect(ctx,cc.x,cc.y,cc.w,cc.h,cr);ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1}
        if(cc.errF>0.02){ctx.globalAlpha=cc.errF*0.5;ctx.fillStyle=NC.red;ctx.shadowColor=NC.red;ctx.shadowBlur=18;ctx.beginPath();rrect(ctx,cc.x,cc.y,cc.w,cc.h,cr);ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1}
        ctx.restore()
      }
      for(const r of g.rings){if(r.a<0.01)continue;ctx.globalAlpha=r.a;ctx.strokeStyle=r.color;ctx.lineWidth=Math.max(0.5,r.lw);ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,PI2);ctx.stroke()}
      ctx.globalAlpha=1
      for(const pt of g.pts){const a=pt.life/pt.ml;ctx.globalAlpha=a;ctx.fillStyle=pt.color;ctx.shadowColor=pt.color;ctx.shadowBlur=4;ctx.beginPath();ctx.arc(pt.x,pt.y,pt.r*a,0,PI2);ctx.fill()}
      ctx.shadowBlur=0;ctx.globalAlpha=1
      for(const f of g.floats){ctx.globalAlpha=f.life/f.ml;ctx.fillStyle=f.color;ctx.shadowColor=f.color;ctx.shadowBlur=5;ctx.font="bold 14px 'Fredoka One',sans-serif";ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y)}
      ctx.shadowBlur=0;ctx.globalAlpha=1

      if(phRef.current==='input'&&g.repBtn.vis){
        const b=g.repBtn,free=g.repCnt<cfg.replayFree
        ctx.fillStyle=free?'rgba(162,155,254,0.15)':'rgba(255,107,107,0.1)';ctx.strokeStyle=free?'rgba(162,155,254,0.4)':'rgba(255,107,107,0.3)';ctx.lineWidth=1.5
        ctx.beginPath();rrect(ctx,b.x,b.y,b.w,b.h,16);ctx.fill();ctx.stroke()
        ctx.fillStyle='#fff';ctx.font="bold 11px 'Fredoka One',sans-serif";ctx.textAlign='center'
        ctx.fillText(free?`👁 Replay (${cfg.replayFree-g.repCnt})`:'👁 Replay (-100)',b.x+b.w/2,b.y+b.h/2+4)
      }

      // HUD
      ctx.fillStyle='rgba(6,6,32,0.75)';ctx.fillRect(0,0,W,52);ctx.fillStyle='rgba(162,155,254,0.06)';ctx.fillRect(0,50,W,2)
      ctx.textAlign='left';ctx.font="bold 13px 'Fredoka One',sans-serif"
      ctx.fillStyle=g.isBoss?NC.red:NC.cyan;ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=3
      ctx.fillText(g.isBoss?`⚡ Lv ${g.level}`:`🧠 Lv ${g.level}`,12,20);ctx.shadowBlur=0
      const p=phRef.current
      if(p==='input'||p==='showing'){const dR=2.5,dG=7;for(let i=0;i<g.pattern.length;i++){const dn=p==='input'?i<g.pInput.length:i<=g.showIdx;ctx.fillStyle=dn?NC.green:'rgba(255,255,255,0.1)';if(dn){ctx.shadowColor=NC.green;ctx.shadowBlur=3}ctx.beginPath();ctx.arc(12+i*dG,38,dR,0,PI2);ctx.fill();ctx.shadowBlur=0}}
      ctx.textAlign='right';ctx.fillStyle=NC.gold;ctx.shadowColor=NC.gold;ctx.shadowBlur=3;ctx.font="bold 15px 'Fredoka One',sans-serif"
      ctx.fillText(g.score.toLocaleString(),W-12,21);ctx.shadowBlur=0
      ctx.font='13px serif';let h='';for(let i=0;i<cfg.lives;i++)h+=i<g.lives?'❤️':'🖤';ctx.fillText(h,W-12,40)
      if(g.combo>=2){ctx.textAlign='center';ctx.fillStyle=NC.gold;ctx.shadowColor=NC.gold;ctx.shadowBlur=5+Math.sin(ts/150)*3;ctx.font="bold 12px 'Fredoka One',sans-serif";ctx.fillText(`🔥 ${g.combo}× (${Math.min(1+g.combo*0.4,5).toFixed(1)}×)`,W/2,20);ctx.shadowBlur=0}
      if(p==='showing'||p==='input'){ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font="9px 'Fredoka One',sans-serif";ctx.fillText(`${g.grid.size}×${g.grid.size} • ${g.pattern.length} pola`,W/2,44)}

      if(phRef.current==='levelUp'&&g.lvlA>0){
        const t=1-g.lvlA,sc=t<0.3?(t/0.3)*1.1:t<0.5?lerp(1.1,1,(t-0.3)/0.2):1,al=t>0.85?1-(t-0.85)/0.15:1
        ctx.save();ctx.translate(W/2,H/2);ctx.scale(sc,sc);ctx.globalAlpha=al;ctx.fillStyle='#fff';ctx.shadowColor=NC.cyan;ctx.shadowBlur=20
        ctx.font="bold 30px 'Fredoka One',sans-serif";ctx.textAlign='center';ctx.fillText(g.lvlT,0,10);ctx.shadowBlur=0;ctx.restore()
      }
      if(phRef.current==='bossIntro'&&g.bIntro>0){
        const t=1-g.bIntro;ctx.fillStyle=`rgba(0,0,0,${Math.min(t*2,0.4)})`;ctx.fillRect(-5,-5,W+10,H+10)
        const al=t>0.85?1-(t-0.85)/0.15:Math.min(t*3,1)
        ctx.save();ctx.globalAlpha=al;ctx.translate(Math.sin(ts/50)*2*(1-t),0)
        ctx.fillStyle=NC.red;ctx.shadowColor=NC.red;ctx.shadowBlur=30;ctx.font="bold 34px 'Fredoka One',sans-serif";ctx.textAlign='center'
        ctx.fillText('⚡ BOSS ⚡',W/2,H/2-8);ctx.shadowBlur=10;ctx.fillStyle='#fff';ctx.font="bold 16px 'Fredoka One',sans-serif"
        ctx.fillText(`Level ${g.level}`,W/2,H/2+20);ctx.shadowBlur=0;ctx.restore()
      }
      if(phRef.current==='idle'){
        ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(0,0,W,H)
        const pl=0.9+Math.sin(ts/400)*0.1;ctx.save();ctx.translate(W/2,H/2);ctx.scale(pl,pl)
        ctx.fillStyle='#fff';ctx.shadowColor=NC.cyan;ctx.shadowBlur=15;ctx.font="bold 20px 'Fredoka One',sans-serif";ctx.textAlign='center'
        ctx.fillText('TAP UNTUK MULAI',0,-8);ctx.shadowBlur=6;ctx.fillStyle=NC.purple;ctx.font="12px 'Fredoka One',sans-serif"
        ctx.fillText('🧠 Memory Pattern Pro',0,16);ctx.shadowBlur=0;ctx.restore()
      }
      ctx.restore()
    }

    animRef.current=requestAnimationFrame(loop)
    return ()=>{cancelAnimationFrame(animRef.current);c.removeEventListener('click',onM);c.removeEventListener('touchstart',onT)}
  },[difficulty.id])

  const restart=()=>{const {w:W,h:H}=sizeCanvas();gRef.current=initGame(W,H);setPh('idle');setUiScore(0);setUiLives(cfg.lives);setUiLevel(1);setUiCombo(0);setShowConf(false)}
  const stars=phase==='won'?(uiLives>=cfg.lives?3:uiLives>=cfg.lives-1?2:1):0
  const cb={easy:25,medium:45,hard:70}
  const coinR=phase==='won'?(cb[difficulty.id]||25)+Math.floor(uiScore/200)+(stars===3?35:0):Math.max(5,Math.floor(uiScore/150))
  const DL={easy:'🟢 Mudah',medium:'🟡 Sedang',hard:'🔴 Sulit'}

  return(
    <div ref={wrapRef} style={{position:'fixed',inset:0,background:BG,display:'flex',flexDirection:'column',fontFamily:"'Fredoka One',cursive"}}>
      {showTut&&<TutorialModal steps={TUTORIAL_STEPS} storageKey="bp_tut_memory-pattern" onClose={()=>setShowTut(false)}/>}
      {showConf&&<Confetti/>}
      <div style={{position:'absolute',top:8,left:10,zIndex:20}}>
        <button onClick={onBack} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',borderRadius:10,padding:'7px 13px',fontSize:15,cursor:'pointer'}}>←</button>
      </div>
      <canvas ref={canvasRef} style={{flex:1,display:'block',touchAction:'none'}}/>

      {(phase==='won'||phase==='lost')&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:20,animation:'mppFade 0.3s ease'}}>
          <div style={{background:'linear-gradient(180deg,#0d0d30,#1a1a3e)',borderRadius:28,padding:'36px 28px',textAlign:'center',maxWidth:380,width:'100%',boxShadow:phase==='won'?`0 0 60px ${NC.cyan}33, 0 24px 80px rgba(0,0,0,0.5)`:'0 24px 80px rgba(0,0,0,0.5)',animation:'mppPop 0.45s cubic-bezier(0.34,1.56,0.64,1)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:phase==='won'?`linear-gradient(90deg,${NC.cyan},${NC.purple},${NC.gold})`:`linear-gradient(90deg,${NC.red},#FF6B6B,${NC.red})`}}/>
            <div style={{fontSize:52,marginBottom:8,animation:'mppBounce 0.6s ease'}}>{phase==='won'?'🏆':'💥'}</div>
            <h2 style={{color:'#fff',fontSize:26,marginBottom:4}}>{phase==='won'?'SEMPURNA!':'Game Over'}</h2>
            <p style={{color:NC.purple,fontSize:13,marginBottom:8}}>{phase==='won'?`${cfg.maxLevel} level ditaklukkan!`:`Sampai Level ${uiLevel}`}</p>
            <span style={{display:'inline-block',background:'rgba(162,155,254,0.15)',color:NC.purple,padding:'4px 14px',borderRadius:100,fontSize:13,fontWeight:700,marginBottom:14}}>{DL[difficulty.id]}</span>
            {phase==='won'&&<div style={{fontSize:30,marginBottom:12,letterSpacing:8}}>{[0,1,2].map(i=><span key={i} style={{display:'inline-block',animation:i<stars?`mppStar 0.4s ${0.2+i*0.15}s cubic-bezier(0.34,1.56,0.64,1) both`:'none',opacity:i<stars?1:0.25,filter:i<stars?'none':'grayscale(1)'}}>{i<stars?'⭐':'☆'}</span>)}</div>}
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(253,203,110,0.12)',border:'1.5px solid #FDCB6E44',borderRadius:100,padding:'6px 18px',marginBottom:16}}><span>🪙</span><span style={{color:'#F9A825',fontSize:16,fontWeight:800}}>+{coinR}</span></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:24}}>
              {[{l:'Skor',v:uiScore.toLocaleString(),c:NC.gold},{l:'Max Combo',v:`${gRef.current?.maxCombo||0}×`,c:NC.cyan},{l:'Nyawa',v:uiLives,c:uiLives>0?NC.green:NC.red}].map(s=>(
                <div key={s.l} style={{background:`${s.c}10`,borderRadius:14,padding:'12px 8px'}}><div style={{fontSize:22,color:s.c}}>{s.v}</div><div style={{fontSize:10,color:'#888',marginTop:2}}>{s.l}</div></div>
              ))}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={restart} style={{flex:1,background:`linear-gradient(135deg,${NC.cyan},${NC.purple})`,color:'#fff',border:'none',borderRadius:100,padding:'13px 18px',fontSize:15,fontWeight:800,cursor:'pointer',boxShadow:`0 4px 20px ${NC.cyan}44`}}>🔄 Main Lagi</button>
              <button onClick={onBack} style={{flex:1,background:'#1e2a4a',color:'#aaa',border:'2px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'13px 18px',fontSize:15,fontWeight:800,cursor:'pointer'}}>🎯 Ganti Level</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes mppFade{from{opacity:0}to{opacity:1}}@keyframes mppPop{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}@keyframes mppBounce{0%{transform:scale(0.3)}60%{transform:scale(1.15)}100%{transform:scale(1)}}@keyframes mppStar{from{transform:scale(0) rotate(-20deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}`}</style>
    </div>
  )
}
