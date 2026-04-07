import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useThemeColors } from '../hooks/useThemeColors.js'

/**
 * PvpBattleIntro - Cinematic opening for PvP matches
 * Props:
 *  - myProfile: { displayName, photoURL }
 *  - oppProfile: { displayName, photoURL }
 *  - gameTitle: string
 *  - onDone: function
 */
export default function PvpBattleIntro({ myProfile, oppProfile, gameTitle, onDone }) {
  const tc = useThemeColors()
  const myRef = useRef(null)
  const oppRef = useRef(null)
  const vsRef = useRef(null)
  const titleRef = useRef(null)
  const overlayRef = useRef(null)

  useEffect(() => {
    const tl = gsap.timeline({ 
      onComplete: () => {
        // Wait a bit before calling onDone to let the fade out finish
        setTimeout(onDone, 100)
      }
    })
    
    // Initial states
    gsap.set(myRef.current, { x: -400, opacity: 0, rotate: -15 })
    gsap.set(oppRef.current, { x: 400, opacity: 0, rotate: 15 })
    gsap.set(vsRef.current, { scale: 5, opacity: 0, rotate: -90 })
    gsap.set(titleRef.current, { y: 50, opacity: 0 })
    
    tl.to(myRef.current, { x: -70, opacity: 1, rotate: 0, duration: 0.7, ease: 'back.out(1.2)' }, 0.2)
      .to(oppRef.current, { x: 70, opacity: 1, rotate: 0, duration: 0.7, ease: 'back.out(1.2)' }, 0.2)
      .to(vsRef.current, { scale: 1, opacity: 1, rotate: 0, duration: 0.5, ease: 'elastic.out(1, 0.6)' }, 0.6)
      .to(titleRef.current, { y: 0, opacity: 1, duration: 0.5 }, 0.8)
      .to(overlayRef.current, { opacity: 0, duration: 0.5, delay: 1.5 })
  }, [onDone])

  return (
    <div ref={overlayRef} style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'radial-gradient(circle, #1a1a3a 0%, #050510 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', color: '#fff', overflow: 'hidden'
    }}>
      {/* Background Glow */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.3, pointerEvents: 'none' }}>
         <div style={{ 
           position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
           width: 800, height: 800, 
           background: 'radial-gradient(circle, #6c5ce7 0%, transparent 70%)', 
           filter: 'blur(120px)' 
         }} />
      </div>

      {/* Duel Section */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250, width: '100%' }}>
        {/* My Profile */}
        <div ref={myRef} style={{ position: 'absolute', textAlign: 'center' }}>
          <div style={{ 
            width: 120, height: 120, borderRadius: 32, 
            border: '4px solid #00B894', overflow: 'hidden', 
            boxShadow: '0 0 40px rgba(0, 184, 148, 0.4)',
            background: '#0d0d0d'
          }}>
            {myProfile?.photoURL 
              ? <img src={myProfile.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> 
              : <div style={{ background: 'rgba(0,184,148,0.1)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>👤</div>
            }
          </div>
          <div style={{ marginTop: 16, fontFamily: "'Fredoka One',cursive", fontSize: 20, color: '#00B894' }}>
            {myProfile?.displayName?.toUpperCase() || 'KAMU'}
          </div>
        </div>

        {/* VS Text */}
        <div ref={vsRef} style={{ 
          zIndex: 10, fontFamily: "'Fredoka One',cursive", fontSize: 100, 
          fontStyle: 'italic', color: '#fff', 
          textShadow: '0 0 20px #6c5ce7, 0 0 40px #6c5ce7',
          WebkitTextStroke: '2px rgba(255,255,255,0.2)'
        }}>
          VS
        </div>

        {/* Opponent Profile */}
        <div ref={oppRef} style={{ position: 'absolute', textAlign: 'center' }}>
          <div style={{ 
            width: 120, height: 120, borderRadius: 32, 
            border: '4px solid #FF6B6B', overflow: 'hidden', 
            boxShadow: '0 0 40px rgba(255, 107, 107, 0.4)',
            background: '#0d0d0d'
          }}>
            {oppProfile?.photoURL 
              ? <img src={oppProfile.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> 
              : <div style={{ background: 'rgba(255,107,107,0.1)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>👤</div>
            }
          </div>
          <div style={{ marginTop: 16, fontFamily: "'Fredoka One',cursive", fontSize: 20, color: '#FF6B6B' }}>
            {oppProfile?.displayName?.toUpperCase() || 'LAWAN'}
          </div>
        </div>
      </div>
      
      {/* Footer Info */}
      <div ref={titleRef} style={{ marginTop: 80, textAlign: 'center' }}>
        <div style={{ fontSize: 14, letterSpacing: 4, opacity: 0.6, textTransform: 'uppercase', marginBottom: 8, fontWeight: 800 }}>
          Siap Bertanding di
        </div>
        <div style={{ 
          fontFamily: "'Fredoka One',cursive", fontSize: 36, 
          background: 'linear-gradient(135deg, #fff, #A29BFE)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          {gameTitle}
        </div>
      </div>

      <style>{`
        @keyframes glowPulse {
          from { opacity: 0.3 } to { opacity: 0.6 }
        }
      `}</style>
    </div>
  )
}
