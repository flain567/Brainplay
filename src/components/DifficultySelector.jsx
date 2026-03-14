import { useState } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'

const DIFF_CONFIG = {
  easy:   { icon: '🟢', label: 'Mudah',  gradient: 'linear-gradient(135deg,#00b894,#55efc4)', glow: '#00b89444' },
  medium: { icon: '🟡', label: 'Sedang', gradient: 'linear-gradient(135deg,#f9a825,#FFE66D)', glow: '#f9a82544' },
  hard:   { icon: '🔴', label: 'Sulit',  gradient: 'linear-gradient(135deg,#FF6B6B,#fd79a8)', glow: '#FF6B6B44' },
}

export default function DifficultySelector({ game, onSelect, onBack }) {
  const { darkMode } = useSettings()
  const { play }     = useSound()
  const [hovered, setHovered] = useState(null)
  const dark = darkMode

  const bg      = dark ? '#0d0b1e' : '#FFF9F0'
  const surface = dark ? '#16213e' : '#fff'
  const textMain  = dark ? '#e8e8f0' : '#2D3436'
  const textMuted = dark ? '#8892b0' : '#636E72'
  const borderCol = dark ? '#2d3561' : '#DFE6E9'

  return (
    <>
      <style>{`
        .diff-root {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          padding: 32px 20px;
          position: relative; overflow: hidden;
          transition: background 0.4s;
        }
        /* Subtle radial glow behind */
        .diff-root::before {
          content: '';
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 60% 50% at 50% 40%, ${game.color}18, transparent 70%);
          transition: opacity 0.4s;
        }
        .diff-card {
          max-width: 500px; width: 100%;
          position: relative; z-index: 1;
          animation: slide-up 0.45s ease both;
        }
        .diff-back-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: ${surface};
          border: 2px solid ${borderCol};
          border-radius: 12px; padding: 9px 18px;
          font-size: 14px; font-weight: 700;
          color: ${textMuted};
          cursor: pointer; margin-bottom: 36px;
          transition: all 0.18s ease;
          font-family: 'Nunito',sans-serif;
        }
        .diff-back-btn:hover { border-color: ${game.color}; color: ${game.color}; transform: translateX(-3px); }
        .diff-back-btn { -webkit-tap-highlight-color: transparent; }

        .diff-game-info { text-align: center; margin-bottom: 40px; }
        .diff-emoji-wrap {
          width: 96px; height: 96px; border-radius: 28px; margin: 0 auto 20px;
          background: linear-gradient(135deg, ${game.color}22, ${game.color}44);
          border: 2px solid ${game.color}33;
          display: flex; align-items: center; justify-content: center;
          font-size: 52px;
          box-shadow: 0 8px 32px ${game.color}22;
          animation: scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .diff-game-title { font-family: 'Fredoka One',cursive; font-size: 30px; color: ${textMain}; margin-bottom: 8px; }
        .diff-game-desc  { font-size: 14px; color: ${textMuted}; line-height: 1.6; max-width: 360px; margin: 0 auto; }

        .diff-label { font-family: 'Fredoka One',cursive; font-size: 15px; color: ${textMuted}; text-align: center; margin-bottom: 14px; letter-spacing: 0.3px; }

        .diff-option {
          display: flex; align-items: center; gap: 16px;
          border-radius: 20px; padding: 18px 22px; margin-bottom: 12px;
          cursor: pointer; border: 2px solid ${borderCol};
          background: ${surface};
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
          position: relative; overflow: hidden;
        }
        .diff-option::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.03) 100%);
          pointer-events: none;
        }
        .diff-option:hover   { transform: translateX(8px) scale(1.01); }
        .diff-option:active  { transform: translateX(4px) scale(0.99); }
        .diff-option { -webkit-tap-highlight-color: transparent; }

        .diff-icon-wrap {
          width: 52px; height: 52px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; flex-shrink: 0;
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .diff-option:hover .diff-icon-wrap { transform: scale(1.15) rotate(-5deg); }

        .diff-text { flex: 1; }
        .diff-name { font-family: 'Fredoka One',cursive; font-size: 20px; margin-bottom: 3px; transition: color 0.2s; }
        .diff-desc { font-size: 12px; color: ${textMuted}; line-height: 1.4; }

        .diff-chips { display: flex; flex-direction: column; gap: 5px; align-items: flex-end; }
        .diff-chip  { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 100px; white-space: nowrap; transition: all 0.2s; }

        .diff-arrow { font-size: 18px; transition: transform 0.2s, color 0.2s; flex-shrink: 0; }
        .diff-option:hover .diff-arrow { transform: translateX(5px); }

        /* Best scores */
        .diff-scores {
          margin-top: 24px; border-radius: 20px; padding: 18px 22px;
          background: ${surface}; border: 2px solid ${borderCol};
        }
        .diff-scores-title { font-family: 'Fredoka One',cursive; font-size: 14px; color: ${textMuted}; margin-bottom: 14px; }
        .diff-scores-grid  { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
        .diff-score-cell   { text-align: center; padding: 12px 8px; border-radius: 14px; background: ${dark ? '#1e2a4a' : '#F8F9FA'}; }
        .diff-score-val    { font-family: 'Fredoka One',cursive; font-size: 16px; margin-bottom: 2px; }
        .diff-score-lbl    { font-size: 11px; color: ${textMuted}; font-weight: 600; }

        @media (max-width: 500px) {
          .diff-root { padding: 24px 16px; }
          .diff-game-title { font-size: 24px; }
          .diff-emoji-wrap { width: 76px; height: 76px; font-size: 42px; border-radius: 22px; }
          .diff-option { padding: 14px 16px; gap: 12px; border-radius: 16px; }
          .diff-icon-wrap { width: 44px; height: 44px; border-radius: 12px; font-size: 24px; }
          .diff-name { font-size: 17px; }
          .diff-chips { display: none; }
        }
      `}</style>

      <div className="diff-root" style={{ background: bg }}>
        <div className="diff-card">

          {/* Back */}
          <button className="diff-back-btn" onClick={() => { play('click'); onBack() }}>
            ← Kembali ke Home
          </button>

          {/* Game info */}
          <div className="diff-game-info">
            <div className="diff-emoji-wrap">{game.emoji}</div>
            <h1 className="diff-game-title">{game.title}</h1>
            <p className="diff-game-desc">{game.description}</p>
          </div>

          {/* Difficulty options */}
          <p className="diff-label">Pilih tingkat kesulitan 👇</p>

          {game.difficulties.map((diff, i) => {
            const cfg       = DIFF_CONFIG[diff.id]
            const isHovered = hovered === diff.id
            return (
              <div
                key={diff.id}
                className="diff-option"
                style={{
                  borderColor: isHovered ? game.color : borderCol,
                  background:  isHovered ? `${game.color}10` : surface,
                  boxShadow:   isHovered ? `0 8px 28px ${game.color}22, 4px 0 0 ${game.color} inset` : 'none',
                  animationDelay: `${i * 0.08}s`,
                  animation: `slide-up 0.4s ${i * 0.08}s ease both`,
                }}
                onClick={() => { play('click'); onSelect(diff.id) }}
                onMouseEnter={() => { play('hover'); setHovered(diff.id) }}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Icon */}
                <div className="diff-icon-wrap" style={{ background: isHovered ? `${game.color}20` : (dark ? '#1e2a4a' : '#F8F9FA') }}>
                  {cfg.icon}
                </div>

                {/* Text */}
                <div className="diff-text">
                  <div className="diff-name" style={{ color: isHovered ? game.color : textMain }}>{cfg.label}</div>
                  <div className="diff-desc">{diff.description}</div>
                </div>

                {/* Stat chips */}
                <div className="diff-chips">
                  {diff.stats.map((s, j) => (
                    <span key={j} className="diff-chip" style={{
                      background: isHovered ? `${game.color}22` : (dark ? '#1e2a4a' : '#F0F0F0'),
                      color: isHovered ? game.color : textMuted,
                    }}>
                      {s}
                    </span>
                  ))}
                </div>

                {/* Arrow */}
                <div className="diff-arrow" style={{ color: isHovered ? game.color : borderCol }}>→</div>
              </div>
            )
          })}

          {/* Best scores */}
          <div className="diff-scores">
            <div className="diff-scores-title">🏆 Rekor Terbaikmu</div>
            <div className="diff-scores-grid">
              {game.difficulties.map(diff => {
                const cfg  = DIFF_CONFIG[diff.id]
                const best = localStorage.getItem(`${game.id}-best-${diff.id}`)
                return (
                  <div key={diff.id} className="diff-score-cell">
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{cfg.icon}</div>
                    <div className="diff-score-val" style={{ color: best ? game.color : (dark ? '#3d4a6a' : '#DFE6E9') }}>
                      {best ? `${best}×` : '—'}
                    </div>
                    <div className="diff-score-lbl">{cfg.label}</div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
