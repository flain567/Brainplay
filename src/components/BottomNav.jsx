import { useThemeColors } from '../hooks/useThemeColors'
import { useSound } from '../hooks/useSound'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'

const NAV_ITEMS = [
  { id: 'home',    label: 'Home',   icon: '🏠' },
  { id: 'games',   label: 'Games',  icon: '🎮' },
  { id: 'wheel',   label: 'Wheel',  icon: '🎡', center: true },
  { id: 'shop',    label: 'Shop',   icon: '🏪' },
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
          height: 68px; background: ${dark ? 'rgba(13,16,34,0.92)' : 'rgba(255,255,255,0.95)'};
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border-top: 1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
          display: flex; align-items: center; justify-content: space-around;
          padding: 0 12px env(safe-area-inset-bottom, 0px);
          box-shadow: 0 -4px 24px rgba(0,0,0,0.18);
        }
        @media (min-width: 641px) {
          .bottom-nav { display: none; }
        }
        .nav-item {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          cursor: pointer; flex: 1; position: relative;
          -webkit-tap-highlight-color: transparent;
          padding: 8px 0;
        }
        .nav-item-icon {
          font-size: 22px; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 2;
        }
        .nav-item.active .nav-item-icon {
          transform: translateY(-3px) scale(1.15);
        }
        /* ── Center Wheel button — elevated, glowing ── */
        .nav-item.center-btn {
          position: relative;
          margin-top: -18px;
        }
        .nav-center-orb {
          width: 56px; height: 56px; border-radius: 50%;
          background: linear-gradient(135deg, #7C6FE8, #A29BFE);
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; z-index: 3; position: relative;
          box-shadow: 
            0 4px 20px rgba(124,111,232,0.4),
            0 0 0 4px ${dark ? 'rgba(13,16,34,0.92)' : 'rgba(255,255,255,0.95)'};
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s;
        }
        .nav-item.center-btn.active .nav-center-orb {
          transform: scale(1.1) rotate(15deg);
          box-shadow: 
            0 6px 28px rgba(124,111,232,0.6),
            0 0 0 4px ${dark ? 'rgba(13,16,34,0.92)' : 'rgba(255,255,255,0.95)'};
        }
        .nav-center-pulse {
          position: absolute; inset: -4px; border-radius: 50%;
          border: 2px solid rgba(124,111,232,0.3);
          animation: nav-center-breathe 2.5s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes nav-center-breathe {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50%       { transform: scale(1.15); opacity: 0; }
        }
        .nav-burst {
          position: fixed; width: 40px; height: 40px;
          margin-left: -20px; margin-top: -20px;
          border-radius: 50%; border: 3px solid ${activeColor};
          pointer-events: none; z-index: 1000;
        }
        .nav-item-label {
          font-size: 10px; font-weight: 700; color: ${dark ? '#64748B' : '#94A3B8'};
          transition: color 0.3s; letter-spacing: 0.3px;
        }
        .nav-item.active .nav-item-label {
          color: ${activeColor};
        }
        .nav-item.center-btn .nav-item-label {
          font-size: 9px; margin-top: 2px;
          color: ${dark ? '#A29BFE' : '#7C6FE8'};
          font-weight: 800;
        }
        .nav-active-bg {
          position: absolute; top: -4px; width: 42px; height: 42px;
          background: ${activeColor}18; border-radius: 14px; z-index: 1;
        }
      `}</style>

      {NAV_ITEMS.map(item => {
        const isWheel = item.center
        const isActive = isWheel
          ? activeScreen === 'wheel'
          : activeScreen === item.id || (activeScreen === 'home' && item.id === 'home')

        // Map friends/inventory screens to their parent nav item highlight
        const highlightActive = isActive 
          || (item.id === 'profile' && (activeScreen === 'friends' || activeScreen === 'analytics' || activeScreen === 'admin' || activeScreen === 'stats'))
          || (item.id === 'shop' && activeScreen === 'inventory')

        if (isWheel) {
          return (
            <div 
              key={item.id} 
              className={`nav-item center-btn ${isActive ? 'active' : ''}`}
              onClick={(e) => {
                if (navigator.vibrate) navigator.vibrate([15, 30, 20])
                play('pop')
                
                const rect = e.currentTarget.getBoundingClientRect()
                const x = rect.left + rect.width / 2
                const y = rect.top + rect.height / 2
                const burst = document.createElement('div')
                burst.className = 'nav-burst'
                burst.style.left = x + 'px'
                burst.style.top = y + 'px'
                document.body.appendChild(burst)
                gsap.fromTo(burst, 
                  { scale: 0.3, opacity: 0.8 },
                  { scale: 2.5, opacity: 0, duration: 0.4, ease: 'power2.out', onComplete: () => burst.remove() }
                )
                
                onNavigate('wheel')
              }}
            >
              <div className="nav-center-orb">
                <div className="nav-center-pulse" />
                <span style={{ zIndex: 2, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{item.icon}</span>
              </div>
              <span className="nav-item-label">{item.label}</span>
            </div>
          )
        }

        return (
          <div 
            key={item.id} 
            className={`nav-item ${highlightActive ? 'active' : ''}`}
            onClick={(e) => {
              if (highlightActive && activeScreen === item.id) return
              if (navigator.vibrate) navigator.vibrate([15, 30, 20])
              play('pop')
              
              // Spawn burst
              const rect = e.currentTarget.getBoundingClientRect()
              const x = rect.left + rect.width / 2
              const y = rect.top + rect.height / 2
              const burst = document.createElement('div')
              burst.className = 'nav-burst'
              burst.style.left = x + 'px'
              burst.style.top = y + 'px'
              document.body.appendChild(burst)
              
              gsap.fromTo(burst, 
                { scale: 0.3, opacity: 0.8 },
                { scale: 2.5, opacity: 0, duration: 0.4, ease: 'power2.out', onComplete: () => burst.remove() }
              )
              
              onNavigate(item.id)
            }}
          >
            {highlightActive && <div ref={highlightActive ? activeRef : null} className="nav-active-bg" />}
            <span className="nav-item-icon">{item.icon}</span>
            <span className="nav-item-label">{item.label}</span>
          </div>
        )
      })}
    </nav>
  )
}
