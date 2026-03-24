import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
const TUT=[
  {emoji:'💎',title:'Neon Dash',desc:'Runner neon ala Geometry Dash! Terrain naik-turun, spikes, dan wave mode!',tip:'Mati = restart 0%. Hafalkan polanya!'},
  {emoji:'🟦',title:'Mode Cube',desc:'TAP/SPASI untuk lompat. Terrain berubah ketinggian — perhatikan jalurnya!',tip:'Lompat tepat waktu saat mendekati obstacle.'},
  {emoji:'🌊',title:'Mode Wave',desc:'TAHAN naik diagonal, LEPAS turun diagonal. Lewati celah sempit!',tip:'Smooth control, jangan panik!'},
  {emoji:'⭐',title:'Progress',desc:'Progress bar 0-100%. Kumpulkan 💎 untuk bonus. Mati = restart dari 0%!',tip:'Setiap attempt makin mudah — hafalkan polanya!'},
]
import{useEffect,useRef,useState}from'react'
import{useSound}from'../../hooks/useSound.js'
import{useProgress}from'../../context/ProgressContext.jsx'
import{useCoins}from'../../context/CoinContext.jsx'

const DC={
  easy:{spd:3.3,si:0.1,grav:0.55,jv:-9,ws:3.2,ml:6},
  medium:{spd:4,si:0.15,grav:0.65,jv:-9.6,ws:3.8,ml:10},
  hard:{spd:5,si:0.22,grav:0.75,jv:-10.2,ws:4.6,ml:14},
}
const CL={
  bg:'#1a0a3a',bg2:'#2d1b69',
  gnd:'#1a1a2e',gndLine:'#A29BFE',gndG:'#6C5CE7',
  ply:'#7dff3a',plyOut:'#2d8a08',plyEye:'#00F5FF',
  spk:'#ffffff',spkFill:'#1a1a2e',
  blk:'#1a1a2e',blkLine:'#ffffff',
  wav:'#FF6348',wavG:'#EE5A24',ptl:'#55EFC4',
  dia:'#ffffff',orb:'#ffffff',
}
const P2=Math.PI*2,PS=20,BLK=30 // player size, block size in pixels

// ═════════════════════════════════════════════════════════════
// LEVEL BUILDER — Terrain-based, GD style
// Commands: F(n)=flat, U(n)=step up, D(n)=step down,
// S=spike, B(w,h)=block, G(n)=gap, DI=diamond, P(m)=portal,
// W(gy,gh)=waveWall, PL(h)=pillar
// Ground height tracked as block units from bottom
// ═════════════════════════════════════════════════════════════
function buildLv(cmds,baseGndBlocks,canvasH){
  const items=[]; let x=300, gndH=baseGndBlocks // ground height in blocks
  const gndPx=()=>canvasH-gndH*BLK // ground Y in pixels

  for(const cmd of cmds){
    const c=cmd[0]
    switch(c){
      case 'F':{ // Flat ground n units
        const n=cmd[1]||3
        for(let i=0;i<n;i++){
          items.push({t:'ground',x:x+i*BLK,y:gndPx(),w:BLK,h:gndH*BLK})
        }
        x+=n*BLK; break
      }
      case 'U':{ // Step up n blocks (with ground blocks forming stairs)
        const n=cmd[1]||1
        for(let i=0;i<n;i++){
          gndH++
          items.push({t:'ground',x,y:gndPx(),w:BLK,h:gndH*BLK})
          x+=BLK
        }
        break
      }
      case 'D':{ // Step down n blocks
        const n=cmd[1]||1
        for(let i=0;i<n;i++){
          gndH=Math.max(1,gndH-1)
          items.push({t:'ground',x,y:gndPx(),w:BLK,h:gndH*BLK})
          x+=BLK
        }
        break
      }
      case 'S':{ // Spike on current ground
        items.push({t:'spike',x,y:gndPx(),w:BLK,h:BLK})
        x+=BLK; break
      }
      case 'SS':{ // Double spike
        items.push({t:'spike',x,y:gndPx(),w:BLK,h:BLK})
        items.push({t:'spike',x:x+BLK,y:gndPx(),w:BLK,h:BLK})
        x+=BLK*2; break
      }
      case 'B':{ // Block obstacle (w,h in block units)
        const bw=(cmd[1]||1)*BLK, bh=(cmd[2]||1)*BLK
        items.push({t:'block',x,y:gndPx()-bh,w:bw,h:bh})
        // Ground under block
        items.push({t:'ground',x,y:gndPx(),w:bw,h:gndH*BLK})
        x+=bw; break
      }
      case 'BS':{ // Block with spike on top
        const bw=(cmd[1]||1)*BLK, bh=(cmd[2]||1)*BLK
        items.push({t:'block',x,y:gndPx()-bh,w:bw,h:bh})
        items.push({t:'spike',x,y:gndPx()-bh,w:BLK,h:BLK})
        items.push({t:'ground',x,y:gndPx(),w:bw,h:gndH*BLK})
        x+=bw; break
      }
      case 'PL':{ // Tall pillar (h blocks), with grid texture
        const h=(cmd[1]||3)*BLK
        items.push({t:'pillar',x,y:gndPx()-h,w:BLK,h})
        items.push({t:'ground',x,y:gndPx(),w:BLK,h:gndH*BLK})
        x+=BLK; break
      }
      case 'G':{ // Gap (no ground)
        const n=cmd[1]||2
        x+=n*BLK; break
      }
      case 'DI':{ // Diamond
        items.push({t:'dia',x,y:gndPx()-BLK*2,col:false})
        x+=BLK; break
      }
      case 'ORB':{ // Orb (collectible circle)
        items.push({t:'orb',x,y:gndPx()-BLK*1.5})
        x+=BLK; break
      }
      case 'P':{ // Portal
        items.push({t:'portal',x,y:gndPx()-BLK*2,w:BLK,h:BLK*2,mode:cmd[1]})
        x+=BLK; break
      }
      case 'W':{ // Wave wall
        items.push({t:'wtop',x,y:0,w:18,h:cmd[1]},{t:'wbot',x,y:cmd[1]+cmd[2],w:18,h:400})
        x+=BLK*1.5; break
      }
      case 'PAD':{ // Jump pad (auto jump)
        items.push({t:'pad',x,y:gndPx(),w:BLK,h:8})
        items.push({t:'ground',x,y:gndPx(),w:BLK,h:gndH*BLK})
        x+=BLK; break
      }
      case '_':{ // Spacer
        const n=cmd[1]||1
        // Add ground during spacer
        for(let i=0;i<n;i++){
          items.push({t:'ground',x:x+i*BLK,y:gndPx(),w:BLK,h:gndH*BLK})
        }
        x+=n*BLK; break
      }
    }
  }
  // Finish + trailing ground
  for(let i=0;i<6;i++) items.push({t:'ground',x:x+i*BLK,y:gndPx(),w:BLK,h:gndH*BLK})
  x+=6*BLK
  items.push({t:'end',x})
  return{items,len:x,nd:items.filter(i=>i.t==='dia').length}
}

