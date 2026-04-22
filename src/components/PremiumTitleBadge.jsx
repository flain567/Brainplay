import React from 'react'

export default function PremiumTitleBadge({ title, rarity = 'common', size = 'normal', style={} }) {
  if (!title) return null;

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

  // Sizes: small, normal, large
  const sCfg = {
    small: { height: 22, px: 20, fs: 10, offset: 12 },
    normal: { height: 28, px: 26, fs: 12, offset: 14 },
    large: { height: 36, px: 32, fs: 15, offset: 18 }
  }
  const cfg = sCfg[size] || sCfg.normal

  return (
    <div className={`ptb-wrapper ptb-rarity-${rarity}`} style={{ ...style, height: cfg.height, filter: theme.glow }}>
      <style>{`
        .ptb-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          /* Fire pulse animation for high tiers */
          min-width: 100px;
        }
        .ptb-rarity-mythic, .ptb-rarity-legendary {
          animation: ptbPulse 2s infinite alternate;
        }
        .ptb-core {
          position: relative;
          height: 100%;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 ${cfg.px}px;
          clip-path: polygon(${cfg.offset}px 0%, calc(100% - ${cfg.offset}px) 0%, 100% 50%, calc(100% - ${cfg.offset}px) 100%, ${cfg.offset}px 100%, 0% 50%);
          background: ${theme.border};
        }
        .ptb-inner {
          position: absolute;
          inset: 2px;
          clip-path: polygon(${cfg.offset - 1}px 0%, calc(100% - ${cfg.offset - 1}px) 0%, 100% 50%, calc(100% - ${cfg.offset - 1}px) 100%, ${cfg.offset - 1}px 100%, 0% 50%);
          background: ${theme.bg};
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        
        /* Shimmer effect inside */
        .ptb-shimmer {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%);
          transform: translateX(-100%);
          animation: ptbShimmer 3s infinite linear;
        }

        .ptb-text {
          position: relative;
          z-index: 2;
          font-family: 'Fredoka One', cursive;
          font-size: ${cfg.fs}px;
          color: ${theme.text};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.6);
          white-space: nowrap;
        }
        
        /* Wings decoration for Mythic and Epic/Legendary */
        .ptb-decorator {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 8px;
          height: 8px;
          background: #fff;
          opacity: 0.8;
          box-shadow: 0 0 6px #fff;
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
        }
        .ptb-rarity-mythic .ptb-decorator, .ptb-rarity-legendary .ptb-decorator {
          display: block;
        }
        .ptb-decorator { display: none; } /* default hidden */
        .ptb-decorator-left { left: 4px; }
        .ptb-decorator-right { right: 4px; }

        @keyframes ptbPulse {
          0% { filter: ${theme.glow} brightness(1); }
          100% { filter: ${theme.glow} drop-shadow(0 0 20px rgba(255,255,255,0.4)) brightness(1.2); }
        }
        @keyframes ptbShimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
      
      <div className="ptb-core">
        <div className="ptb-inner">
          {(rarity === 'mythic' || rarity === 'legendary') && (
            <>
              <div className="ptb-shimmer" />
              <div className="ptb-decorator ptb-decorator-left" />
              <div className="ptb-decorator ptb-decorator-right" />
            </>
          )}
        </div>
        <span className="ptb-text">{title}</span>
      </div>
    </div>
  )
}
