import { useState, useMemo } from 'react'
import { useLocalAnalytics } from '../context/LocalAnalyticsContext.jsx'
import { useProgress } from '../context/ProgressContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'

// ─── SVG Chart Components ──────────────────────────────────────────────────

function MiniLineChart({ data, dataKey, color = '#A29BFE', height = 120, showDots = true, showArea = true, showLabels = true }) {
  if (!data || data.length === 0) return null
  const values = data.map(d => d[dataKey] || 0)
  const max = Math.max(...values, 1)
  const w = 100
  const h = height
  const padY = 10
  const padX = 4
  const usableW = w - padX * 2
  const usableH = h - padY * 2

  const points = values.map((v, i) => {
    const x = padX + (i / Math.max(values.length - 1, 1)) * usableW
    const y = padY + usableH - (v / max) * usableH
    return { x, y, v }
  })

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaD = lineD + ` L${points[points.length - 1].x},${h - padY} L${points[0].x},${h - padY} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`area-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {showArea && <path d={areaD} fill={`url(#area-${dataKey})`} />}
      <path d={lineD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {showDots && points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill={color} stroke="#0d1022" strokeWidth="1">
          <title>{data[i]?.label}: {p.v}</title>
        </circle>
      ))}
      {showLabels && points.length <= 14 && points.map((p, i) => (
        i % Math.ceil(points.length / 7) === 0 ? (
          <text key={`l${i}`} x={p.x} y={h - 1} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="3.5" fontFamily="sans-serif">
            {data[i]?.label?.split(' ')[0]}
          </text>
        ) : null
      ))}
    </svg>
  )
}

function MiniBarChart({ data, maxVal, color = '#A29BFE', accentColor, dark }) {
  if (!data || data.length === 0) return null
  const mx = maxVal || Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => {
        const pct = Math.max((d.value / mx) * 100, 2)
        return (
          <div key={d.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>{d.emoji || '🎮'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: dark ? '#e8e8f0' : '#2D3436', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.label}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: d.color || color, flexShrink: 0, marginLeft: 8 }}>
                  {d.value}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 100, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 100, width: `${pct}%`,
                  background: `linear-gradient(90deg, ${d.color || color}, ${accentColor || color}cc)`,
                  transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
                  boxShadow: `0 0 8px ${d.color || color}44`,
                }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({ data, size = 120, strokeWidth = 18 }) {
  if (!data || data.length === 0) return null
  const r = (size - strokeWidth) / 2
  const c = Math.PI * 2 * r
  let offset = 0

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((seg, i) => {
          const dashLen = (seg.pct / 100) * c
          const gap = c - dashLen
          const rot = (offset / 100) * 360 - 90
          offset += seg.pct
          return (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke={seg.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dashLen} ${gap}`}
              strokeLinecap="round"
              transform={`rotate(${rot} ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dasharray 0.8s ease', opacity: 0.85 }}
            >
              <title>{seg.name}: {seg.pct}%</title>
            </circle>
          )
        })}
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "'Fredoka One', cursive", color: '#fff' }}>
          {data.reduce((s, d) => s + d.count, 0)}
        </span>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Total
        </span>
      </div>
    </div>
  )
}

function ActivityHeatmap({ data, dark }) {
  if (!data || data.length === 0) return null
  const maxCount = Math.max(...data.map(d => d.count), 1)

  const getColor = (count) => {
    if (count === 0) return dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
    const intensity = count / maxCount
    if (intensity <= 0.25) return dark ? 'rgba(124,111,232,0.2)' : 'rgba(108,92,231,0.15)'
    if (intensity <= 0.5) return dark ? 'rgba(124,111,232,0.4)' : 'rgba(108,92,231,0.3)'
    if (intensity <= 0.75) return dark ? 'rgba(124,111,232,0.65)' : 'rgba(108,92,231,0.5)'
    return dark ? '#7C6FE8' : '#6C5CE7'
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {data.map((d, i) => (
        <div key={i} title={`${d.dateLabel}: ${d.count} game`}
          style={{
            width: 24, height: 24, borderRadius: 6,
            background: getColor(d.count),
            border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 800,
            color: d.count > 0 ? (dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)') : 'transparent',
            transition: 'all 0.2s',
            cursor: 'default',
          }}
        >
          {d.count > 0 ? d.count : ''}
        </div>
      ))}
    </div>
  )
}

