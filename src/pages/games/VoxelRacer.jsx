import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
const TUT=[
  {emoji:'🚗',title:'Voxel Racer',desc:'Balapan mobil 3D voxel! Hindari rintangan, kumpulkan koin, dan capai garis finish!',tip:'Game flagship ke-3 BrainPlay!'},
  {emoji:'🕹️',title:'Kontrol',desc:'GESER KIRI/KANAN atau panah untuk pindah jalur. TAP/SPASI untuk lompat!',tip:'Ada 3 jalur — pindah tepat waktu!'},
  {emoji:'💰',title:'Koin & Skor',desc:'Kumpulkan koin emas di jalan. Semakin jauh, semakin cepat & semakin banyak poin!',tip:'Lompat untuk hindari rintangan rendah dan ambil koin tinggi!'},
]
import{useEffect,useRef,useState,useCallback}from'react'
import{useSound}from'../../hooks/useSound.js'
import{useProgress}from'../../context/ProgressContext.jsx'
import{useCoins}from'../../context/CoinContext.jsx'
import*as THREE from'three'

const DC={
  easy:  {spd:0.25,si:0.008,ml:6, obstRate:0.025,coinRate:0.04},
  medium:{spd:0.32,si:0.012,ml:10,obstRate:0.035,coinRate:0.035},
  hard:  {spd:0.40,si:0.018,ml:14,obstRate:0.05, coinRate:0.03},
}
const LANE_W=2.2, LANES=[-LANE_W,0,LANE_W]
const ROAD_W=LANE_W*3+1.5, ROAD_LEN=200
const COLORS={
  sky:0x87CEEB, grass:0x4CAF50, road:0x37474F, roadLine:0xFFFFFF,
  car:0xFFD93D, carDark:0xE6A817, carWindow:0x29B6F6, carWheel:0x212121,
  obst:[0xE53935,0x7B1FA2,0x1565C0,0xEF6C00,0x2E7D32],
  coin:0xFFD700, coinGlow:0xFFF176,
  build:[0xFFCDD2,0xC5CAE9,0xB2DFDB,0xFFF9C4,0xF8BBD0,0xD1C4E9],
  ramp:0x66BB6A,
}
const V3=THREE.Vector3

