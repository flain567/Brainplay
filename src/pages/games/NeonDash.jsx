import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
const TUT=[
  {emoji:'💎',title:'Neon Dash',desc:'Runner neon ala Geometry Dash! Lompat obstacle dan terbang kumpulkan diamond!',tip:'Mati = restart 0%. Hafalkan polanya!'},
  {emoji:'🟦',title:'Mode Cube',desc:'TAP / SPASI = lompat. Hindari spike dan block. Timing!',tip:'Lompat tepat waktu, jangan spam.'},
  {emoji:'🌊',title:'Mode Wave',desc:'TAHAN = terbang naik, LEPAS = turun. Kumpulkan diamond di udara!',tip:'Hindari atas/bawah layar, kumpulkan diamond!'},
  {emoji:'⭐',title:'Tips',desc:'Progress bar di atas. 100% = level clear. Diamond = bonus skor!',tip:'Setiap attempt kamu makin hafal polanya!'},
]
import{useEffect,useRef,useState}from'react'
import{useSound}from'../../hooks/useSound.js'
import{useProgress}from'../../context/ProgressContext.jsx'
import{useCoins}from'../../context/CoinContext.jsx'
import{DASH_THEMES}from'../../context/CoinContext.jsx'
import{useHaptics}from'../../hooks/useHaptics.js'
import{useThemeColors}from'../../hooks/useThemeColors.js'
import{WinModal,LoseModal}from'../../components/GameLayout.jsx'

// ═══════════════════════════════════════════════════════════
// CONFIG — jump heights verified: max obstacle = 2 blocks
// Easy:  max jump = 73px (2.4 blocks) ✓
// Med:   max jump = 70px (2.3 blocks) ✓
// Hard:  max jump = 69px (2.3 blocks) ✓
// ═══════════════════════════════════════════════════════════
const DC={
  easy:  {spd:3.2,si:0.08,grav:0.55,jv:-9,   ws:3.0,ml:6},
  medium:{spd:3.8,si:0.12,grav:0.65,jv:-9.6,  ws:3.6,ml:10},
  hard:  {spd:4.5,si:0.18,grav:0.75,jv:-10.2, ws:4.2,ml:14},
}
const CL={
  bg:'#1a0a3a',bg2:'#2d1b69',
  gnd:'#1a1a2e',gndL:'#A29BFE',gndG:'#6C5CE7',
  ply:'#7dff3a',plyO:'#2d8a08',plyE:'#00F5FF',
  spk:'#ffffff',spkF:'#1a1a2e',
  blk:'#1a1a2e',blkL:'#ffffff',
  wav:'#FF6348',wavG:'#EE5A24',
  ptl:'#55EFC4',dia:'#FFD700',
}
const P2=Math.PI*2,PS=20,BK=30 // player size, block size

// ═══════════════════════════════════════════════════════════
// LEVEL BUILDER
// F(n)=flat, U(n)=up, D(n)=down, S=spike, B(w,h)=block
// G(n)=gap, DI=diamond, P(mode)=portal, WD=wave diamond(yOff)
// MAX BLOCK HEIGHT = 2 (enforced!)
// ═══════════════════════════════════════════════════════════
function buildLv(cmds,baseH,cH){
  const items=[];let x=0,gH=baseH
  const gY=()=>cH-gH*BK
  // Runway
  for(let i=0;i<14;i++) items.push({t:'gnd',x:i*BK,y:gY(),w:BK,h:gH*BK})
  x=14*BK

  for(const c of cmds){
    switch(c[0]){
      case'F':{const n=c[1]||3;for(let i=0;i<n;i++){items.push({t:'gnd',x:x+i*BK,y:gY(),w:BK,h:gH*BK})};x+=n*BK;break}
      case'U':{const n=c[1]||1;for(let i=0;i<n;i++){gH++;items.push({t:'gnd',x,y:gY(),w:BK,h:gH*BK});x+=BK};break}
      case'D':{const n=c[1]||1;for(let i=0;i<n;i++){gH=Math.max(2,gH-1);items.push({t:'gnd',x,y:gY(),w:BK,h:gH*BK});x+=BK};break}
      case'S':items.push({t:'spk',x,y:gY(),w:BK,h:BK},{t:'gnd',x,y:gY(),w:BK,h:gH*BK});x+=BK;break
      case'B':{
        const bw=(c[1]||1)*BK,bh=Math.min(c[2]||1,2)*BK // MAX 2 blocks tall!
        items.push({t:'blk',x,y:gY()-bh,w:bw,h:bh},{t:'gnd',x,y:gY(),w:bw,h:gH*BK});x+=bw;break}
      case'G':{x+=(c[1]||2)*BK;break}
      case'DI':items.push({t:'dia',x,y:gY()-BK*2,col:false},{t:'gnd',x,y:gY(),w:BK,h:gH*BK});x+=BK;break
      case'P':{
        const pw=BK*3;items.push({t:'ptl',x,y:gY()-BK*2.5,w:pw,h:BK*2.5,mode:c[1],tr:false})
        for(let i=0;i<3;i++)items.push({t:'gnd',x:x+i*BK,y:gY(),w:BK,h:gH*BK});x+=pw;break}
      case'WD':{
        // Wave diamond — placed at absolute Y offset from screen center
        const yOff=c[1]||0
        items.push({t:'dia',x,y:cH*0.4+yOff,col:false})
        items.push({t:'gnd',x,y:gY(),w:BK,h:gH*BK});x+=BK*2;break}
      case'WO':{
        // Wave obstacle — gentle ceiling/floor bar (not full wall!)
        const fromTop=c[1]==='top'
        const len=Math.min(c[2]||80,cH*0.3) // max 30% of screen
        if(fromTop) items.push({t:'wbar',x,y:0,w:20,h:len})
        else items.push({t:'wbar',x,y:cH-gH*BK-len,w:20,h:len})
        items.push({t:'gnd',x,y:gY(),w:BK,h:gH*BK});x+=BK*2;break}
      case'_':{const n=c[1]||2;for(let i=0;i<n;i++){items.push({t:'gnd',x:x+i*BK,y:gY(),w:BK,h:gH*BK})};x+=n*BK;break}
    }
  }
  // Ending runway
  for(let i=0;i<8;i++)items.push({t:'gnd',x:x+i*BK,y:gY(),w:BK,h:gH*BK})
  x+=8*BK;items.push({t:'end',x})
  return{items,len:x,nd:items.filter(i=>i.t==='dia').length}
}

