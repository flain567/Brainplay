import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
const TUT = [
  { emoji: '💎', title: 'Neon Dash', desc: 'Runner neon ala Geometry Dash! Timing lompatan dan kontrol wave adalah kunci!', tip: 'Mati = restart level dari 0%. Hafalkan polanya!' },
  { emoji: '🟦', title: 'Mode Cube', desc: 'TAP / SPASI untuk lompat. Timing harus tepat saat mendekati obstacle!', tip: 'Lompat hanya saat di tanah — jangan spam tap.' },
  { emoji: '🌊', title: 'Mode Wave', desc: 'TAHAN untuk naik diagonal, LEPAS untuk turun diagonal. Lewati celah!', tip: 'Wave mode butuh kontrol smooth — jangan panik!' },
  { emoji: '⭐', title: 'Progress', desc: 'Progress 0-100% di atas. Kumpulkan 💎. Mati = restart dari 0%!', tip: 'Hafalkan pola — setiap attempt makin mudah!' },
]
import { useEffect, useRef, useState } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
const DC = {
  easy:   { spd: 3.5, si: 0.12, grav: 0.55, jv: -9, ws: 3.2, ml: 6 },
  medium: { spd: 4.2, si: 0.18, grav: 0.65, jv: -9.8, ws: 4.0, ml: 10 },
  hard:   { spd: 5.2, si: 0.25, grav: 0.75, jv: -10.5, ws: 5.0, ml: 14 },
}
const CL = {
  bg:'#0b0b2a', grd:'rgba(162,155,254,0.06)', gnd:'#A29BFE', gndG:'#6C5CE7',
  ply:'#00F5FF', plyG:'#00B4D8', spk:'#FF6B9D', spkG:'#FF2D78',
  blk:'#A29BFE', wav:'#FF6348', wavG:'#EE5A24', ptl:'#55EFC4',
  dia:'#FFD700', pil:'#FD79A8', saw:'#FF4757',
}
const P2=Math.PI*2, PS=17, GO=0.78 // player size, ground offset

