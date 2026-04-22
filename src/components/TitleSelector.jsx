import { useProgress, LEVEL_TITLES, ACHIEVEMENTS, BP_REWARDS, getTitleColorForLevel } from '../context/ProgressContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { useEffect } from 'react'
import PremiumTitleBadge from './PremiumTitleBadge.jsx'

export default function TitleSelector({ onClose }) {
  const { progress, setSelectedTitle, getLevelInfo } = useProgress()
  const { playerName } = useAuth()
  const { play } = useSound()
  const tc = useThemeColors()
  const levelInfo = getLevelInfo(progress.totalXP || 0)
  const dark = tc.dark

  const unlockedTitles = new Set(progress.unlockedTitles || [])
  const currentTitle = progress.selectedTitle || null

  // 1. Get all potential titles (Level + Achievement)
  const achievementTitles = ACHIEVEMENTS.filter(a => a.reward?.title).map(a => ({
    title: a.reward.title,
    from: a.title,
    rarity: a.category === 'streak' || a.category === 'score' ? 'epic' : 'rare'
  }))

  const levelTitles = LEVEL_TITLES.map((t, idx) => ({
    title: t,
    level: idx,
    from: `Level ${idx}`,
    rarity: idx >= 5 ? 'legendary' : idx >= 4 ? 'epic' : 'common'
  }))

  const bpTitles = BP_REWARDS
    .filter(r => r.reward?.type === 'title')
    .map(r => ({
      title: r.reward.value,
      from: `Battle Pass Level ${r.tier}`,
      rarity: r.reward.rarity || 'legendary'
    }))

  const allTitles = [
    { title: 'None', from: 'Default', rarity: 'common' }, // Option to have no title
    ...levelTitles,
    ...achievementTitles,
    ...bpTitles
  ]

  // Filter out duplicates (some level titles might be achievement titles, though unlikely here)
  const uniqueTitles = Array.from(new Set(allTitles.map(t => t.title)))
    .map(title => allTitles.find(t => t.title === title))

  const handleSelect = (title) => {
    play('click')
    setSelectedTitle(title === 'None' ? null : title)
  }

  const nameColor = getTitleColorForLevel(levelInfo.level || 0)

  // Lock body scroll when modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Scroll overlay into view
    window.scrollTo({ top: 0 })
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div className="ts-overlay" onClick={onClose}>
      <style>{`
        .ts-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
          animation: ts-fade 0.3s ease;
          overflow: hidden;
        }
        .ts-modal {
          width: 100%; max-width: 500px; max-height: 85vh;
          background: ${tc.surface}; border: 2px solid ${tc.borderCol};
          border-radius: 28px; display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }
        .ts-header {
          padding: 24px; border-bottom: 1px solid ${tc.borderCol};
          text-align: center; position: relative;
        }
        .ts-close {
          position: absolute; right: 20px; top: 20px;
          width: 32px; height: 32px; border-radius: 50%;
          border: 1.5px solid ${tc.borderCol}; background: transparent;
          color: ${tc.textMuted}; cursor: pointer; font-size: 18px;
        }
        .ts-preview {
          padding: 20px; background: ${dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
          margin: 0 24px 20px; border-radius: 18px; text-align: center;
          border: 1.5px dashed ${tc.borderCol};
        }
        .ts-scroll {
          flex: 1; overflow-y: auto; padding: 0 24px 24px;
          display: grid; grid-template-columns: 1fr; gap: 10px;
        }
        .ts-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px; border-radius: 16px; border: 1.5px solid ${tc.borderCol};
          cursor: pointer; transition: all 0.2s; background: transparent;
          color: ${tc.textMain}; font-family: 'Nunito', sans-serif;
        }
        .ts-item.unlocked:hover { transform: translateX(5px); border-color: #A29BFE; }
        .ts-item.active { border-color: #A29BFE; background: #A29BFE15; }
        .ts-item.locked { opacity: 0.5; filter: grayscale(1); cursor: not-allowed; }

        .ts-item-info { text-align: left; }
        .ts-item-title { font-family: 'Fredoka One', cursive; font-size: 15px; margin-bottom: 2px; }
        .ts-item-from { font-size: 11px; color: ${tc.textMuted}; font-weight: 700; }
        
        .ts-item-status { font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 100px; }
        
        @keyframes ts-fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <div className="ts-modal" onClick={e => e.stopPropagation()}>
        <div className="ts-header">
          <button className="ts-close" onClick={onClose}>×</button>
          <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: tc.textMain, margin: 0 }}>
            Pilih Gelar Player 🎖️
          </h2>
        </div>

        <div className="ts-preview">
          <div style={{ fontSize: 11, fontWeight: 800, color: tc.textMuted, marginBottom: 8, letterSpacing: '1px' }}>
            PRATINJAU TAMPILAN
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 18 }}>
            <PremiumTitleBadge 
              title={currentTitle || 'Tanpa Gelar'} 
              rarity={currentTitle ? (uniqueTitles.find(t => t.title === currentTitle)?.rarity || 'common') : 'common'} 
              size="normal"
            />
            <span style={{ 
              fontFamily: "'Fredoka One', cursive",
              background: nameColor.bg !== 'transparent' ? nameColor.bg : 'none',
              WebkitBackgroundClip: nameColor.bg !== 'transparent' ? 'text' : 'border-box',
              WebkitTextFillColor: nameColor.bg !== 'transparent' ? 'transparent' : tc.textMain,
              color: tc.textMain,
              marginLeft: 8
            }}>{playerName || 'Player'}</span>
          </div>
        </div>

        <div className="ts-scroll">
          {uniqueTitles.map(t => {
            const isLevelUnlocked = t.level !== undefined && levelInfo.level >= t.level
            const unlocked = t.title === 'None' || unlockedTitles.has(t.title) || isLevelUnlocked
            const active = (currentTitle === t.title) || (currentTitle === null && t.title === 'None')
            
            return (
              <button 
                key={t.title}
                className={`ts-item ${unlocked ? 'unlocked' : 'locked'} ${active ? 'active' : ''}`}
                onClick={() => unlocked && handleSelect(t.title)}
                disabled={!unlocked}
              >
                <div className="ts-item-info">
                  <div style={{ marginBottom: 6 }}>
                    <PremiumTitleBadge 
                      title={t.title === 'None' ? 'Kosongkan Gelar' : t.title} 
                      rarity={unlocked ? t.rarity : 'common'} 
                      size="small"
                      style={!unlocked ? { filter: 'grayscale(1)', opacity: 0.8 } : {}}
                    />
                  </div>
                  <div className="ts-item-from">
                    {t.title === 'None' ? 'Hapus gelar yang terpasang' : `Diperoleh dari: ${t.from}`}
                  </div>
                </div>
                {active ? (
                  <span className="ts-item-status" style={{ background: '#4ECDC422', color: '#4ECDC4' }}>TERPASANG</span>
                ) : unlocked ? (
                  <span className="ts-item-status" style={{ border: `1.5px solid ${tc.borderCol}`, color: tc.textMuted }}>GUNAKAN</span>
                ) : (
                  <span className="ts-item-status">🔒 TERKUNCI</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
