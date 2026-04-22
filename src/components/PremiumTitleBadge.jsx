import React from 'react'

export default function PremiumTitleBadge({ title, rarity = 'common', size = 'normal', style = {} }) {
  if (!title) return null

  const themes = {
    mythic: {
      bg: 'linear-gradient(90deg, #ff0a82, #b400ff)',
      glow: '0 0 12px rgba(255,10,130,0.5)',
      text: '#fff'
    },
    legendary: {
      bg: 'linear-gradient(90deg, #ff5a00, #ffb400)',
      glow: '0 0 12px rgba(255,90,0,0.5)',
      text: '#fff'
    },
    epic: {
      bg: 'linear-gradient(90deg, #6c5ce7, #00f5ff)',
      glow: '0 0 10px rgba(0,245,255,0.4)',
      text: '#fff'
    },
    rare: {
      bg: 'linear-gradient(90deg, #26de81, #2bcbba)',
      glow: '0 0 8px rgba(38,222,129,0.3)',
      text: '#fff'
    },
    common: {
      bg: 'linear-gradient(90deg, #95a5a6, #7f8c8d)',
      glow: '0 0 6px rgba(189,195,199,0.2)',
      text: '#fff'
    }
  }

  const theme = themes[rarity?.toLowerCase()] || themes.common
  const isHighTier = rarity === 'mythic' || rarity === 'legendary'

  const sCfg = {
    small:  { height: 22, px: 14, fs: 9 },
    normal: { height: 28, px: 18, fs: 11 },
    large:  { height: 34, px: 22, fs: 14 }
  }
  const cfg = sCfg[size] || sCfg.normal

  return (
    <>
      <style>{`
        @keyframes ptbPulse {
          0%   { box-shadow: 0 0 8px rgba(255,255,255,0.1); }
          100% { box-shadow: 0 0 18px rgba(255,255,255,0.35); }
        }
        @keyframes ptbShimmer {
          0%   { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
      <div style={{
        ...style,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: cfg.height,
        padding: `0 ${cfg.px}px`,
        background: theme.bg,
        borderRadius: 4,
        boxShadow: theme.glow,
        position: 'relative',
        overflow: 'hidden',
        animation: isHighTier ? 'ptbPulse 2s infinite alternate' : 'none',
        // Hexagonal pointed edges using border trick
        clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)',
      }}>
        {/* Shimmer for high-tier */}
        {isHighTier && (
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0,
            width: '40%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
            animation: 'ptbShimmer 3s infinite linear',
            pointerEvents: 'none',
            left: '-100%',
          }} />
        )}

        <span style={{
          position: 'relative',
          zIndex: 2,
          fontFamily: "'Fredoka One', cursive",
          fontSize: cfg.fs,
          color: theme.text,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}>{title}</span>
      </div>
    </>
  )
}
