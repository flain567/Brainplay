import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
const TUT=[
  {emoji:'💎',title:'Neon Dash',desc:'Berlari melewati rintangan neon! Tap untuk lompat, hindari spike & gap, kumpulkan diamond!',tip:'Timing lompatan adalah kunci — jangan terlalu cepat atau lambat!'},
  {emoji:'🏃',title:'Kontrol',desc:'TAP/KLIK untuk lompat. Tahan lebih lama untuk lompat lebih tinggi. Desktop: Spasi/↑ juga bisa.',tip:'Double tap untuk double jump di udara!'},
  {emoji:'⭐',title:'Koleksi & Skor',desc:'Kumpulkan 💎 diamond untuk poin bonus. Selesaikan level untuk mendapat bintang!',tip:'3 bintang jika kumpulkan 80%+ diamond & jarang mati!'},
]
import{useEffect,useRef,useState}from'react'
import{useSound}from'../../hooks/useSound.js'
import{useProgress}from'../../context/ProgressContext.jsx'
import{useCoins}from'../../context/CoinContext.jsx'

const CFG={
  easy:{speed:3.5,gravity:0.45,jumpF:-9,maxLevel:8,obstFreq:0.015,gapChance:0.1,spikeH:20},
  medium:{speed:4.5,gravity:0.5,jumpF:-9.5,maxLevel:12,obstFreq:0.022,gapChance:0.15,spikeH:24},
  hard:{speed:5.5,gravity:0.55,jumpF:-10,maxLevel:16,obstFreq:0.03,gapChance:0.2,spikeH:28},
}
const NC={cy:'#00F5FF',pu:'#A29BFE',pk:'#FF6B9D',go:'#FFD700',gr:'#00B894',re:'#FF4757',or:'#FF6348',wh:'#ffffff'}
const OBST_COLS=[NC.pk,NC.pu,NC.cy,'#55EFC4',NC.or]
const rnd=(a,b)=>a+Math.random()*(b-a),P2=Math.PI*2

// Level generator — creates obstacles & diamonds for a level
function genLevel(W,H,cfg,lvl){
  const groundY=H*0.75
  const levelLen=W*8+lvl*W*2 // longer per level
  const items=[]
  let x=W*1.5
  const speed=cfg.speed+lvl*0.15
  while(x<levelLen){
    const r=Math.random()
    if(r<0.35){
      // Spike triangle
      const h=cfg.spikeH+lvl*1.5
      items.push({type:'spike',x,y:groundY-h,w:24+lvl,h,color:OBST_COLS[Math.floor(Math.random()*OBST_COLS.length)]})
      x+=80+rnd(40,80)
    }else if(r<0.55){
      // Block obstacle
      const bh=20+rnd(10,25+lvl*2),bw=25+rnd(10,20)
      items.push({type:'block',x,y:groundY-bh,w:bw,h:bh,color:OBST_COLS[Math.floor(Math.random()*OBST_COLS.length)]})
      x+=90+rnd(30,60)
    }else if(r<0.65&&lvl>=2){
      // Gap in ground
      const gw=50+lvl*3+rnd(0,20)
      items.push({type:'gap',x,w:gw})
      x+=gw+60+rnd(20,40)
    }else if(r<0.8){
      // Diamond collectible (in air)
      const dy=groundY-40-rnd(20,60+lvl*3)
      items.push({type:'diamond',x:x+rnd(0,30),y:dy,collected:false})
      x+=50+rnd(20,40)
    }else{
      // Platform (floating)
      if(lvl>=3){
        const py=groundY-60-rnd(20,40+lvl*2),pw=60+rnd(20,40)
        items.push({type:'platform',x,y:py,w:pw})
        // Diamond on platform
        items.push({type:'diamond',x:x+pw/2,y:py-20,collected:false})
      }
      x+=100+rnd(30,60)
    }
  }
  // Add end marker
  items.push({type:'finish',x:levelLen})
  const totalDiamonds=items.filter(i=>i.type==='diamond').length
  return{items,levelLen,groundY,totalDiamonds,speed}
}

