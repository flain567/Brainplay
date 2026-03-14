import { useState } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useProgress, ACHIEVEMENTS, getLevelInfo } from '../context/ProgressContext.jsx'

const CATEGORY_META = {
  milestone: { label: 'Milestone',  icon: '🎮', color: '#4ECDC4' },
  variety:   { label: 'Variasi',    icon: '🧭', color: '#A29BFE' },
  skill:     { label: 'Skill',      icon: '⚔️', color: '#FF6B6B' },
  streak:    { label: 'Streak',     icon: '🔥', color: '#FD79A8' },
  score:     { label: 'Skor',       icon: '💰', color: '#FDCB6E' },
  perfect:   { label: 'Sempurna',   icon: '⭐', color: '#FFE66D' },
  speed:     { label: 'Kecepatan',  icon: '⚡', color: '#45B7D1' },
  game:      { label: 'Per-Game',   icon: '🎯', color: '#55EFC4' },
}

function formatPlayTime(seconds) {
  if (!seconds || seconds <= 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}j ${m}m`
  return `${m}m`
}

export default function Profile({ onBack, games }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { progress } = useProgress()
  const [achFilter, setAchFilter] = useState('all')
  const dark = darkMode

  const levelInfo = getLevelInfo(progress.totalXP || 0)
  const unlockedSet = new Set(progress.unlockedAchievements || [])
  const unlockedCount = unlockedSet.size
  const totalAchievements = ACHIEVEMENTS.length

  const categories = ['all', ...Object.keys(CATEGORY_META)]
  const filteredAchievements = achFilter === 'all'
    ? ACHIEVEMENTS
    : ACHIEVEMENTS.filter(a => a.category === achFilter)

  const bg       = dark ? '#0d0b1e' : '#FFF9F0'
  const surface  = dark ? '#16213e' : '#fff'
  const textMain = dark ? '#e8e8f0' : '#2D3436'
  const textMuted= dark ? '#8892b0' : '#636E72'
  const borderCol= dark ? '#2d3561' : '#DFE6E9'

  return (
    <>
      <style>{`
        .prof-root {
          min-height: 100vh; padding: 32px 20px 80px;
          transition: background 0.4s;
        }
        .prof-inner { max-width: 600px; margin: 0 auto; }
        .prof-back {
          display: inline-flex; align-items: center; gap: 8px;
          background: ${surface}; border: 2px solid ${borderCol};
          border-radius: 12px; padding: 9px 18px;
          font-size: 14px; font-weight: 700; color: ${textMuted};
          cursor: pointer; margin-bottom: 28px; font-family: 'Nunito',sans-serif;
          transition: all 0.18s ease;
        }
        .prof-back:hover { border-color: #A29BFE; color: #A29BFE; transform: translateX(-3px); }

        /* Level card */
        .prof-level-card {
          background: ${surface}; border: 2px solid ${borderCol};
          border-radius: 24px; padding: 28px; margin-bottom: 20px;
          position: relative; overflow: hidden;
          animation: slide-up 0.4s ease both;
        }
        .prof-level-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, #FF6B6B, #A29BFE, #4ECDC4, #FDCB6E);
        }

        /* Stats grid */
        .prof-stats {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
          margin-bottom: 20px;
          animation: slide-up 0.4s 0.1s ease both;
        }
        .prof-stat {
          background: ${surface}; border: 2px solid ${borderCol};
          border-radius: 18px; padding: 18px 16px; text-align: center;
          transition: all 0.2s;
        }
        .prof-stat:hover { transform: translateY(-2px); border-color: #A29BFE44; }

        /* Achievement section */
        .prof-ach-section {
          background: ${surface}; border: 2px solid ${borderCol};
          border-radius: 24px; padding: 24px; margin-bottom: 20px;
          animation: slide-up 0.4s 0.2s ease both;
        }

        /* Achievement filter */
        .ach-filter-row {
          display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px;
          padding-bottom: 16px; border-bottom: 1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'};
        }
        .ach-filter-btn {
          padding: 5px 12px; border-radius: 100px; border: 1.5px solid ${borderCol};
          background: transparent; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
          font-family: 'Nunito',sans-serif; color: ${textMuted};
        }
        .ach-filter-btn.active {
          border-color: #A29BFE; background: #A29BFE22; color: #A29BFE;
        }
        .ach-filter-btn:hover { border-color: #A29BFE; }

        /* Achievement item */
        .ach-item {
          display: flex; align-items: center; gap: 14px;
          padding: 14px; border-radius: 16px;
          margin-bottom: 8px; transition: all 0.2s;
          border: 1.5px solid transparent;
        }
        .ach-item.unlocked { background: ${dark ? 'rgba(253,203,110,0.06)' : 'rgba(253,203,110,0.08)'}; border-color: ${dark ? 'rgba(253,203,110,0.15)' : 'rgba(253,203,110,0.2)'}; }
        .ach-item.locked   { opacity: 0.5; }
        .ach-item:hover    { transform: translateX(4px); }
        .ach-icon-wrap {
          width: 48px; height: 48px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; flex-shrink: 0;
        }

        /* Leaderboard */
        .prof-leader {
          background: ${surface}; border: 2px solid ${borderCol};
          border-radius: 24px; padding: 24px;
          animation: slide-up 0.4s 0.3s ease both;
        }

        @media (max-width: 480px) {
          .prof-stats { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .prof-stat { padding: 14px 10px; }
        }
      `}</style>

      <div className="prof-root" style={{ background: bg }}>
        <div className="prof-inner">

          {/* Back */}
          <button className="prof-back" onClick={() => { play('click'); onBack() }}>
            ← Kembali
          </button>

          {/* ── Level Card ── */}
          <div className="prof-level-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: 'linear-gradient(135deg, #A29BFE22, #FDCB6E22)',
                border: '2px solid #A29BFE33',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, flexShrink: 0,
              }}>
                {levelInfo.level < 5 ? '🌱' : levelInfo.level < 10 ? '⚔️' : levelInfo.level < 15 ? '👑' : '🌟'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 13, color: '#A29BFE', letterSpacing: '0.5px', marginBottom: 2 }}>
                  LEVEL {levelInfo.level}
                </div>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: textMain, lineHeight: 1.1 }}>
                  {levelInfo.title}
                </div>
                <div style={{ fontSize: 12, color: textMuted, marginTop: 4 }}>
                  {levelInfo.xp.toLocaleString()} XP total
                </div>
              </div>
            </div>

            {/* XP progress bar */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>Level {levelInfo.level}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>Level {levelInfo.level + 1}</span>
              </div>
              <div style={{
                height: 10, borderRadius: 100, overflow: 'hidden',
                background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }}>
                <div style={{
                  height: '100%', borderRadius: 100,
                  background: 'linear-gradient(90deg, #A29BFE, #FDCB6E)',
                  width: `${Math.round(levelInfo.progress * 100)}%`,
                  transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: textMuted, marginTop: 5, fontWeight: 700 }}>
                {levelInfo.xpToNext.toLocaleString()} XP lagi ke Level {levelInfo.level + 1}
              </div>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="prof-stats">
            {[
              { icon: '🎮', label: 'Game Dimainkan', value: progress.totalGamesPlayed || 0 },
              { icon: '🔥', label: 'Streak', value: `${progress.currentStreak || 0} hari` },
              { icon: '🏆', label: 'Achievements', value: `${unlockedCount}/${totalAchievements}` },
              { icon: '🎯', label: 'Game Unik', value: `${progress.uniqueGamesPlayed || 0}/${games?.length || 8}` },
              { icon: '⭐', label: '3 Bintang', value: progress.threeStarCount || 0 },
              { icon: '⏱️', label: 'Total Main', value: formatPlayTime(progress.totalPlayTime) },
            ].map(s => (
              <div key={s.label} className="prof-stat">
                <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: textMain, marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: textMuted, fontWeight: 700 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Per-game breakdown ── */}
          {games && games.length > 0 && (
            <div className="prof-leader">
              <h3 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 18, color: textMain, marginBottom: 16 }}>
                📊 Statistik Per Game
              </h3>
              {games.map(g => {
                const wins = (progress.gameWins || {})[g.id] || 0
                const best = (progress.gameBests || {})[g.id] || 0
                // Contextual best label per game type
                const bestLabel = g.id === 'hangman' ? `${best} salah`
                  : g.id === 'sudoku' ? `${Math.floor(best/60)}:${(best%60).toString().padStart(2,'0')}`
                  : g.id === 'color-sort' ? `${best} langkah`
                  : g.id === 'slither-worm' ? `${best} poin`
                  : g.id === 'space-shooter' ? `${best} poin`
                  : best.toLocaleString()
                return (
                  <div key={g.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 14px', borderRadius: 14, marginBottom: 8,
                    background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                  }}>
                    <span style={{ fontSize: 28, flexShrink: 0 }}>{g.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 14, color: textMain }}>{g.title}</div>
                      <div style={{ fontSize: 11, color: textMuted }}>
                        {wins > 0 ? `${wins}× menang` : 'Belum dimainkan'}
                        {best > 0 ? ` • Best: ${bestLabel}` : ''}
                      </div>
                    </div>
                    <div style={{
                      background: `${g.color}22`, color: g.color,
                      padding: '4px 10px', borderRadius: 100,
                      fontSize: 11, fontWeight: 800,
                    }}>
                      Hari {g.day}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Achievements ── */}
          <div className="prof-ach-section" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 18, color: textMain }}>
                🏆 Achievements
              </h3>
              <span style={{
                background: '#FDCB6E22', color: '#FDCB6E', padding: '4px 12px',
                borderRadius: 100, fontSize: 12, fontWeight: 800, fontFamily: "'Fredoka One',cursive",
              }}>
                {unlockedCount}/{totalAchievements}
              </span>
            </div>

            {/* Filter */}
            <div className="ach-filter-row">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`ach-filter-btn ${achFilter === cat ? 'active' : ''}`}
                  onClick={() => { play('click'); setAchFilter(cat) }}
                >
                  {cat === 'all' ? '🎮 Semua' : `${CATEGORY_META[cat].icon} ${CATEGORY_META[cat].label}`}
                </button>
              ))}
            </div>

            {/* Achievement list */}
            {filteredAchievements.map(ach => {
              const unlocked = unlockedSet.has(ach.id)
              const catMeta = CATEGORY_META[ach.category]
              const prog = !unlocked && ach.progress ? ach.progress(progress) : null
              const isNew = ['hangman_hero','sort_master','sudoku_sage'].includes(ach.id)
              return (
                <div key={ach.id} className={`ach-item ${unlocked ? 'unlocked' : 'locked'}`}>
                  <div className="ach-icon-wrap" style={{
                    background: unlocked
                      ? `${catMeta?.color || '#A29BFE'}22`
                      : (dark ? '#1e2a4a' : '#F0F0F0'),
                  }}>
                    {unlocked ? ach.icon : '🔒'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{
                        fontFamily: "'Fredoka One',cursive", fontSize: 14,
                        color: unlocked ? textMain : textMuted,
                      }}>
                        {ach.title}
                      </span>
                      {isNew && !unlocked && (
                        <span style={{ fontSize: 9, fontWeight: 800, background: '#FF6B6B', color: '#fff', padding: '1px 6px', borderRadius: 100, letterSpacing: '0.5px' }}>NEW</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: textMuted }}>{ach.desc}</div>
                    {/* Progress bar for locked achievements */}
                    {!unlocked && prog && prog.max > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 100, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 100,
                            background: `linear-gradient(90deg, ${catMeta?.color || '#A29BFE'}, ${catMeta?.color || '#A29BFE'}aa)`,
                            width: `${Math.round((prog.cur / prog.max) * 100)}%`,
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: catMeta?.color || '#A29BFE', whiteSpace: 'nowrap', fontFamily: "'Fredoka One',cursive" }}>
                          {prog.cur}/{prog.max}
                        </span>
                      </div>
                    )}
                  </div>
                  {unlocked && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#4ECDC4', whiteSpace: 'nowrap' }}>✓ Unlocked</span>
                  )}
                </div>
              )
            })}

            {filteredAchievements.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: textMuted, fontSize: 14 }}>
                Tidak ada achievement di kategori ini
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
