import { useEffect, useState, useRef } from 'react'
import { useSocial } from '../context/SocialContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import gsap from 'gsap'

export default function ActivityTicker() {
  const { activities } = useSocial()
  const tc = useThemeColors()
  const [index, setIndex] = useState(0)
  const tickerRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (activities.length <= 1) return
    
    timerRef.current = setInterval(() => {
      // Animate out
      gsap.to(tickerRef.current, {
        y: -20, opacity: 0, duration: 0.5, ease: 'power2.in',
        onComplete: () => {
          setIndex(prev => (prev + 1) % activities.length)
          // Reset position and fade in
          gsap.fromTo(tickerRef.current, 
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
          )
        }
      })
    }, 5000)

    return () => clearInterval(timerRef.current)
  }, [activities.length])

  if (activities.length === 0) return null

  const current = activities[index]

  return (
    <div style={{
      width: '100%', maxWidth: 500, margin: '0 auto 16px',
      background: tc.surface, padding: '10px 18px', borderRadius: 20,
      border: `1.5px dashed ${tc.borderCol}`,
      display: 'flex', alignItems: 'center', gap: 12,
      overflow: 'hidden', height: 44, position: 'relative'
    }}>
      <div style={{ fontSize: 20 }}>{current.icon || '🌟'}</div>
      <div ref={tickerRef} style={{ flex: 1, fontSize: 13, color: tc.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <span style={{ fontWeight: 800, color: tc.accent }}>{current.userName}</span>
        {' '}{current.details}
      </div>
      <div style={{ 
        fontSize: 10, color: tc.textMuted, background: tc.surfaceDeep, 
        padding: '2px 8px', borderRadius: 100, fontWeight: 700 
      }}>LIVE</div>
    </div>
  )
}