export default function VoxelRacer({onBack,game,difficulty}){
  const mountRef=useRef(null),aRef=useRef(null),gR=useRef(null),phR=useRef('idle')
  const{play}=useSound(),{reportGameResult}=useProgress(),{earnCoins}=useCoins()
  const dc=DC[difficulty.id]
  const[phase,_sp]=useState('idle')
  const[showTut,setShowTut]=useState(()=>!localStorage.getItem('bp_tut_voxel-racer'))
  const[showConf,setShowConf]=useState(false)
  const[uSc,sSc]=useState(0),[uLv,sLv]=useState(1),[uCo,sCo]=useState(0),[uDist,sDist]=useState(0)
  const sp=p=>{phR.current=p;_sp(p)}

  useEffect(()=>{
    const mount=mountRef.current;if(!mount)return
    const W=mount.clientWidth||window.innerWidth, H=mount.clientHeight||window.innerHeight

    // ═══ THREE.JS SETUP ═══
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false})
    renderer.setSize(W,H);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)
    renderer.domElement.style.touchAction='none'

    const scene=new THREE.Scene()
    scene.background=new THREE.Color(COLORS.sky)
    scene.fog=new THREE.Fog(COLORS.sky,40,120)

    const camera=new THREE.PerspectiveCamera(65,W/H,0.5,150)
    camera.position.set(0,5,-7);camera.lookAt(0,1,10)

    // Lighting
    const amb=new THREE.AmbientLight(0xffffff,0.6);scene.add(amb)
    const sun=new THREE.DirectionalLight(0xffffff,0.8)
    sun.position.set(10,20,10);sun.castShadow=true
    sun.shadow.camera.left=-30;sun.shadow.camera.right=30;sun.shadow.camera.top=30;sun.shadow.camera.bottom=-30
    sun.shadow.mapSize.set(1024,1024);scene.add(sun)

    // ═══ WORLD ═══
    // Ground
    const groundGeo=new THREE.PlaneGeometry(100,ROAD_LEN*2)
    const groundMat=new THREE.MeshLambertMaterial({color:COLORS.grass})
    const ground=new THREE.Mesh(groundGeo,groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-0.01
    ground.receiveShadow=true;scene.add(ground)

    // Road
    const roadGeo=new THREE.PlaneGeometry(ROAD_W,ROAD_LEN*2)
    const roadMat=new THREE.MeshLambertMaterial({color:COLORS.road})
    const road=new THREE.Mesh(roadGeo,roadMat);road.rotation.x=-Math.PI/2;road.position.y=0.01
    road.receiveShadow=true;scene.add(road)

    // Road lane lines
    for(let i=-1;i<=1;i++){
      const lineGeo=new THREE.PlaneGeometry(0.08,ROAD_LEN*2)
      const lineMat=new THREE.MeshBasicMaterial({color:COLORS.roadLine,transparent:true,opacity:0.4})
      const line=new THREE.Mesh(lineGeo,lineMat)
      line.rotation.x=-Math.PI/2;line.position.set(i*LANE_W,0.02,0);scene.add(line)
    }
    // Road edges
    for(const side of[-1,1]){
      const edgeGeo=new THREE.PlaneGeometry(0.15,ROAD_LEN*2)
      const edgeMat=new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.6})
      const edge=new THREE.Mesh(edgeGeo,edgeMat)
      edge.rotation.x=-Math.PI/2;edge.position.set(side*(ROAD_W/2),0.02,0);scene.add(edge)
    }

    // ═══ CAR (voxel style) ═══
    const carGroup=new THREE.Group()
    // Body
    const bodyGeo=new THREE.BoxGeometry(1.4,0.6,2.2)
    const bodyMat=new THREE.MeshLambertMaterial({color:COLORS.car})
    const body=new THREE.Mesh(bodyGeo,bodyMat);body.position.y=0.5;body.castShadow=true
    carGroup.add(body)
    // Roof/cabin
    const roofGeo=new THREE.BoxGeometry(1.2,0.5,1.0)
    const roofMat=new THREE.MeshLambertMaterial({color:COLORS.carDark})
    const roof=new THREE.Mesh(roofGeo,roofMat);roof.position.set(0,0.95,-0.2);roof.castShadow=true
    carGroup.add(roof)
    // Windshield
    const winGeo=new THREE.BoxGeometry(1.1,0.4,0.05)
    const winMat=new THREE.MeshLambertMaterial({color:COLORS.carWindow,transparent:true,opacity:0.7})
    const windshield=new THREE.Mesh(winGeo,winMat);windshield.position.set(0,0.9,0.32)
    carGroup.add(windshield)
    // Wheels
    const wheelGeo=new THREE.BoxGeometry(0.3,0.3,0.3)
    const wheelMat=new THREE.MeshLambertMaterial({color:COLORS.carWheel})
    const wheelPositions=[[-0.7,0.2,0.65],[0.7,0.2,0.65],[-0.7,0.2,-0.65],[0.7,0.2,-0.65]]
    wheelPositions.forEach(p=>{const w=new THREE.Mesh(wheelGeo,wheelMat);w.position.set(...p);carGroup.add(w)})
    // Headlights
    const hlGeo=new THREE.BoxGeometry(0.2,0.15,0.05)
    const hlMat=new THREE.MeshBasicMaterial({color:0xFFFFFF})
    ;[[-0.45,0.5,1.13],[0.45,0.5,1.13]].forEach(p=>{const h=new THREE.Mesh(hlGeo,hlMat);h.position.set(...p);carGroup.add(h)})

    carGroup.position.set(0,0,0);scene.add(carGroup)

    // ═══ BUILDINGS (scenery) ═══
    const buildings=[]
    function addBuilding(x,z){
      const w=1.5+Math.random()*3, h=2+Math.random()*6, d=1.5+Math.random()*2
      const geo=new THREE.BoxGeometry(w,h,d)
      const mat=new THREE.MeshLambertMaterial({color:COLORS.build[Math.floor(Math.random()*COLORS.build.length)]})
      const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,h/2,z);mesh.castShadow=true
      scene.add(mesh);buildings.push(mesh)
    }
    for(let z=-20;z<ROAD_LEN;z+=6+Math.random()*8){
      addBuilding(-ROAD_W/2-2-Math.random()*5,z)
      addBuilding(ROAD_W/2+2+Math.random()*5,z)
    }

    // Clouds
    for(let i=0;i<15;i++){
      const cg=new THREE.BoxGeometry(3+Math.random()*4,0.8+Math.random()*0.5,1.5+Math.random()*2)
      const cm=new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:0.8})
      const cloud=new THREE.Mesh(cg,cm)
      cloud.position.set(-25+Math.random()*50,12+Math.random()*8,Math.random()*ROAD_LEN)
      scene.add(cloud);buildings.push(cloud)
    }

    // ═══ GAME STATE ═══
    const g={
      lane:1, targetLane:1, // 0,1,2 (left,center,right)
      carY:0, carVY:0, onGround:true,
      dist:0, spd:dc.spd, lv:1, sc:0, coins:0, att:1,
      obstacles:[], coinMeshes:[],
      dead:false, dieT:0, winT:0,
      lvLen:80+dc.ml*10, // level length in distance
      nextObst:15, nextCoin:8,
    }
    gR.current=g

    // ═══ OBSTACLE/COIN MANAGEMENT ═══
    const obstGroup=new THREE.Group();scene.add(obstGroup)
    const coinGroup=new THREE.Group();scene.add(coinGroup)

    function spawnObstacle(z){
      const lane=Math.floor(Math.random()*3)
      const types=['block','tall','wide','ramp']
      const type=types[Math.floor(Math.random()*types.length)]
      let mesh,hitbox

      const color=COLORS.obst[Math.floor(Math.random()*COLORS.obst.length)]
      if(type==='block'){
        const geo=new THREE.BoxGeometry(1.2,1.2,1.2)
        const mat=new THREE.MeshLambertMaterial({color})
        mesh=new THREE.Mesh(geo,mat);mesh.position.set(LANES[lane],0.6,z)
        hitbox={w:1.0,h:1.0,d:1.0}
      }else if(type==='tall'){
        const geo=new THREE.BoxGeometry(1.0,2.5,0.8)
        const mat=new THREE.MeshLambertMaterial({color})
        mesh=new THREE.Mesh(geo,mat);mesh.position.set(LANES[lane],1.25,z)
        hitbox={w:0.8,h:2.3,d:0.6}
      }else if(type==='wide'){
        // Spans 2 lanes
        const lane2=lane===0?1:lane===2?1:Math.random()>0.5?0:2
        const cx=(LANES[lane]+LANES[lane2])/2
        const geo=new THREE.BoxGeometry(LANE_W+1,1.0,1.0)
        const mat=new THREE.MeshLambertMaterial({color})
        mesh=new THREE.Mesh(geo,mat);mesh.position.set(cx,0.5,z)
        hitbox={w:LANE_W+0.8,h:0.8,d:0.8,cx}
      }else{ // ramp
        const geo=new THREE.BoxGeometry(1.8,0.4,2.0)
        const mat=new THREE.MeshLambertMaterial({color:COLORS.ramp})
        mesh=new THREE.Mesh(geo,mat);mesh.position.set(LANES[lane],0.2,z)
        mesh.rotation.x=-0.15
        hitbox={w:1.6,h:0.3,d:1.8,isRamp:true}
      }
      mesh.castShadow=true
      // Add grid lines effect
      const edges=new THREE.EdgesGeometry(mesh.geometry)
      const edgeMat=new THREE.LineBasicMaterial({color:0x000000,transparent:true,opacity:0.15})
      const wireframe=new THREE.LineSegments(edges,edgeMat)
      mesh.add(wireframe)

      obstGroup.add(mesh)
      g.obstacles.push({mesh,lane,type,hitbox,z})
    }

    function spawnCoin(z){
      const lane=Math.floor(Math.random()*3)
      const yOff=Math.random()>0.6?2.0:0.8 // some coins high (need jump)
      const geo=new THREE.BoxGeometry(0.5,0.5,0.5)
      const mat=new THREE.MeshLambertMaterial({color:COLORS.coin,emissive:COLORS.coinGlow,emissiveIntensity:0.3})
      const mesh=new THREE.Mesh(geo,mat);mesh.position.set(LANES[lane],yOff,z)
      mesh.rotation.y=Math.PI/4
      coinGroup.add(mesh)
      g.coinMeshes.push({mesh,lane,z,y:yOff,collected:false})
    }

    function clearAll(){
      g.obstacles.forEach(o=>obstGroup.remove(o.mesh))
      g.coinMeshes.forEach(c=>coinGroup.remove(c.mesh))
      g.obstacles=[];g.coinMeshes=[]
    }

    function startLevel(){
      clearAll()
      g.dist=0;g.lane=1;g.targetLane=1;g.carY=0;g.carVY=0;g.onGround=true
      g.dead=false;g.dieT=0;g.winT=0
      g.spd=dc.spd+(g.lv-1)*dc.si
      g.lvLen=80+g.lv*15
      g.nextObst=12;g.nextCoin=6
      carGroup.position.set(LANES[1],0,0);carGroup.rotation.set(0,0,0)
      // Pre-spawn some obstacles ahead
      for(let z=18;z<g.lvLen;z+=5+Math.random()*8){
        if(Math.random()<dc.obstRate*15)spawnObstacle(z)
        if(Math.random()<dc.coinRate*15)spawnCoin(z)
      }
      sp('play')
    }

    function doRetry(){
      g.att++;
      startLevel()
    }

    function doDie(){
      sp('dying');g.dieT=50;g.dead=true
      try{play('mismatch')}catch(e){}
    }

    function doWin(){
      sp('winning');g.winT=60
      const pts=Math.round(200+g.lv*60+g.coins*25+Math.max(0,200-(g.att-1)*20))
      g.sc+=pts;sSc(g.sc)
      try{play('win')}catch(e){}
    }

    function finGame(won){
      const st=won?3:g.lv>dc.ml/2?2:g.lv>2?1:0
      let co=({easy:25,medium:50,hard:75}[difficulty.id]||25)+Math.floor(g.sc/150);if(st===3)co+=35
      if(!won)co=Math.max(5,Math.floor(g.sc/200))
      earnCoins(co,`Voxel Racer (${difficulty.id})`)
      reportGameResult({gameId:'voxel-racer',difficultyId:difficulty.id,won,score:g.sc,stars:Math.max(st,won?1:0),timeSec:0})
      const bk=`voxel-racer-best-${difficulty.id}`,pv=parseInt(localStorage.getItem(bk)||'0')
      if(g.sc>pv)localStorage.setItem(bk,g.sc)
    }

    // ═══ INPUT ═══
    let touchStartX=null
    function onDown(e){
      const p=phR.current
      if(p==='idle'){startLevel();return}
      if(p==='dead'){doRetry();return}
      if(p!=='play')return
      // Jump
      if(g.onGround){g.carVY=0.18;g.onGround=false;try{play('flip')}catch(e2){}}
      // Touch tracking
      if(e.touches)touchStartX=e.touches[0].clientX
    }
    function onMove(e){
      if(!touchStartX||phR.current!=='play')return
      const x=e.touches[0].clientX
      const dx=x-touchStartX
      if(Math.abs(dx)>30){
        if(dx>0&&g.targetLane<2){g.targetLane++;touchStartX=x}
        if(dx<0&&g.targetLane>0){g.targetLane--;touchStartX=x}
      }
    }
    function onUp(){touchStartX=null}
    function onKey(e){
      const p=phR.current
      if(p==='idle'){startLevel();return}
      if(p==='dead'){doRetry();return}
      if(p!=='play')return
      if(e.code==='ArrowLeft'&&g.targetLane>0)g.targetLane--
      if(e.code==='ArrowRight'&&g.targetLane<2)g.targetLane++
      if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();if(g.onGround){g.carVY=0.18;g.onGround=false;try{play('flip')}catch(e2){}}}
    }

    const el=renderer.domElement
    el.addEventListener('mousedown',onDown);el.addEventListener('touchstart',e=>{e.preventDefault();onDown(e)},{passive:false})
    el.addEventListener('touchmove',onMove,{passive:false});el.addEventListener('touchend',onUp)
    window.addEventListener('keydown',onKey)

    // ═══ GAME LOOP ═══
    const clock=new THREE.Clock()
    function loop(){
      aRef.current=requestAnimationFrame(loop)
      try{
        const dt=Math.min(clock.getDelta(),0.05)
        const p=phR.current

        // State transitions
        if(p==='dying'){g.dieT-=1;if(g.dieT<=0)sp('dead')}
        if(p==='winning'){g.winT-=1;if(g.winT<=0){
          if(g.lv>=dc.ml){sp('won');setShowConf(true);finGame(true)}
          else{g.lv++;g.att=1;sLv(g.lv);startLevel()}}}

        if(p==='play'){
          // Speed
          g.spd=Math.min(dc.spd+(g.lv-1)*dc.si+g.dist*0.0003,dc.spd*1.8)

          // Move forward
          g.dist+=g.spd
          sDist(Math.round(g.dist))

          // Lane switching (smooth)
          const targetX=LANES[g.targetLane]
          carGroup.position.x+=(targetX-carGroup.position.x)*0.12
          // Tilt on lane change
          const dx=targetX-carGroup.position.x
          carGroup.rotation.z=-dx*0.15

          // Jump physics
          g.carVY-=0.008 // gravity
          g.carY+=g.carVY
          if(g.carY<=0){g.carY=0;g.carVY=0;g.onGround=true}
          carGroup.position.y=g.carY
          // Tilt forward when jumping
          carGroup.rotation.x=g.carY>0.1?-0.1:0

          // Move world (move camera + everything relative)
          // Actually: keep car at z=0, move obstacles toward car
          for(const o of g.obstacles){o.mesh.position.z=o.z-g.dist}
          for(const c of g.coinMeshes){
            c.mesh.position.z=c.z-g.dist
            c.mesh.rotation.y+=0.03 // spin coins
            c.mesh.position.y=c.y+Math.sin(Date.now()*0.003+c.z)*0.15 // bob
          }
          // Move ground/road/buildings
          ground.position.z=g.dist
          road.position.z=g.dist
          sun.position.z=g.dist+10

          // Scenery recycling
          for(const b of buildings){
            if(b.position.z-g.dist<-30)b.position.z+=ROAD_LEN*1.5
          }

          // ── Collision detection ──
          const carX=carGroup.position.x, carZ=0, carYpos=g.carY
          for(const o of g.obstacles){
            const oz=o.mesh.position.z
            if(oz>8||oz<-2)continue // too far
            const hb=o.hitbox
            const ox=o.hitbox.cx!==undefined?o.hitbox.cx:o.mesh.position.x
            // AABB check
            if(Math.abs(carX-ox)<(hb.w/2+0.5)&&
               Math.abs(oz)<(hb.d/2+0.8)&&
               carYpos<hb.h-0.1){
              if(hb.isRamp&&carYpos<0.3){
                // Hit ramp = boost jump!
                g.carVY=0.22;g.onGround=false
              }else if(!hb.isRamp){
                doDie();break
              }
            }
          }
          // Coin collection
          for(const c of g.coinMeshes){
            if(c.collected)continue
            const cz=c.mesh.position.z
            if(Math.abs(carX-c.mesh.position.x)<1.0&&Math.abs(cz)<1.2&&Math.abs(carYpos-c.y)<1.0){
              c.collected=true;c.mesh.visible=false
              g.coins++;g.sc+=25;sSc(g.sc);sCo(g.coins)
              try{play('match')}catch(e){}
            }
          }

          // Level complete
          if(g.dist>=g.lvLen){doWin()}

          // Progress
          sPr(Math.round(Math.min(g.dist/g.lvLen,1)*100))
        }

        // ── Dying animation ──
        if(p==='dying'){
          carGroup.rotation.x+=0.05;carGroup.rotation.z+=0.03
          carGroup.position.y+=0.02
        }

        renderer.render(scene,camera)
      }catch(e){console.error('VR:',e)}
    }

    // Handle resize
    function onResize(){
      const w=mount.clientWidth,h=mount.clientHeight
      camera.aspect=w/h;camera.updateProjectionMatrix()
      renderer.setSize(w,h)
    }
    window.addEventListener('resize',onResize)

    loop()

    return()=>{
      cancelAnimationFrame(aRef.current)
      window.removeEventListener('keydown',onKey)
      window.removeEventListener('resize',onResize)
      renderer.dispose()
      if(mount.contains(renderer.domElement))mount.removeChild(renderer.domElement)
    }
  },[difficulty.id])

  const restart=()=>{sp('idle');sSc(0);sLv(1);sCo(0);sDist(0);setShowConf(false)}
  const coinR=phase==='won'?({easy:25,medium:50,hard:75}[difficulty.id]||25)+Math.floor(uSc/150)+35:0

  const [uPr,sPr]=useState(0)

  return(
    <div style={{width:'100%',height:typeof CSS!=='undefined'&&CSS.supports('height','100dvh')?'100dvh':'100vh',background:'#87CEEB',position:'relative',overflow:'hidden',userSelect:'none',fontFamily:"'Fredoka One',cursive"}}>
      {showTut&&<TutorialModal steps={TUT} storageKey="bp_tut_voxel-racer" onClose={()=>setShowTut(false)}/>}
      {showConf&&<Confetti/>}

      {/* 3D Canvas Mount */}
      <div ref={mountRef} style={{position:'absolute',inset:0,zIndex:1}}/>

      {/* Back button */}
      <div style={{position:'absolute',top:8,left:8,zIndex:20}}>
        <button onClick={onBack} style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.3)',color:'#fff',borderRadius:10,padding:'7px 13px',fontSize:15,cursor:'pointer',backdropFilter:'blur(4px)'}}>←</button>
      </div>

      {/* HUD */}
      <div style={{position:'absolute',top:0,left:0,right:0,zIndex:10,padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(0,0,0,0.25)',backdropFilter:'blur(4px)'}}>
        <div style={{color:'#fff',fontSize:13}}>
          <span>🚗 Lv {uLv}</span>
          <span style={{marginLeft:12}}>💰 {uCo}</span>
        </div>
        {/* Progress bar */}
        <div style={{flex:1,maxWidth:200,margin:'0 16px',height:6,background:'rgba(255,255,255,0.2)',borderRadius:3}}>
          <div style={{height:'100%',borderRadius:3,background:'#FFD93D',width:`${uPr}%`,transition:'width 0.2s',boxShadow:'0 0 8px rgba(255,217,61,0.5)'}}/>
        </div>
        <div style={{color:'#fff',fontSize:12}}>{uPr}%</div>
      </div>

      {/* Idle overlay */}
      {phase==='idle'&&(
        <div style={{position:'absolute',inset:0,zIndex:30,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
          <div style={{fontSize:60,marginBottom:16}}>🚗</div>
          <div style={{color:'#fff',fontSize:24,fontWeight:800,textShadow:'0 2px 8px rgba(0,0,0,0.5)'}}>TAP UNTUK MULAI</div>
          <div style={{color:'rgba(255,255,255,0.7)',fontSize:14,marginTop:8}}>Voxel Racer</div>
        </div>
      )}

      {/* Dead overlay */}
      {phase==='dead'&&(
        <div style={{position:'absolute',inset:0,zIndex:30,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
          <div style={{fontSize:50,marginBottom:12}}>💥</div>
          <div style={{color:'#fff',fontSize:22,fontWeight:800}}>CRASH!</div>
          <div style={{color:'rgba(255,255,255,0.6)',fontSize:14,marginTop:8}}>Tap untuk retry</div>
          <div style={{color:'rgba(255,255,255,0.4)',fontSize:12,marginTop:4}}>Attempt #{gR.current?.att||1} • {uPr}%</div>
        </div>
      )}

      {/* Winning overlay */}
      {phase==='winning'&&(
        <div style={{position:'absolute',inset:0,zIndex:30,background:'rgba(0,0,0,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{color:'#FFD93D',fontSize:28,fontWeight:800,textShadow:'0 2px 12px rgba(0,0,0,0.5)'}}>✨ LEVEL CLEAR!</div>
        </div>
      )}

      {/* Won modal */}
      {phase==='won'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:20}}>
          <div style={{background:'linear-gradient(180deg,#1a237e,#0d47a1)',borderRadius:28,padding:'36px 28px',textAlign:'center',maxWidth:380,width:'100%',boxShadow:'0 0 60px rgba(33,150,243,0.3)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:'linear-gradient(90deg,#FFD93D,#FF6B6B,#29B6F6)'}}/>
            <div style={{fontSize:52,marginBottom:8}}>🏆</div>
            <h2 style={{color:'#fff',fontSize:26,marginBottom:4}}>RACE COMPLETE!</h2>
            <p style={{color:'#90CAF9',fontSize:13,marginBottom:12}}>{dc.ml} level selesai!</p>
            <div style={{fontSize:30,marginBottom:12,letterSpacing:8}}>⭐⭐⭐</div>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,217,61,0.15)',border:'1.5px solid rgba(255,217,61,0.3)',borderRadius:100,padding:'6px 18px',marginBottom:16}}>
              <span>🪙</span><span style={{color:'#FFD93D',fontSize:16,fontWeight:800}}>+{coinR}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:24}}>
              <div style={{background:'rgba(255,217,61,0.1)',borderRadius:14,padding:'12px 8px'}}><div style={{fontSize:22,color:'#FFD93D'}}>{uSc}</div><div style={{fontSize:10,color:'#90CAF9',marginTop:2}}>Skor</div></div>
              <div style={{background:'rgba(41,182,246,0.1)',borderRadius:14,padding:'12px 8px'}}><div style={{fontSize:22,color:'#29B6F6'}}>{uCo}</div><div style={{fontSize:10,color:'#90CAF9',marginTop:2}}>Koin</div></div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={restart} style={{flex:1,background:'linear-gradient(135deg,#FFD93D,#FF6B6B)',color:'#fff',border:'none',borderRadius:100,padding:'13px 18px',fontSize:15,fontWeight:800,cursor:'pointer'}}>🔄 Main Lagi</button>
              <button onClick={onBack} style={{flex:1,background:'#1a237e',color:'#90CAF9',border:'2px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'13px 18px',fontSize:15,fontWeight:800,cursor:'pointer'}}>🎯 Ganti Level</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