function StatCard({ icon, label, value, color, sub, dark }) {
  return (
    <div style={{
      background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      border: `1.5px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      borderRadius: 18, padding: '18px 16px', textAlign: 'center',
      transition: 'all 0.2s',
    }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 26, color: color || '#A29BFE', marginBottom: 4, lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: 10, color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 10, color: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function InsightCard({ insight, dark }) {
  const typeColors = { success: '#00B894', warning: '#FDCB6E', info: '#A29BFE', tip: '#4ECDC4' }
  const color = typeColors[insight.type] || '#A29BFE'
  return (
    <div style={{
      display: 'flex', gap: 14, padding: '16px 18px', borderRadius: 16,
      background: dark ? `rgba(${insight.type === 'warning' ? '253,203,110' : '124,111,232'},0.08)` : `rgba(${insight.type === 'warning' ? '253,203,110' : '108,92,231'},0.05)`,
      border: `1.5px solid ${color}33`,
      transition: 'all 0.2s',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14, flexShrink: 0,
        background: `${color}18`, border: `1.5px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>{insight.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: dark ? '#e8e8f0' : '#2D3436', marginBottom: 4 }}>{insight.title}</div>
        <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)', lineHeight: 1.5 }}>{insight.text}</div>
      </div>
    </div>
  )
}