// ═══════════════════════════════════════════════════════════════
// LEVEL DATA — hand-crafted arrays
// [type, xOffset, ...params]
// S=spike, TS=tall spike, B=block(w,h), G=gap(w), D=diamond(yOff)
// P=portal(mode), W=waveWall(gapY,gapH), PL=pillar(h), SW=saw(yOff)
// ═══════════════════════════════════════════════════════════════
const LVS = [
  // 1: Tutorial
  [['D',120,-50],['S',80],['D',90,-45],['S',80],['S',55],['D',100,-50]],
  // 2: Blocks
  [['S',100],['S',55],['D',70,-50],['B',90,28,32],['S',80],['D',70,-45],['B',80,25,38],['S',65]],
  // 3: Gaps
  [['S',100],['B',70,24,42],['D',60,-55],['S',80],['G',90,52],['D',50,-40],['S',90],['S',55],['D',70,-50]],
  // 4: Pillars + wave intro
  [['PL',100,38],['PL',60,48],['D',50,-60],['S',90],['P',90,'wave'],['W',60,95,60],['W',60,70,60],['D',35,0],['W',60,100,60],['P',60,'cube'],['S',90],['D',60,-50]],
  // 5: Mixed
  [['S',90],['S',45],['B',65,28,48],['D',55,-60],['G',85,48],['S',80],['P',80,'wave'],['W',55,85,55],['W',55,105,55],['D',30,0],['W',55,70,55],['P',55,'cube'],['S',75],['D',60,-50]],
  // 6: Speed
  [['S',85],['S',40],['S',40],['D',65,-48],['B',60,24,44],['G',75,45],['PL',70,55],['D',45,-60],['S',60],['S',40],['S',40],['D',70,-45]],
  // 7: Long wave
  [['S',90],['B',65,24,38],['P',85,'wave'],['W',50,80,50],['W',50,60,50],['W',50,95,48],['D',25,0],['W',50,55,48],['W',50,85,48],['W',50,70,45],['D',25,0],['P',50,'cube'],['S',80],['B',65,26,40],['D',60,-55]],
  // 8: Saws
  [['S',90],['S',42],['D',60,-48],['SW',65,-28],['S',60],['SW',60,-42],['B',65,24,38],['G',75,48],['SW',60,-25],['D',50,-52],['S',55],['S',40]],
  // 9: Gauntlet
  [['S',80],['B',55,20,50],['S',48],['G',65,42],['PL',60,52],['S',48],['D',55,-52],['P',75,'wave'],['W',48,78,45],['W',45,58,45],['W',45,92,45],['D',22,0],['W',45,52,45],['P',45,'cube'],['S',65],['SW',55,-32],['D',50,-48]],
  // 10: Intense
  [['S',75],['S',38],['S',38],['B',55,22,52],['D',48,-60],['G',65,45],['SW',55,-30],['PL',55,55],['S',50],['P',70,'wave'],['W',42,75,42],['W',40,95,42],['W',40,55,40],['W',40,80,40],['D',20,0],['P',40,'cube'],['S',60],['S',35],['D',55,-48]],
  // 11+: harder
  [['S',70],['S',35],['S',35],['S',35],['D',55,-48],['B',50,22,55],['G',55,42],['SW',50,-35],['PL',50,60],['P',65,'wave'],['W',38,72,38],['W',36,55,38],['W',36,88,36],['D',18,0],['W',36,60,36],['P',36,'cube'],['S',55],['S',32],['S',32],['D',50,-50]],
  [['S',65],['S',32],['B',48,20,58],['SW',48,-32],['G',52,40],['S',50],['S',30],['S',30],['D',48,-50],['PL',45,62],['P',60,'wave'],['W',34,70,35],['W',32,90,34],['W',32,50,32],['D',16,0],['W',32,78,32],['P',32,'cube'],['SW',48,-30],['S',42],['S',30],['D',45,-48]],
  [['S',60],['S',28],['S',28],['S',28],['S',28],['D',45,-45],['B',42,20,60],['G',48,38],['SW',42,-35],['PL',42,65],['P',55,'wave'],['W',30,65,30],['W',28,85,28],['W',28,50,28],['W',28,75,28],['D',14,0],['W',28,60,26],['P',28,'cube'],['S',45],['S',25],['S',25],['D',40,-48]],
  [['S',55],['S',25],['S',25],['S',25],['S',25],['S',25],['D',40,-42],['B',38,18,62],['SW',40,-32],['G',45,36],['PL',40,68],['P',50,'wave'],['W',26,62,26],['W',24,82,25],['W',24,48,24],['W',24,72,24],['W',24,55,24],['D',12,0],['P',24,'cube'],['SW',42,-28],['S',38],['S',24],['S',24],['D',38,-45]],
]

