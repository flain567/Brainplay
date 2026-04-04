import React from 'react'

/**
 * InfiniteTicker Component
 * A horizontal scrolling marquee with smooth CSS animations.
 * @param {Array<string>} items - List of strings to scroll
 * @param {string} speed - duration of completion (e.g. '20s', '40s')
 * @param {string} mode - 'mono' for tech look, 'serif' for renaissance look
 */
export default function InfiniteTicker({ items = [], speed = '30s', mode = 'mono' }) {
  // Duplicate items twice to ensure seamless loop
  const displayItems = [...items, ...items, ...items]

  return (
    <div className="marquee-container" style={{ padding: '12px 0' }}>
      <div className="marquee-content" style={{ animationDuration: speed }}>
        {displayItems.map((item, i) => (
          <div 
            key={i} 
            className={mode === 'serif' ? 'serif-title' : 'mono-label'}
            style={{ 
              fontSize: mode === 'serif' ? '24px' : '12px',
              color: 'rgba(255,255,255,0.8)',
              fontWeight: mode === 'serif' ? 400 : 700,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <span>{item}</span>
            <span style={{ opacity: 0.3, fontSize: '10px' }}>✦</span>
          </div>
        ))}
      </div>
    </div>
  )
}
