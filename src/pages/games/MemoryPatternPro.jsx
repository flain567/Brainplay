import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
const TUT=[
  {emoji:'🧠',title:'Memory Pattern Pro',desc:'Game premium BrainPlay! Ingat pola yang muncul di grid, lalu ulangi dengan urutan yang tepat.',tip:'Ini game flagship — siapkan konsentrasi penuhmu!'},
  {emoji:'👀',title:'Cara Main',desc:'Sel-sel akan menyala satu per satu. Perhatikan urutannya, lalu tap sel dengan urutan yang sama!',tip:'Fokus pada POSISI sel — polanya selalu berubah!'},
  {emoji:'⚡',title:'Boss Level',desc:'Setiap 5 level, hadapi Boss Level! Pola lebih cepat, efek distraksi, dan skor bonus besar!',tip:'Di Boss Level, tetap tenang — jangan terburu-buru!'},
  {emoji:'🔥',title:'Combo & Replay',desc:'Jawab benar berturut-turut untuk combo multiplier hingga 5×! Gunakan Replay untuk melihat ulang pola.',tip:'2 replay gratis per level, setelah itu -100 poin.'},
]
import{useEffect,useRef,useState}from'react'
import{useSound}from'../../hooks/useSound.js'
import{useProgress}from'../../context/ProgressContext.jsx'
import{useCoins}from'../../context/CoinContext.jsx'

const CFG={
  easy:{lives:4,maxLevel:15,showMs:700,gapMs:220,bShowMs:500,bGapMs:160,repFree:3},
  medium:{lives:3,maxLevel:20,showMs:550,gapMs:180,bShowMs:380,bGapMs:120,repFree:2},
  hard:{lives:2,maxLevel:25,showMs:400,gapMs:140,bShowMs:280,bGapMs:100,repFree:1},
}
const N={cy:'#00F5FF',pu:'#A29BFE',gr:'#00B894',pk:'#FF6B9D',go:'#FFD700',re:'#FF4757',or:'#FF6348'}
const GCOL=[N.cy,N.pk,N.gr,'#FDCB6E',N.pu,'#55EFC4','#FF6B6B','#FD79A8']
const BCOL=[N.or,N.re,'#FF6B6B','#E17055']
const rnd=(a,b)=>a+Math.random()*(b-a), clp=(v,a,b)=>Math.max(a,Math.min(b,v)), lrp=(a,b,t)=>a+(b-a)*t, P2=Math.PI*2