// ═════════════════════════════════════════════════════════════
// LEVEL DEFINITIONS — GD-style with terrain changes
// ═════════════════════════════════════════════════════════════
const LVS=[
  // Lv1: Tutorial — flat with simple jumps
  [['F',8],['DI'],['F',2],['S'],['F',3],['DI'],['F',2],['S'],['F',2],['S'],['F',3],['DI'],['F',4]],

  // Lv2: Intro blocks + small steps (EASY!)
  [['F',5],['DI'],['F',2],['S'],['F',3],['B',1,1],['F',3],['DI'],['S'],['F',3],['U',1],['F',3],['DI'],['D',1],['F',3],['S'],['F',4]],

  // Lv3: Steps up and down
  [['F',4],['S'],['F',2],['U',1],['F',2],['U',1],['DI'],['F',2],['S'],['D',1],['F',2],['D',1],['F',2],['DI'],['S'],['F',2],['B',1,2],['F',3],['U',2],['F',2],['D',2],['F',4]],

  // Lv4: Taller blocks + gaps
  [['F',4],['S'],['F',2],['B',1,2],['DI'],['F',3],['S'],['S'],['F',2],['U',2],['F',2],['DI'],['D',2],['F',2],['G',2],['F',3],['S'],['F',2],['B',1,1],['F',3],['DI'],['F',3]],

  // Lv5: Wave intro + steps
  [['F',4],['S'],['F',2],['U',1],['F',2],['DI'],['D',1],['S'],['F',3],['P','wave'],['W',80,55],['W',100,55],['DI'],['W',70,55],['W',95,55],['P','cube'],['F',3],['S'],['F',2],['B',1,1],['DI'],['F',4]],

  // Lv6: Staircase challenge
  [['F',3],['S'],['F',1],['U',1],['S'],['U',1],['F',1],['U',1],['DI'],['F',2],['D',1],['S'],['D',1],['D',1],['F',2],['S'],['S'],['F',2],['U',2],['F',1],['DI'],['S'],['D',2],['F',2],['B',2,2],['F',3],['DI'],['F',3]],

  // Lv7: Pillar + gap combo
  [['F',3],['S'],['S'],['F',2],['PL',3],['DI'],['F',2],['G',2],['F',2],['S'],['F',1],['U',2],['F',2],['DI'],['D',2],['F',1],['PL',2],['F',2],['S'],['S'],['F',2],['B',1,2],['DI'],['F',3]],

  // Lv8: Long wave section
  [['F',3],['S'],['F',2],['U',1],['DI'],['D',1],['F',2],['P','wave'],['W',85,50],['W',60,50],['W',95,48],['DI'],['W',55,48],['W',80,48],['W',70,45],['DI'],['P','cube'],['F',3],['S'],['S'],['F',2],['U',1],['F',2],['D',1],['DI'],['F',3]],

  // Lv9: Mixed hard
  [['F',3],['S'],['F',1],['B',1,2],['DI'],['F',2],['U',1],['S'],['U',1],['F',2],['DI'],['D',2],['G',2],['F',2],['PL',3],['F',1],['S'],['S'],['F',2],['P','wave'],['W',75,42],['W',55,42],['W',90,42],['DI'],['W',60,42],['P','cube'],['F',2],['S'],['F',3]],

  // Lv10: Intense
  [['F',2],['S'],['S'],['F',1],['U',1],['S'],['U',1],['DI'],['F',1],['D',1],['D',1],['S'],['F',1],['B',2,3],['F',2],['G',2],['F',1],['DI'],['U',2],['S'],['F',2],['D',2],['F',1],['PL',4],['S'],['S'],['F',2],['DI'],['F',2],['P','wave'],['W',70,38],['W',90,38],['W',50,38],['W',80,36],['DI'],['P','cube'],['F',3]],

  // Lv11-14: Progressively harder
  [['F',2],['S'],['S'],['S'],['F',1],['U',2],['DI'],['S'],['D',1],['D',1],['F',1],['B',1,3],['G',2],['F',2],['U',1],['S'],['U',1],['S'],['DI'],['D',2],['F',1],['PL',3],['S'],['F',2],['P','wave'],['W',65,36],['W',85,36],['W',50,36],['DI'],['W',75,34],['P','cube'],['S'],['S'],['F',3]],
  [['F',2],['S'],['S'],['U',1],['S'],['U',1],['U',1],['DI'],['D',1],['S'],['D',1],['D',1],['B',2,3],['G',2],['F',1],['S'],['U',2],['F',1],['DI'],['S'],['D',2],['PL',4],['S'],['P','wave'],['W',60,34],['W',80,34],['W',45,32],['W',70,32],['DI'],['W',55,32],['P','cube'],['S'],['S'],['S'],['F',3]],
  [['F',1],['S'],['S'],['S'],['U',1],['S'],['U',1],['S'],['U',1],['DI'],['D',1],['D',1],['S'],['D',1],['B',1,3],['G',2],['F',1],['U',2],['S'],['S'],['DI'],['D',2],['PL',4],['G',2],['F',1],['P','wave'],['W',55,30],['W',75,30],['W',42,28],['W',65,28],['DI'],['W',50,28],['P','cube'],['S'],['S'],['S'],['S'],['F',3]],
  [['S'],['S'],['S'],['U',1],['S'],['U',1],['S'],['U',1],['S'],['DI'],['D',1],['S'],['D',1],['S'],['D',1],['B',2,4],['G',3],['F',1],['U',3],['S'],['S'],['DI'],['D',3],['PL',5],['G',2],['P','wave'],['W',50,28],['W',70,28],['W',40,26],['W',60,26],['W',45,26],['DI'],['W',65,24],['P','cube'],['S'],['S'],['S'],['S'],['S'],['F',3]],
]

