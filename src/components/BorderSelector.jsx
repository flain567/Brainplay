import { useProgress, CUSTOM_BORDERS, getBorderForLevel } from '../context/ProgressContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useThemeColors } from '../hooks/useThemeColors.js'

export default function BorderSelector({ onClose }) {
  const { progress, selectBorder, getLevelInfo } = useProgress()
  const { play } = useSound()
  const tc = useThemeColors()
  
  const levelInfo = getLevelInfo(progress.totalXP || 0)
  const defaultBorder = getBorderForLevel(levelInfo.level)
  
  const allUnlocked = [
    { ...defaultBorder, name: `Level ${levelInfo.level} Default`, isDefault: true },
    ...(progress.unlockedBorders || []).map(id => CUSTOM_BORDERS[id]).filter(Boolean)
  ]

  const handleSelect = (id) => {
    play('click')
    selectBorder(id)
  }

  const dark = tc.dark

  return (
    <div className="border-modal">
      <style>{`
        .border-modal {
          position: fixed; inset: 0; z-index: 1100;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px; animation: modal-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes modal-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        
        .border-panel {
          background: ${dark ? '#1a1a2e' : '#fff'};
          width: 100%; max-width: 500px; border-radius: 28px;
          border: 2px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
          padding: 30px; position: relative;
        }
        .border-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 16px; margin-top: 24px; max-height: 400px; overflow-y: auto; padding: 4px;
        }
        .border-item {
          background: ${dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
          border: 2.5px solid transparent; border-radius: 20px;
          padding: 16px; display: flex; flex-direction: column; align-items: center;
          cursor: pointer; transition: all 0.2s; position: relative;
        }
        .border-item:hover { transform: translateY(-4px); background: ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}; }
        .border-item.active { 
          border-color: #a29bfe; background: ${dark ? 'rgba(162,155,254,0.1)' : 'rgba(162,155,254,0.05)'};
          box-shadow: 0 10px 25px rgba(162,155,254,0.2);
        }
        
        .avatar-preview {
          width: 64px; height: 64px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Fredoka One', cursive; font-size: 24px;
          margin-bottom: 12px; transition: all 0.3s;
        }
        .border-name { font-size: 13px; font-weight: 800; text-align: center; color: ${dark ? '#fff' : '#000'}; }
        
        .active-badge {
          position: absolute; top: -8px; right: -8px;
          background: #4ecdc4; color: #fff; width: 24px; height: 24px;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 14px; border: 2px solid ${dark ? '#1a1a2e' : '#fff'};
        }

        .close-btn {
          margin-top: 30px; width: 100%; padding: 14px;
          border-radius: 16px; border: none;
          background: #a29bfe; color: #fff;
          font-family: 'Fredoka One', cursive; font-size: 16px;
          cursor: pointer; transition: transform 0.2s;
        }
        .close-btn:active { transform: scale(0.96); }
      `}</style>

      <div className="border-panel">
        <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 24, margin: 0 }}>Avatar Border</h2>
        <p style={{ fontSize: 14, color: tc.textMuted, marginTop: 4 }}>Pilih bingkai kustom yang telah kamu buka!</p>

        <div className="border-grid">
          {allUnlocked.map((b) => {
            const isActive = progress.selectedBorder === b.id || (b.isDefault && !progress.selectedBorder)
            return (
              <div 
                key={b.id || 'default'} 
                className={`border-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelect(b.isDefault ? null : b.id)}
              >
                {isActive && <div className="active-badge">✓</div>}
                <div 
                  className="avatar-preview-container" 
                  style={{ position: 'relative', width: 80, height: 80, marginBottom: 12 }}
                >
                  {/* Actual Avatar (Placeholder 'P') */}
                  <div style={{
                    position: 'absolute', inset: 15, borderRadius: '50%',
                    background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    display: 'flex', alignItems: 'center', justify_content: 'center',
                    fontSize: 24, fontWeight: 800, color: b.color || tc.textMuted,
                    zIndex: 1
                  }}>P</div>

                  {/* Border Layer */}
                  {b.url ? (
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundImage: `url(${b.url})`,
                      backgroundSize: '100% 100%',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      zIndex: 2, pointerEvents: 'none'
                    }} />
                  ) : (
                    <div style={{
                      position: 'absolute', inset: 12,
                      border: b.border, boxShadow: b.boxShadow,
                      borderRadius: '50%', zIndex: 2, pointerEvents: 'none'
                    }} />
                  )}
                </div>
                <div className="border-name">{b.name}</div>
              </div>
            )
          })}
        </div>

        <button className="close-btn" onClick={() => { play('click'); onClose() }}>Selesai</button>
      </div>
    </div>
  )
}
