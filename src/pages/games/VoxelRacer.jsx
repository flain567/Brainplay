import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
const TUT=[
  {emoji:'🚗',title:'Voxel Racer',desc:'Hill Climb Racing style! Gas untuk maju, rem untuk mundur. Jangan kehabisan bensin!',tip:'Kumpulkan jeriken 🛢️ dan koin 🪙!'},
  {emoji:'🕹️',title:'Kontrol',desc:'KANAN / TAP KANAN = Gas maju. KIRI / TAP KIRI = Rem/mundur. Jaga keseimbangan!',tip:'Di udara: gas = lean forward, rem = lean backward.'},
  {emoji:'⛽',title:'Bensin & Koin',desc:'Bensin terus berkurang! Kumpulkan 🛢️ jeriken untuk refuel. 🪙 koin = bonus skor.',tip:'Terbalik atau bensin habis = Game Over!'},
]
import{useEffect,useRef,useState}from'react'
import{useSound}from'../../hooks/useSound.js'
import{useProgress}from'../../context/ProgressContext.jsx'
import{useCoins}from'../../context/CoinContext.jsx'

const DC={
  easy:  {power:0.13,maxSpd:6.5,grav:0.32,fuelDrain:0.06,fuelCan:35,ml:6},
  medium:{power:0.16,maxSpd:7.5,grav:0.35,fuelDrain:0.10,fuelCan:28,ml:10},
  hard:  {power:0.20,maxSpd:8.5,grav:0.38,fuelDrain:0.15,fuelCan:22,ml:14},
}
const P2=Math.PI*2,PI=Math.PI
const CAR_W=48,CAR_H=22,WHL_R=9,WHL_BASE=34

// ═══════════════════════════════════════════════════════════
// TERRAIN — smooth sine-based hills (HCR style)
// ═══════════════════════════════════════════════════════════
function buildTerrain(lvl, seed){
  // Generate smooth terrain using layered sine waves
  const pts=[]
  const len=800+lvl*200 // longer per level
  const step=5 // point every 5px for smooth curves
  const s=seed||lvl*137
  for(let x=-100;x<len;x+=step){
    let y=0
    // Layer 1: big hills (HCR-like amplitude)
    y+=Math.sin(x*0.005+s)*80*(1+lvl*0.2)
    // Layer 2: medium bumps
    y+=Math.sin(x*0.015+s*2.3)*40*(1+lvl*0.15)
    // Layer 3: small bumps (more at higher levels)
    y+=Math.sin(x*0.04+s*4.7)*15*Math.min(lvl*0.3,3)
    // Flat start (longer like HCR)
    if(x<200)y*=Math.max(0,(x-20)/180)
    // Keep y negative (up) for hills, positive for valleys
    pts.push({x,y})
  }
  return{pts,len,finishX:len-150}
}

function getTerrainY(pts,x){
  // Binary search for segment, then lerp
  let lo=0,hi=pts.length-1
  while(lo<hi-1){const m=(lo+hi)>>1;if(pts[m].x<=x)lo=m;else hi=m}
  const a=pts[lo],b=pts[hi]
  if(b.x===a.x)return a.y
  const t=(x-a.x)/(b.x-a.x)
  return a.y+(b.y-a.y)*t
}

function getTerrainAngle(pts,x){
  const dx=3
  const y1=getTerrainY(pts,x-dx),y2=getTerrainY(pts,x+dx)
  return Math.atan2(y2-y1,dx*2)
}