// ─── Tab definitions ────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  icon: '📈', label: 'Overview' },
  { id: 'activity',  icon: '🔥', label: 'Aktivitas' },
  { id: 'games',     icon: '🎮', label: 'Per Game' },
  { id: 'trends',    icon: '📊', label: 'Tren' },
  { id: 'insights',  icon: '🧠', label: 'Insight' },
  { id: 'data',      icon: '⚙️', label: 'Data' },
]

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function AnalyticsDashboard({ onBack }) {
  const {
    getDailyTrend, getHeatmapData, getTopGames, getCategoryDistribution,
    getInsights, getSummary, getLimitedModeStats, exportJSON, resetAnalytics,
  } = useLocalAnalytics()
  const { progress } = useProgress()
  const tc = useThemeColors()
  const [tab, setTab] = useState('overview')
  const [trendPeriod, setTrendPeriod] = useState(7)

  const dark = tc.dark
  const accent = '#7C6FE8'
  const surface = dark ? '#1A1F35' : '#FFFFFF'
  const border = dark ? '#252B45' : '#E8ECF4'
  const textMain = dark ? '#E2E8F0' : '#2D3436'
  const textMuted = dark ? '#475569' : '#636E72'

  // Memoized data
  const summary = useMemo(() => getSummary(), [getSummary])
  const trend = useMemo(() => getDailyTrend(trendPeriod), [getDailyTrend, trendPeriod])
  const heatmap = useMemo(() => getHeatmapData(30), [getHeatmapData])
  const topGames = useMemo(() => getTopGames(8), [getTopGames])
  const categoryDist = useMemo(() => getCategoryDistribution(), [getCategoryDistribution])
  const insights = useMemo(() => getInsights(), [getInsights])

  // Progress-based stats
  const totalGames = progress.totalGamesPlayed || 0
  const totalXP = progress.totalXP || 0
  const totalPlayTime = progress.totalPlayTime || 0
  const streak = progress.currentStreak || 0
  const maxStreak = progress.maxStreak || 0
  const uniqueGames = progress.uniqueGamesPlayed || 0
  const threeStars = progress.threeStarCount || 0
  const hardWon = progress.hardGamesWon || 0

  const formatTime = (sec) => {
    if (sec < 60) return `${sec}d`
    if (sec < 3600) return `${Math.round(sec / 60)}m`
    return `${Math.round(sec / 3600 * 10) / 10}j`
  }

  // Active days in last 30
  const activeDays30 = heatmap.filter(d => d.count > 0).length
  // Total games in last 7 days
  const gamesLast7 = trend.slice(-7).reduce((s, d) => s + d.gamesPlayed, 0)

  return (
    <>
      <style>{`
        .ad-root { min-height: 100vh; padding: 24px 16px 100px; transition: background 0.4s; }
        .ad-inner { max-width: 860px; margin: 0 auto; }

        /* Header */
        .ad-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px; gap: 12px;
        }
        .ad-title {
          font-family: 'Fredoka One', cursive; font-size: 26px; color: ${textMain};
          margin: 0; display: flex; align-items: center; gap: 10px;
        }
        .ad-back {
          display: inline-flex; align-items: center; gap: 6px;
          background: ${surface}; border: 2px solid ${border}; border-radius: 12px;
          padding: 8px 16px; font-size: 13px; font-weight: 700; color: ${textMuted};
          cursor: pointer; transition: all 0.2s; font-family: 'Nunito', sans-serif;
        }
        .ad-back:hover { border-color: ${accent}; color: ${accent}; transform: translateX(-3px); }

        /* Tabs */
        .ad-tabs {
          display: flex; gap: 4px; overflow-x: auto; padding-bottom: 4px;
          margin-bottom: 24px; scrollbar-width: none;
          border-bottom: 2px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
        }
        .ad-tabs::-webkit-scrollbar { display: none; }
        .ad-tab {
          flex-shrink: 0; display: flex; align-items: center; gap: 6px;
          padding: 10px 16px; border: none; background: transparent;
          color: ${textMuted}; font-weight: 700; font-size: 12px; cursor: pointer;
          border-bottom: 3px solid transparent; transition: all 0.2s;
          font-family: 'Nunito', sans-serif; white-space: nowrap;
        }
        .ad-tab.active { color: ${accent}; border-bottom-color: ${accent}; }
        .ad-tab:hover { color: ${textMain}; }

        /* Card */
        .ad-card {
          background: ${surface}; border: 1.5px solid ${border}; border-radius: 20px;
          padding: 20px; margin-bottom: 16px; transition: all 0.2s;
        }
        .ad-card:hover { border-color: ${accent}22; }
        .ad-card-title {
          font-family: 'Fredoka One', cursive; font-size: 16px; color: ${textMain};
          margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
        }

        /* Stats Grid */
        .ad-stats-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;
          margin-bottom: 20px;
        }
        @media (max-width: 480px) {
          .ad-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* Period selector */
        .ad-period-row { display: flex; gap: 6px; margin-bottom: 16px; }
        .ad-period-btn {
          padding: 6px 14px; border-radius: 10px; border: 1.5px solid ${border};
          background: transparent; color: ${textMuted}; font-size: 11px; font-weight: 700;
          cursor: pointer; transition: all 0.2s; font-family: 'Nunito', sans-serif;
        }
        .ad-period-btn.active { background: ${accent}; color: #fff; border-color: ${accent}; }
        .ad-period-btn:hover { border-color: ${accent}; }

        /* Heatmap legend */
        .ad-hm-legend { display: flex; align-items: center; gap: 6px; margin-top: 12px; }
        .ad-hm-box { width: 14px; height: 14px; border-radius: 4px; }

        /* Action buttons */
        .ad-action-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .ad-action-btn {
          padding: 10px 20px; border-radius: 12px; border: 1.5px solid ${border};
          background: transparent; color: ${textMuted}; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.2s; font-family: 'Nunito', sans-serif;
          display: flex; align-items: center; gap: 8px;
        }
        .ad-action-btn:hover { border-color: ${accent}; color: ${accent}; transform: translateY(-2px); }
        .ad-action-btn.danger { border-color: #FF6B6B; color: #FF6B6B; }
        .ad-action-btn.danger:hover { background: #FF6B6B18; }
        .ad-action-btn.primary { background: linear-gradient(135deg, #A29BFE, #6C5CE7); border: none; color: #fff; }
        .ad-action-btn.primary:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(162,155,254,0.3); }

        /* Empty state */
        .ad-empty {
          text-align: center; padding: 40px 20px; color: ${textMuted};
          font-size: 14px; font-weight: 600;
        }
        .ad-empty-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.4; }

        /* Responsive */
        @media (max-width: 600px) {
          .ad-root { padding: 16px 12px 80px; }
          .ad-title { font-size: 22px; }
          .ad-tab { padding: 8px 12px; font-size: 11px; }
        }

        @keyframes ad-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .ad-animated { animation: ad-fade-in 0.4s ease both; }
      `}</style>

      <div className="ad-root" style={{ background: tc.bg }}>
        <div className="ad-inner">
          {/* Header */}
          <div className="ad-header">
            <h1 className="ad-title"><span>📊</span> Analytics</h1>
            <button className="ad-back" onClick={() => onBack?.()}>← Kembali</button>
          </div>

          {/* Tabs */}
          <div className="ad-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`ad-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* ─── TAB: Overview ─── */}
          {tab === 'overview' && (
            <div className="ad-animated">
              {/* Stat cards */}
              <div className="ad-stats-grid">
                <StatCard icon="🎮" label="Total Game" value={totalGames} color="#A29BFE" dark={dark} />
                <StatCard icon="⭐" label="Total XP" value={totalXP} color="#FDCB6E" dark={dark} />
                <StatCard icon="🔥" label="Streak" value={streak} color="#FF6B6B" sub={`Max: ${maxStreak}`} dark={dark} />
                <StatCard icon="⏱️" label="Play Time" value={formatTime(totalPlayTime)} color="#4ECDC4" dark={dark} />
                <StatCard icon="🎯" label="Game Unik" value={uniqueGames} color="#00B894" dark={dark} />
                <StatCard icon="⭐" label="3 Bintang" value={threeStars} color="#FFD700" dark={dark} />
              </div>

              {/* XP Trend mini chart */}
              <div className="ad-card">
                <div className="ad-card-title"><span>📈</span> Game 7 Hari Terakhir</div>
                {gamesLast7 > 0 ? (
                  <MiniLineChart data={getDailyTrend(7)} dataKey="gamesPlayed" color="#A29BFE" height={100} />
                ) : (
                  <div className="ad-empty">
                    <div className="ad-empty-icon">📉</div>
                    Belum ada data. Main game untuk melihat grafik!
                  </div>
                )}
              </div>

              {/* Category Distribution */}
              {categoryDist.length > 0 && (
                <div className="ad-card">
                  <div className="ad-card-title"><span>🎯</span> Distribusi Kategori</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                    <DonutChart data={categoryDist} size={110} strokeWidth={16} />
                    <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {categoryDist.map(cat => (
                        <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: cat.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: textMuted, flex: 1 }}>{cat.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: textMain }}>{cat.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB: Aktivitas ─── */}
          {tab === 'activity' && (
            <div className="ad-animated">
              {/* Streak banner */}
              <div className="ad-card" style={{
                background: dark
                  ? 'linear-gradient(135deg, rgba(255,107,107,0.1), rgba(26,31,53,0))'
                  : 'linear-gradient(135deg, rgba(255,107,107,0.06), #fff)',
                borderColor: 'rgba(255,107,107,0.25)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                    background: 'rgba(255,107,107,0.12)', border: '2px solid rgba(255,107,107,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                  }}>🔥</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Streak Saat Ini</div>
                    <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 32, color: '#FF6B6B' }}>{streak} Hari</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: textMuted }}>Streak Terpanjang</div>
                    <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: '#FDCB6E' }}>{maxStreak}</div>
                  </div>
                </div>
              </div>

              {/* Summary strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                <StatCard icon="📅" label="Hari Aktif (30h)" value={activeDays30} color="#4ECDC4" dark={dark} />
                <StatCard icon="🎮" label="Game (7h)" value={gamesLast7} color="#A29BFE" dark={dark} />
                <StatCard icon="💪" label="Hard Mode" value={hardWon} color="#FF6B6B" dark={dark} />
              </div>

              {/* Heatmap */}
              <div className="ad-card">
                <div className="ad-card-title"><span>🗓️</span> Aktivitas 30 Hari</div>
                <ActivityHeatmap data={heatmap} dark={dark} />
                <div className="ad-hm-legend">
                  <span style={{ fontSize: 10, color: textMuted }}>Sedikit</span>
                  {[0.04, 0.2, 0.4, 0.65, 1].map((opacity, i) => (
                    <div key={i} className="ad-hm-box" style={{
                      background: i === 0
                        ? (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')
                        : `rgba(124,111,232,${opacity})`,
                    }} />
                  ))}
                  <span style={{ fontSize: 10, color: textMuted }}>Banyak</span>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: Per Game ─── */}
          {tab === 'games' && (
            <div className="ad-animated">
              {topGames.length > 0 ? (
                <>
                  <div className="ad-card">
                    <div className="ad-card-title"><span>🏆</span> Game Terbanyak Dimainkan</div>
                    <MiniBarChart
                      data={topGames.map(g => ({
                        id: g.gameId, label: g.name, emoji: g.emoji,
                        value: g.played, color: '#A29BFE',
                      }))}
                      dark={dark}
                    />
                  </div>

                  <div className="ad-card">
                    <div className="ad-card-title"><span>🎯</span> Win Rate per Game</div>
                    <MiniBarChart
                      data={topGames
                        .filter(g => g.played >= 1)
                        .sort((a, b) => b.winRate - a.winRate)
                        .map(g => ({
                          id: g.gameId, label: g.name, emoji: g.emoji,
                          value: g.winRate,
                          color: g.winRate >= 70 ? '#00B894' : g.winRate >= 40 ? '#FDCB6E' : '#FF6B6B',
                        }))
                      }
                      maxVal={100}
                      dark={dark}
                    />
                  </div>

                  {/* Detail cards */}
                  <div className="ad-card">
                    <div className="ad-card-title"><span>📋</span> Detail Per Game</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {topGames.map(g => (
                        <div key={g.gameId} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 14px', borderRadius: 14,
                          background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                          border: `1px solid ${border}`,
                        }}>
                          <span style={{ fontSize: 24, width: 32, textAlign: 'center' }}>{g.emoji}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: textMain }}>{g.name}</div>
                            <div style={{ fontSize: 11, color: textMuted }}>
                              {g.played}x main • {g.won}W • WR {g.winRate}%
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 10, color: textMuted }}>Best</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#FDCB6E', fontFamily: "'Fredoka One', cursive" }}>
                              {g.bestScore > 0 ? g.bestScore : '—'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="ad-card">
                  <div className="ad-empty">
                    <div className="ad-empty-icon">🎮</div>
                    Belum ada data game. Main beberapa game dulu!
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB: Tren ─── */}
          {tab === 'trends' && (
            <div className="ad-animated">
              {/* Period selector */}
              <div className="ad-period-row">
                {[
                  { val: 7, label: '7 Hari' },
                  { val: 14, label: '14 Hari' },
                  { val: 30, label: '30 Hari' },
                ].map(p => (
                  <button
                    key={p.val}
                    className={`ad-period-btn ${trendPeriod === p.val ? 'active' : ''}`}
                    onClick={() => setTrendPeriod(p.val)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="ad-card">
                <div className="ad-card-title"><span>🎮</span> Game Dimainkan</div>
                {trend.some(d => d.gamesPlayed > 0) ? (
                  <MiniLineChart data={trend} dataKey="gamesPlayed" color="#A29BFE" height={110} />
                ) : (
                  <div className="ad-empty" style={{ padding: 20 }}>
                    <div className="ad-empty-icon">📉</div>
                    Belum ada data untuk periode ini.
                  </div>
                )}
              </div>

              <div className="ad-card">
                <div className="ad-card-title"><span>🏆</span> Game Dimenangkan</div>
                {trend.some(d => d.gamesWon > 0) ? (
                  <MiniLineChart data={trend} dataKey="gamesWon" color="#00B894" height={110} />
                ) : (
                  <div className="ad-empty" style={{ padding: 20 }}>
                    <div className="ad-empty-icon">📉</div>
                    Belum ada data kemenangan.
                  </div>
                )}
              </div>

              <div className="ad-card">
                <div className="ad-card-title"><span>🪙</span> Koin Diperoleh</div>
                {trend.some(d => d.coinsEarned > 0) ? (
                  <MiniLineChart data={trend} dataKey="coinsEarned" color="#FDCB6E" height={110} />
                ) : (
                  <div className="ad-empty" style={{ padding: 20 }}>
                    <div className="ad-empty-icon">📉</div>
                    Belum ada data koin.
                  </div>
                )}
              </div>

              <div className="ad-card">
                <div className="ad-card-title"><span>⭐</span> XP Diperoleh</div>
                {trend.some(d => d.xpEarned > 0) ? (
                  <MiniLineChart data={trend} dataKey="xpEarned" color="#4ECDC4" height={110} />
                ) : (
                  <div className="ad-empty" style={{ padding: 20 }}>
                    <div className="ad-empty-icon">📉</div>
                    Belum ada data XP.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB: Insights ─── */}
          {tab === 'insights' && (
            <div className="ad-animated">
              {insights.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {insights.map(ins => (
                    <InsightCard key={ins.id} insight={ins} dark={dark} />
                  ))}
                </div>
              ) : (
                <div className="ad-card">
                  <div className="ad-empty">
                    <div className="ad-empty-icon">🧠</div>
                    Main beberapa game dulu, nanti insight akan muncul secara otomatis!
                  </div>
                </div>
              )}

              {/* Quick stats summary */}
              <div className="ad-card" style={{ marginTop: 16 }}>
                <div className="ad-card-title"><span>📊</span> Ringkasan Cepat</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {[
                    { label: 'Total Game', value: totalGames, icon: '🎮' },
                    { label: 'Game Unik', value: uniqueGames, icon: '🎯' },
                    { label: 'Streak Max', value: maxStreak, icon: '🔥' },
                    { label: 'Hard Won', value: hardWon, icon: '💪' },
                    { label: '3 Stars', value: threeStars, icon: '⭐' },
                    { label: 'Play Time', value: formatTime(totalPlayTime), icon: '⏱️' },
                  ].map(s => (
                    <div key={s.label} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 12,
                      background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    }}>
                      <span style={{ fontSize: 18 }}>{s.icon}</span>
                      <div>
                        <div style={{ fontSize: 10, color: textMuted }}>{s.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: textMain, fontFamily: "'Fredoka One', cursive" }}>{s.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: Data ─── */}
          {tab === 'data' && (
            <div className="ad-animated">
              <div className="ad-card">
                <div className="ad-card-title"><span>💾</span> Kelola Data Analytics</div>
                <div style={{ fontSize: 13, color: textMuted, lineHeight: 1.7, marginBottom: 20 }}>
                  Data analytics disimpan secara lokal di browser kamu. Kamu bisa ekspor sebagai JSON atau reset semua data.
                </div>
                <div className="ad-action-row">
                  <button className="ad-action-btn primary" onClick={exportJSON}>
                    📥 Export JSON
                  </button>
                  <button className="ad-action-btn danger" onClick={() => {
                    if (confirm('Reset semua data analytics? Ini tidak bisa dibatalkan!')) {
                      resetAnalytics()
                    }
                  }}>
                    🗑️ Reset Data
                  </button>
                </div>
              </div>

              {/* Raw event stats */}
              <div className="ad-card">
                <div className="ad-card-title"><span>📋</span> Info Penyimpanan</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Total Events Tracked', value: summary.totalEvents },
                    { label: 'Active Event Types', value: summary.activeEvents },
                    { label: 'Unique Games (events)', value: summary.uniqueGames },
                    { label: 'Daily Logs', value: Object.keys(getDailyTrend(60).filter(d => d.gamesPlayed > 0)).length + ' hari' },
                  ].map(row => (
                    <div key={row.label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                    }}>
                      <span style={{ fontSize: 12, color: textMuted }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: textMain }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