function rr(c,x,y,w,h,r){w=Math.max(w,1);h=Math.max(h,1);r=Math.max(0,Math.min(r||0,w/2,h/2));if(r<1){c.rect(x,y,w,h);return}c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function lCfg(l){if(l<=4)return{g:3,p:clp(3+Math.floor((l-1)*0.6),3,5)};if(l<=9)return{g:4,p:clp(4+Math.floor((l-5)*0.5),4,7)};if(l<=14)return{g:5,p:clp(6+Math.floor((l-10)*0.6),6,9)};if(l<=20)return{g:6,p:clp(8+Math.floor((l-15)*0.6),8,12)};return{g:6,p:clp(10+Math.floor((l-20)*0.5),10,14)}}

export default function MemoryPatternPro({onBack,game,difficulty}){
  const cRef=useRef(null),aRef=useRef(null),phR=useRef('idle'),gR=useRef(null)
  const{play}=useSound(),{reportGameResult}=useProgress(),{earnCoins}=useCoins()
  const cfg=CFG[difficulty.id]
  const[phase,_sP]=useState('idle')
  const[showTut,setShowTut]=useState(()=>!localStorage.getItem('bp_tut_memory-pattern'))
  const[showConf,setShowConf]=useState(false)
  const[uS,setUS]=useState(0)
  const[uLv,setULv]=useState(1)
  const[uLi,setULi]=useState(cfg.lives)
  const[uCo,setUCo]=useState(0)
  const[rzKey,setRzKey]=useState(0)
  const sP=p=>{phR.current=p;_sP(p)}

  // Resize handler
  useEffect(()=>{
    let t=null
    const onRz=()=>{clearTimeout(t);t=setTimeout(()=>setRzKey(k=>k+1),250)}
    window.addEventListener('resize',onRz)
    const onOr=()=>setTimeout(onRz,200)
    window.addEventListener('orientationchange',onOr)
    return()=>{clearTimeout(t);window.removeEventListener('resize',onRz);window.removeEventListener('orientationchange',onOr)}
  },[])

  // Canvas sizing — EXACT SpaceShooter pattern
  function szCvs(){
    const c=cRef.current;if(!c)return{w:300,h:500}
    const par=c.parentElement;if(!par)return{w:300,h:500}
    const rc=par.getBoundingClientRect()
    const dpr=Math.min(window.devicePixelRatio||1,2)
    const w=Math.floor(rc.width)||window.innerWidth,h=Math.floor(rc.height)||window.innerHeight
    c.width=w*dpr;c.height=h*dpr
    c.style.width=w+'px';c.style.height=h+'px'
    const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0)
    return{w,h}
  }

  function mkGrid(W,H,gs){
    const pX=20,pT=65,pB=55,aW=Math.max(W-pX*2,80),aH=Math.max(H-pT-pB,80)
    const mx=Math.min(aW,aH),gap=Math.max(4,10-gs)
    const cs=Math.max(16,(mx-(gs-1)*gap)/gs),tW=gs*cs+(gs-1)*gap
    const oX=(W-tW)/2,oY=pT+(aH-tW)/2
    const cells=[]
    for(let r=0;r<gs;r++)for(let c=0;c<gs;c++){const x=oX+c*(cs+gap),y=oY+r*(cs+gap)
      cells.push({x,y,w:cs,h:cs,cx:x+cs/2,cy:y+cs/2,i:r*gs+c,gA:0,pu:Math.random()*P2,hA:0,hC:N.cy,ts:1,oF:0,eF:0})}
    return{sz:gs,cells,cs,gap,oX,oY,tW}
  }
  function mkPat(gs,len){const t=gs*gs,p=[];for(let i=0;i<len;i++){let v;do{v=Math.floor(Math.random()*t)}while(p.length>0&&p[p.length-1]===v);p.push(v)};return p}

  function mkGame(W,H){const l=lCfg(1);return{W,H,lv:1,sc:0,li:cfg.lives,co:0,mxCo:0,
    gr:mkGrid(W,H,l.g),pat:mkPat(l.g,l.p),pIn:[],sI:-1,sT:0,boss:false,rCnt:0,
    rBtn:{x:0,y:0,w:0,h:0,v:false},
    pts:[],rings:[],flt:[],
    bg:Array.from({length:25},()=>({x:rnd(0,W),y:rnd(0,H),dx:rnd(-0.2,0.2),dy:rnd(-0.2,0.2),r:rnd(1,2.5),a:rnd(0.04,0.12),c:GCOL[Math.floor(Math.random()*GCOL.length)]})),
    shk:0,bG:0,lA:0,lT:'',bI:0,iSt:0,bFl:0}}

  useEffect(()=>{
    const{w:W,h:H}=szCvs()
    const c=cRef.current;if(!c)return
    const ctx=c.getContext('2d')
    const g=mkGame(W,H);gR.current=g
    setUS(0);setULi(cfg.lives);setULv(1);setUCo(0)

    // VFX
    function sP2(x,y,col,n){for(let i=0;i<n;i++){const a=P2*Math.random(),s=rnd(1.5,4);g.pts.push({x,y,dx:Math.cos(a)*s,dy:Math.sin(a)*s,l:rnd(20,35),ml:35,r:rnd(2,4),c:col})}}
    function sRi(x,y,mr,col){g.rings.push({x,y,r:5,mr,a:0.8,c:col,lw:2.5})}
    function sFl(x,y,t,col){g.flt.push({x,y,t,c:col,l:55,ml:55,dy:-1.2})}

    function stLvl(){
      const lc=lCfg(g.lv);g.boss=g.lv%5===0&&g.lv>1
      g.gr=mkGrid(W,H,lc.g);g.pat=mkPat(lc.g,lc.p)
      g.pIn=[];g.sI=-1;g.sT=0;g.rCnt=0;g.rBtn.v=false
      if(g.boss){g.bI=1;sP('bossIntro')}
      else{g.lT=g.lv===1?'START!':`LEVEL ${g.lv}`;g.lA=1;sP('levelUp')}
    }
    function bShow(){g.sI=0;g.sT=0;sP('showing')}
    function bInp(){
      g.pIn=[];g.iSt=Date.now()
      const by=g.gr.oY+g.gr.tW+10
      g.rBtn={x:W/2-50,y:Math.min(by,H-50),w:100,h:32,v:true}
      if(g.boss)g.bFl=20;sP('input')
    }
    function doRep(){
      g.rCnt++;if(g.rCnt>cfg.repFree){g.sc=Math.max(0,g.sc-100);sFl(W/2,g.rBtn.y-10,'-100',N.re)}
      g.sI=0;g.sT=0;g.pIn=[];sP('showing');try{play('flip')}catch(e){}
    }
    function hInp(ci){
      const exp=g.pat[g.pIn.length];if(exp===undefined)return
      const cell=ci<g.gr.cells.length?g.gr.cells[ci]:null
      if(cell){cell.ts=1.12;cell.hA=1;cell.hC=N.cy;sRi(cell.cx,cell.cy,35,'#fff')}
      if(ci===exp){
        g.pIn.push(ci);if(cell){cell.oF=1;sP2(cell.cx,cell.cy,N.gr,4)}
        try{play('flip')}catch(e){}
        if(g.pIn.length===g.pat.length)onDone()
      }else onWrong(ci,exp)
    }
    function onDone(){
      g.co++;g.mxCo=Math.max(g.mxCo,g.co)
      const mu=Math.min(1+g.co*0.4,5),sp=Math.max(0,3000-(Date.now()-g.iSt))/100
      const p=Math.round((100+sp+g.lv*10+(g.boss?200:0))*mu);g.sc+=p
      sFl(W/2,g.gr.oY-12,`+${p}`,N.go)
      if(g.co>=3)sFl(W/2,g.gr.oY-35,`🔥 ${g.co}× COMBO`,N.go)
      for(const i of g.pat){const cc=i<g.gr.cells.length?g.gr.cells[i]:null;if(cc)sP2(cc.cx,cc.cy,N.cy,2)}
      sRi(W/2,g.gr.oY+g.gr.tW/2,g.boss?160:90,g.boss?N.go:N.cy)
      try{play(g.boss?'win':'match')}catch(e){}
      setUS(g.sc);setUCo(g.co)
      if(g.lv+1>cfg.maxLevel){setTimeout(()=>{sP('won');setShowConf(true);fin(true)},500)}
      else{g.lv++;setULv(g.lv);setTimeout(stLvl,700)}
    }
    function onWrong(wi,ci){
      g.co=0;g.li--;setUCo(0);setULi(g.li)
      const wc=wi<g.gr.cells.length?g.gr.cells[wi]:null;if(wc){wc.eF=1;sP2(wc.cx,wc.cy,N.re,7)}
      const cc=ci<g.gr.cells.length?g.gr.cells[ci]:null;if(cc){cc.oF=1;cc.hA=1;cc.hC=N.gr}
      g.shk=10;sFl(W/2,g.gr.oY+g.gr.tW/2,'❌ SALAH!',N.re)
      try{play('mismatch')}catch(e){}
      if(g.li<=0)setTimeout(()=>{sP('lost');fin(false)},800)
      else setTimeout(stLvl,1200)
    }
    function fin(won){
      const st=won?(g.li>=cfg.lives?3:g.li>=cfg.lives-1?2:1):0
      const cb={easy:25,medium:45,hard:70}
      let co=(cb[difficulty.id]||25)+Math.floor(g.sc/200);if(st===3)co+=35;if(!won)co=Math.max(5,Math.floor(g.sc/150))
      earnCoins(co,`Memory Pattern Pro (${difficulty.id})`)
      reportGameResult({gameId:'memory-pattern',difficultyId:difficulty.id,won,score:g.sc,stars:Math.max(st,won?1:0),timeSec:0})
      const bk=`memory-pattern-best-${difficulty.id}`,pv=parseInt(localStorage.getItem(bk)||'0')
      if(g.sc>pv)localStorage.setItem(bk,g.sc)
    }

    // Input
    function tapAt(cx,cy){
      if(phR.current==='idle'){stLvl();return}
      if(phR.current!=='input')return
      const b=g.rBtn;if(b.v&&cx>=b.x&&cx<=b.x+b.w&&cy>=b.y&&cy<=b.y+b.h){doRep();return}
      for(const cl of g.gr.cells){if(cx>=cl.x&&cx<=cl.x+cl.w&&cy>=cl.y&&cy<=cl.y+cl.h){hInp(cl.i);return}}
    }
    const oM=e=>{const r=c.getBoundingClientRect();tapAt(e.clientX-r.left,e.clientY-r.top)}
    const oT=e=>{e.preventDefault();const t=e.touches[0],r=c.getBoundingClientRect();tapAt(t.clientX-r.left,t.clientY-r.top)}
    c.addEventListener('click',oM);c.addEventListener('touchstart',oT,{passive:false})

    // GAME LOOP
    let lt=0
    function loop(ts){try{
      const dt=Math.min((ts-lt)/16.667,2.5);lt=ts;const p=phR.current
      // bg dots
      for(const d of g.bg){d.x+=d.dx*dt;d.y+=d.dy*dt;if(d.x<-5)d.x=W+5;if(d.x>W+5)d.x=-5;if(d.y<-5)d.y=H+5;if(d.y>H+5)d.y=-5}
      // cells
      for(const cc of g.gr.cells){cc.pu+=0.02*dt;cc.gA=0.03+Math.sin(cc.pu)*0.02;cc.ts=lrp(cc.ts,1,0.15*dt);cc.hA=lrp(cc.hA,0,0.06*dt);cc.oF=lrp(cc.oF,0,0.04*dt);cc.eF=lrp(cc.eF,0,0.04*dt)}
      // particles
      for(let i=g.pts.length-1;i>=0;i--){const pt=g.pts[i];pt.x+=pt.dx*dt;pt.y+=pt.dy*dt;pt.dy+=0.08*dt;pt.dx*=0.98;pt.l-=dt;if(pt.l<=0)g.pts.splice(i,1)}
      for(let i=g.rings.length-1;i>=0;i--){const r=g.rings[i];r.r+=2.5*dt;r.a=0.8*(1-r.r/r.mr);r.lw*=0.98;if(r.r>=r.mr)g.rings.splice(i,1)}
      for(let i=g.flt.length-1;i>=0;i--){const f=g.flt[i];f.y+=f.dy*dt;f.l-=dt;if(f.l<=0)g.flt.splice(i,1)}
      if(g.shk>0){g.shk*=(1-0.08*dt);if(g.shk<0.3)g.shk=0}
      g.bG=(g.boss&&(p==='showing'||p==='input'||p==='bossIntro'))?0.12+Math.sin(ts/300)*0.08:lrp(g.bG,0,0.05*dt)
      // phases
      if(p==='levelUp'){g.lA-=0.02*dt;if(g.lA<=0)bShow()}
      if(p==='bossIntro'){g.bI-=0.014*dt;if(g.bI<=0)bShow()}
      if(p==='showing'){
        const sMs=g.boss?cfg.bShowMs:cfg.showMs,gMs=g.boss?cfg.bGapMs:cfg.gapMs
        const sT=sMs/16.667,gT=gMs/16.667
        if(g.sI>=0&&g.sI<g.pat.length){
          g.sT+=dt;const ci=g.pat[g.sI]
          if(ci!==undefined&&ci<g.gr.cells.length){
            const cell=g.gr.cells[ci]
            if(g.sT<sT){cell.hA=1;cell.hC=g.boss?BCOL[g.sI%BCOL.length]:GCOL[g.sI%GCOL.length]
              if(g.sT<2){sP2(cell.cx,cell.cy,cell.hC,5);sRi(cell.cx,cell.cy,g.gr.cs*1.1,cell.hC)}}
          }
          if(g.sT>=sT+gT){g.sT=0;g.sI++}
        }else if(g.sI>=g.pat.length){bInp()}
      }
      if(p==='input'&&g.boss&&g.bFl>0){g.bFl-=dt;if(Math.random()<0.1){const rc=g.gr.cells[Math.floor(Math.random()*g.gr.cells.length)];if(rc){rc.hA=0.2;rc.hC=BCOL[Math.floor(Math.random()*BCOL.length)]}}}

      // DRAW
      const sx=g.shk>0?(Math.random()-0.5)*g.shk*2:0,sy=g.shk>0?(Math.random()-0.5)*g.shk*2:0
      ctx.save();ctx.translate(sx,sy)
      ctx.fillStyle='#060620';ctx.fillRect(-5,-5,W+10,H+10)
      if(g.bG>0.01){ctx.fillStyle=`rgba(255,67,87,${g.bG})`;ctx.fillRect(-5,-5,W+10,H+10)}
      // grid lines
      ctx.strokeStyle='rgba(162,155,254,0.03)';ctx.lineWidth=0.5
      for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
      for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
      // bg dots
      for(const d of g.bg){ctx.globalAlpha=d.a;ctx.fillStyle=d.c;ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,P2);ctx.fill()}
      ctx.globalAlpha=1
      // cells
      const cr=Math.max(4,g.gr.cs*0.12)
      for(const cc of g.gr.cells){
        ctx.save()
        if(cc.ts!==1){ctx.translate(cc.cx,cc.cy);ctx.scale(cc.ts,cc.ts);ctx.translate(-cc.cx,-cc.cy)}
        ctx.fillStyle='#12123a';ctx.strokeStyle='#2a2a5a';ctx.lineWidth=1.5;ctx.beginPath();rr(ctx,cc.x,cc.y,cc.w,cc.h,cr);ctx.fill();ctx.stroke()
        ctx.fillStyle=`rgba(162,155,254,${cc.gA})`;ctx.beginPath();rr(ctx,cc.x,cc.y,cc.w,cc.h,cr);ctx.fill()
        if(cc.hA>0.02){ctx.globalAlpha=cc.hA*0.8;ctx.fillStyle=cc.hC;ctx.shadowColor=cc.hC;ctx.shadowBlur=18*cc.hA;ctx.beginPath();rr(ctx,cc.x+2,cc.y+2,cc.w-4,cc.h-4,Math.max(1,cr-1));ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.fillStyle=`rgba(255,255,255,${cc.hA*0.3})`;ctx.beginPath();rr(ctx,cc.x+cc.w*0.15,cc.y+cc.h*0.1,cc.w*0.7,cc.h*0.3,cr*0.4);ctx.fill()}
        if(cc.oF>0.02){ctx.globalAlpha=cc.oF*0.5;ctx.fillStyle=N.gr;ctx.shadowColor=N.gr;ctx.shadowBlur=12;ctx.beginPath();rr(ctx,cc.x,cc.y,cc.w,cc.h,cr);ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1}
        if(cc.eF>0.02){ctx.globalAlpha=cc.eF*0.5;ctx.fillStyle=N.re;ctx.shadowColor=N.re;ctx.shadowBlur=18;ctx.beginPath();rr(ctx,cc.x,cc.y,cc.w,cc.h,cr);ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1}
        ctx.restore()
      }
      // rings
      for(const r of g.rings){if(r.a<0.01)continue;ctx.globalAlpha=r.a;ctx.strokeStyle=r.c;ctx.lineWidth=Math.max(0.5,r.lw);ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,P2);ctx.stroke()}
      ctx.globalAlpha=1
      // particles
      for(const pt of g.pts){const a=pt.l/pt.ml;ctx.globalAlpha=a;ctx.fillStyle=pt.c;ctx.shadowColor=pt.c;ctx.shadowBlur=4;ctx.beginPath();ctx.arc(pt.x,pt.y,pt.r*a,0,P2);ctx.fill()}
      ctx.shadowBlur=0;ctx.globalAlpha=1
      // floats
      for(const f of g.flt){ctx.globalAlpha=f.l/f.ml;ctx.fillStyle=f.c;ctx.shadowColor=f.c;ctx.shadowBlur=5;ctx.font="bold 14px 'Fredoka One',sans-serif";ctx.textAlign='center';ctx.fillText(f.t,f.x,f.y)}
      ctx.shadowBlur=0;ctx.globalAlpha=1
      // replay btn
      if(phR.current==='input'&&g.rBtn.v){const b=g.rBtn,fr=g.rCnt<cfg.repFree;ctx.fillStyle=fr?'rgba(162,155,254,0.15)':'rgba(255,107,107,0.1)';ctx.strokeStyle=fr?'rgba(162,155,254,0.4)':'rgba(255,107,107,0.3)';ctx.lineWidth=1.5;ctx.beginPath();rr(ctx,b.x,b.y,b.w,b.h,16);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font="bold 11px 'Fredoka One',sans-serif";ctx.textAlign='center';ctx.fillText(fr?`👁 Replay (${cfg.repFree-g.rCnt})`:'👁 Replay (-100)',b.x+b.w/2,b.y+b.h/2+4)}
      // HUD
      ctx.fillStyle='rgba(6,6,32,0.75)';ctx.fillRect(0,0,W,52);ctx.fillStyle='rgba(162,155,254,0.06)';ctx.fillRect(0,50,W,2)
      ctx.textAlign='left';ctx.font="bold 13px 'Fredoka One',sans-serif";ctx.fillStyle=g.boss?N.re:N.cy;ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=3;ctx.fillText(g.boss?`⚡ Lv ${g.lv}`:`🧠 Lv ${g.lv}`,12,20);ctx.shadowBlur=0
      if(p==='input'||p==='showing'){const dR=2.5,dG=7;for(let i=0;i<g.pat.length;i++){const dn=p==='input'?i<g.pIn.length:i<=g.sI;ctx.fillStyle=dn?N.gr:'rgba(255,255,255,0.1)';if(dn){ctx.shadowColor=N.gr;ctx.shadowBlur=3}ctx.beginPath();ctx.arc(12+i*dG,38,dR,0,P2);ctx.fill();ctx.shadowBlur=0}}
      ctx.textAlign='right';ctx.fillStyle=N.go;ctx.shadowColor=N.go;ctx.shadowBlur=3;ctx.font="bold 15px 'Fredoka One',sans-serif";ctx.fillText(g.sc.toLocaleString(),W-12,21);ctx.shadowBlur=0
      ctx.font='13px serif';let hrt='';for(let i=0;i<cfg.lives;i++)hrt+=i<g.li?'❤️':'🖤';ctx.fillText(hrt,W-12,40)
      if(g.co>=2){ctx.textAlign='center';ctx.fillStyle=N.go;ctx.shadowColor=N.go;ctx.shadowBlur=5+Math.sin(ts/150)*3;ctx.font="bold 12px 'Fredoka One',sans-serif";ctx.fillText(`🔥 ${g.co}× (${Math.min(1+g.co*0.4,5).toFixed(1)}×)`,W/2,20);ctx.shadowBlur=0}
      if(p==='showing'||p==='input'){ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font="9px 'Fredoka One',sans-serif";ctx.fillText(`${g.gr.sz}×${g.gr.sz} • ${g.pat.length} pola`,W/2,44)}
      // level up
      if(p==='levelUp'&&g.lA>0){const t=1-g.lA,sc=t<0.3?(t/0.3)*1.1:t<0.5?lrp(1.1,1,(t-0.3)/0.2):1,al=t>0.85?1-(t-0.85)/0.15:1;ctx.save();ctx.translate(W/2,H/2);ctx.scale(sc,sc);ctx.globalAlpha=al;ctx.fillStyle='#fff';ctx.shadowColor=N.cy;ctx.shadowBlur=20;ctx.font="bold 30px 'Fredoka One',sans-serif";ctx.textAlign='center';ctx.fillText(g.lT,0,10);ctx.shadowBlur=0;ctx.restore()}
      // boss intro
      if(p==='bossIntro'&&g.bI>0){const t=1-g.bI;ctx.fillStyle=`rgba(0,0,0,${Math.min(t*2,0.4)})`;ctx.fillRect(-5,-5,W+10,H+10);const al=t>0.85?1-(t-0.85)/0.15:Math.min(t*3,1);ctx.save();ctx.globalAlpha=al;ctx.translate(Math.sin(ts/50)*2*(1-t),0);ctx.fillStyle=N.re;ctx.shadowColor=N.re;ctx.shadowBlur=30;ctx.font="bold 34px 'Fredoka One',sans-serif";ctx.textAlign='center';ctx.fillText('⚡ BOSS ⚡',W/2,H/2-8);ctx.shadowBlur=10;ctx.fillStyle='#fff';ctx.font="bold 16px 'Fredoka One',sans-serif";ctx.fillText(`Level ${g.lv}`,W/2,H/2+20);ctx.shadowBlur=0;ctx.restore()}
      // idle
      if(p==='idle'){ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(0,0,W,H);const pl=0.9+Math.sin(ts/400)*0.1;ctx.save();ctx.translate(W/2,H/2);ctx.scale(pl,pl);ctx.fillStyle='#fff';ctx.shadowColor=N.cy;ctx.shadowBlur=15;ctx.font="bold 20px 'Fredoka One',sans-serif";ctx.textAlign='center';ctx.fillText('TAP UNTUK MULAI',0,-8);ctx.shadowBlur=6;ctx.fillStyle=N.pu;ctx.font="12px 'Fredoka One',sans-serif";ctx.fillText('🧠 Memory Pattern Pro',0,16);ctx.shadowBlur=0;ctx.restore()}
      ctx.restore()
    }catch(e){console.error('MPP:',e)}
      aRef.current=requestAnimationFrame(loop)
    }
    aRef.current=requestAnimationFrame(loop)
    return()=>{cancelAnimationFrame(aRef.current);c.removeEventListener('click',oM);c.removeEventListener('touchstart',oT)}
  },[difficulty.id,rzKey])

  const restart=()=>{const{w:W,h:H}=szCvs();gR.current=mkGame(W,H);sP('idle');setUS(0);setULi(cfg.lives);setULv(1);setUCo(0);setShowConf(false)}
  const stars=phase==='won'?(uLi>=cfg.lives?3:uLi>=cfg.lives-1?2:1):0
  const coinR=phase==='won'?({easy:25,medium:45,hard:70}[difficulty.id]||25)+Math.floor(uS/200)+(stars===3?35:0):Math.max(5,Math.floor(uS/150))
  const DL={easy:'🟢 Mudah',medium:'🟡 Sedang',hard:'🔴 Sulit'}

  return(
    <div style={{width:'100%',height:typeof CSS!=='undefined'&&CSS.supports('height','100dvh')?'100dvh':'100vh',background:'#060620',position:'relative',overflow:'hidden',userSelect:'none',fontFamily:"'Fredoka One',cursive"}}>
      {showTut&&<TutorialModal steps={TUT} storageKey="bp_tut_memory-pattern" onClose={()=>setShowTut(false)}/>}
      {showConf&&<Confetti/>}
      <div style={{position:'absolute',top:8,left:10,zIndex:20}}>
        <button onClick={onBack} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',borderRadius:10,padding:'7px 13px',fontSize:15,cursor:'pointer'}}>←</button>
      </div>
      <div style={{position:'absolute',inset:0,zIndex:1}}>
        <canvas ref={cRef} style={{width:'100%',height:'100%',display:'block',touchAction:'none'}}/>
      </div>

      {(phase==='won'||phase==='lost')&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:20,animation:'mF 0.3s ease'}}>
          <div style={{background:'linear-gradient(180deg,#0d0d30,#1a1a3e)',borderRadius:28,padding:'36px 28px',textAlign:'center',maxWidth:380,width:'100%',boxShadow:phase==='won'?`0 0 60px ${N.cy}33, 0 24px 80px rgba(0,0,0,0.5)`:'0 24px 80px rgba(0,0,0,0.5)',animation:'mP 0.45s cubic-bezier(0.34,1.56,0.64,1)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:phase==='won'?`linear-gradient(90deg,${N.cy},${N.pu},${N.go})`:`linear-gradient(90deg,${N.re},#FF6B6B,${N.re})`}}/>
            <div style={{fontSize:52,marginBottom:8,animation:'mB 0.6s ease'}}>{phase==='won'?'🏆':'💥'}</div>
            <h2 style={{color:'#fff',fontSize:26,marginBottom:4}}>{phase==='won'?'SEMPURNA!':'Game Over'}</h2>
            <p style={{color:N.pu,fontSize:13,marginBottom:8}}>{phase==='won'?`${cfg.maxLevel} level ditaklukkan!`:`Sampai Level ${uLv}`}</p>
            <span style={{display:'inline-block',background:'rgba(162,155,254,0.15)',color:N.pu,padding:'4px 14px',borderRadius:100,fontSize:13,fontWeight:700,marginBottom:14}}>{DL[difficulty.id]}</span>
            {phase==='won'&&<div style={{fontSize:30,marginBottom:12,letterSpacing:8}}>{[0,1,2].map(i=><span key={i} style={{display:'inline-block',animation:i<stars?`mS 0.4s ${0.2+i*0.15}s cubic-bezier(0.34,1.56,0.64,1) both`:'none',opacity:i<stars?1:0.25,filter:i<stars?'none':'grayscale(1)'}}>{i<stars?'⭐':'☆'}</span>)}</div>}
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(253,203,110,0.12)',border:'1.5px solid #FDCB6E44',borderRadius:100,padding:'6px 18px',marginBottom:16}}><span>🪙</span><span style={{color:'#F9A825',fontSize:16,fontWeight:800}}>+{coinR}</span></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:24}}>
              {[{l:'Skor',v:uS.toLocaleString(),c:N.go},{l:'Max Combo',v:`${gR.current?.mxCo||0}×`,c:N.cy},{l:'Nyawa',v:uLi,c:uLi>0?N.gr:N.re}].map(s=>(
                <div key={s.l} style={{background:`${s.c}10`,borderRadius:14,padding:'12px 8px'}}><div style={{fontSize:22,color:s.c}}>{s.v}</div><div style={{fontSize:10,color:'#888',marginTop:2}}>{s.l}</div></div>
              ))}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={restart} style={{flex:1,background:`linear-gradient(135deg,${N.cy},${N.pu})`,color:'#fff',border:'none',borderRadius:100,padding:'13px 18px',fontSize:15,fontWeight:800,cursor:'pointer',boxShadow:`0 4px 20px ${N.cy}44`}}>🔄 Main Lagi</button>
              <button onClick={onBack} style={{flex:1,background:'#1e2a4a',color:'#aaa',border:'2px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'13px 18px',fontSize:15,fontWeight:800,cursor:'pointer'}}>🎯 Ganti Level</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes mF{from{opacity:0}to{opacity:1}}@keyframes mP{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}@keyframes mB{0%{transform:scale(0.3)}60%{transform:scale(1.15)}100%{transform:scale(1)}}@keyframes mS{from{transform:scale(0) rotate(-20deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}`}</style>
    </div>
  )
}
