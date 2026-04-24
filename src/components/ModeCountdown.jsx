import { useState, useEffect } from 'react'

/**
 * ModeCountdown Component
 * Segregated timer logic to prevent crashes on the main Home page.
 * Safely calculates remaining time until the end of the current mode's active period.
 */
export default function ModeCountdown({ activeDays, color }) {
  const [timeLeft, setTimeLeft] = useState('00:00:00')

  useEffect(() => {
    // Safety check: if no days provided, just show zero
    if (!activeDays || !Array.isArray(activeDays) || activeDays.length === 0) {
      setTimeLeft('00:00:00')
      return
    }

    const pad = n => String(n).padStart(2, '0')
    const endDay = activeDays[activeDays.length - 1]

    const update = () => {
      try {
        const now = new Date()
        const currentDay = now.getDay() // 0=Sun, 1=Mon...
        
        let diffDays = 0
        // Logic: How many days until we reach the endDay at 23:59:59
        if (endDay !== currentDay) {
          if (endDay === 0) { // Target is Sunday
            diffDays = 7 - currentDay
          } else if (endDay > currentDay) {
            diffDays = endDay - currentDay
          } else {
            // endDay is earlier in the week than today? (Shouldn't happen with current logic, but safety first)
            diffDays = (7 - currentDay) + endDay
          }
        }

        const target = new Date()
        target.setDate(now.getDate() + diffDays)
        target.setHours(23, 59, 59, 999)

        const dist = target.getTime() - now.getTime()
        
        if (dist <= 0) {
          setTimeLeft('00:00:00')
          return
        }

        const h = Math.floor(dist / (1000 * 60 * 60))
        const m = Math.floor((dist / (1000 * 60)) % 60)
        const s = Math.floor((dist / 1000) % 60)
        
        setTimeLeft(`${pad(h)}:${pad(m)}:${pad(s)}`)
      } catch (err) {
        console.error('[ModeCountdown] Timer error:', err)
        setTimeLeft('00:00:00')
      }
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [activeDays])

  return (
    <span style={{ 
      fontWeight: 800, 
      letterSpacing: 0.5,
      fontFamily: 'monospace',
      color: color || 'inherit'
    }}>
      {timeLeft}
    </span>
  )
}
