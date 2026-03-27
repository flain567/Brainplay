import { useState } from 'react'
import { useLocalAnalytics } from '../context/LocalAnalyticsContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'

export default function AnalyticsDashboard({ onBack }) {
  const { getLimitedModeStats, getGameStats, getSummary, resetAnalytics, exportJSON } = useLocalAnalytics()
  const tc = useThemeColors()
  const [tab, setTab] = useState('overview') // overview, events, games
  
  const dark = tc.dark
  const bg = tc.bg
  const surface = tc.surface
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const borderCol = tc.borderCol

  const summary = getSummary()
  const eventStats = getLimitedModeStats()
  const gameStats = getGameStats()

  return (
    <>
      <style>{`
        .analytics-root {
          min-height: 100vh;
          padding: 32px 20px 80px;
          transition: background 0.4s;
        }
        .analytics-inner {
          max-width: 1000px;
          margin: 0 auto;
        }
        .analytics-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        .analytics-title {
          font-family: 'Fredoka One', cursive;
          font-size: 28px;
          color: ${textMain};
          margin: 0;
        }
        .analytics-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: ${surface};
          border: 2px solid ${borderCol};
          border-radius: 12px;
          padding: 9px 18px;
          font-size: 14px;
          font-weight: 700;
          color: ${textMuted};
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .analytics-back:hover {
          border-color: #A29BFE;
          color: #A29BFE;
          transform: translateX(-3px);
        }

        /* Tabs */
        .analytics-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 28px;
          border-bottom: 2px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'};
          padding-bottom: 0;
        }
        .analytics-tab {
          padding: 12px 20px;
          border: none;
          background: transparent;
          color: ${textMuted};
          font-weight: 700;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
          font-family: 'Nunito', sans-serif;
          font-size: 14px;
        }
        .analytics-tab.active {
          color: #A29BFE;
          border-bottom-color: #A29BFE;
        }
        .analytics-tab:hover {
          color: ${textMain};
        }

        /* Summary Cards */
        .analytics-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }
        .analytics-card {
          background: ${surface};
          border: 2px solid ${borderCol};
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          transition: all 0.2s;
        }
        .analytics-card:hover {
          border-color: #A29BFE;
          transform: translateY(-2px);
        }
        .analytics-card-value {
          font-family: 'Fredoka One', cursive;
          font-size: 32px;
          color: #A29BFE;
          margin-bottom: 6px;
        }
        .analytics-card-label {
          font-size: 12px;
          color: ${textMuted};
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Table */
        .analytics-table {
          background: ${surface};
          border: 2px solid ${borderCol};
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 28px;
        }
        .analytics-table-head {
          background: ${dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
          border-bottom: 1px solid ${borderCol};
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 20px;
          font-weight: 700;
          font-size: 12px;
          color: ${textMuted};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .analytics-table-row {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 20px;
          border-bottom: 1px solid ${dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
          transition: all 0.2s;
        }
        .analytics-table-row:last-child {
          border-bottom: none;
        }
        .analytics-table-row:hover {
          background: ${dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'};
        }
        .analytics-table-cell {
          flex: 1;
          font-size: 13px;
          color: ${textMain};
        }
        .analytics-table-cell.muted {
          color: ${textMuted};
        }

        /* Actions */
        .analytics-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding-top: 20px;
          border-top: 1px solid ${borderCol};
        }
        .analytics-btn {
          padding: 8px 16px;
          border-radius: 10px;
          border: 1.5px solid ${borderCol};
          background: transparent;
          color: ${textMuted};
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Nunito', sans-serif;
        }
        .analytics-btn:hover {
          border-color: #A29BFE;
          color: #A29BFE;
        }
        .analytics-btn.danger {
          border-color: #FF6B6B;
          color: #FF6B6B;
        }
        .analytics-btn.danger:hover {
          background: #FF6B6B22;
        }
        .analytics-btn.primary {
          background: linear-gradient(135deg, #A29BFE, #6C5CE7);
          border: none;
          color: #fff;
        }
        .analytics-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(162,155,254,0.3);
        }

        @media (max-width: 600px) {
          .analytics-root { padding: 20px 16px 80px; }
          .analytics-title { font-size: 22px; }
          .analytics-summary { grid-template-columns: repeat(2, 1fr); }
          .analytics-table-head, .analytics-table-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
      `}</style>

      <div className="analytics-root" style={{ background: bg }}>
        <div className="analytics-inner">
          {/* Header */}
          <div className="analytics-header">
            <h1 className="analytics-title">📊 Analytics</h1>
            <button className="analytics-back" onClick={() => { onBack && onBack() }}>
              ← Kembali
            </button>
          </div>

          {/* Summary Cards */}
          <div className="analytics-summary">
            <div className="analytics-card">
              <div className="analytics-card-value">{summary.totalEvents}</div>
              <div className="analytics-card-label">Total Events</div>
            </div>
            <div className="analytics-card">
              <div className="analytics-card-value">{summary.totalCoins.toLocaleString()}</div>
              <div className="analytics-card-label">Total Coins</div>
            </div>
            <div className="analytics-card">
              <div className="analytics-card-value">{summary.totalXP.toLocaleString()}</div>
              <div className="analytics-card-label">Total XP</div>
            </div>
            <div className="analytics-card">
              <div className="analytics-card-value">{summary.activeEvents}</div>
              <div className="analytics-card-label">Active Events</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="analytics-tabs">
            <button className={`analytics-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
              Overview
            </button>
            <button className={`analytics-tab ${tab === 'events' ? 'active' : ''}`} onClick={() => setTab('events')}>
              Limited Mode Events
            </button>
            <button className={`analytics-tab ${tab === 'games' ? 'active' : ''}`} onClick={() => setTab('games')}>
              Game Stats
            </button>
          </div>

          {/* Tab Content */}
          {tab === 'overview' && (
            <div style={{ background: surface, border: `2px solid ${borderCol}`, borderRadius: 16, padding: 24 }}>
              <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 18, color: textMain, marginBottom: 16 }}>
                📈 Quick Overview
              </h3>
              <div style={{ fontSize: 13, color: textMuted, lineHeight: 1.8 }}>
                <div>✓ Total events tracked: <strong style={{ color: '#A29BFE' }}>{summary.totalEvents}</strong></div>
                <div>✓ Active event types: <strong style={{ color: '#A29BFE' }}>{summary.activeEvents}</strong></div>
                <div>✓ Unique games played: <strong style={{ color: '#A29BFE' }}>{summary.uniqueGames}</strong></div>
                <div style={{ marginTop: 12 }}>Total coins earned: <strong style={{ color: '#FDCB6E' }}>{summary.totalCoins.toLocaleString()}</strong> 🪙</div>
                <div>Total XP earned: <strong style={{ color: '#4ECDC4' }}>{summary.totalXP.toLocaleString()}</strong> ⭐</div>
              </div>
            </div>
          )}

          {tab === 'events' && (
            <div className="analytics-table">
              <div className="analytics-table-head">
                <div style={{ flex: 1.5 }}>Event Name</div>
                <div>Views</div>
                <div>Games</div>
                <div>Avg ⭐</div>
                <div>Total 🪙</div>
                <div>Total ⭐</div>
              </div>
              {eventStats.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: textMuted }}>
                  No event data yet. Play games during active events!
                </div>
              ) : (
                eventStats.map((stat) => (
                  <div key={stat.eventId} className="analytics-table-row">
                    <div className="analytics-table-cell" style={{ flex: 1.5 }}>
                      <strong>{stat.name}</strong>
                    </div>
                    <div className="analytics-table-cell">{stat.view_count}</div>
                    <div className="analytics-table-cell">{stat.game_count}</div>
                    <div className="analytics-table-cell" style={{ color: '#FDCB6E' }}>
                      {stat.avg_stars}
                    </div>
                    <div className="analytics-table-cell" style={{ color: '#FDCB6E' }}>
                      {stat.total_coins}
                    </div>
                    <div className="analytics-table-cell" style={{ color: '#4ECDC4' }}>
                      {stat.total_xp}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'games' && (
            <div className="analytics-table">
              <div className="analytics-table-head">
                <div style={{ flex: 1.5 }}>Game Name</div>
                <div>Completions</div>
                <div>Total 🪙</div>
                <div>Total ⭐</div>
              </div>
              {gameStats.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: textMuted }}>
                  No game data yet. Complete games to see stats!
                </div>
              ) : (
                gameStats.map((stat) => (
                  <div key={stat.gameId} className="analytics-table-row">
                    <div className="analytics-table-cell" style={{ flex: 1.5 }}>
                      <strong>{stat.gameId}</strong>
                    </div>
                    <div className="analytics-table-cell">{stat.completions}</div>
                    <div className="analytics-table-cell" style={{ color: '#FDCB6E' }}>
                      {stat.total_coins}
                    </div>
                    <div className="analytics-table-cell" style={{ color: '#4ECDC4' }}>
                      {stat.total_xp}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Actions */}
          <div className="analytics-table">
            <div className="analytics-actions">
              <button className="analytics-btn" onClick={exportJSON}>
                📥 Export JSON
              </button>
              <button className="analytics-btn danger" onClick={() => {
                if (confirm('Reset all analytics data? This cannot be undone!')) {
                  resetAnalytics()
                }
              }}>
                🗑️ Reset Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