export default function NeonDash({onBack,game,difficulty}){
  const cRef=useRef(null),aRef=useRef(null),phR=useRef('idle'),gR=useRef(null)
  const{play}=useSound(),{reportGameResult}=useProgress(),{earnCoins}=useCoins()
  const cfg=CFG[difficulty.id]
  const[phase,_sP]=useState('idle')
  const[showTut,setShowTut]=useState(()=>!localStorage.getItem('bp_tut_neon-dash'))
  const[showConf,setShowConf]=useState(false)
  const[uScore,setUScore]=useState(0)
  const[uLevel,setULevel]=useState(1)
  const[uProg,setUProg]=useState(0)
  const[uDia,setUDia]=useState('0/0')
  const[uDeaths,setUDeaths]=useState(0)

  const sP=p=>{phR.current=p;_sP(p)}

  function szCvs(){
    const c=cRef.current;if(!c)return{w:300,h:500}
    const par=c.parentElement;if(!par)return{w:300,h:500}
    const rc=par.getBoundingClientRect()
    const dpr=Math.min(window.devicePixelRatio||1,2)
    const w=Math.floor(rc.width)||window.innerWidth,h=Math.floor(rc.height)||window.innerHeight
    c.width=w*dpr;c.height=h*dpr;c.style.width=w+'px';c.style.height=h+'px'
    const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0)
    return{w,h}
  }

  function mkGame(W,H){
    const lvl=genLevel(W,H,cfg,1)
    return{W,H,level:1,score:0,deaths:0,totalDia:0,colDia:0,
      px:80,py:lvl.groundY-20,pw:16,ph:16,vy:0,onGround:true,canDblJump:true,jumping:false,
      camX:0,lvl,groundY:lvl.groundY,
      pts:[],rings:[],shk:0,
      bgStars:Array.from({length:40},()=>({x:rnd(0,W),y:rnd(0,H*0.7),r:rnd(0.5,2),a:rnd(0.1,0.4)})),
      trail:[],deathAnim:0,winAnim:0,
      levelStartX:0,
    }
  }

  useEffect(()=>{
    const{w:W,h:H}=szCvs()
    const c=cRef.current;if(!c)return
    const ctx=c.getContext('2d')
    const g=mkGame(W,H);gR.current=g

    // Input
    let jumpPressed=false
    function doJump(){
      if(phR.current==='idle'){stLevel();return}
      if(phR.current!=='playing')return
      if(g.onGround){
        g.vy=cfg.jumpF;g.onGround=false;g.canDblJump=true;g.jumping=true
        try{play('flip')}catch(e){}
      }else if(g.canDblJump){
        g.vy=cfg.jumpF*0.85;g.canDblJump=false
        try{play('flip')}catch(e){}
        // Double jump particles
        for(let i=0;i<6;i++){const a=P2*Math.random();g.pts.push({x:g.px+g.pw/2,y:g.py+g.ph,dx:Math.cos(a)*rnd(1,3),dy:Math.sin(a)*rnd(1,3),l:20,ml:20,r:rnd(2,4),c:NC.cy})}
      }
    }
    const oM=()=>doJump()
    const oT=e=>{e.preventDefault();doJump()}
    const oK=e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();if(!jumpPressed){jumpPressed=true;doJump()}}}
    const oKU=e=>{if(e.code==='Space'||e.code==='ArrowUp')jumpPressed=false}
    c.addEventListener('click',oM);c.addEventListener('touchstart',oT,{passive:false})
    window.addEventListener('keydown',oK);window.addEventListener('keyup',oKU)

    function stLevel(){
      const lvl=genLevel(W,H,cfg,g.level)
      g.lvl=lvl;g.groundY=lvl.groundY;g.camX=0
      g.px=80;g.py=lvl.groundY-20;g.vy=0;g.onGround=true;g.canDblJump=true
      g.colDia=0;g.deathAnim=0;g.winAnim=0;g.trail=[];g.pts=[];g.rings=[]
      g.levelStartX=0
      sP('playing')
    }

    function die(){
      g.deaths++;setUDeaths(g.deaths);g.shk=12
      g.deathAnim=40
      for(let i=0;i<15;i++){const a=P2*Math.random();g.pts.push({x:g.px+g.pw/2,y:g.py+g.ph/2,dx:Math.cos(a)*rnd(2,6),dy:Math.sin(a)*rnd(2,6),l:rnd(25,40),ml:40,r:rnd(2,5),c:NC.re})}
      g.rings.push({x:g.px+g.pw/2,y:g.py+g.ph/2,r:5,mr:80,a:0.8,c:NC.re,lw:3})
      try{play('mismatch')}catch(e){}
      // Respawn after delay
      setTimeout(()=>{
        if(phR.current!=='playing')return
        g.px=80;g.py=g.groundY-20;g.vy=0;g.onGround=true;g.canDblJump=true;g.camX=Math.max(0,g.camX-W*0.3)
        g.deathAnim=0
      },500)
    }

    function winLevel(){
      const diaRatio=g.lvl.totalDiamonds>0?g.colDia/g.lvl.totalDiamonds:1
      const deathPenalty=Math.max(0,100-g.deaths*15)
      const lvlScore=Math.round(200+g.level*50+diaRatio*300+deathPenalty)
      g.score+=lvlScore;setUScore(g.score)
      g.winAnim=60

      for(let i=0;i<20;i++){const a=P2*Math.random();g.pts.push({x:W/2,y:H/2,dx:Math.cos(a)*rnd(2,7),dy:Math.sin(a)*rnd(2,7),l:rnd(30,50),ml:50,r:rnd(3,6),c:[NC.cy,NC.go,NC.pu,NC.gr][i%4]})}
      g.rings.push({x:W/2,y:H/2,r:10,mr:200,a:0.9,c:NC.go,lw:3})
      try{play('win')}catch(e){}

      setTimeout(()=>{
        if(g.level>=cfg.maxLevel){
          sP('won');setShowConf(true);fin(true)
        }else{
          g.level++;setULevel(g.level);g.deaths=0;setUDeaths(0);stLevel()
        }
      },1200)
    }

    function fin(won){
      const st=won?3:g.level>cfg.maxLevel/2?2:g.level>2?1:0
      const coinB={easy:20,medium:40,hard:65}
      let co=(coinB[difficulty.id]||20)+Math.floor(g.score/150);if(st===3)co+=30;if(!won)co=Math.max(5,Math.floor(g.score/200))
      earnCoins(co,`Neon Dash (${difficulty.id})`)
      reportGameResult({gameId:'neon-dash',difficultyId:difficulty.id,won,score:g.score,stars:Math.max(st,won?1:0),timeSec:0})
      const bk=`neon-dash-best-${difficulty.id}`,pv=parseInt(localStorage.getItem(bk)||'0')
      if(g.score>pv)localStorage.setItem(bk,g.score)
    }

    // GAME LOOP
    let lt=0
    function loop(ts){try{
      const dt=Math.min((ts-lt)/16.667,2.5);lt=ts;const p=phR.current

      // Particles
      for(let i=g.pts.length-1;i>=0;i--){const pt=g.pts[i];pt.x+=pt.dx*dt;pt.y+=pt.dy*dt;pt.dy+=0.06*dt;pt.l-=dt;if(pt.l<=0)g.pts.splice(i,1)}
      for(let i=g.rings.length-1;i>=0;i--){const r=g.rings[i];r.r+=2.5*dt;r.a=0.8*(1-r.r/r.mr);if(r.r>=r.mr)g.rings.splice(i,1)}
      if(g.shk>0){g.shk*=0.9;if(g.shk<0.3)g.shk=0}

      if(p==='playing'&&g.deathAnim<=0&&g.winAnim<=0){
        const spd=g.lvl.speed*dt

        // Move camera forward
        g.camX+=spd

        // Trail
        if(ts%3<2)g.trail.push({x:g.px+g.pw/2-g.camX*0,y:g.py+g.ph/2,a:0.6,r:rnd(2,4),c:NC.cy})
        for(let i=g.trail.length-1;i>=0;i--){g.trail[i].a-=0.02*dt;if(g.trail[i].a<=0)g.trail.splice(i,1)}

        // Gravity
        g.vy+=cfg.gravity*dt;g.py+=g.vy*dt

        // Ground collision (check for gaps)
        const screenPx=g.px
        const worldX=g.px+g.camX
        let overGap=false
        for(const it of g.lvl.items){
          if(it.type==='gap'&&worldX+g.pw>it.x&&worldX<it.x+it.w){overGap=true;break}
        }
        if(!overGap&&g.py+g.ph>=g.groundY){g.py=g.groundY-g.ph;g.vy=0;g.onGround=true;g.canDblJump=true}
        // Platform collision
        for(const it of g.lvl.items){
          if(it.type==='platform'){
            const sx=it.x-g.camX;
            if(g.vy>0&&screenPx+g.pw>sx&&screenPx<sx+it.w&&g.py+g.ph>=it.y&&g.py+g.ph<=it.y+10){
              g.py=it.y-g.ph;g.vy=0;g.onGround=true;g.canDblJump=true
            }
          }
        }

        // Fell off screen
        if(g.py>H+50){die();g.deathAnim=1}

        // Collision with obstacles
        for(const it of g.lvl.items){
          const sx=it.x-g.camX
          if(sx<-100||sx>W+100)continue
          if(it.type==='spike'||it.type==='block'){
            // Simple AABB with shrink
            const s=4 // shrink hitbox
            if(screenPx+g.pw-s>sx+s&&screenPx+s<sx+it.w-s&&g.py+g.ph-s>it.y+s&&g.py+s<it.y+it.h-s){
              die();break
            }
          }
          if(it.type==='diamond'&&!it.collected){
            const dx=(screenPx+g.pw/2)-(sx+8),dy=(g.py+g.ph/2)-(it.y+8)
            if(Math.abs(dx)<18&&Math.abs(dy)<18){
              it.collected=true;g.colDia++;g.score+=25;setUScore(g.score)
              g.pts.push({x:sx+8,y:it.y+8,dx:0,dy:-2,l:20,ml:20,r:6,c:NC.go})
              g.rings.push({x:sx+8,y:it.y+8,r:5,mr:30,a:0.6,c:NC.go,lw:2})
              try{play('match')}catch(e){}
            }
          }
          if(it.type==='finish'&&worldX>=it.x){winLevel();break}
        }

        // Progress
        const prog=Math.min(g.camX/g.lvl.levelLen,1)
        setUProg(Math.round(prog*100))
        setUDia(`${g.colDia}/${g.lvl.totalDiamonds}`)
      }
      if(g.deathAnim>0)g.deathAnim-=dt
      if(g.winAnim>0)g.winAnim-=dt

      // DRAW
      const sx=g.shk>0?(Math.random()-0.5)*g.shk*2:0,sy=g.shk>0?(Math.random()-0.5)*g.shk*2:0
      ctx.save();ctx.translate(sx,sy)

      // BG gradient
      const bgGrad=ctx.createLinearGradient(0,0,0,H)
      bgGrad.addColorStop(0,'#0a0a2e');bgGrad.addColorStop(0.6,'#12124a');bgGrad.addColorStop(1,'#1a0a3a')
      ctx.fillStyle=bgGrad;ctx.fillRect(0,0,W,H)

      // BG stars
      for(const s of g.bgStars){ctx.globalAlpha=s.a+Math.sin(ts/2000+s.x)*0.1;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,P2);ctx.fill()}
      ctx.globalAlpha=1

      // Ground
      const gY=g.groundY
      // Draw gaps
      ctx.strokeStyle=NC.pu;ctx.lineWidth=2;ctx.shadowColor=NC.pu;ctx.shadowBlur=8
      let lastX=0
      const gaps=g.lvl.items.filter(i=>i.type==='gap').sort((a,b)=>a.x-b.x)
      // Draw ground segments
      ctx.beginPath()
      let drawing=true
      for(let x=0;x<W;x+=1){
        const worldX=x+g.camX
        let inGap=false
        for(const gap of gaps){if(worldX>=gap.x&&worldX<=gap.x+gap.w){inGap=true;break}}
        if(!inGap){if(!drawing){ctx.moveTo(x,gY);drawing=true}else ctx.lineTo(x,gY)}
        else drawing=false
      }
      ctx.stroke();ctx.shadowBlur=0

      // Ground glow line
      ctx.strokeStyle='rgba(162,155,254,0.15)';ctx.lineWidth=1
      ctx.beginPath();ctx.moveTo(0,gY+1);ctx.lineTo(W,gY+1);ctx.stroke()

      // Items
      for(const it of g.lvl.items){
        const sx2=it.x-g.camX
        if(sx2<-60||sx2>W+60)continue

        if(it.type==='spike'){
          ctx.fillStyle=it.color;ctx.shadowColor=it.color;ctx.shadowBlur=10
          ctx.beginPath();ctx.moveTo(sx2,gY);ctx.lineTo(sx2+it.w/2,it.y-g.camX*0+g.camX*0);
          // recalc y based on groundY
          ctx.lineTo(sx2+it.w/2,gY-it.h);ctx.lineTo(sx2+it.w,gY);ctx.closePath();ctx.fill()
          ctx.shadowBlur=0
        }
        if(it.type==='block'){
          ctx.fillStyle=it.color+'88';ctx.strokeStyle=it.color;ctx.lineWidth=2
          ctx.shadowColor=it.color;ctx.shadowBlur=6
          ctx.fillRect(sx2,it.y,it.w,it.h);ctx.strokeRect(sx2,it.y,it.w,it.h)
          ctx.shadowBlur=0
        }
        if(it.type==='platform'){
          ctx.strokeStyle=NC.gr;ctx.lineWidth=2.5;ctx.shadowColor=NC.gr;ctx.shadowBlur=8
          ctx.beginPath();ctx.moveTo(sx2,it.y);ctx.lineTo(sx2+it.w,it.y);ctx.stroke()
          ctx.shadowBlur=0
        }
        if(it.type==='diamond'&&!it.collected){
          const dx2=sx2,dy2=it.y+Math.sin(ts/400+it.x*0.01)*4
          ctx.fillStyle=NC.go;ctx.shadowColor=NC.go;ctx.shadowBlur=10
          ctx.save();ctx.translate(dx2+8,dy2+8);ctx.rotate(Math.PI/4)
          ctx.fillRect(-6,-6,12,12);ctx.restore();ctx.shadowBlur=0
        }
      }

      // Trail
      for(const t of g.trail){ctx.globalAlpha=t.a;ctx.fillStyle=t.c;ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,P2);ctx.fill()}
      ctx.globalAlpha=1

      // Player
      if(g.deathAnim<=0||Math.floor(ts/80)%2===0){
        const px=g.px,py=g.py
        // Player body (glowing square with rotation during jump)
        ctx.save();ctx.translate(px+g.pw/2,py+g.ph/2)
        if(!g.onGround)ctx.rotate(ts/200)
        ctx.fillStyle=NC.cy;ctx.shadowColor=NC.cy;ctx.shadowBlur=15
        ctx.fillRect(-g.pw/2,-g.ph/2,g.pw,g.ph)
        ctx.fillStyle='rgba(255,255,255,0.4)';ctx.fillRect(-g.pw/2,-g.ph/2,g.pw,g.ph/3)
        ctx.shadowBlur=0;ctx.restore()
        // Eyes
        ctx.fillStyle='#fff'
        ctx.fillRect(px+4,py+4,4,4);ctx.fillRect(px+9,py+4,4,4)
      }

      // Particles
      for(const pt of g.pts){const a=pt.l/pt.ml;ctx.globalAlpha=a;ctx.fillStyle=pt.c;ctx.shadowColor=pt.c;ctx.shadowBlur=4;ctx.beginPath();ctx.arc(pt.x,pt.y,pt.r*a,0,P2);ctx.fill()}
      ctx.shadowBlur=0;ctx.globalAlpha=1
      // Rings
      for(const r of g.rings){if(r.a<0.01)continue;ctx.globalAlpha=r.a;ctx.strokeStyle=r.c;ctx.lineWidth=Math.max(0.5,r.lw||2);ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,P2);ctx.stroke()}
      ctx.globalAlpha=1

      // HUD - progress bar
      ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(0,0,W,40)
      // Progress bar
      const barX=60,barW=W-180,barH=10,barY=15
      ctx.fillStyle='rgba(255,255,255,0.1)';ctx.fillRect(barX,barY,barW,barH)
      ctx.fillStyle=NC.cy;ctx.shadowColor=NC.cy;ctx.shadowBlur=6
      ctx.fillRect(barX,barY,barW*Math.min(uProg/100,1),barH);ctx.shadowBlur=0
      ctx.fillStyle='#fff';ctx.font="bold 11px 'Fredoka One',sans-serif";ctx.textAlign='center'
      ctx.fillText(`${uProg}%`,barX+barW/2,barY+barH-1)
      // Back btn
      ctx.textAlign='left';ctx.fillStyle='rgba(255,255,255,0.6)';ctx.font="14px 'Fredoka One',sans-serif"
      ctx.fillText('←',14,24)
      // Diamond count + level
      ctx.textAlign='right';ctx.fillStyle=NC.go;ctx.font="bold 12px 'Fredoka One',sans-serif"
      ctx.fillText(`💎 ${uDia}`,W-14,18)
      ctx.fillStyle=NC.pu;ctx.fillText(`Lv ${g.level}`,W-14,34)

      // Idle overlay
      if(phR.current==='idle'){
        ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(0,0,W,H)
        const pl=0.9+Math.sin(ts/400)*0.1;ctx.save();ctx.translate(W/2,H/2);ctx.scale(pl,pl)
        ctx.fillStyle='#fff';ctx.shadowColor=NC.cy;ctx.shadowBlur=15;ctx.font="bold 22px 'Fredoka One',sans-serif";ctx.textAlign='center'
        ctx.fillText('TAP UNTUK MULAI',0,-8);ctx.shadowBlur=6;ctx.fillStyle=NC.pu;ctx.font="13px 'Fredoka One',sans-serif"
        ctx.fillText('💎 Neon Dash',0,18);ctx.shadowBlur=0;ctx.restore()
      }

      ctx.restore()
    }catch(e){console.error('ND:',e)}
      aRef.current=requestAnimationFrame(loop)
    }
    aRef.current=requestAnimationFrame(loop)
    return()=>{cancelAnimationFrame(aRef.current);c.removeEventListener('click',oM);c.removeEventListener('touchstart',oT);window.removeEventListener('keydown',oK);window.removeEventListener('keyup',oKU)}
  },[difficulty.id])

  const restart=()=>{const{w,h}=szCvs();gR.current=mkGame(w,h);sP('idle');setUScore(0);setULevel(1);setUProg(0);setUDia('0/0');setUDeaths(0);setShowConf(false)}
  const stars=phase==='won'?3:0
  const coinR=phase==='won'?({easy:20,medium:40,hard:65}[difficulty.id]||20)+Math.floor(uScore/150)+(stars===3?30:0):Math.max(5,Math.floor(uScore/200))
  const DL={easy:'🟢 Mudah',medium:'🟡 Sedang',hard:'🔴 Sulit'}

  return(
    <div style={{width:'100%',height:typeof CSS!=='undefined'&&CSS.supports('height','100dvh')?'100dvh':'100vh',background:'#0a0a2e',position:'relative',overflow:'hidden',userSelect:'none',fontFamily:"'Fredoka One',cursive"}}>
      {showTut&&<TutorialModal steps={TUT} storageKey="bp_tut_neon-dash" onClose={()=>setShowTut(false)}/>}
      {showConf&&<Confetti/>}
      <div style={{position:'absolute',top:8,left:8,zIndex:20}}>
        <button onClick={onBack} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',borderRadius:10,padding:'7px 13px',fontSize:15,cursor:'pointer'}}>←</button>
      </div>
      <div style={{position:'absolute',inset:0,zIndex:1}}>
        <canvas ref={cRef} style={{width:'100%',height:'100%',display:'block',touchAction:'none'}}/>
      </div>

      {(phase==='won'||phase==='lost')&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:20,animation:'ndF 0.3s ease'}}>
          <div style={{background:'linear-gradient(180deg,#0d0d30,#1a1a3e)',borderRadius:28,padding:'36px 28px',textAlign:'center',maxWidth:380,width:'100%',boxShadow:`0 0 60px ${NC.cy}33`,animation:'ndP 0.45s cubic-bezier(0.34,1.56,0.64,1)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${NC.cy},${NC.pu},${NC.go})`}}/>
            <div style={{fontSize:52,marginBottom:8}}>🏆</div>
            <h2 style={{color:'#fff',fontSize:26,marginBottom:4}}>CLEAR!</h2>
            <p style={{color:NC.pu,fontSize:13,marginBottom:12}}>{cfg.maxLevel} level selesai!</p>
            <span style={{display:'inline-block',background:'rgba(162,155,254,0.15)',color:NC.pu,padding:'4px 14px',borderRadius:100,fontSize:13,fontWeight:700,marginBottom:14}}>{DL[difficulty.id]}</span>
            <div style={{fontSize:30,marginBottom:12,letterSpacing:8}}>{[0,1,2].map(i=><span key={i}>⭐</span>)}</div>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(253,203,110,0.12)',border:'1.5px solid #FDCB6E44',borderRadius:100,padding:'6px 18px',marginBottom:16}}><span>🪙</span><span style={{color:'#F9A825',fontSize:16,fontWeight:800}}>+{coinR}</span></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:24}}>
              <div style={{background:`${NC.go}10`,borderRadius:14,padding:'12px 8px'}}><div style={{fontSize:22,color:NC.go}}>{uScore}</div><div style={{fontSize:10,color:'#888',marginTop:2}}>Skor</div></div>
              <div style={{background:`${NC.cy}10`,borderRadius:14,padding:'12px 8px'}}><div style={{fontSize:22,color:NC.cy}}>Lv {uLevel}</div><div style={{fontSize:10,color:'#888',marginTop:2}}>Level</div></div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={restart} style={{flex:1,background:`linear-gradient(135deg,${NC.cy},${NC.pu})`,color:'#fff',border:'none',borderRadius:100,padding:'13px 18px',fontSize:15,fontWeight:800,cursor:'pointer'}}>🔄 Main Lagi</button>
              <button onClick={onBack} style={{flex:1,background:'#1e2a4a',color:'#aaa',border:'2px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'13px 18px',fontSize:15,fontWeight:800,cursor:'pointer'}}>🎯 Ganti Level</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes ndF{from{opacity:0}to{opacity:1}}@keyframes ndP{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}
