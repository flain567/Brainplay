import React from 'react'

export default function PremiumTitleBadge({ title, rarity = 'common', size = 'normal', style = {} }) {
  if (!title) return null

  const themes = {
    mythic: {
      bg: 'linear-gradient(90deg, rgba(255,10,130,0.8), rgba(180,0,255,0.8))',
      border: 'linear-gradient(90deg, #ff0a82, #b400ff)',
      glow: 'drop-shadow(0 0 12px rgba(255,10,130,0.5))',
      text: '#fff'
    },
    legendary: {
      bg: 'linear-gradient(90deg, rgba(255,90,0,0.8), rgba(255,180,0,0.8))',
      border: 'linear-gradient(90deg, #ff5a00, #ffb400)',
      glow: 'drop-shadow(0 0 12px rgba(255,90,0,0.5))',
      text: '#fff'
    },
    epic: {
      bg: 'linear-gradient(90deg, rgba(108,92,231,0.8), rgba(0,245,255,0.8))',
      border: 'linear-gradient(90deg, #6c5ce7, #00f5ff)',
      glow: 'drop-shadow(0 0 10px rgba(0,245,255,0.4))',
      text: '#fff'
    },
    rare: {
      bg: 'linear-gradient(90deg, rgba(38,222,129,0.8), rgba(43,203,186,0.8))',
      border: 'linear-gradient(90deg, #26de81, #2bcbba)',
      glow: 'drop-shadow(0 0 8px rgba(38,222,129,0.3))',
      text: '#fff'
    },
    common: {
      bg: 'linear-gradient(90deg, rgba(149,165,166,0.8), rgba(127,140,141,0.8))',
      border: 'linear-gradient(90deg, #bdc3c7, #95a5a6)',
      glow: 'drop-shadow(0 0 6px rgba(189,195,199,0.2))',
      text: '#fff'
    }
  }

  const theme = themes[rarity?.toLowerCase()] || themes.common
  const isHighTier = rarity === 'mythic' || rarity === 'legendary'

  const sCfg = {
    small:  { height: 22, px: 20, fs: 10, offset: 12 },
    normal: { height: 28, px: 26, fs: 12, offset: 14 },
    large:  { height: 36, px: 32, fs: 15, offset: 18 }
  }
  const cfg = sCfg[size] || sCfg.normal

  const clipOuter = `polygon(${cfg.offset}px 0%, calc(100% - ${cfg.offset}px) 0%, 100% 50%, calc(100% - ${cfg.offset}px) 100%, ${cfg.offset}px 100%, 0% 50%)`
  const clipInner = `polygon(${cfg.offset - 1}px 0%, calc(100% - ${cfg.offset - 1}px) 0%, 100% 50%, calc(100% - ${cfg.offset - 1}px) 100%, ${cfg.offset - 1}px 100%, 0% 50%)`

  return (
    <>
      <style>{`
        @keyframes ptbPulse {
          0%   { filter: brightness(1); }
          100% { filter: brightness(1.2) drop-shadow(0 0 20px rgba(255,255,255,0.3)); }
        }
        @keyframes ptbShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      <div style={{
        ...style,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: cfg.height,
        minWidth: 80,
        filter: theme.glow,
        animation: isHighTier ? 'ptbPulse 2s infinite alternate' : 'none',
      }}>
        {/* Outer border shape */}
        <div style={{
          position: 'relative',
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `0 ${cfg.px}px`,
          clipPath: clipOuter,
          background: theme.border,
        }}>
          {/* Inner fill */}
          <div style={{
            position: 'absolute',
            inset: 2,
            clipPath: clipInner,
            background: theme.bg,
            overflow: 'hidden',
          }}>
            {/* Shimmer */}
            {isHighTier && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
                animation: 'ptbShimmer 3s infinite linear',
              }} />
            )}
          </div>

          {/* Text */}
          <span style={{
            position: 'relative',
            zIndex: 2,
            fontFamily: "'Fredoka One', cursive",
            fontSize: cfg.fs,
            color: theme.text,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            textShadow: '0 2px 4px rgba(0,0,0,0.6)',
            whiteSpace: 'nowrap',
          }}>{title}</span>
        </div>
      </div>
    </>
  )
}
