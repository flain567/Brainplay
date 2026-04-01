import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useThemeColors } from '../hooks/useThemeColors.js'
import gsap from 'gsap'

export default function QuickSettings({ isFullscreen }) {
  const { darkMode, muted, musicOff, hapticsEnabled, toggle } = useSettings()
  const { play } = useSound()
  const tc = useThemeColors()
  
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef(null)
  const itemsRef = useRef([])
  const triggerRef = useRef(null)

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return
    const fn = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', fn)
    document.addEventListener('touchstart', fn)
    return () => {
      document.removeEventListener('mousedown', fn)
      document.removeEventListener('touchstart', fn)
    }
  }, [isOpen])

  // Fan-out animation
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (isOpen) {
        gsap.to(itemsRef.current, {
          y: (i) => -((i + 1) * 56),
          opacity: 1,
          scale: 1,
          duration: 0.4,
          stagger: 0.05,
          ease: 'back.out(1.7)',
        })
        gsap.to(triggerRef.current, { rotate: 90, duration: 0.3 })
      } else {
        gsap.to(itemsRef.current, {
          y: 0,
          opacity: 0,
          scale: 0.6,
          duration: 0.3,
          stagger: 0.03,
          ease: 'power2.in',
        })
        gsap.to(triggerRef.current, { rotate: 0, duration: 0.3 })
      }
    }, rootRef)
    return () => ctx.revert()
  }, [isOpen])

  const handleToggle = (key, fn) => {
    play('click')
    fn()
  }

  if (isFullscreen) return null

  const dark = tc.dark
  const accent = tc.accent || '#A29BFE'
  const surface = tc.surface
  const textMain = tc.textMain
  const borderCol = tc.borderCol

  const OPTIONS = [
    { id: 'theme',  icon: darkMode ? '☀️' : '🌙', label: darkMode ? 'Mode Terang' : 'Mode Gelap', fn: toggle.darkMode, active: darkMode },
    { id: 'haptic', icon: hapticsEnabled ? '📳' : '📵', label: 'Getaran', fn: toggle.haptics, active: hapticsEnabled },
    { id: 'sound',  icon: muted ? '🔕' : '🔊', label: 'Suara', fn: toggle.muted, active: !muted },
    { id: 'music',  icon: musicOff ? '🔇' : '🎵', label: 'Musik', fn: toggle.musicOff, active: !musicOff },
  ]

  return (
    <div ref={rootRef} className="qs-root">
      <style>{`
        .qs-root { position: fixed; bottom: 24px; right: 24px; z-index: 1001; }
        .qs-item {
          position: absolute; bottom: 0; right: 0;
          width: 52px; height: 52px; border-radius: 50%;
          background: ${surface}; border: 2px solid ${borderCol};
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; cursor: pointer; pointer-events: ${isOpen ? 'auto' : 'none'};
          opacity: 0; transform: scale(0.6);
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          transition: border-color 0.2s, background 0.2s, transform 0.25s;
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        }
        .qs-item:hover { border-color: ${accent}; transform: scale(1.1); background: ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)'}; }
        .qs-item.active { background: ${accent}25; border-color: ${accent}; }
        
        .qs-trigger {
          width: 56px; height: 56px; border-radius: 50%;
          background: linear-gradient(135deg, ${accent}, ${tc.accentAlt || accent});
          border: 3px solid rgba(255,255,255,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; cursor: pointer;
          box-shadow: 0 6px 20px ${accent}44;
          transition: all 0.25s; z-index: 2; position: relative;
        }
        .qs-trigger:hover { transform: scale(1.1) rotate(15deg); box-shadow: 0 8px 25px ${accent}66; }
        .qs-trigger:active { transform: scale(0.9); }

        /* Tooltip-like label */
        .qs-item-label {
          position: absolute; right: 60px; white-space: nowrap;
          background: ${textMain}; color: ${surface};
          padding: 4px 10px; border-radius: 8px; font-size: 11px;
          font-weight: 700; pointer-events: none; opacity: 0;
          transition: opacity 0.2s, transform 0.2s; transform: translateX(10px);
        }
        .qs-item:hover .qs-item-label { opacity: 1; transform: translateX(0); }
        
        @media (max-width: 640px) {
          .qs-root { bottom: 20px; right: 20px; }
          .qs-item-label { display: none; }
        }
      `}</style>

      {/* Fan-out Buttons */}
      {OPTIONS.map((opt, i) => (
        <div
          key={opt.id}
          ref={el => itemsRef.current[i] = el}
          className={`qs-item${opt.active ? ' active' : ''}`}
          onClick={() => handleToggle(opt.id, opt.fn)}
          title={opt.label}
        >
          {opt.icon}
          <div className="qs-item-label">{opt.label}</div>
        </div>
      ))}

      {/* Main Trigger */}
      <button 
        ref={triggerRef}
        className="qs-trigger" 
        onClick={() => { play('click'); setIsOpen(!isOpen) }}
        title="Pengaturan Cepat"
      >
        ⚙️
      </button>
    </div>
  )
}