// ═════════════════════════════════════════════════════════════
// BG rectangles (parallax, like GD)
// ═════════════════════════════════════════════════════════════
function mkBgRects(W,H){
  const rects=[]
  for(let i=0;i<12;i++){
    rects.push({x:Math.random()*W*3,y:Math.random()*H*0.8,w:60+Math.random()*200,h:40+Math.random()*150,a:0.04+Math.random()*0.06,spd:0.15+Math.random()*0.2})
  }
  return rects
}

// ═════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════
export default function NeonDash({onBack,game,difficulty}){
  const cRef=useRef(null),aRef=useRef(null),gR=useRef(null),phR=useRef('idle')
  const{play}=useSound(),{reportGameResult}=useProgress(),{earnCoins}=useCoins()
  const dc=DC[difficulty.id]
  const[phase,_sp]=useState('idle')
  const[showTut,setShowTut]=useState(()=>!localStorage.getItem('bp_tut_neon-dash'))
  const[showConf,setShowConf]=useState(false)
  const[uSc,sSc]=useState(0),[uLv,sLv]=useState(1),[uPr,sPr]=useState(0),[uDi,sDi]=useState('0/0'),[uAt,sAt]=useState(1)
  const sp=p=>{phR.current=p;_sp(p)}

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
    const baseBlocks=Math.floor(H*0.22/BLK) // ground = ~22% of screen height in blocks
    return{W,H,lv:1,sc:0,att:1,baseBlk:baseBlocks,
      lvD:buildLv(LVS[0],baseBlocks,H),
      px:70,py:H-baseBlocks*BLK-PS,vy:0,gnd:true,mode:'cube',rot:0,hold:false,
      cam:0,spd:dc.spd,cd:0,
      dieT:0,winT:0,
      pts:[],rings:[],trail:[],shk:0,gridOff:0,
      bgR:mkBgRects(W,H)}
  }

  useEffect(()=>{
    const{w:W,h:H}=szC()
    const c=cRef.current;if(!c)return
    const ctx=c.getContext('2d')
    let g=mkG(W,H);gR.current=g
    sSc(0);sLv(1);sPr(0);sDi('0/0');sAt(1)

    function onDown(){
      const p=phR.current
      if(p==='idle'){stLv();return}
      if(p==='dead'){retry();return}
      if(p!=='play')return
      g.hold=true
      if(g.mode==='cube'&&g.gnd){g.vy=dc.jv;g.gnd=false;try{play('flip')}catch(e){}}
    }
    function onUp(){g.hold=false}
    const md=()=>onDown(),mu=()=>onUp()
    c.addEventListener('mousedown',md);c.addEventListener('mouseup',mu)
    c.addEventListener('touchstart',e=>{e.preventDefault();onDown()},{passive:false})
    c.addEventListener('touchend',e=>{e.preventDefault();onUp()},{passive:false})
    const kd=e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();onDown()}}
    const ku=e=>{if(e.code==='Space'||e.code==='ArrowUp')onUp()}
    window.addEventListener('keydown',kd);window.addEventListener('keyup',ku)

    function stLv(){
      g.lvD=buildLv(LVS[Math.min(g.lv-1,LVS.length-1)],g.baseBlk,H)
      g.cam=0;g.cd=0;g.spd=dc.spd+(g.lv-1)*dc.si
      g.px=70;g.py=H-g.baseBlk*BLK-PS;g.vy=0;g.gnd=true
      g.mode='cube';g.rot=0;g.hold=false
      g.dieT=0;g.winT=0;g.trail=[];g.pts=[];g.rings=[]
      sp('play')
    }
    function retry(){
      g.att++;sAt(g.att)
      for(const it of g.lvD.items)if(it.t==='dia')it.col=false
      g.cam=0;g.cd=0;g.px=70;g.py=H-g.baseBlk*BLK-PS;g.vy=0;g.gnd=true
      g.mode='cube';g.rot=0;g.hold=false;g.dieT=0;g.winT=0
      g.trail=[];g.pts=[];g.rings=[]
      sp('play')
    }
    function doDie(){
      sp('dying');g.dieT=35;g.shk=14
      const cx=g.px+PS/2,cy=g.py+PS/2
      for(let i=0;i<16;i++){const a=P2*Math.random(),s=1.5+Math.random()*5
        g.pts.push({x:cx,y:cy,dx:Math.cos(a)*s,dy:Math.sin(a)*s,l:20+Math.random()*25,ml:45,r:2+Math.random()*4,c:CL.ply})}
      g.rings.push({x:cx,y:cy,r:5,mr:90,a:1,c:'#fff',lw:3})
      try{play('mismatch')}catch(e){}
    }
    function doWin(){
      sp('winning');g.winT=60
      const dr=g.lvD.nd>0?g.cd/g.lvD.nd:1
      const pts=Math.round(250+g.lv*50+dr*350+Math.max(0,200-(g.att-1)*25))
      g.sc+=pts;sSc(g.sc)
      const cx=g.px+PS/2,cy=g.py+PS/2
      for(let i=0;i<20;i++){const a=P2*Math.random(),s=2+Math.random()*6
        g.pts.push({x:cx,y:cy,dx:Math.cos(a)*s,dy:Math.sin(a)*s,l:25+Math.random()*30,ml:55,r:3+Math.random()*5,c:['#fff',CL.dia,CL.ply,CL.gndLine][i%4]})}
      try{play('win')}catch(e){}
    }
    function finG(won){
      const st=won?3:g.lv>dc.ml/2?2:g.lv>2?1:0
      let co=({easy:20,medium:40,hard:65}[difficulty.id]||20)+Math.floor(g.sc/150);if(st===3)co+=30
      if(!won)co=Math.max(5,Math.floor(g.sc/200))
      earnCoins(co,`Neon Dash (${difficulty.id})`)
      reportGameResult({gameId:'neon-dash',difficultyId:difficulty.id,won,score:g.sc,stars:Math.max(st,won?1:0),timeSec:0})
      const bk=`neon-dash-best-${difficulty.id}`,pv=parseInt(localStorage.getItem(bk)||'0')
      if(g.sc>pv)localStorage.setItem(bk,g.sc)
    }

    // ══════════ GAME LOOP ══════════
    let lt=0,fc=0
    function loop(ts){try{
      const dt=Math.min((ts-lt)/16.667,2.5);lt=ts;fc++
      const p=phR.current

      // VFX
      for(let i=g.pts.length-1;i>=0;i--){const pt=g.pts[i];pt.x+=pt.dx*dt;pt.y+=pt.dy*dt;pt.dy+=0.05*dt;pt.l-=dt;if(pt.l<=0)g.pts.splice(i,1)}
      for(let i=g.rings.length-1;i>=0;i--){const r=g.rings[i];r.r+=3*dt;r.a*=0.94;if(r.a<0.02||r.r>=r.mr)g.rings.splice(i,1)}
      while(g.trail.length>80)g.trail.shift()
      for(let i=g.trail.length-1;i>=0;i--){g.trail[i].a-=0.02*dt;if(g.trail[i].a<=0)g.trail.splice(i,1)}
      if(g.shk>0){g.shk*=0.91;if(g.shk<0.3)g.shk=0}

      if(p==='dying'){g.dieT-=dt;if(g.dieT<=0)sp('dead')}
      if(p==='winning'){g.winT-=dt;if(g.winT<=0){
        if(g.lv>=dc.ml){sp('won');setShowConf(true);finG(true)}
        else{g.lv++;g.att=1;sLv(g.lv);sAt(1);stLv()}
      }}

      if(p==='play'){
        g.spd=Math.min(dc.spd+(g.lv-1)*dc.si+g.cam*0.00012,dc.spd*1.7)
        const spd=g.spd*dt;g.cam+=spd;g.gridOff=(g.gridOff+spd)%BLK

        const wx=g.px+g.cam
        if(fc%2===0)g.trail.push({x:g.px+PS/2,y:g.py+PS/2,a:g.mode==='wave'?0.6:0.3,c:g.mode==='wave'?CL.wav:CL.ply})

        if(g.mode==='cube'){
          g.vy+=dc.grav*dt;g.py+=g.vy*dt
          if(!g.gnd)g.rot+=0.07*dt
          else g.rot=Math.round(g.rot/(Math.PI/2))*(Math.PI/2)

          // Land on ground blocks, blocks, pillars
          g.gnd=false
          if(g.vy>=0){ // only check when falling
            for(const it of g.lvD.items){
              if(it.t!=='ground'&&it.t!=='block'&&it.t!=='pillar')continue
              const sx=it.x-g.cam
              // Check if player is above this surface and falling onto it
              const top=it.t==='ground'?it.y:(it.y)
              if(g.px+PS>sx+2&&g.px<sx+it.w-2&&g.py+PS>=top&&g.py+PS<=top+g.vy*dt+8){
                g.py=top-PS;g.vy=0;g.gnd=true;break
              }
            }
          }
          if(g.py>H+60){doDie();/* fall death */}
        }else{
          const ws=dc.ws*dt
          if(g.hold){g.py-=ws;g.rot=-0.35}else{g.py+=ws;g.rot=0.35}
          g.py=Math.max(8,Math.min(g.py,H-PS-10))
        }

        // Collision
        if(phR.current==='play'){
          const p1=g.px+3,q1=g.py+3,p2=g.px+PS-3,q2=g.py+PS-3
          let died=false
          for(const it of g.lvD.items){
            const sx=it.x-g.cam
            if(sx<-80||sx>W+80)continue
            if(it.t==='spike'){
              // Triangle: narrow hitbox
              const triL=sx+it.w*0.15,triR=sx+it.w*0.85,triTop=it.y-it.h*0.8
              if(p2>triL&&p1<triR&&q2>triTop&&q1<it.y){died=true;break}
            }
            if(it.t==='block'||it.t==='pillar'){
              // Side collision (not top — top is for landing)
              if(p2>sx+2&&p1<sx+it.w-2&&q2>it.y+4&&q1<it.y+it.h-2){
                // Check if we're not on top
                if(g.py+PS>it.y+4){died=true;break}
              }
            }
            if((it.t==='wtop'||it.t==='wbot')&&g.mode==='wave'){
              if(p2>sx&&p1<sx+it.w&&q2>it.y&&q1<it.y+it.h){died=true;break}
            }
            if(it.t==='pad'&&g.gnd&&g.px+PS>sx&&g.px<sx+it.w&&Math.abs(g.py+PS-it.y)<8){
              g.vy=dc.jv*1.4;g.gnd=false // super jump!
              g.rings.push({x:sx+it.w/2,y:it.y,r:3,mr:40,a:0.6,c:CL.ptl,lw:2})
            }
            if(it.t==='dia'&&!it.col){
              if(Math.abs((g.px+PS/2)-(sx+10))<20&&Math.abs((g.py+PS/2)-(it.y+10))<20){
                it.col=true;g.cd++;g.sc+=30;sSc(g.sc)
                g.pts.push({x:sx+10,y:it.y+10,dx:0,dy:-1.5,l:18,ml:18,r:5,c:CL.dia})
                try{play('match')}catch(e){}
              }
            }
            if(it.t==='portal'&&wx>it.x&&wx<it.x+it.w+5&&g.mode!==it.mode){
              g.mode=it.mode;g.rings.push({x:g.px+PS/2,y:g.py+PS/2,r:4,mr:50,a:0.7,c:CL.ptl,lw:2})
              if(it.mode==='wave'){g.vy=0;g.gnd=false}
            }
            if(it.t==='end'&&wx>=it.x){doWin();break}
          }
          if(died&&phR.current==='play')doDie()
        }
        sPr(Math.round(Math.min(g.cam/g.lvD.len,1)*100))
        sDi(`${g.cd}/${g.lvD.nd}`)
      }

      // ══════════ DRAW ══════════
      const shx=g.shk>0?(Math.random()-0.5)*g.shk*2:0
      const shy=g.shk>0?(Math.random()-0.5)*g.shk*2:0
      ctx.save();ctx.translate(shx,shy)

      // BG gradient (purple like GD)
      const bg=ctx.createLinearGradient(0,0,0,H)
      bg.addColorStop(0,'#2d1b69');bg.addColorStop(1,'#1a0a3a')
      ctx.fillStyle=bg;ctx.fillRect(0,0,W,H)

      // BG parallax rectangles
      ctx.strokeStyle='rgba(162,155,254,0.08)';ctx.lineWidth=2
      for(const r of g.bgR){
        const rx=(r.x-g.cam*r.spd)%(W+r.w+200)-r.w
        ctx.strokeRect(rx,r.y,r.w,r.h)
        ctx.fillStyle=`rgba(162,155,254,${r.a})`;ctx.fillRect(rx,r.y,r.w,r.h)
      }

      // Scrolling grid (subtle)
      ctx.strokeStyle=CL.grd;ctx.lineWidth=0.5
      for(let x=-(g.gridOff||0);x<W+BLK;x+=BLK){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
      for(let y=0;y<H;y+=BLK){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}

      // ── Items ──
      for(const it of g.lvD.items){
        const sx=it.x-g.cam
        if(sx<-it.w-20||sx>W+60)continue

        if(it.t==='ground'){
          // Dark block with grid lines (GD style)
          ctx.fillStyle=CL.gnd;ctx.fillRect(sx,it.y,it.w,it.h)
          // Grid lines inside ground block
          ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=0.5
          for(let gy=it.y;gy<it.y+it.h;gy+=BLK){ctx.beginPath();ctx.moveTo(sx,gy);ctx.lineTo(sx+it.w,gy);ctx.stroke()}
          // Top edge glow
          ctx.strokeStyle=CL.gndLine;ctx.lineWidth=2;ctx.shadowColor=CL.gndG;ctx.shadowBlur=8
          ctx.beginPath();ctx.moveTo(sx,it.y);ctx.lineTo(sx+it.w,it.y);ctx.stroke();ctx.shadowBlur=0
          // Side edges
          ctx.strokeStyle='rgba(162,155,254,0.3)';ctx.lineWidth=1
          ctx.strokeRect(sx,it.y,it.w,it.h)
        }
        if(it.t==='spike'){
          // White outlined triangle with dark fill (like GD!)
          ctx.fillStyle=CL.spkFill
          ctx.strokeStyle=CL.spk;ctx.lineWidth=2;ctx.shadowColor='#fff';ctx.shadowBlur=6
          ctx.beginPath();ctx.moveTo(sx,it.y);ctx.lineTo(sx+it.w/2,it.y-it.h);ctx.lineTo(sx+it.w,it.y);ctx.closePath()
          ctx.fill();ctx.stroke();ctx.shadowBlur=0
        }
        if(it.t==='block'){
          // Dark block with white outline and grid (GD style)
          ctx.fillStyle=CL.blk;ctx.fillRect(sx,it.y,it.w,it.h)
          ctx.strokeStyle=CL.blkLine;ctx.lineWidth=2;ctx.shadowColor='#fff';ctx.shadowBlur=4
          ctx.strokeRect(sx,it.y,it.w,it.h);ctx.shadowBlur=0
          // Grid inside
          ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=0.5
          for(let gy=it.y+BLK;gy<it.y+it.h;gy+=BLK){ctx.beginPath();ctx.moveTo(sx,gy);ctx.lineTo(sx+it.w,gy);ctx.stroke()}
          for(let gx=sx+BLK;gx<sx+it.w;gx+=BLK){ctx.beginPath();ctx.moveTo(gx,it.y);ctx.lineTo(gx,it.y+it.h);ctx.stroke()}
        }
        if(it.t==='pillar'){
          ctx.fillStyle=CL.blk;ctx.fillRect(sx,it.y,it.w,it.h)
          ctx.strokeStyle=CL.blkLine;ctx.lineWidth=2;ctx.shadowColor='#fff';ctx.shadowBlur=4
          ctx.strokeRect(sx,it.y,it.w,it.h);ctx.shadowBlur=0
          for(let gy=it.y+BLK;gy<it.y+it.h;gy+=BLK){ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(sx,gy);ctx.lineTo(sx+it.w,gy);ctx.stroke()}
        }
        if(it.t==='portal'){const pc=it.mode==='wave'?CL.wav:CL.ptl;ctx.strokeStyle=pc;ctx.lineWidth=3;ctx.shadowColor=pc;ctx.shadowBlur=14;ctx.strokeRect(sx,it.y,it.w,it.h);ctx.fillStyle=pc+'22';ctx.fillRect(sx,it.y,it.w,it.h);ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.font="bold 14px sans-serif";ctx.textAlign='center';ctx.fillText(it.mode==='wave'?'~':'□',sx+it.w/2,it.y+it.h/2+5)}
        if(it.t==='wtop'||it.t==='wbot'){ctx.fillStyle='rgba(255,107,157,0.3)';ctx.strokeStyle=CL.spk;ctx.lineWidth=1.5;ctx.shadowColor='#fff';ctx.shadowBlur=4;ctx.fillRect(sx,it.y,it.w,Math.min(it.h,H));ctx.strokeRect(sx,it.y,it.w,Math.min(it.h,H));ctx.shadowBlur=0}
        if(it.t==='pad'){ctx.fillStyle=CL.ptl;ctx.shadowColor=CL.ptl;ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(sx,it.y);ctx.lineTo(sx+it.w/2,it.y-8);ctx.lineTo(sx+it.w,it.y);ctx.closePath();ctx.fill();ctx.shadowBlur=0}
        if(it.t==='dia'&&!it.col){const dy=it.y+Math.sin(ts/350+it.x*0.01)*3;ctx.fillStyle='#fff';ctx.shadowColor='#fff';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(sx+10,dy+10,6,0,P2);ctx.fill();ctx.shadowBlur=0}
      }

      // Trail
      if(g.trail.length>1){
        if(g.mode==='wave'){ctx.strokeStyle=CL.wav;ctx.lineWidth=2.5;ctx.shadowColor=CL.wavG;ctx.shadowBlur=6;ctx.beginPath()
          for(let i=0;i<g.trail.length;i++){const t=g.trail[i];ctx.globalAlpha=t.a;if(i===0)ctx.moveTo(t.x,t.y);else ctx.lineTo(t.x,t.y)}
          ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha=1
        }else{for(const t of g.trail){ctx.globalAlpha=t.a*0.5;ctx.fillStyle=t.c;ctx.fillRect(t.x-2,t.y-2,4,4)};ctx.globalAlpha=1}
      }

      // Player (green cube with dark outline, like GD!)
      const ph=phR.current
      if(ph==='play'||ph==='winning'||(ph==='dying'&&g.dieT>15)){
        ctx.save();ctx.translate(g.px+PS/2,g.py+PS/2);ctx.rotate(g.rot)
        // Outer dark square
        ctx.fillStyle=CL.plyOut;ctx.fillRect(-PS/2-2,-PS/2-2,PS+4,PS+4)
        // Inner bright square
        ctx.fillStyle=CL.ply;ctx.shadowColor=CL.ply;ctx.shadowBlur=10
        ctx.fillRect(-PS/2,-PS/2,PS,PS)
        ctx.shadowBlur=0
        // White outline
        ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.strokeRect(-PS/2,-PS/2,PS,PS)
        // Eye
        ctx.fillStyle=CL.plyEye;ctx.fillRect(1,-3,5,5)
        ctx.restore()
      }

      // Particles & rings
      for(const pt of g.pts){const a=pt.l/pt.ml;ctx.globalAlpha=a;ctx.fillStyle=pt.c;ctx.shadowColor=pt.c;ctx.shadowBlur=3;ctx.beginPath();ctx.arc(pt.x,pt.y,pt.r*a,0,P2);ctx.fill()}
      ctx.shadowBlur=0;ctx.globalAlpha=1
      for(const r of g.rings){if(r.a<0.02)continue;ctx.globalAlpha=r.a;ctx.strokeStyle=r.c;ctx.lineWidth=r.lw||2;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,P2);ctx.stroke()}
      ctx.globalAlpha=1

      // HUD
      ctx.fillStyle='rgba(11,11,42,0.5)';ctx.fillRect(0,0,W,34)
      const bx=48,bw=W-130,bh=6,by=13,pr=Math.min(uPr/100,1)
      ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(bx,by,bw,bh)
      ctx.fillStyle=CL.gndLine;ctx.shadowColor=CL.gndG;ctx.shadowBlur=4;ctx.fillRect(bx,by,bw*pr,bh);ctx.shadowBlur=0
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bx+bw*pr,by+bh/2,4,0,P2);ctx.fill()
      ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font="bold 9px 'Fredoka One',sans-serif";ctx.textAlign='center';ctx.fillText(`${uPr}%`,bx+bw/2,by+bh+10)
      ctx.textAlign='left';ctx.fillStyle=g.mode==='wave'?CL.wav:CL.ply;ctx.font="bold 10px 'Fredoka One',sans-serif";ctx.fillText(g.mode==='wave'?'~ WAVE':'□ CUBE',10,26)
      ctx.textAlign='right';ctx.font="bold 11px 'Fredoka One',sans-serif";ctx.fillStyle='#fff';ctx.fillText(`💎 ${uDi}`,W-10,14);ctx.fillStyle=CL.gndLine;ctx.fillText(`Lv${g.lv} ×${g.att}`,W-10,28)

      // Overlays
      if(ph==='idle'){ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(0,0,W,H);const sc=0.92+Math.sin(ts/400)*0.08;ctx.save();ctx.translate(W/2,H*0.42);ctx.scale(sc,sc);ctx.fillStyle='#fff';ctx.shadowColor=CL.gndLine;ctx.shadowBlur=16;ctx.font="bold 22px 'Fredoka One',sans-serif";ctx.textAlign='center';ctx.fillText('TAP UNTUK MULAI',0,0);ctx.shadowBlur=4;ctx.fillStyle=CL.gndLine;ctx.font="13px 'Fredoka One',sans-serif";ctx.fillText('💎 Neon Dash',0,26);ctx.shadowBlur=0;ctx.restore()}
      if(ph==='dead'){ctx.fillStyle='rgba(0,0,0,0.35)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.shadowColor='#fff';ctx.shadowBlur=12;ctx.font="bold 22px 'Fredoka One',sans-serif";ctx.textAlign='center';ctx.fillText('💥 CRASH!',W/2,H*0.38);ctx.shadowBlur=4;ctx.font="14px 'Fredoka One',sans-serif";ctx.fillText('Tap untuk retry',W/2,H*0.38+28);ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font="11px 'Fredoka One',sans-serif";ctx.fillText(`Attempt #${g.att}  •  ${uPr}%`,W/2,H*0.38+50);ctx.shadowBlur=0}
      if(ph==='winning'){ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(0,0,W,H);ctx.fillStyle=CL.gndLine;ctx.shadowColor=CL.gndLine;ctx.shadowBlur=15;ctx.font="bold 26px 'Fredoka One',sans-serif";ctx.textAlign='center';ctx.fillText('✨ LEVEL CLEAR!',W/2,H*0.4);ctx.shadowBlur=0}

      ctx.restore()
    }catch(e){console.error('ND:',e)}
      aRef.current=requestAnimationFrame(loop)
    }
    aRef.current=requestAnimationFrame(loop)
    return()=>{cancelAnimationFrame(aRef.current);c.removeEventListener('mousedown',md);c.removeEventListener('mouseup',mu);window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku)}
  },[difficulty.id])

  const restart=()=>{const{w,h}=szC();const ng=mkG(w,h);gR.current=ng;sp('idle');sSc(0);sLv(1);sPr(0);sDi('0/0');sAt(1);setShowConf(false)}
  const coinR=phase==='won'?({easy:20,medium:40,hard:65}[difficulty.id]||20)+Math.floor(uSc/150)+30:0
  const DL={easy:'🟢 Mudah',medium:'🟡 Sedang',hard:'🔴 Sulit'}

  return(
    <div style={{width:'100%',height:typeof CSS!=='undefined'&&CSS.supports('height','100dvh')?'100dvh':'100vh',background:CL.bg,position:'relative',overflow:'hidden',userSelect:'none',fontFamily:"'Fredoka One',cursive"}}>
      {showTut&&<TutorialModal steps={TUT} storageKey="bp_tut_neon-dash" onClose={()=>setShowTut(false)}/>}
      {showConf&&<Confetti/>}
      <div style={{position:'absolute',top:8,left:8,zIndex:20}}><button onClick={onBack} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',borderRadius:10,padding:'7px 13px',fontSize:15,cursor:'pointer'}}>←</button></div>
      <div style={{position:'absolute',inset:0,zIndex:1}}><canvas ref={cRef} style={{width:'100%',height:'100%',display:'block',touchAction:'none'}}/></div>
      {phase==='won'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:20,animation:'ndF 0.3s'}}>
          <div style={{background:'linear-gradient(180deg,#1a0a3a,#2d1b69)',borderRadius:28,padding:'36px 28px',textAlign:'center',maxWidth:380,width:'100%',boxShadow:'0 0 60px rgba(162,155,254,0.3)',animation:'ndP 0.45s cubic-bezier(0.34,1.56,0.64,1)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:'linear-gradient(90deg,#A29BFE,#FFD700,#00F5FF)'}}/>
            <div style={{fontSize:52,marginBottom:8}}>🏆</div><h2 style={{color:'#fff',fontSize:26,marginBottom:4}}>ALL CLEAR!</h2>
            <p style={{color:CL.gndLine,fontSize:13,marginBottom:12}}>{dc.ml} level selesai!</p>
            <span style={{display:'inline-block',background:'rgba(162,155,254,0.15)',color:CL.gndLine,padding:'4px 14px',borderRadius:100,fontSize:13,fontWeight:700,marginBottom:14}}>{DL[difficulty.id]}</span>
            <div style={{fontSize:30,marginBottom:12,letterSpacing:8}}>⭐⭐⭐</div>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(253,203,110,0.12)',border:'1.5px solid #FDCB6E44',borderRadius:100,padding:'6px 18px',marginBottom:16}}><span>🪙</span><span style={{color:'#F9A825',fontSize:16,fontWeight:800}}>+{coinR}</span></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:24}}>
              <div style={{background:'rgba(255,215,0,0.06)',borderRadius:14,padding:'12px 8px'}}><div style={{fontSize:22,color:CL.dia}}>{uSc}</div><div style={{fontSize:10,color:'#888',marginTop:2}}>Skor</div></div>
              <div style={{background:'rgba(162,155,254,0.06)',borderRadius:14,padding:'12px 8px'}}><div style={{fontSize:22,color:CL.gndLine}}>Lv {uLv}</div><div style={{fontSize:10,color:'#888',marginTop:2}}>Level</div></div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={restart} style={{flex:1,background:'linear-gradient(135deg,#A29BFE,#6C5CE7)',color:'#fff',border:'none',borderRadius:100,padding:'13px 18px',fontSize:15,fontWeight:800,cursor:'pointer'}}>🔄 Main Lagi</button>
              <button onClick={onBack} style={{flex:1,background:'#1a1a3e',color:'#aaa',border:'2px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'13px 18px',fontSize:15,fontWeight:800,cursor:'pointer'}}>🎯 Ganti Level</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes ndF{from{opacity:0}to{opacity:1}}@keyframes ndP{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}