// ═══════════════════════════════════════════════════════════
// COLLECTIBLES — coins and fuel cans along terrain
// ═══════════════════════════════════════════════════════════
function spawnCollectibles(terrain,lvl){
  const items=[]
  const pts=terrain.pts
  for(let x=150;x<terrain.len-200;x+=40+Math.random()*60){
    const ty=getTerrainY(pts,x)
    if(Math.random()<0.7){
      // Coin
      items.push({type:'coin',x,y:ty-25-Math.random()*20,collected:false})
    }
    if(Math.random()<0.15){
      // Fuel can
      items.push({type:'fuel',x,y:ty-22,collected:false})
    }
  }
  return items
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════
export default function VoxelRacer({onBack,game,difficulty}){
  const cRef=useRef(null),aRef=useRef(null),gR=useRef(null),phR=useRef('idle')
  const{play}=useSound(),{reportGameResult}=useProgress(),{earnCoins:earnC}=useCoins()
  const dc=DC[difficulty.id]
  const[phase,_sp]=useState('idle')
  const[showTut,setShowTut]=useState(()=>!localStorage.getItem('bp_tut_voxel-racer'))
  const[showConf,setShowConf]=useState(false)
  const[uSc,sSc]=useState(0),[uLv,sLv]=useState(1),[uPr,sPr]=useState(0),[uAt,sAt]=useState(1)
  const[uFuel,sFuel]=useState(100),[uDist,sDist]=useState(0),[uCoins,sCoins]=useState(0)
  const sp=p=>{phR.current=p;_sp(p)}

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
    const terr=buildTerrain(1,1)
    return{W,H,lv:1,sc:0,att:1,coins:0,
      terr,items:spawnCollectibles(terr,1),
      // Car
      cx:80,cy:0,vx:0,vy:0,angle:0,angVel:0,
      air:false,gas:false,brk:false,whlRot:0,
      fuel:100,maxFuel:100,
      // Camera
      camX:0,camY:0,
      // State
      dead:false,dieT:0,winT:0,
      baseY:H*0.75,
      pts:[],shk:0,bestDist:0,
    }
  }

  useEffect(()=>{
    const{w:W,h:H}=szC()
    const c=cRef.current;if(!c)return
    const ctx=c.getContext('2d')
    let g=mkG(W,H);gR.current=g
    sSc(0);sLv(1);sPr(0);sAt(1);sFuel(100);sDist(0);sCoins(0)

    function stLv(){
      g.terr=buildTerrain(g.lv,g.lv*137)
      g.items=spawnCollectibles(g.terr,g.lv)
      g.cx=80;g.cy=getTerrainY(g.terr.pts,80)-WHL_R-CAR_H/2
      g.vx=0;g.vy=0;g.angle=0;g.angVel=0
      g.air=false;g.gas=false;g.brk=false;g.whlRot=0
      g.fuel=100;g.dead=false;g.dieT=0;g.winT=0
      g.camX=g.cx-W*0.35;g.camY=g.cy;g.pts=[];g.shk=0
      sFuel(100);sDist(0)
      sp('play')
    }
    function retry(){g.att++;sAt(g.att);stLv()}
    function die(reason){
      sp('dying');g.dieT=45;g.dead=true;g.shk=12
      for(let i=0;i<12;i++){const a=P2*Math.random()
        g.pts.push({x:g.cx,y:g.cy,dx:Math.cos(a)*(2+Math.random()*4),dy:Math.sin(a)*(1+Math.random()*3)-2,l:20+Math.random()*20,ml:40,r:3+Math.random()*3,c:['#FFD93D','#E53935','#212121'][i%3]})}
      try{play('mismatch')}catch(e){}
    }
    function win2(){
      sp('winning');g.winT=55
      const pts=Math.round(200+g.lv*80+g.coins*30+Math.max(0,150-(g.att-1)*20))
      g.sc+=pts;sSc(g.sc)
      try{play('win')}catch(e){}
    }
    function finG(won){
      const st=won?3:g.lv>dc.ml/2?2:g.lv>2?1:0
      let co=({easy:25,medium:50,hard:75}[difficulty.id]||25)+Math.floor(g.sc/150);if(st===3)co+=35
      if(!won)co=Math.max(5,Math.floor(g.sc/200))
      earnC(co,`Voxel Racer (${difficulty.id})`)
      reportGameResult({gameId:'voxel-racer',difficultyId:difficulty.id,won,score:g.sc,stars:Math.max(st,won?1:0),timeSec:0})
      const bk=`voxel-racer-best-${difficulty.id}`,pv=parseInt(localStorage.getItem(bk)||'0')
      if(g.sc>pv)localStorage.setItem(bk,g.sc)
    }

    // Input
    function onDown(e){
      const p=phR.current
      if(p==='idle'){stLv();return}
      if(p==='dead'){retry();return}
      if(p!=='play')return
      let cx=e.clientX||(e.touches&&e.touches[0]?.clientX)||W/2
      if(cx>W*0.4)g.gas=true;else g.brk=true
    }
    function onUp(){g.gas=false;g.brk=false}
    function onKey(e){
      const p=phR.current
      if(p==='idle'){stLv();return}
      if(p==='dead'){retry();return}
      if(p!=='play')return
      if(e.type==='keydown'){
        if(e.code==='ArrowRight'||e.code==='KeyD'||e.code==='Space'){e.preventDefault();g.gas=true}
        if(e.code==='ArrowLeft'||e.code==='KeyA')g.brk=true
      }else{
        if(e.code==='ArrowRight'||e.code==='KeyD'||e.code==='Space')g.gas=false
        if(e.code==='ArrowLeft'||e.code==='KeyA')g.brk=false
      }
    }
    c.addEventListener('mousedown',onDown);c.addEventListener('mouseup',onUp)
    c.addEventListener('touchstart',e=>{e.preventDefault();onDown(e)},{passive:false})
    c.addEventListener('touchend',e=>{e.preventDefault();onUp()},{passive:false})
    window.addEventListener('keydown',onKey);window.addEventListener('keyup',onKey)

    // ═════════════ GAME LOOP ═════════════
    let lt=0
    function loop(ts){try{
      const dt=Math.min((ts-lt)/16.667,2.5);lt=ts
      const p=phR.current

      // VFX
      for(let i=g.pts.length-1;i>=0;i--){const pt=g.pts[i];pt.x+=pt.dx*dt;pt.y+=pt.dy*dt;pt.dy+=0.1*dt;pt.l-=dt;if(pt.l<=0)g.pts.splice(i,1)}
      if(g.shk>0){g.shk*=0.9;if(g.shk<0.3)g.shk=0}

      if(p==='dying'){g.dieT-=dt;if(g.dieT<=0)sp('dead')}
      if(p==='winning'){g.winT-=dt;if(g.winT<=0){
        if(g.lv>=dc.ml){sp('won');setShowConf(true);finG(true)}
        else{g.lv++;g.att=1;sLv(g.lv);sAt(1);stLv()}}}

      if(p==='play'){
        const tPts=g.terr.pts

        // Fuel consumption
        g.fuel-=dc.fuelDrain*dt*(g.gas?1.5:0.5)
        if(g.fuel<=0){g.fuel=0;die('fuel');sFuel(0)}
        sFuel(Math.round(g.fuel))

        // ═══════════════════════════════════════════════════
        // PHYSICS ENGINE v3 — Correct order, no projection bug
        // Order: gravity → drive → move → ground collision
        // ═══════════════════════════════════════════════════

        const terrAngle=getTerrainAngle(tPts,g.cx)
        const surfCos=Math.cos(terrAngle),surfSin=Math.sin(terrAngle)

        // 1) GRAVITY — always applies
        g.vy+=dc.grav*dt

        // 2) DRIVE FORCE — along terrain surface when grounded, along car angle in air
        if(!g.air){
          if(g.gas&&g.fuel>0){
            const slopeBoost=terrAngle<-0.05?1.8:1.0 // 80% extra uphill
            g.vx+=surfCos*dc.power*slopeBoost*dt
            g.vy+=surfSin*dc.power*slopeBoost*dt
          }
          if(g.brk){
            g.vx-=surfCos*dc.power*0.8*dt
            g.vy-=surfSin*dc.power*0.8*dt
          }
          // Rolling friction
          g.vx*=(1-0.01*dt)
          // Speed limit
          const spd=Math.sqrt(g.vx*g.vx+g.vy*g.vy)
          if(spd>dc.maxSpd){const f=dc.maxSpd/spd;g.vx*=f;g.vy*=f}
        }else{
          // Air: lean control
          if(g.gas)g.angVel+=0.005*dt
          if(g.brk)g.angVel-=0.005*dt
          g.angle+=g.angVel*dt
          g.angVel*=(1-0.003*dt)
          // Minimal air drag
          g.vx*=(1-0.001*dt)
        }

        // 3) MOVE
        g.cx+=g.vx*dt
        g.cy+=g.vy*dt

        // 4) GROUND COLLISION — after movement
        const cosA=Math.cos(g.angle)
        const rearWX=g.cx-cosA*WHL_BASE/2
        const frontWX=g.cx+cosA*WHL_BASE/2
        const terrAtRear=getTerrainY(tPts,rearWX)
        const terrAtFront=getTerrainY(tPts,frontWX)
        const terrAtCenter=getTerrainY(tPts,g.cx)
        const avgGround=(terrAtRear+terrAtFront)/2
        const surfaceY=avgGround-CAR_H/2-WHL_R

        const wasAir=g.air
        const pen=g.cy-surfaceY // positive = car below surface

        if(pen>-2){ // touching or below ground
          g.air=false

          // Push car onto surface
          if(pen>0) g.cy=surfaceY

          // Cancel perpendicular velocity (normal force)
          // Normal to surface = (-surfSin, surfCos)
          const vNorm=g.vx*(-surfSin)+g.vy*surfCos
          if(vNorm>0){ // only cancel if moving INTO ground
            g.vx-=(-surfSin)*vNorm
            g.vy-=surfCos*vNorm

            // Landing shock
            if(wasAir&&vNorm>2){
              g.shk=Math.min(vNorm*0.5,6)
              // Partial bounce for big impacts
              if(vNorm>5){g.vy-=vNorm*0.1}
            }
          }

          // Match terrain angle smoothly
          const angleDiff=terrAngle-g.angle
          const normDiff=((angleDiff+PI)%(PI*2))-PI
          g.angle+=normDiff*0.25*dt
          g.angVel*=(1-0.12*dt)

          // Downhill gravity boost: on downhill, add speed along surface
          if(terrAngle>0.03){ // going downhill
            const gravAlongSurface=dc.grav*surfSin*0.5*dt
            g.vx+=surfCos*gravAlongSurface
            g.vy+=surfSin*gravAlongSurface
          }

        }else{
          g.air=true
        }

        // Wheel rotation visual
        g.whlRot+=g.vx*0.12*dt

        // Death
        if(!g.air&&Math.abs(g.angle)>PI*0.45){die('flip')}
        if(g.cy>terrAtCenter+250){die('fall')}

        // Collect items
        for(const it of g.items){
          if(it.collected)continue
          const dx=g.cx-it.x,dy=g.cy-it.y
          if(dx*dx+dy*dy<900){ // ~30px radius
            it.collected=true
            if(it.type==='coin'){
              g.coins++;g.sc+=25;sSc(g.sc);sCoins(g.coins)
              g.pts.push({x:it.x,y:it.y,dx:0,dy:-2,l:15,ml:15,r:5,c:'#FFD700'})
              try{play('match')}catch(e){}
            }
            if(it.type==='fuel'){
              g.fuel=Math.min(g.maxFuel,g.fuel+dc.fuelCan)
              sFuel(Math.round(g.fuel))
              g.pts.push({x:it.x,y:it.y,dx:0,dy:-2,l:15,ml:15,r:5,c:'#4CAF50'})
              try{play('flip')}catch(e){}
            }
          }
        }

        // Camera — HCR style: car always at ~60% screen height, 35% from left
        g.camX+=(g.cx-W*0.35-g.camX)*0.1*dt
        g.camY+=(g.cy-g.camY)*0.1*dt

        // Win
        if(g.cx>=g.terr.finishX){win2()}

        // Progress & distance
        const dist=Math.max(0,g.cx-80)
        g.bestDist=Math.max(g.bestDist,dist)
        sDist(Math.round(dist))
        sPr(Math.round(Math.min(dist/(g.terr.finishX-80),1)*100))
      }

      // ═════════════ DRAW ═════════════
      const shx=g.shk>0?(Math.random()-0.5)*g.shk*2:0
      const shy=g.shk>0?(Math.random()-0.5)*g.shk*2:0
      ctx.save();ctx.translate(shx,shy)

      // Sky gradient
      const sky=ctx.createLinearGradient(0,0,0,H)
      sky.addColorStop(0,'#4FC3F7');sky.addColorStop(0.5,'#81D4FA');sky.addColorStop(1,'#B3E5FC')
      ctx.fillStyle=sky;ctx.fillRect(0,0,W,H)

      // Clouds (parallax)
      ctx.fillStyle='rgba(255,255,255,0.6)'
      for(let i=0;i<6;i++){
        const cx2=((i*280+100)-g.camX*0.05)%(W+200)-50
        ctx.beginPath()
        ctx.arc(cx2,50+i*18,25+i*8,0,P2);ctx.arc(cx2+20,45+i*18,20+i*6,0,P2);ctx.arc(cx2-15,48+i*18,18+i*5,0,P2)
        ctx.fill()
      }

      // Far mountains (parallax) - positioned relative to screen
      ctx.fillStyle='#A5D6A7'
      ctx.beginPath();ctx.moveTo(0,H)
      for(let x=0;x<=W;x+=8){const wx=x+g.camX*0.15;ctx.lineTo(x,H*0.35+Math.sin(wx*0.006)*25+Math.sin(wx*0.013)*12)}
      ctx.lineTo(W,H);ctx.fill()

      // Near hills
      ctx.fillStyle='#81C784'
      ctx.beginPath();ctx.moveTo(0,H)
      for(let x=0;x<=W;x+=6){const wx=x+g.camX*0.3;ctx.lineTo(x,H*0.45+Math.sin(wx*0.01)*18+Math.sin(wx*0.022)*8)}
      ctx.lineTo(W,H);ctx.fill()

      // ── World space — car centered at (35%, 60%) of screen ──
      ctx.save()
      ctx.translate(-g.camX,H*0.6-g.camY)

      // Terrain fill
      const tPts=g.terr.pts
      const vl=g.camX-50,vr=g.camX+W+50

      // Ground body (dirt — HCR brown)
      ctx.fillStyle='#5D4037'
      ctx.beginPath();ctx.moveTo(tPts[0].x,tPts[0].y+12)
      for(const pt of tPts){if(pt.x<vl-100||pt.x>vr+100)continue;ctx.lineTo(pt.x,pt.y+12)}
      ctx.lineTo(tPts[tPts.length-1].x,500);ctx.lineTo(tPts[0].x,500);ctx.fill()

      // Ground surface (green like HCR)
      ctx.fillStyle='#4CAF50'
      ctx.beginPath();ctx.moveTo(tPts[0].x,tPts[0].y)
      for(const pt of tPts){if(pt.x<vl-100||pt.x>vr+100)continue;ctx.lineTo(pt.x,pt.y)}
      ctx.lineTo(tPts[tPts.length-1].x,500);ctx.lineTo(tPts[0].x,500);ctx.fill()

      // HCR-style multi-layer grass edge
      ctx.strokeStyle='#2E7D32';ctx.lineWidth=4
      ctx.beginPath();let st2=false
      for(const pt of tPts){if(pt.x<vl-100||pt.x>vr+100)continue;if(!st2){ctx.moveTo(pt.x,pt.y+6);st2=true}else ctx.lineTo(pt.x,pt.y+6)}
      ctx.stroke()
      ctx.strokeStyle='#388E3C';ctx.lineWidth=3
      ctx.beginPath();let st3=false
      for(const pt of tPts){if(pt.x<vl-100||pt.x>vr+100)continue;if(!st3){ctx.moveTo(pt.x,pt.y+3);st3=true}else ctx.lineTo(pt.x,pt.y+3)}
      ctx.stroke()
      // Top bright green edge
      ctx.strokeStyle='#66BB6A';ctx.lineWidth=3
      ctx.beginPath()
      let started=false
      for(const pt of tPts){if(pt.x<vl-100||pt.x>vr+100)continue;if(!started){ctx.moveTo(pt.x,pt.y-1);started=true}else ctx.lineTo(pt.x,pt.y-1)}
      ctx.stroke()

      // Collectibles
      for(const it of g.items){
        if(it.collected||it.x<vl-30||it.x>vr+30)continue
        if(it.type==='coin'){
          const bob=Math.sin(ts*0.003+it.x*0.01)*3
          ctx.fillStyle='#FFD700';ctx.shadowColor='#FFD700';ctx.shadowBlur=8
          ctx.beginPath();ctx.arc(it.x,it.y+bob,7,0,P2);ctx.fill()
          ctx.strokeStyle='#FFA000';ctx.lineWidth=1.5;ctx.stroke()
          ctx.shadowBlur=0
          ctx.fillStyle='#FFA000';ctx.font='bold 8px sans-serif';ctx.textAlign='center'
          ctx.fillText('$',it.x,it.y+bob+3)
        }
        if(it.type==='fuel'){
          ctx.fillStyle='#E53935';ctx.fillRect(it.x-6,it.y-8,12,16)
          ctx.fillStyle='#FFEB3B';ctx.fillRect(it.x-3,it.y-5,6,4)
          ctx.strokeStyle='#B71C1C';ctx.lineWidth=1.5;ctx.strokeRect(it.x-6,it.y-8,12,16)
          ctx.fillStyle='#fff';ctx.font='bold 6px sans-serif';ctx.textAlign='center'
          ctx.fillText('⛽',it.x,it.y+5)
        }
      }

      // Finish flag
      const fx=g.terr.finishX,fy=getTerrainY(tPts,fx)
      ctx.fillStyle='#fff';ctx.fillRect(fx,fy-55,3,55)
      ctx.fillStyle='#E53935';ctx.fillRect(fx+3,fy-55,22,12)
      ctx.fillStyle='#000'
      for(let r=0;r<12;r+=4)for(let c2=0;c2<22;c2+=4){if(((r/4)+(c2/4))%2===0)ctx.fillRect(fx+3+c2,fy-55+r,4,4)}
      ctx.fillStyle='#fff';ctx.font="bold 9px 'Fredoka One',sans-serif";ctx.textAlign='center'
      ctx.fillText('🏁',fx+14,fy-58)

      // CAR
      const ph2=phR.current
      if(ph2==='play'||ph2==='winning'||(ph2==='dying'&&g.dieT>18)){
        ctx.save();ctx.translate(g.cx,g.cy);ctx.rotate(g.angle)

        // Shadow on ground
        ctx.fillStyle='rgba(0,0,0,0.12)';ctx.fillRect(-CAR_W/2+5,CAR_H/2+3,CAR_W-10,5)

        // Body bottom
        ctx.fillStyle='#E6A817';ctx.fillRect(-CAR_W/2,-CAR_H/2,CAR_W,CAR_H)
        // Body top
        ctx.fillStyle='#FFD93D';ctx.fillRect(-CAR_W/2+2,-CAR_H/2-1,CAR_W-4,CAR_H-1)
        // Cabin
        ctx.fillStyle='#E6A817';ctx.fillRect(-8,-CAR_H/2-11,24,13)
        // Windshield
        ctx.fillStyle='rgba(41,182,246,0.7)';ctx.fillRect(13,-CAR_H/2-9,4,9)
        // Rear window
        ctx.fillStyle='rgba(41,182,246,0.5)';ctx.fillRect(-6,-CAR_H/2-9,4,9)
        // Bumpers
        ctx.fillStyle='#BDBDBD';ctx.fillRect(-CAR_W/2-2,-3,3,6);ctx.fillRect(CAR_W/2-1,-3,3,6)
        // Headlights
        ctx.fillStyle='#FFEB3B';ctx.fillRect(CAR_W/2,-5,2,3);ctx.fillRect(CAR_W/2,1,2,3)
        // Taillights
        ctx.fillStyle='#E53935';ctx.fillRect(-CAR_W/2-1,-4,2,3);ctx.fillRect(-CAR_W/2-1,1,2,3)
        // Outline
        ctx.strokeStyle='rgba(0,0,0,0.2)';ctx.lineWidth=1;ctx.strokeRect(-CAR_W/2,-CAR_H/2,CAR_W,CAR_H)

        // Wheels
        for(const wx of[-WHL_BASE/2,WHL_BASE/2]){
          ctx.save();ctx.translate(wx,CAR_H/2)
          ctx.rotate(g.whlRot)
          ctx.fillStyle='#212121';ctx.beginPath();ctx.arc(0,0,WHL_R,0,P2);ctx.fill()
          ctx.fillStyle='#616161';ctx.beginPath();ctx.arc(0,0,WHL_R*0.5,0,P2);ctx.fill()
          ctx.strokeStyle='#424242';ctx.lineWidth=1
          ctx.beginPath();ctx.moveTo(-WHL_R*0.35,0);ctx.lineTo(WHL_R*0.35,0);ctx.stroke()
          ctx.beginPath();ctx.moveTo(0,-WHL_R*0.35);ctx.lineTo(0,WHL_R*0.35);ctx.stroke()
          ctx.restore()
        }

        // Exhaust
        if(g.gas&&!g.air&&Math.random()>0.4){
          g.pts.push({x:g.cx-Math.cos(g.angle)*CAR_W/2,y:g.cy-Math.sin(g.angle)*CAR_W/2,
            dx:-g.vx*0.2+(Math.random()-0.5),dy:-0.5-Math.random()*1.5,l:10+Math.random()*8,ml:18,r:2+Math.random()*2,c:'#9E9E9E'})}

        ctx.restore()
      }

      // Particles
      for(const pt of g.pts){const a=pt.l/pt.ml;ctx.globalAlpha=a;ctx.fillStyle=pt.c;ctx.beginPath();ctx.arc(pt.x,pt.y,pt.r*a,0,P2);ctx.fill()}
      ctx.globalAlpha=1

      ctx.restore() // world space

      // ═══ HUD ═══
      ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(0,0,W,42)

      // Progress bar
      const bx=50,bw=W-140,bh=6,by=8,pr=Math.min(uPr/100,1)
      ctx.fillStyle='rgba(255,255,255,0.15)';ctx.fillRect(bx,by,bw,bh)
      ctx.fillStyle='#FFD93D';ctx.fillRect(bx,by,bw*pr,bh)
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bx+bw*pr,by+bh/2,3,0,P2);ctx.fill()
      ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font="bold 8px 'Fredoka One',sans-serif";ctx.textAlign='center'
      ctx.fillText(`${uPr}%`,bx+bw/2,by+bh+9)

      // Fuel gauge
      const fgx=10,fgy=22,fgw=80,fgh=8
      ctx.fillStyle='rgba(255,255,255,0.15)';ctx.fillRect(fgx,fgy,fgw,fgh)
      const fuelPct=uFuel/100
      ctx.fillStyle=fuelPct>0.3?'#4CAF50':fuelPct>0.15?'#FF9800':'#E53935'
      ctx.fillRect(fgx,fgy,fgw*fuelPct,fgh)
      ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1;ctx.strokeRect(fgx,fgy,fgw,fgh)
      ctx.fillStyle='#fff';ctx.font="bold 7px 'Fredoka One',sans-serif";ctx.textAlign='left'
      ctx.fillText(`⛽ ${uFuel}%`,fgx,fgy+fgh+9)

      // Info
      ctx.textAlign='left';ctx.fillStyle='#FFD93D';ctx.font="bold 11px 'Fredoka One',sans-serif"
      ctx.fillText(`🚗 Lv${g.lv}`,fgx,10)
      ctx.textAlign='right';ctx.fillStyle='#fff';ctx.font="bold 11px 'Fredoka One',sans-serif"
      ctx.fillText(`${uDist}m`,W-10,12)
      ctx.fillStyle='#FFD700';ctx.fillText(`🪙 ${uCoins}`,W-10,26)
      ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font="9px 'Fredoka One',sans-serif"
      ctx.fillText(`×${g.att}`,W-10,38)

      // Touch controls hint
      if(phR.current==='play'){
        ctx.globalAlpha=0.12;ctx.fillStyle='#fff';ctx.font='bold 30px sans-serif';ctx.textAlign='center'
        ctx.fillText('◀ REM',W*0.15,H-30);ctx.fillText('GAS ▶',W*0.85,H-30)
        ctx.globalAlpha=1
      }

      // Overlays
      const ph=phR.current
      if(ph==='idle'){
        ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(0,0,W,H)
        const sc=0.92+Math.sin(ts/400)*0.08;ctx.save();ctx.translate(W/2,H*0.4);ctx.scale(sc,sc)
        ctx.fillStyle='#fff';ctx.shadowColor='#FFD93D';ctx.shadowBlur=16;ctx.font="bold 24px 'Fredoka One',sans-serif";ctx.textAlign='center'
        ctx.fillText('TAP UNTUK MULAI',0,0);ctx.shadowBlur=4;ctx.fillStyle='#FFD93D';ctx.font="14px 'Fredoka One',sans-serif"
        ctx.fillText('🚗 Voxel Racer',0,28);ctx.shadowBlur=0;ctx.restore()
      }
      if(ph==='dead'){
        ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#fff';ctx.shadowColor='#E53935';ctx.shadowBlur=12;ctx.font="bold 24px 'Fredoka One',sans-serif";ctx.textAlign='center'
        ctx.fillText('💥 CRASH!',W/2,H*0.34);ctx.shadowBlur=4;ctx.font="13px 'Fredoka One',sans-serif"
        ctx.fillText(g.fuel<=0?'Bensin habis!':'Mobil terbalik!',W/2,H*0.34+25)
        ctx.fillStyle='rgba(255,255,255,0.6)';ctx.fillText('Tap untuk retry',W/2,H*0.34+50)
        ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font="11px 'Fredoka One',sans-serif"
        ctx.fillText(`${uDist}m • Attempt #${g.att}`,W/2,H*0.34+70);ctx.shadowBlur=0
      }
      if(ph==='winning'){
        ctx.fillStyle='rgba(0,0,0,0.25)';ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#FFD93D';ctx.shadowColor='#FFD93D';ctx.shadowBlur=15;ctx.font="bold 28px 'Fredoka One',sans-serif";ctx.textAlign='center'
        ctx.fillText('🏁 FINISH!',W/2,H*0.38);ctx.shadowBlur=0
      }
      ctx.restore()
    }catch(e){console.error('VR:',e)}
      aRef.current=requestAnimationFrame(loop)}
    aRef.current=requestAnimationFrame(loop)
    return()=>{cancelAnimationFrame(aRef.current);c.removeEventListener('mousedown',onDown);c.removeEventListener('mouseup',onUp);window.removeEventListener('keydown',onKey);window.removeEventListener('keyup',onKey)}
  },[difficulty.id])

  const restart=()=>{const{w,h}=szC();gR.current=mkG(w,h);sp('idle');sSc(0);sLv(1);sPr(0);sAt(1);sFuel(100);sDist(0);sCoins(0);setShowConf(false)}
  const coinR=phase==='won'?({easy:25,medium:50,hard:75}[difficulty.id]||25)+Math.floor(uSc/150)+35:0

  return(
    <div style={{width:'100%',height:typeof CSS!=='undefined'&&CSS.supports('height','100dvh')?'100dvh':'100vh',background:'#4FC3F7',position:'relative',overflow:'hidden',userSelect:'none',fontFamily:"'Fredoka One',cursive"}}>
      {showTut&&<TutorialModal steps={TUT} storageKey="bp_tut_voxel-racer" onClose={()=>setShowTut(false)}/>}
      {showConf&&<Confetti/>}
      <div style={{position:'absolute',top:8,left:8,zIndex:20}}><button onClick={onBack} style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.3)',color:'#fff',borderRadius:10,padding:'7px 13px',fontSize:15,cursor:'pointer',backdropFilter:'blur(4px)'}}>←</button></div>
      <div style={{position:'absolute',inset:0,zIndex:1}}><canvas ref={cRef} style={{width:'100%',height:'100%',display:'block',touchAction:'none'}}/></div>
      {phase==='won'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:20}}>
          <div style={{background:'linear-gradient(180deg,#1a237e,#0d47a1)',borderRadius:28,padding:'36px 28px',textAlign:'center',maxWidth:380,width:'100%',boxShadow:'0 0 60px rgba(33,150,243,0.3)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:'linear-gradient(90deg,#FFD93D,#FF6B6B,#29B6F6)'}}/>
            <div style={{fontSize:52,marginBottom:8}}>🏆</div><h2 style={{color:'#fff',fontSize:26,marginBottom:4}}>RACE COMPLETE!</h2>
            <p style={{color:'#90CAF9',fontSize:13,marginBottom:12}}>{dc.ml} level selesai!</p>
            <div style={{fontSize:30,marginBottom:12,letterSpacing:8}}>⭐⭐⭐</div>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,217,61,0.15)',border:'1.5px solid rgba(255,217,61,0.3)',borderRadius:100,padding:'6px 18px',marginBottom:16}}><span>🪙</span><span style={{color:'#FFD93D',fontSize:16,fontWeight:800}}>+{coinR}</span></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:24}}>
              <div style={{background:'rgba(255,217,61,0.1)',borderRadius:14,padding:'12px 8px'}}><div style={{fontSize:22,color:'#FFD93D'}}>{uSc}</div><div style={{fontSize:10,color:'#90CAF9',marginTop:2}}>Skor</div></div>
              <div style={{background:'rgba(41,182,246,0.1)',borderRadius:14,padding:'12px 8px'}}><div style={{fontSize:22,color:'#29B6F6'}}>{uCoins}</div><div style={{fontSize:10,color:'#90CAF9',marginTop:2}}>Koin</div></div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={restart} style={{flex:1,background:'linear-gradient(135deg,#FFD93D,#FF6B6B)',color:'#fff',border:'none',borderRadius:100,padding:'13px 18px',fontSize:15,fontWeight:800,cursor:'pointer'}}>🔄 Main Lagi</button>
              <button onClick={onBack} style={{flex:1,background:'#1a237e',color:'#90CAF9',border:'2px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'13px 18px',fontSize:15,fontWeight:800,cursor:'pointer'}}>🎯 Ganti Level</button>
            </div>
          </div>
        </div>)}
    </div>)
}