function buildLv(idx, gY) {
  const data = LVS[Math.min(idx, LVS.length - 1)]
  const items = []; let x = 350
  for (const d of data) {
    x += d[1]
    switch (d[0]) {
      case 'S':  items.push({t:'spike',x,y:gY,w:22,h:22}); break
      case 'TS': items.push({t:'spike',x,y:gY,w:22,h:38}); break
      case 'B':  items.push({t:'block',x,y:gY-d[3],w:d[2],h:d[3]}); break
      case 'G':  items.push({t:'gap',x,w:d[2]}); break
      case 'D':  items.push({t:'dia',x,y:gY+d[2],col:false}); break
      case 'P':  items.push({t:'portal',x,y:gY-55,w:28,h:55,mode:d[2]}); break
      case 'W':  items.push({t:'wtop',x,y:0,w:18,h:d[2]},{t:'wbot',x,y:d[2]+d[3],w:18,h:400}); break
      case 'PL': items.push({t:'pillar',x,y:gY-d[2],w:18,h:d[2]}); break
      case 'SW': items.push({t:'saw',x,y:gY+d[2],r:14}); break
    }
  }
  x += 200; items.push({t:'end',x})
  return {items, len:x, nd:items.filter(i=>i.t==='dia').length}
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function NeonDash({onBack, game, difficulty}) {
  const cRef=useRef(null), aRef=useRef(null), gR=useRef(null)
  const {play}=useSound(), {reportGameResult}=useProgress(), {earnCoins}=useCoins()
  const dc=DC[difficulty.id]

  const [phase,setPhase]=useState('idle') // idle|play|dying|dead|winning|won
  const [showTut,setShowTut]=useState(()=>!localStorage.getItem('bp_tut_neon-dash'))
  const [showConf,setShowConf]=useState(false)
  const [uSc,setSc]=useState(0)
  const [uLv,setLv]=useState(1)
  const [uPr,setPr]=useState(0)
  const [uDi,setDi]=useState('0/0')
  const [uAt,setAt]=useState(1)

  // We store phase in ref too so game loop reads latest
  const phRef=useRef('idle')
  const sp=p=>{phRef.current=p;setPhase(p)}

  function szC(){
    const c=cRef.current;if(!c)return{w:300,h:500}
    const par=c.parentElement;if(!par)return{w:300,h:500}
    const rc=par.getBoundingClientRect()
    const dpr=Math.min(window.devicePixelRatio||1,2)
    const w=Math.floor(rc.width)||window.innerWidth,h=Math.floor(rc.height)||window.innerHeight
    c.width=w*dpr;c.height=h*dpr;c.style.width=w+'px';c.style.height=h+'px'
    c.getContext('2d').setTransform(dpr,0,0,dpr,0,0)
    return{w,h}
  }

  function mkG(W,H){
    const gY=Math.floor(H*GO)
    return{W,H,gY,lv:1,sc:0,att:1,lvD:buildLv(0,gY),
      px:70,py:gY-PS,vy:0,gnd:true,mode:'cube',rot:0,hold:false,
      cam:0,spd:dc.spd,cd:0,
      // State timers (frame-based, not setTimeout!)
      dieT:0, winT:0, nextAction:null,
      // VFX
      pts:[],rings:[],trail:[],shk:0,gridOff:0}
  }

  useEffect(()=>{
    const{w:W,h:H}=szC()
    const c=cRef.current;if(!c)return
    const ctx=c.getContext('2d')
    let g=mkG(W,H);gR.current=g
    setSc(0);setLv(1);setPr(0);setDi('0/0');setAt(1)

    // ── Input ──
    function onDown(){
      const p=phRef.current
      if(p==='idle'){startLv();return}
      if(p==='dead'){retry();return}
      if(p!=='play')return
      g.hold=true
      if(g.mode==='cube'&&g.gnd){
        g.vy=dc.jv;g.gnd=false
        try{play('flip')}catch(e){}
      }
    }
    function onUp(){g.hold=false}

    const md=()=>onDown(), mu=()=>onUp()
    const ts2=e=>{e.preventDefault();onDown()}, te=e=>{e.preventDefault();onUp()}
    const kd=e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();onDown()}}
    const ku=e=>{if(e.code==='Space'||e.code==='ArrowUp')onUp()}
    c.addEventListener('mousedown',md);c.addEventListener('mouseup',mu)
    c.addEventListener('touchstart',ts2,{passive:false});c.addEventListener('touchend',te,{passive:false})
    window.addEventListener('keydown',kd);window.addEventListener('keyup',ku)

    // ── Level management ──
    function startLv(){
      g.lvD=buildLv(g.lv-1,g.gY)
      g.cam=0;g.cd=0;g.spd=dc.spd+(g.lv-1)*dc.si
      g.px=70;g.py=g.gY-PS;g.vy=0;g.gnd=true
      g.mode='cube';g.rot=0;g.hold=false
      g.dieT=0;g.winT=0;g.nextAction=null
      g.trail=[];g.pts=[];g.rings=[]
      sp('play')
    }

    function retry(){
      g.att++;setAt(g.att)
      for(const it of g.lvD.items)if(it.t==='dia')it.col=false
      g.cam=0;g.cd=0;g.spd=dc.spd+(g.lv-1)*dc.si
      g.px=70;g.py=g.gY-PS;g.vy=0;g.gnd=true
      g.mode='cube';g.rot=0;g.hold=false
      g.dieT=0;g.winT=0;g.nextAction=null
      g.trail=[];g.pts=[];g.rings=[]
      sp('play')
    }

    function doDie(){
      sp('dying'); g.dieT=35 // frames until 'dead' state
      const cx=g.px+PS/2,cy=g.py+PS/2
      for(let i=0;i<16;i++){const a=P2*Math.random(),s=1.5+Math.random()*5
        g.pts.push({x:cx,y:cy,dx:Math.cos(a)*s,dy:Math.sin(a)*s,l:20+Math.random()*25,ml:45,r:2+Math.random()*4,c:CL.ply})}
      g.rings.push({x:cx,y:cy,r:5,mr:90,a:1,c:CL.spk,lw:3})
      g.shk=14
      try{play('mismatch')}catch(e){}
    }

    function doWin(){
      sp('winning'); g.winT=60 // frames until next level
      const dr=g.lvD.nd>0?g.cd/g.lvD.nd:1
      const ab=Math.max(0,200-(g.att-1)*25)
      const pts=Math.round(250+g.lv*50+dr*350+ab)
      g.sc+=pts;setSc(g.sc)
      const cx=g.px+PS/2,cy=g.py+PS/2
      for(let i=0;i<20;i++){const a=P2*Math.random(),s=2+Math.random()*6
        g.pts.push({x:cx,y:cy,dx:Math.cos(a)*s,dy:Math.sin(a)*s,l:25+Math.random()*30,ml:55,r:3+Math.random()*5,c:[CL.ply,CL.dia,CL.ptl,CL.gnd][i%4]})}
      g.rings.push({x:cx,y:cy,r:8,mr:180,a:1,c:CL.dia,lw:4})
      try{play('win')}catch(e){}
    }

    function finGame(won){
      const st=won?3:g.lv>dc.ml/2?2:g.lv>2?1:0
      const cb={easy:20,medium:40,hard:65}
      let co=(cb[difficulty.id]||20)+Math.floor(g.sc/150);if(st===3)co+=30
      if(!won)co=Math.max(5,Math.floor(g.sc/200))
      earnCoins(co,`Neon Dash (${difficulty.id})`)
      reportGameResult({gameId:'neon-dash',difficultyId:difficulty.id,won,score:g.sc,stars:Math.max(st,won?1:0),timeSec:0})
      const bk=`neon-dash-best-${difficulty.id}`,pv=parseInt(localStorage.getItem(bk)||'0')
      if(g.sc>pv)localStorage.setItem(bk,g.sc)
    }

    // ═════════════════════════════════════════════════════════
    // GAME LOOP — uses frame-based state machine, NO setTimeout
    // ═════════════════════════════════════════════════════════
    let lt=0,fc=0
    function loop(ts){try{
      const dt=Math.min((ts-lt)/16.667,2.5);lt=ts;fc++
      const p=phRef.current, gY=g.gY

      // ── VFX ──
      for(let i=g.pts.length-1;i>=0;i--){const pt=g.pts[i];pt.x+=pt.dx*dt;pt.y+=pt.dy*dt;pt.dy+=0.05*dt;pt.l-=dt;if(pt.l<=0)g.pts.splice(i,1)}
      for(let i=g.rings.length-1;i>=0;i--){const r=g.rings[i];r.r+=3*dt;r.a*=0.95;if(r.a<0.02||r.r>=r.mr)g.rings.splice(i,1)}
      while(g.trail.length>60)g.trail.shift()
      for(let i=g.trail.length-1;i>=0;i--){g.trail[i].a-=0.025*dt;if(g.trail[i].a<=0)g.trail.splice(i,1)}
      if(g.shk>0){g.shk*=0.91;if(g.shk<0.3)g.shk=0}

      // ── STATE: dying → dead (frame-based!) ──
      if(p==='dying'){
        g.dieT-=dt
        if(g.dieT<=0) sp('dead')
      }

      // ── STATE: winning → next level (frame-based!) ──
      if(p==='winning'){
        g.winT-=dt
        if(g.winT<=0){
          if(g.lv>=dc.ml){sp('won');setShowConf(true);finGame(true)}
          else{g.lv++;g.att=1;setLv(g.lv);setAt(1);startLv()}
        }
      }

      // ── STATE: play ──
      if(p==='play'){
        g.spd=Math.min(dc.spd+(g.lv-1)*dc.si+g.cam*0.00015,dc.spd*1.8)
        const spd=g.spd*dt
        g.cam+=spd
        g.gridOff=(g.gridOff+spd)%40

        const wx=g.px+g.cam
        if(fc%2===0)g.trail.push({x:g.px+PS/2,y:g.py+PS/2,a:g.mode==='wave'?0.55:0.3,c:g.mode==='wave'?CL.wav:CL.ply})

        if(g.mode==='cube'){
          g.vy+=dc.grav*dt;g.py+=g.vy*dt
          if(!g.gnd)g.rot+=0.07*dt
          else g.rot=Math.round(g.rot/(Math.PI/2))*(Math.PI/2)
          let overGap=false
          for(const it of g.lvD.items){if(it.t==='gap'&&wx+PS>it.x&&wx<it.x+it.w){overGap=true;break}}
          if(!overGap&&g.py+PS>=gY){g.py=gY-PS;g.vy=0;g.gnd=true}
          if(g.py>H+60){doDie();/*skip rest*/}
        }else{
          const ws=dc.ws*dt
          if(g.hold){g.py-=ws;g.rot=-0.35}else{g.py+=ws;g.rot=0.35}
          g.py=Math.max(8,Math.min(g.py,gY-PS))
        }

        // Collision (only if still playing)
        if(phRef.current==='play'){
          const p1=g.px+3,q1=g.py+3,p2=g.px+PS-3,q2=g.py+PS-3
          let died=false
          for(const it of g.lvD.items){
            const sx=it.x-g.cam
            if(sx<-80||sx>W+80)continue
            if(it.t==='spike'&&p2>sx+5&&p1<sx+it.w-5&&q2>it.y-it.h+5&&q1<it.y){died=true;break}
            if((it.t==='block'||it.t==='pillar')&&p2>sx+2&&p1<sx+it.w-2&&q2>it.y+2&&q1<it.y+it.h-2){died=true;break}
            if((it.t==='wtop'||it.t==='wbot')&&g.mode==='wave'&&p2>sx+1&&p1<sx+it.w-1&&q2>it.y&&q1<it.y+it.h){died=true;break}
            if(it.t==='saw'){const dx=(g.px+PS/2)-(sx+it.r),dy=(g.py+PS/2)-(it.y+it.r);if(dx*dx+dy*dy<(it.r+PS/2-5)*(it.r+PS/2-5)){died=true;break}}
            if(it.t==='dia'&&!it.col){if(Math.abs((g.px+PS/2)-(sx+7))<18&&Math.abs((g.py+PS/2)-(it.y+7))<18){
              it.col=true;g.cd++;g.sc+=30;setSc(g.sc)
              g.pts.push({x:sx+7,y:it.y+7,dx:0,dy:-1.5,l:18,ml:18,r:5,c:CL.dia})
              g.rings.push({x:sx+7,y:it.y+7,r:4,mr:28,a:0.5,c:CL.dia,lw:2})
              try{play('match')}catch(e){}
            }}
            if(it.t==='portal'&&wx>it.x&&wx<it.x+it.w+5&&g.mode!==it.mode){
              g.mode=it.mode;g.rings.push({x:g.px+PS/2,y:g.py+PS/2,r:4,mr:50,a:0.7,c:CL.ptl,lw:2})
              if(it.mode==='wave'){g.vy=0;g.gnd=false}
            }
            if(it.t==='end'&&wx>=it.x){doWin();break}
          }
          if(died&&phRef.current==='play')doDie()
        }

        setPr(Math.round(Math.min(g.cam/g.lvD.len,1)*100))
        setDi(`${g.cd}/${g.lvD.nd}`)
      }

      // ═══════════ DRAW ═══════════
      const shx=g.shk>0?(Math.random()-0.5)*g.shk*2:0,shy=g.shk>0?(Math.random()-0.5)*g.shk*2:0
      ctx.save();ctx.translate(shx,shy)

      // BG
      const bg=ctx.createLinearGradient(0,0,0,H)
      bg.addColorStop(0,'#0b0b2a');bg.addColorStop(1,'#0d0d35')
      ctx.fillStyle=bg;ctx.fillRect(0,0,W,H)

      // Grid
      ctx.strokeStyle=CL.grd;ctx.lineWidth=1
      for(let x=-(g.gridOff||0);x<W+40;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
      for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}

      // Ground
      ctx.strokeStyle=CL.gnd;ctx.lineWidth=3;ctx.shadowColor=CL.gndG;ctx.shadowBlur=12
      ctx.beginPath();let pen=false
      for(let x=0;x<W;x+=3){const wx=x+g.cam;let inG=false
        for(const it of g.lvD.items){if(it.t==='gap'&&wx>=it.x&&wx<=it.x+it.w){inG=true;break}}
        if(!inG){if(!pen){ctx.moveTo(x,gY);pen=true}else ctx.lineTo(x,gY)}else pen=false}
      ctx.stroke();ctx.shadowBlur=0
      ctx.fillStyle='rgba(162,155,254,0.04)';ctx.fillRect(0,gY+1,W,H-gY)

      // Items
      for(const it of g.lvD.items){
        const sx=it.x-g.cam
        if(sx<-60||sx>W+60)continue
        if(it.t==='spike'){ctx.fillStyle=CL.spk;ctx.shadowColor=CL.spkG;ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(sx,it.y);ctx.lineTo(sx+it.w/2,it.y-it.h);ctx.lineTo(sx+it.w,it.y);ctx.closePath();ctx.fill();ctx.shadowBlur=0}
        if(it.t==='block'){ctx.fillStyle=CL.blk+'55';ctx.strokeStyle=CL.blk;ctx.lineWidth=2;ctx.shadowColor=CL.blk;ctx.shadowBlur=8;ctx.fillRect(sx,it.y,it.w,it.h);ctx.strokeRect(sx,it.y,it.w,it.h);ctx.shadowBlur=0}
        if(it.t==='pillar'){ctx.fillStyle=CL.pil+'66';ctx.strokeStyle=CL.pil;ctx.lineWidth=2;ctx.shadowColor=CL.pil;ctx.shadowBlur=6;ctx.fillRect(sx,it.y,it.w,it.h);ctx.strokeRect(sx,it.y,it.w,it.h);ctx.shadowBlur=0}
        if(it.t==='portal'){const pc=it.mode==='wave'?CL.wav:CL.ptl;ctx.strokeStyle=pc;ctx.lineWidth=3;ctx.shadowColor=pc;ctx.shadowBlur=14;ctx.strokeRect(sx,it.y,it.w,it.h);ctx.fillStyle=pc+'22';ctx.fillRect(sx,it.y,it.w,it.h);ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.font="bold 16px sans-serif";ctx.textAlign='center';ctx.fillText(it.mode==='wave'?'~':'□',sx+it.w/2,it.y+it.h/2+6)}
        if(it.t==='wtop'||it.t==='wbot'){ctx.fillStyle=CL.spk+'44';ctx.strokeStyle=CL.spk;ctx.lineWidth=1.5;ctx.shadowColor=CL.spkG;ctx.shadowBlur=5;ctx.fillRect(sx,it.y,it.w,Math.min(it.h,H));ctx.strokeRect(sx,it.y,it.w,Math.min(it.h,H));ctx.shadowBlur=0}
        if(it.t==='saw'){ctx.fillStyle=CL.saw;ctx.shadowColor=CL.saw;ctx.shadowBlur=8;ctx.save();ctx.translate(sx+it.r,it.y+it.r);ctx.rotate(ts/180);ctx.beginPath();for(let i=0;i<8;i++){const a=(P2/8)*i,r2=i%2===0?it.r:it.r*0.55;ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2)};ctx.closePath();ctx.fill();ctx.restore();ctx.shadowBlur=0}
        if(it.t==='dia'&&!it.col){const dy=it.y+Math.sin(ts/350+it.x*0.01)*3;ctx.fillStyle=CL.dia;ctx.shadowColor=CL.dia;ctx.shadowBlur=10;ctx.save();ctx.translate(sx+7,dy+7);ctx.rotate(Math.PI/4);ctx.fillRect(-5,-5,10,10);ctx.restore();ctx.shadowBlur=0}
      }

      // Trail
      if(g.trail.length>1){
        if(g.mode==='wave'){ctx.strokeStyle=CL.wav;ctx.lineWidth=2.5;ctx.shadowColor=CL.wavG;ctx.shadowBlur=6;ctx.beginPath()
          for(let i=0;i<g.trail.length;i++){const t=g.trail[i];ctx.globalAlpha=t.a;if(i===0)ctx.moveTo(t.x,t.y);else ctx.lineTo(t.x,t.y)}
          ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha=1
        }else{for(const t of g.trail){ctx.globalAlpha=t.a;ctx.fillStyle=t.c;ctx.beginPath();ctx.arc(t.x,t.y,2,0,P2);ctx.fill()};ctx.globalAlpha=1}
      }

      // Player (visible in play, dying; hidden in dead after blink)
      const ph=phRef.current
      if(ph==='play'||ph==='winning'||(ph==='dying'&&g.dieT>15)){
        ctx.save();ctx.translate(g.px+PS/2,g.py+PS/2);ctx.rotate(g.rot)
        ctx.fillStyle=g.mode==='wave'?CL.wav:CL.ply;ctx.shadowColor=g.mode==='wave'?CL.wavG:CL.plyG;ctx.shadowBlur=14
        ctx.fillRect(-PS/2,-PS/2,PS,PS)
        ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillRect(-PS/2,-PS/2,PS,PS*0.3)
        ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.fillRect(-3,-2,3,3);ctx.fillRect(2,-2,3,3)
        ctx.restore()
      }

      // Particles & rings
      for(const pt of g.pts){const a=pt.l/pt.ml;ctx.globalAlpha=a;ctx.fillStyle=pt.c;ctx.shadowColor=pt.c;ctx.shadowBlur=3;ctx.beginPath();ctx.arc(pt.x,pt.y,pt.r*a,0,P2);ctx.fill()}
      ctx.shadowBlur=0;ctx.globalAlpha=1
      for(const r of g.rings){if(r.a<0.02)continue;ctx.globalAlpha=r.a;ctx.strokeStyle=r.c;ctx.lineWidth=r.lw||2;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,P2);ctx.stroke()}
      ctx.globalAlpha=1

      // HUD
      ctx.fillStyle='rgba(11,11,42,0.55)';ctx.fillRect(0,0,W,36)
      const bx=48,bw=W-130,bh=7,by=14,pr=Math.min(uPr/100,1)
      ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(bx,by,bw,bh)
      ctx.fillStyle=CL.ply;ctx.shadowColor=CL.plyG;ctx.shadowBlur=5;ctx.fillRect(bx,by,bw*pr,bh);ctx.shadowBlur=0
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bx+bw*pr,by+bh/2,4,0,P2);ctx.fill()
      ctx.fillStyle='rgba(255,255,255,0.6)';ctx.font="bold 9px 'Fredoka One',sans-serif";ctx.textAlign='center'
      ctx.fillText(`${uPr}%`,bx+bw/2,by+bh+11)
      ctx.textAlign='left';ctx.fillStyle=g.mode==='wave'?CL.wav:CL.ply;ctx.font="bold 10px 'Fredoka One',sans-serif"
      ctx.fillText(g.mode==='wave'?'~ WAVE':'□ CUBE',10,28)
      ctx.textAlign='right';ctx.fillStyle=CL.dia;ctx.font="bold 11px 'Fredoka One',sans-serif"
      ctx.fillText(`💎 ${uDi}`,W-10,15);ctx.fillStyle=CL.gnd;ctx.fillText(`Lv${g.lv} ×${g.att}`,W-10,30)

      // Overlays
      if(ph==='idle'){
        ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(0,0,W,H)
        const sc=0.92+Math.sin(ts/400)*0.08;ctx.save();ctx.translate(W/2,H*0.44);ctx.scale(sc,sc)
        ctx.fillStyle='#fff';ctx.shadowColor=CL.ply;ctx.shadowBlur=16;ctx.font="bold 22px 'Fredoka One',sans-serif";ctx.textAlign='center'
        ctx.fillText('TAP UNTUK MULAI',0,0);ctx.shadowBlur=4;ctx.fillStyle=CL.gnd;ctx.font="13px 'Fredoka One',sans-serif"
        ctx.fillText('💎 Neon Dash',0,26);ctx.shadowBlur=0;ctx.restore()
      }
      if(ph==='dead'){
        ctx.fillStyle='rgba(0,0,0,0.35)';ctx.fillRect(0,0,W,H)
        ctx.fillStyle=CL.spk;ctx.shadowColor=CL.spkG;ctx.shadowBlur=12
        ctx.font="bold 22px 'Fredoka One',sans-serif";ctx.textAlign='center'
        ctx.fillText('💥 CRASH!',W/2,H*0.38)
        ctx.shadowBlur=4;ctx.fillStyle='#fff';ctx.font="14px 'Fredoka One',sans-serif"
        ctx.fillText('Tap untuk retry',W/2,H*0.38+28)
        ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font="11px 'Fredoka One',sans-serif"
        ctx.fillText(`Attempt #${g.att}  •  ${uPr}%`,W/2,H*0.38+50)
        ctx.shadowBlur=0
      }
      if(ph==='winning'){
        ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(0,0,W,H)
        ctx.fillStyle=CL.dia;ctx.shadowColor=CL.dia;ctx.shadowBlur=15
        ctx.font="bold 26px 'Fredoka One',sans-serif";ctx.textAlign='center'
        ctx.fillText('✨ LEVEL CLEAR!',W/2,H*0.4)
        ctx.shadowBlur=0
      }

      ctx.restore()
    }catch(e){console.error('ND:',e)}
      aRef.current=requestAnimationFrame(loop)
    }
    aRef.current=requestAnimationFrame(loop)
    return()=>{cancelAnimationFrame(aRef.current);c.removeEventListener('mousedown',md);c.removeEventListener('mouseup',mu);window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku)}
  },[difficulty.id])

  const restart=()=>{const{w,h}=szC();gR.current=mkG(w,h);sp('idle');setSc(0);setLv(1);setPr(0);setDi('0/0');setAt(1);setShowConf(false)}
  const coinR=phase==='won'?({easy:20,medium:40,hard:65}[difficulty.id]||20)+Math.floor(uSc/150)+30:0
  const DL={easy:'🟢 Mudah',medium:'🟡 Sedang',hard:'🔴 Sulit'}

  return(
    <div style={{width:'100%',height:typeof CSS!=='undefined'&&CSS.supports('height','100dvh')?'100dvh':'100vh',background:CL.bg,position:'relative',overflow:'hidden',userSelect:'none',fontFamily:"'Fredoka One',cursive"}}>
      {showTut&&<TutorialModal steps={TUT} storageKey="bp_tut_neon-dash" onClose={()=>setShowTut(false)}/>}
      {showConf&&<Confetti/>}
      <div style={{position:'absolute',top:8,left:8,zIndex:20}}>
        <button onClick={onBack} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',borderRadius:10,padding:'7px 13px',fontSize:15,cursor:'pointer'}}>←</button>
      </div>
      <div style={{position:'absolute',inset:0,zIndex:1}}>
        <canvas ref={cRef} style={{width:'100%',height:'100%',display:'block',touchAction:'none'}}/>
      </div>
      {phase==='won'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:20,animation:'ndF 0.3s'}}>
          <div style={{background:'linear-gradient(180deg,#0d0d30,#1a1a3e)',borderRadius:28,padding:'36px 28px',textAlign:'center',maxWidth:380,width:'100%',boxShadow:`0 0 60px ${CL.ply}33`,animation:'ndP 0.45s cubic-bezier(0.34,1.56,0.64,1)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${CL.ply},${CL.gnd},${CL.dia})`}}/>
            <div style={{fontSize:52,marginBottom:8}}>🏆</div>
            <h2 style={{color:'#fff',fontSize:26,marginBottom:4}}>ALL CLEAR!</h2>
            <p style={{color:CL.gnd,fontSize:13,marginBottom:12}}>{dc.ml} level selesai!</p>
            <span style={{display:'inline-block',background:'rgba(162,155,254,0.15)',color:CL.gnd,padding:'4px 14px',borderRadius:100,fontSize:13,fontWeight:700,marginBottom:14}}>{DL[difficulty.id]}</span>
            <div style={{fontSize:30,marginBottom:12,letterSpacing:8}}>⭐⭐⭐</div>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(253,203,110,0.12)',border:'1.5px solid #FDCB6E44',borderRadius:100,padding:'6px 18px',marginBottom:16}}><span>🪙</span><span style={{color:'#F9A825',fontSize:16,fontWeight:800}}>+{coinR}</span></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:24}}>
              <div style={{background:`${CL.dia}10`,borderRadius:14,padding:'12px 8px'}}><div style={{fontSize:22,color:CL.dia}}>{uSc}</div><div style={{fontSize:10,color:'#888',marginTop:2}}>Skor</div></div>
              <div style={{background:`${CL.ply}10`,borderRadius:14,padding:'12px 8px'}}><div style={{fontSize:22,color:CL.ply}}>Lv {uLv}</div><div style={{fontSize:10,color:'#888',marginTop:2}}>Level</div></div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={restart} style={{flex:1,background:`linear-gradient(135deg,${CL.ply},${CL.gnd})`,color:'#fff',border:'none',borderRadius:100,padding:'13px 18px',fontSize:15,fontWeight:800,cursor:'pointer'}}>🔄 Main Lagi</button>
              <button onClick={onBack} style={{flex:1,background:'#1e2a4a',color:'#aaa',border:'2px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'13px 18px',fontSize:15,fontWeight:800,cursor:'pointer'}}>🎯 Ganti Level</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes ndF{from{opacity:0}to{opacity:1}}@keyframes ndP{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}
