import { useThemeColors } from '../hooks/useThemeColors'
import { useSound } from '../hooks/useSound'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'games', label: 'Games', icon: '🎮' },
  { id: 'wheel', label: 'Wheel', icon: '🎡' },
  { id: 'shop', label: 'Shop', icon: '🏪' },
  { id: 'profile', label: 'Profil', icon: '👤' },
]

export default function BottomNav({ activeScreen, onNavigate }) {
  const tc = useThemeColors()
  const { play } = useSound()
  const activeRef = useRef(null)

  const dark = tc.dark
  const activeColor = '#7C6FE8'

  // Animate indicator on activeScreen change
  useEffect(() => {
    if (activeRef.current) {
      gsap.fromTo(activeRef.current, 
        { scale: 0.5, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.2)' }
      )
    }
  }, [activeScreen])

  return (
    <nav className="bottom-nav">
      <style>{`
        .bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 500;
          height: 68px; background: ${dark ? 'rgba(13,16,34,0.85)' : 'rgba(255,255,255,0.92)'};
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          border-top: 1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
          display: flex; align-items: center; justify-content: space-around;
          padding: 0 16px env(safe-area-inset-bottom, 0px);
          box-shadow: 0 -4px 24px rgba(0,0,0,0.18);
        }
        @media (min-width: 641px) {
          .bottom-nav { display: none; }
        }
        .nav-item {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          cursor: pointer; flex: 1; max-width: 80px; position: relative;
          -webkit-tap-highlight-color: transparent;
          padding: 8px 0;
        }
        .nav-item-icon {
          font-size: 20px; transition: transform 0.3s;
          z-index: 2;
        }
        .nav-item.active .nav-item-icon {
          transform: translateY(-4px) scale(1.15);
        }
        .nav-item-label {
          font-size: 10px; font-weight: 700; color: ${dark ? '#94A3B8' : '#64748B'};
          transition: color 0.3s;
        }
        .nav-item.active .nav-item-label {
          color: ${activeColor};
        }
        .nav-active-bg {
          position: absolute; top: -4px; width: 40px; height: 40px;
          background: ${activeColor}22; border-radius: 14px; z-index: 1;
        }
      `}</style>

      {NAV_ITEMS.map(item => {
        const isActive = activeScreen === item.id || (activeScreen === 'home' && item.id === 'home')
        return (
          <div 
            key={item.id} 
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => {
              if (isActive) return
              if (navigator.vibrate) navigator.vibrate(15)
              play('click')
              onNavigate(item.id)
            }}
          >
            {isActive && <div ref={activeRef} className="nav-active-bg" />}
            <span className="nav-item-icon">{item.icon}</span>
            <span className="nav-item-label">{item.label}</span>
          </div>
        )
      })}
    </nav>
  )
}