// ═══════════════════════════════════════════════════════════
// LEVELS — all obstacles ≤2 blocks, fair spacing
// Wave sections: open sky with diamonds, gentle bars
// ═══════════════════════════════════════════════════════════
const LVS=[
  // 1: Tutorial
  [['F',6],['DI'],['F',5],['S'],['F',6],['DI'],['F',5],['S'],['F',5],['S'],['F',6],['DI'],['F',6]],
  // 2: Small blocks
  [['F',5],['DI'],['F',4],['S'],['F',5],['B',1,1],['F',5],['DI'],['F',4],['S'],['F',5],['U',1],['F',4],['DI'],['D',1],['F',5],['S'],['F',5]],
  // 3: Steps — block is MAX 2 high now!
  [['F',5],['S'],['F',4],['U',1],['F',4],['U',1],['DI'],['F',4],['S'],['F',4],['D',1],['F',4],['D',1],['F',4],['DI'],['F',4],['S'],['F',5],['B',1,2],['F',6],['U',2],['F',4],['D',2],['F',5]],
  // 4: Gaps + blocks
  [['F',5],['S'],['F',5],['B',1,2],['DI'],['F',6],['S'],['F',4],['S'],['F',5],['U',2],['F',4],['DI'],['D',2],['F',4],['G',2],['F',5],['S'],['F',5],['B',1,1],['F',5],['DI'],['F',5]],
  // 5: Wave intro — OPEN SKY with diamonds, no tight walls!
  [['F',5],['S'],['F',4],['U',1],['F',4],['DI'],['D',1],['F',4],['S'],['F',5],
   ['P','wave'],['F',4],
   ['WD',-40],['WD',20],['WD',-20],['DI'],['WD',40],['WD',-30],['WD',10],['WD',30],['DI'],['WD',-10],
   ['P','cube'],['F',5],['S'],['F',5],['B',1,1],['DI'],['F',5]],
  // 6: Stairs + variety
  [['F',5],['S'],['F',4],['U',1],['F',4],['S'],['F',4],['U',1],['F',4],['DI'],['F',4],['D',1],['F',4],['S'],['F',4],['D',1],['F',5],['S'],['F',4],['S'],['F',5],['U',2],['F',4],['DI'],['F',4],['S'],['F',4],['D',2],['F',5],['B',1,2],['F',6],['DI'],['F',5]],
  // 7: Gaps + wave with gentle obstacles
  [['F',5],['S'],['F',4],['S'],['F',5],['B',1,2],['DI'],['F',6],['G',2],['F',5],['S'],['F',4],['U',2],['F',4],['DI'],['D',2],['F',5],
   ['P','wave'],['F',4],
   ['WD',-30],['WO','top',60],['WD',20],['WD',-40],['DI'],['WO','bot',50],['WD',30],['WD',-20],['DI'],
   ['P','cube'],['F',5],['S'],['F',4],['S'],['F',5],['B',1,1],['DI'],['F',5]],
  // 8: Long wave — diamond path with occasional bars
  [['F',4],['S'],['F',5],['U',1],['DI'],['D',1],['F',5],
   ['P','wave'],['F',4],
   ['WD',-30],['WD',30],['WO','top',70],['WD',-20],['WD',40],['DI'],['WO','bot',60],['WD',-40],['WD',20],['WO','top',50],['WD',30],['WD',-10],['DI'],
   ['P','cube'],['F',5],['S'],['F',4],['S'],['F',5],['U',1],['F',4],['D',1],['DI'],['F',5]],
  // 9: Mixed
  [['F',4],['S'],['F',4],['B',1,2],['DI'],['F',5],['U',1],['F',4],['S'],['F',4],['U',1],['F',4],['DI'],['D',2],['F',4],['G',2],['F',5],['S'],['F',4],['S'],['F',5],
   ['P','wave'],['F',4],['WD',-35],['WO','top',60],['WD',25],['WD',-25],['DI'],['WO','bot',50],['WD',35],['WD',-15],
   ['P','cube'],['F',5],['S'],['F',4]],
  // 10: Hard but fair
  [['F',4],['S'],['F',4],['S'],['F',4],['U',1],['F',4],['S'],['F',4],['U',1],['DI'],['F',4],['D',1],['F',4],['D',1],['F',4],['S'],['F',5],['B',1,2],['F',6],['G',2],['F',5],['DI'],['U',2],['F',4],['S'],['F',4],['D',2],['F',5],['S'],['F',4],['S'],['F',4],['DI'],['F',5],
   ['P','wave'],['F',4],['WD',-40],['WO','top',70],['WD',30],['WD',-30],['WO','bot',60],['WD',40],['DI'],['WD',-20],['WO','top',55],['WD',25],
   ['P','cube'],['F',4]],
  // 11
  [['F',4],['S'],['F',3],['S'],['F',3],['S'],['F',4],['U',2],['DI'],['F',4],['S'],['F',4],['D',1],['F',4],['D',1],['F',4],['B',1,2],['F',5],['G',2],['F',4],['U',1],['F',4],['S'],['F',4],['U',1],['F',4],['S'],['DI'],['D',2],['F',5],['S'],['F',4],
   ['P','wave'],['F',3],['WD',-35],['WO','top',70],['WD',30],['WD',-40],['WO','bot',60],['DI'],['WD',35],['WD',-25],['WO','top',55],['WD',20],
   ['P','cube'],['F',3],['S'],['F',3],['S'],['F',4]],
  // 12
  [['F',3],['S'],['F',3],['S'],['F',3],['U',1],['F',3],['S'],['F',3],['U',1],['F',3],['U',1],['DI'],['F',3],['D',1],['F',3],['S'],['F',3],['D',1],['F',3],['D',1],['F',4],['B',1,2],['F',5],['G',2],['F',4],['S'],['F',3],['U',2],['DI'],['F',3],['S'],['F',3],['D',2],['F',4],['S'],['F',3],
   ['P','wave'],['F',3],['WD',-30],['WO','top',75],['WD',35],['WO','bot',65],['WD',-40],['DI'],['WD',25],['WO','top',60],['WD',-20],['WD',30],
   ['P','cube'],['F',3],['S'],['F',3],['S'],['F',3],['S'],['F',4]],
  // 13
  [['F',3],['S'],['F',3],['S'],['F',3],['S'],['F',3],['U',1],['F',3],['S'],['F',3],['U',1],['F',3],['S'],['F',3],['U',1],['DI'],['F',3],['D',1],['F',3],['D',1],['F',3],['S'],['F',3],['D',1],['F',4],['B',1,2],['F',5],['G',2],['F',4],['U',2],['F',3],['S'],['F',3],['S'],['DI'],['F',3],['D',2],['F',4],
   ['P','wave'],['F',3],['WD',-40],['WO','top',80],['WD',35],['WO','bot',70],['WD',-35],['DI'],['WO','top',60],['WD',30],['WD',-25],['WO','bot',55],['WD',40],['DI'],
   ['P','cube'],['F',3],['S'],['F',3],['S'],['F',3],['S'],['F',3],['S'],['F',4]],
  // 14: Final
  [['F',3],['S'],['F',3],['S'],['F',3],['S'],['F',3],['U',1],['F',3],['S'],['F',3],['U',1],['F',3],['S'],['F',3],['U',1],['F',3],['S'],['DI'],['F',3],['D',1],['F',3],['S'],['F',3],['D',1],['F',3],['S'],['F',3],['D',1],['F',4],['B',1,2],['F',5],['G',3],['F',4],['U',2],['F',3],['S'],['F',3],['S'],['DI'],['F',3],['D',2],['F',4],['G',2],['F',4],
   ['P','wave'],['F',3],['WD',-40],['WO','top',80],['WD',35],['WO','bot',70],['WD',-35],['WO','top',65],['DI'],['WD',30],['WO','bot',60],['WD',-30],['WO','top',55],['WD',40],['WD',-20],['DI'],
   ['P','cube'],['F',3],['S'],['F',3],['S'],['F',3],['S'],['F',3],['S'],['F',3],['S'],['F',4]],
]

function mkBgR(W,H){const r=[];for(let i=0;i<10;i++)r.push({x:Math.random()*W*3,y:Math.random()*H*0.75,w:60+Math.random()*180,h:40+Math.random()*130,a:0.04+Math.random()*0.05,sp:0.15+Math.random()*0.2});return r}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════
export default function NeonDash({onBack,onHome,game,difficulty}){
  const cRef=useRef(null),aRef=useRef(null),gR=useRef(null),phR=useRef('idle'),retryRef=useRef(()=>{})
  const{play}=useSound(),{reportGameResult}=useProgress(),{earnCoins,getActiveDashTheme,activeDashTheme:activeDashThemeId}=useCoins()
  const{vibrateLight,vibrateMedium,vibrateHeavy,vibrateSuccess,vibrateError}=useHaptics()
  const tc=useThemeColors()
  const dashImgRef=useRef(null)
  const dc=DC[difficulty.id]
  const[phase,_sp]=useState('idle')
  const[showTut,setShowTut]=useState(()=>!localStorage.getItem('bp_tut_neon-dash'))
  const[showConf,setShowConf]=useState(false)
  const[loading,setLoading]=useState(true)
  const[uSc,sSc]=useState(0),[uLv,sLv]=useState(1),[uPr,sPr]=useState(0),[uDi,sDi]=useState('0/0'),[uAt,sAt]=useState(1)
  const[rzKey,setRzKey]=useState(0)
  const bestKey=`nd-best-${difficulty.id}`
  const[bestPr,sBestPr]=useState(()=>parseInt(localStorage.getItem(bestKey+'p')||'0'))
  const[bestLv,sBestLv]=useState(()=>parseInt(localStorage.getItem(bestKey+'l')||'1'))
  const[totalAttempts,sTotalAt]=useState(()=>parseInt(localStorage.getItem(bestKey+'a')||'0'))
  const sp=p=>{phR.current=p;_sp(p)}

  // Resize handler
  useEffect(()=>{
    let t=null
    const onRz=()=>{clearTimeout(t);t=setTimeout(()=>setRzKey(k=>k+1),250)}
    window.addEventListener('resize',onRz)
    const onOr=()=>setTimeout(onRz,200)
    window.addEventListener('orientationchange',onOr)
    return()=>{clearTimeout(t);window.removeEventListener('resize',onRz);window.removeEventListener('orientationchange',onOr)}
  },[])

  // Load dash cube image if the active theme has one
  useEffect(()=>{
    const themeObj = DASH_THEMES.find(t => t.id === (activeDashThemeId || 'default'))
    if(themeObj && themeObj.img){
      const img=new Image()
      img.src=themeObj.img
      img.onload=()=>{dashImgRef.current=img}
      img.onerror=()=>{dashImgRef.current=null}
    }else{
      dashImgRef.current=null
    }
  },[activeDashThemeId])

  function szC(){
    const c=cRef.current;if(!c)return{w:300,h:500}
    const p=c.parentElement;if(!p)return{w:300,h:500}
    const r=p.getBoundingClientRect()
    const d=Math.min(window.devicePixelRatio||1,2)
    const w=Math.floor(r.width)||window.innerWidth,h=Math.floor(r.height)||window.innerHeight
    c.width=w*d;c.height=h*d;c.style.width=w+'px';c.style.height=h+'px'
    c.getContext('2d').setTransform(d,0,0,d,0,0)
    return{w,h}
  }

  function mkG(W,H){
    const bH=Math.max(2,Math.floor(H*0.2/BK))
    return{W,H,lv:1,sc:0,att:1,bH,lvD:buildLv(LVS[0],bH,H),
      px:70,py:H-bH*BK-PS,vy:0,gnd:true,mode:'cube',rot:0,hold:false,
      cam:0,spd:dc.spd,cd:0,dieT:0,winT:0,deathFlash:0,beat:0,bInt:468, // 128 BPM
      pts:[],rings:[],trail:[],shk:0,gOff:0,bgR:mkBgR(W,H)}
  }

  useEffect(()=>{
    setLoading(false)
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
      if(g.mode==='cube'&&g.gnd){
        g.vy=dc.jv;g.gnd=false;g.shk=4;
        try{play('flip');vibrateLight()}catch(e){}
      }
    }
    function onUp(){g.hold=false}
    const onTouchStart=e=>{e.preventDefault();onDown()}
    const onTouchEnd=e=>{e.preventDefault();onUp()}
    c.addEventListener('mousedown',onDown);c.addEventListener('mouseup',onUp)
    c.addEventListener('touchstart',onTouchStart,{passive:false})
    c.addEventListener('touchend',onTouchEnd,{passive:false})
    const kd=e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();onDown()}}
    const ku=e=>{if(e.code==='Space'||e.code==='ArrowUp')onUp()}
    window.addEventListener('keydown',kd);window.addEventListener('keyup',ku)

    function stLv(){
      g.lvD=buildLv(LVS[Math.min(g.lv-1,LVS.length-1)],g.bH,H)
      g.cam=0;g.cd=0;g.spd=dc.spd+(g.lv-1)*dc.si
      g.px=70;g.py=H-g.bH*BK-PS;g.vy=0;g.gnd=true
      g.mode='cube';g.rot=0;g.hold=false;g.dieT=0;g.winT=0
      g.trail=[];g.pts=[];g.rings=[];sp('play')
    }
    function retry(){
      g.att++;sAt(g.att)
      for(const i of g.lvD.items){if(i.t==='dia')i.col=false;if(i.t==='ptl')i.tr=false}
      g.cam=0;g.cd=0;g.px=70;g.py=H-g.bH*BK-PS;g.vy=0;g.gnd=true
      g.mode='cube';g.rot=0;g.hold=false;g.dieT=0;g.winT=0
      g.trail=[];g.pts=[];g.rings=[];sp('play')
    }
    retryRef.current=retry
    function die(){
      const currentTheme = getActiveDashTheme()
      sp('dying');g.dieT=40;g.shk=18;g.deathFlash=1.0
      const cx=g.px+PS/2,cy=g.py+PS/2
      for(let i=0;i<25;i++){const a=P2*Math.random(),s=1.5+Math.random()*6
        g.pts.push({x:cx,y:cy,dx:Math.cos(a)*s,dy:Math.sin(a)*s-1,l:25+Math.random()*25,ml:50,r:2+Math.random()*4,c:i<12?currentTheme.player:i<18?'#FF6B6B':'#fff'})}
      g.rings.push({x:cx,y:cy,r:5,mr:100,a:1,c:'#fff',lw:3})
      g.rings.push({x:cx,y:cy,r:10,mr:60,a:0.6,c:'#FF6B6B',lw:2})
      // Track best progress
      const curPr=Math.round(Math.min(g.cam/g.lvD.len,1)*100)
      const totalPr=Math.round(((g.lv-1)/dc.ml)*100+curPr/dc.ml)
      if(totalPr>bestPr){sBestPr(totalPr);localStorage.setItem(bestKey+'p',totalPr)}
      if(g.lv>bestLv){sBestLv(g.lv);localStorage.setItem(bestKey+'l',g.lv)}
      sTotalAt(prev=>{const n=prev+1;localStorage.setItem(bestKey+'a',n);return n})
      try{play('mismatch');vibrateHeavy()}catch(e){}
    }
    function win(){
      const currentTheme = getActiveDashTheme()
      sp('winning');g.winT=55
      const dr=g.lvD.nd>0?g.cd/g.lvD.nd:1
      const pts=Math.round(250+g.lv*50+dr*350+Math.max(0,200-(g.att-1)*25))
      g.sc+=pts;sSc(g.sc)
      const cx=g.px+PS/2,cy=g.py+PS/2
      for(let i=0;i<18;i++){const a=P2*Math.random(),s=2+Math.random()*5
        g.pts.push({x:cx,y:cy,dx:Math.cos(a)*s,dy:Math.sin(a)*s,l:25+Math.random()*25,ml:50,r:3+Math.random()*4,c:['#fff',CL.dia,currentTheme.player,CL.gndL][i%4]})}
      try{play('win');vibrateSuccess()}catch(e){}
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

    // ═════════════ GAME LOOP ═════════════
    let lt=0,fc=0
    function loop(ts){try{
      const dt=Math.min((ts-lt)/16.667,2.5);lt=ts;fc++
      const p=phR.current,gY=H-g.bH*BK

      // VFX
      for(let i=g.pts.length-1;i>=0;i--){const p2=g.pts[i];p2.x+=p2.dx*dt;p2.y+=p2.dy*dt;p2.dy+=0.05*dt;p2.l-=dt;if(p2.l<=0)g.pts.splice(i,1)}
      for(let i=g.rings.length-1;i>=0;i--){const r=g.rings[i];r.r+=3*dt;r.a*=0.93;if(r.a<0.02||r.r>=r.mr)g.rings.splice(i,1)}
      while(g.trail.length>80)g.trail.shift()
      for(let i=g.trail.length-1;i>=0;i--){g.trail[i].a-=0.02*dt;if(g.trail[i].a<=0)g.trail.splice(i,1)}
      if(g.shk>0){g.shk*=0.9;if(g.shk<0.3)g.shk=0}
      if(g.deathFlash>0){g.deathFlash*=0.88;if(g.deathFlash<0.02)g.deathFlash=0}
      
      // Beat sync logic (simulated 128 BPM)
      const now = performance.now()
      if (now - g.beat > g.bInt) {
        g.beat = now
        // Trigger visual pulse
        if (p==='play') {
          g.bgPulse = 1.0
        }
      }
      if (g.bgPulse > 0) g.bgPulse *= 0.92

      // State transitions (frame-based, no setTimeout!)
      if(p==='dying'){g.dieT-=dt;if(g.dieT<=0)sp('dead')}
      if(p==='winning'){g.winT-=dt;if(g.winT<=0){
        if(g.lv>=dc.ml){sp('won');setShowConf(true);finG(true)}
        else{g.lv++;g.att=1;sLv(g.lv);sAt(1);stLv()}}}

      // ── GAMEPLAY ──
      if(p==='play'){
        const currentTheme = getActiveDashTheme()
        g.spd=Math.min(dc.spd+(g.lv-1)*dc.si+g.cam*0.0001,dc.spd*1.6)
        const spd=g.spd*dt;g.cam+=spd;g.gOff=(g.gOff+spd)%BK
        const wx=g.px+g.cam

        // Trail
        if(fc%2===0)g.trail.push({x:g.px+PS/2,y:g.py+PS/2,a:g.mode==='wave'?0.55:0.3,c:g.mode==='wave'?currentTheme.wave:currentTheme.player})

        if(g.mode==='cube'){
          g.vy+=dc.grav*dt;g.py+=g.vy*dt
          if(!g.gnd)g.rot+=0.07*dt;else g.rot=Math.round(g.rot/(Math.PI/2))*(Math.PI/2)
          // Landing
          g.gnd=false
          if(g.vy>=0){
            for(const it of g.lvD.items){
              if(it.t!=='gnd'&&it.t!=='blk')continue
              const sx=it.x-g.cam,top=it.y
              if(g.px+PS>sx+2&&g.px<sx+it.w-2&&g.py+PS>=top-2&&g.py+PS<=top+Math.max(g.vy*dt+10,12)){
                if (!g.gnd && g.vy > 2) g.shk = 3 // Land shake
                g.py=top-PS;g.vy=0;g.gnd=true;break}}}
          if(g.py>H+50){die();/* fall */}
        }else{
          // WAVE MODE — smooth diagonal, clamped to play area
          const ws=dc.ws*dt
          if(g.hold){g.py-=ws;g.rot=-0.3}else{g.py+=ws;g.rot=0.3}
          // Clamp between top of screen and ground level (with padding)
          const waveTop=15,waveBot=gY-PS-5
          g.py=Math.max(waveTop,Math.min(g.py,waveBot))
          // Die if hit ceiling or floor hard? No — just clamp. GD wave works this way.
        }

        // ── Collision ──
        if(phR.current==='play'){
          const p1=g.px+4,q1=g.py+4,p2=g.px+PS-4,q2=g.py+PS-4
          let died=false
          for(const it of g.lvD.items){
            const sx=it.x-g.cam
            if(sx<-80||sx>W+80)continue
            if(it.t==='spk'){
              if(p2>sx+5&&p1<sx+it.w-5&&q2>it.y-it.h+6&&q1<it.y){died=true;break}}
            if(it.t==='blk'){
              // Only side collision kills (landing on top is fine)
              if(p2>sx+3&&p1<sx+it.w-3&&q2>it.y+5&&q1<it.y+it.h-2){
                if(!(g.py+PS<=it.y+5&&g.vy>=0)){died=true;break}}}
            if(it.t==='wbar'&&g.mode==='wave'){
              if(p2>sx&&p1<sx+it.w&&q2>it.y&&q1<it.y+it.h){died=true;break}}
            if(it.t==='dia'&&!it.col){
              if(Math.abs((g.px+PS/2)-(sx+10))<20&&Math.abs((g.py+PS/2)-(it.y+10))<20){
                it.col=true;g.cd++;g.sc+=30;sSc(g.sc)
                g.pts.push({x:sx+10,y:it.y+10,dx:0,dy:-1.5,l:15,ml:15,r:5,c:CL.dia})
                try{play('match');vibrateLight()}catch(e){}}}
            if(it.t==='ptl'&&!it.tr&&wx>=it.x&&wx<=it.x+it.w+15&&g.mode!==it.mode){
              it.tr=true;g.mode=it.mode
              g.rings.push({x:g.px+PS/2,y:g.py+PS/2,r:4,mr:55,a:0.8,c:CL.ptl,lw:3})
              if(it.mode==='wave'){
                // Teleport player to center of play area
                g.py=gY*0.45;g.vy=0;g.gnd=false}
              if(it.mode==='cube'){
                // Return to ground
                g.py=gY-PS;g.vy=0;g.gnd=true;g.rot=0}
              try{play('flip');vibrateMedium()}catch(e){}}
            if(it.t==='end'&&wx>=it.x){win();break}}
          if(died&&phR.current==='play')die()
        }
        sPr(Math.round(Math.min(g.cam/g.lvD.len,1)*100))
        sDi(`${g.cd}/${g.lvD.nd}`)
      }

      // ═════════════ DRAW ═════════════
      const currentDashTheme = getActiveDashTheme()
      const shx=g.shk>0?(Math.random()-0.5)*g.shk*2:0
      const shy=g.shk>0?(Math.random()-0.5)*g.shk*2:0
      ctx.save();ctx.translate(shx,shy)

      // BG
      const bp = g.bgPulse || 0
      const bg = ctx.createLinearGradient(0,0,0,H)
      bg.addColorStop(0, bp > 0.1 ? `rgb(${45+bp*30},${27+bp*20},${105+bp*50})` : '#2d1b69')
      bg.addColorStop(1, bp > 0.1 ? `rgb(${26+bp*20},${10+bp*10},${58+bp*30})` : '#1a0a3a')
      ctx.fillStyle=bg;ctx.fillRect(0,0,W,H)
      // Parallax rects
      for(const r of g.bgR){const rx=(r.x-g.cam*r.sp)%(W+r.w+200)-r.w
        ctx.strokeStyle='rgba(162,155,254,0.07)';ctx.lineWidth=2;ctx.strokeRect(rx,r.y,r.w,r.h)
        ctx.fillStyle=`rgba(162,155,254,${r.a})`;ctx.fillRect(rx,r.y,r.w,r.h)}
      // Grid
      ctx.strokeStyle='rgba(162,155,254,0.04)';ctx.lineWidth=0.5
      for(let x=-(g.gOff||0);x<W+BK;x+=BK){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
      for(let y=0;y<H;y+=BK){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}

      // Items
      for(const it of g.lvD.items){
        const sx=it.x-g.cam;if(sx<-it.w-30||sx>W+50)continue
        if(it.t==='gnd'){
          ctx.fillStyle=CL.gnd;ctx.fillRect(sx,it.y,it.w,it.h)
          ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineWidth=0.5
          for(let y=it.y+BK;y<it.y+it.h;y+=BK){ctx.beginPath();ctx.moveTo(sx,y);ctx.lineTo(sx+it.w,y);ctx.stroke()}
          ctx.strokeStyle=CL.gndL;ctx.lineWidth=2;ctx.shadowColor=CL.gndG;ctx.shadowBlur=8
          ctx.beginPath();ctx.moveTo(sx,it.y);ctx.lineTo(sx+it.w,it.y);ctx.stroke();ctx.shadowBlur=0
          ctx.strokeStyle='rgba(162,155,254,0.2)';ctx.lineWidth=1;ctx.strokeRect(sx,it.y,it.w,it.h)}
        if(it.t==='spk'){
          ctx.fillStyle=CL.spkF;ctx.strokeStyle=CL.spk;ctx.lineWidth=2;ctx.shadowColor='#fff';ctx.shadowBlur=6
          ctx.beginPath();ctx.moveTo(sx,it.y);ctx.lineTo(sx+it.w/2,it.y-it.h);ctx.lineTo(sx+it.w,it.y);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0}
        if(it.t==='blk'){
          ctx.fillStyle=CL.blk;ctx.fillRect(sx,it.y,it.w,it.h)
          ctx.strokeStyle=CL.blkL;ctx.lineWidth=2;ctx.shadowColor='#fff';ctx.shadowBlur=4;ctx.strokeRect(sx,it.y,it.w,it.h);ctx.shadowBlur=0
          ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=0.5
          for(let y=it.y+BK;y<it.y+it.h;y+=BK){ctx.beginPath();ctx.moveTo(sx,y);ctx.lineTo(sx+it.w,y);ctx.stroke()}
          for(let x2=sx+BK;x2<sx+it.w;x2+=BK){ctx.beginPath();ctx.moveTo(x2,it.y);ctx.lineTo(x2,it.y+it.h);ctx.stroke()}}
        if(it.t==='ptl'){
          const pc=it.mode==='wave'?currentDashTheme.wave:CL.ptl;const pulse=0.7+Math.sin(ts/200)*0.3
          ctx.strokeStyle=pc;ctx.lineWidth=3;ctx.shadowColor=pc;ctx.shadowBlur=18*pulse
          ctx.strokeRect(sx+4,it.y+4,it.w-8,it.h-8);ctx.fillStyle=pc+'22';ctx.fillRect(sx,it.y,it.w,it.h)
          ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.font="bold 14px 'Fredoka One',sans-serif";ctx.textAlign='center'
          ctx.fillText(it.mode==='wave'?'🌊':'🟦',sx+it.w/2,it.y+it.h/2+4)
          ctx.font="bold 8px 'Fredoka One',sans-serif";ctx.fillText(it.mode==='wave'?'WAVE':'CUBE',sx+it.w/2,it.y+it.h/2+18)}
        if(it.t==='wbar'){
          ctx.fillStyle='rgba(255,107,157,0.25)';ctx.strokeStyle='rgba(255,107,157,0.6)';ctx.lineWidth=2
          ctx.shadowColor='#FF6B9D';ctx.shadowBlur=6;ctx.fillRect(sx,it.y,it.w,it.h);ctx.strokeRect(sx,it.y,it.w,it.h);ctx.shadowBlur=0}
        if(it.t==='dia'&&!it.col){
          const dy=it.y+Math.sin(ts/300+it.x*0.01)*4
          ctx.fillStyle='#fff';ctx.shadowColor=CL.dia;ctx.shadowBlur=10
          ctx.save();ctx.translate(sx+10,dy+10);ctx.rotate(Math.PI/4);ctx.fillRect(-5,-5,10,10);ctx.restore();ctx.shadowBlur=0}}

      // Trail
      if(g.trail.length>1){
        if(g.mode==='wave'){ctx.strokeStyle=currentDashTheme.wave;ctx.lineWidth=2.5;ctx.shadowColor=currentDashTheme.wave;ctx.shadowBlur=5;ctx.beginPath()
          for(let i=0;i<g.trail.length;i++){const t=g.trail[i];ctx.globalAlpha=t.a;if(i===0)ctx.moveTo(t.x,t.y);else ctx.lineTo(t.x,t.y)}
          ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha=1
        }else{for(const t of g.trail){ctx.globalAlpha=t.a*0.4;ctx.fillStyle=t.c;ctx.fillRect(t.x-2,t.y-2,4,4)};ctx.globalAlpha=1}}

      // PLAYER — ALWAYS DRAW when alive (any mode!)
      const ph=phR.current
      if(ph==='play'||ph==='winning'||(ph==='dying'&&g.dieT>12)){
        ctx.save();ctx.translate(g.px+PS/2,g.py+PS/2);ctx.rotate(g.rot)
        if(dashImgRef.current){
          // Draw cube image
          const imgS=PS*1.6
          ctx.drawImage(dashImgRef.current, -imgS/2, -imgS/2, imgS, imgS)
        } else {
          ctx.fillStyle=currentDashTheme.playerOutline;ctx.fillRect(-PS/2-2,-PS/2-2,PS+4,PS+4)
          ctx.fillStyle=g.mode==='wave'?currentDashTheme.wave:currentDashTheme.player
          ctx.shadowColor=g.mode==='wave'?currentDashTheme.wave:currentDashTheme.player;ctx.shadowBlur=12 + (g.bgPulse || 0) * 15
          ctx.fillRect(-PS/2,-PS/2,PS,PS);ctx.shadowBlur=0
          ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.strokeRect(-PS/2,-PS/2,PS,PS)
          ctx.fillStyle=currentDashTheme.glow;ctx.fillRect(1,-3,5,5)
        }
        ctx.restore()}

      // Particles & rings
      for(const pt of g.pts){const a=pt.l/pt.ml;ctx.globalAlpha=a;ctx.fillStyle=pt.c;ctx.shadowColor=pt.c;ctx.shadowBlur=3;ctx.beginPath();ctx.arc(pt.x,pt.y,pt.r*a,0,P2);ctx.fill()}
      ctx.shadowBlur=0;ctx.globalAlpha=1
      for(const r of g.rings){if(r.a<0.02)continue;ctx.globalAlpha=r.a;ctx.strokeStyle=r.c;ctx.lineWidth=r.lw||2;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,P2);ctx.stroke()}
      ctx.globalAlpha=1

      // HUD
      ctx.fillStyle='rgba(11,11,42,0.5)';ctx.fillRect(0,0,W,34)
      const bx=48,bw=W-130,bh=6,by=13
      const curPr=Math.round(Math.min(g.cam/g.lvD.len,1)*100)
      const pr=curPr/100
      ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(bx,by,bw,bh)
      ctx.fillStyle=CL.gndL;ctx.shadowColor=CL.gndG;ctx.shadowBlur=4;ctx.fillRect(bx,by,bw*pr,bh);ctx.shadowBlur=0
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bx+bw*pr,by+bh/2,4,0,P2);ctx.fill()
      ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font="bold 9px 'Fredoka One',sans-serif";ctx.textAlign='center';ctx.fillText(`${curPr}%`,bx+bw/2,by+bh+10)
      ctx.textAlign='left';ctx.fillStyle=g.mode==='wave'?currentDashTheme.wave:currentDashTheme.player;ctx.font="bold 10px 'Fredoka One',sans-serif";ctx.fillText(g.mode==='wave'?'~ WAVE':'□ CUBE',10,26)
      ctx.textAlign='right';ctx.font="bold 11px 'Fredoka One',sans-serif";ctx.fillStyle='#fff';ctx.fillText(`💎 ${g.cd}/${g.lvD.nd}`,W-10,14);ctx.fillStyle=CL.gndL;ctx.fillText(`Lv${g.lv} ×${g.att}`,W-10,28)

      // Death flash overlay
      if(g.deathFlash>0.01){ctx.fillStyle=`rgba(255,80,80,${g.deathFlash*0.4})`;ctx.fillRect(0,0,W,H)}

      // Overlays
      if(ph==='idle'){ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(0,0,W,H);const sc=0.92+Math.sin(ts/400)*0.08;ctx.save();ctx.translate(W/2,H*0.38);ctx.scale(sc,sc);ctx.fillStyle='#fff';ctx.shadowColor=CL.gndL;ctx.shadowBlur=16;ctx.font="bold 22px 'Fredoka One',sans-serif";ctx.textAlign='center';ctx.fillText('TAP UNTUK MULAI',0,0);ctx.shadowBlur=4;ctx.fillStyle=CL.gndL;ctx.font="13px 'Fredoka One',sans-serif";ctx.fillText('💎 Neon Dash',0,26);ctx.shadowBlur=0;ctx.restore()
        if(bestPr>0){ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font="10px 'Fredoka One',sans-serif";ctx.fillText(`Rekor: Lv${bestLv} • ${bestPr}% • ${totalAttempts} attempt`,W/2,H*0.38+56)}}
      if(ph==='dead'){ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#FF6B6B';ctx.shadowColor='#FF6B6B';ctx.shadowBlur=15;ctx.font="bold 24px 'Fredoka One',sans-serif";ctx.textAlign='center';ctx.fillText('💥 CRASH!',W/2,H*0.32);ctx.shadowBlur=0
        ctx.fillStyle='#fff';ctx.font="13px 'Fredoka One',sans-serif";const deadPr=Math.round(Math.min(g.cam/g.lvD.len,1)*100);ctx.fillText(`Level ${g.lv}  •  ${deadPr}% selesai`,W/2,H*0.32+28)
        ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font="10px 'Fredoka One',sans-serif";ctx.fillText(`Attempt #${g.att}  •  Skor: ${g.sc}  •  💎 ${g.cd}/${g.lvD.nd}`,W/2,H*0.32+48)
        if(bestPr>0){ctx.fillStyle=CL.gndL;ctx.font="10px 'Fredoka One',sans-serif";ctx.fillText(`Rekor: Lv${bestLv} • ${bestPr}%`,W/2,H*0.32+68)}
        ctx.fillStyle='#fff';ctx.shadowColor='#fff';ctx.shadowBlur=8;ctx.font="bold 14px 'Fredoka One',sans-serif";ctx.fillText('Tap → Retry',W/2,H*0.32+98);ctx.shadowBlur=0}
      if(ph==='winning'){ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(0,0,W,H);ctx.fillStyle=CL.gndL;ctx.shadowColor=CL.gndL;ctx.shadowBlur=15;ctx.font="bold 26px 'Fredoka One',sans-serif";ctx.textAlign='center';ctx.fillText('✨ LEVEL CLEAR!',W/2,H*0.4);ctx.shadowBlur=0}
      ctx.restore()
    }catch(e){console.error('ND:',e)}
      aRef.current=requestAnimationFrame(loop)}
    aRef.current=requestAnimationFrame(loop)
    return()=>{cancelAnimationFrame(aRef.current);c.removeEventListener('mousedown',onDown);c.removeEventListener('mouseup',onUp);c.removeEventListener('touchstart',onTouchStart);c.removeEventListener('touchend',onTouchEnd);window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku)}
  },[difficulty.id,rzKey])

  const restart=()=>{const{w,h}=szC();gR.current=mkG(w,h);sp('idle');sSc(0);sLv(1);sPr(0);sDi('0/0');sAt(1);setShowConf(false)}
  const coinR=phase==='won'?({easy:20,medium:40,hard:65}[difficulty.id]||20)+Math.floor(uSc/150)+30:0

  return(
    <div style={{width:'100%',height:typeof CSS!=='undefined'&&CSS.supports('height','100dvh')?'100dvh':'100vh',background:CL.bg,position:'relative',overflow:'hidden',userSelect:'none',fontFamily:"'Fredoka One',cursive"}}>
      {showTut&&<TutorialModal steps={TUT} storageKey="bp_tut_neon-dash" onClose={()=>setShowTut(false)}/>}
      {showConf&&<Confetti/>}      {loading&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999}}><div style={{fontSize:48,animation:'spin 2s linear infinite'}}>⚙️</div></div>}      <div style={{position:'absolute',top:8,left:8,zIndex:20}}><button onClick={onBack} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',borderRadius:10,padding:'7px 13px',fontSize:15,cursor:'pointer'}}>←</button></div>
      <div style={{position:'absolute',inset:0,zIndex:1}}><canvas ref={cRef} style={{width:'100%',height:'100%',display:'block',touchAction:'none'}}/></div>
      {phase==='won'&&(
        <WinModal emoji="🏆" title="All clear!" subtitle={`${dc.ml} level selesai!`} diffLabel={{easy:'🟢 Mudah',medium:'🟡 Sedang',hard:'🔴 Sulit'}[difficulty.id]}
          stats={[{label:'Skor',value:String(gR.current?.sc??uSc),color:'#FFD700'},{label:'Diamond',value:`${gR.current?.cd||0}/${gR.current?.lvD?.nd||0}`,color:'#00F5FF'},{label:'Attempts',value:String(gR.current?.att??uAt),color:'#A29BFE'}]}
          stars={3} coinReward={coinR} onRestart={restart} onBack={()=>{play('click');onBack()}} onHome={()=>{play('click');onHome?.()}}
          dark={tc.dark} gameColor="#A29BFE"/>
      )}
      {phase==='dead'&&(
        <LoseModal emoji="💥" title="Crash!" subtitle="Coba lagi dari checkpoint level ini." diffLabel={{easy:'🟢 Mudah',medium:'🟡 Sedang',hard:'🔴 Sulit'}[difficulty.id]}
          stats={[{label:'Skor',value:String(uSc),color:'#FFD700'},{label:'Progress',value:`${uPr}%`,color:'#00F5FF'},{label:'Diamond',value:uDi,color:'#A29BFE'},{label:'Attempt',value:String(uAt),color:'#FF6B6B'}]}
          coinReward={0} onRestart={()=>retryRef.current()} onBack={()=>{play('click');onBack()}} onHome={()=>{play('click');onHome?.()}}
          dark={tc.dark} gameColor="#FF6B6B"/>
      )}
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>)
}
