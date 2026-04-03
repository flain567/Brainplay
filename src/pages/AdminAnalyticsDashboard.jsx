import React, { useEffect, useState } from 'react'
import { useThemeColors } from '../hooks/useThemeColors'
import { getDb } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { ADMIN_IDS } from '../config/admin'

export default function AdminAnalyticsDashboard() {
  const { userId } = useAuth()
  const isAdmin = userId && ADMIN_IDS.includes(userId)
  const theme = useThemeColors()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('overview')
  const [dateRange, setDateRange] = useState('7days') // 7days, 30days, all

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  async function loadAnalytics() {
    if (!isAdmin) {
      setLoading(false)
      setError('Akses ditolak. Anda bukan admin.')
      return
    }
    try {
      setLoading(true)
      const db = await getDb()
      const { collection, getDocs, query, where, orderBy } = await import('firebase/firestore')
      
      const eventsCollection = collection(db, 'analytics_events')
      
      // Calculate date range
      const now = new Date()
      let startDate = new Date()
      if (dateRange === '7days') startDate.setDate(now.getDate() - 7)
      else if (dateRange === '30days') startDate.setDate(now.getDate() - 30)
      else startDate = new Date(2000, 0, 1)
      
      const startDateStr = startDate.toISOString().split('T')[0]
      
      // Fetch all events
      const q = query(
        eventsCollection,
        where('date', '>=', startDateStr),
        orderBy('date', 'desc')
      )
      
      const snapshot = await getDocs(q)
      const events = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
      
      // Aggregate data
      const aggregated = aggregateAnalytics(events)
      setAnalytics(aggregated)
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function aggregateAnalytics(events) {
    const gameStats = {}
    const playerStats = {}
    const eventStats = {}
    
    let totalCoins = 0
    let totalXP = 0
    let totalGames = 0
    
    events.forEach(event => {
      if (!event.gameId) return
      
      totalGames++
      totalCoins += event.coinEarned || 0
      totalXP += event.xpEarned || 0
      
      // Game stats
      if (!gameStats[event.gameId]) {
        gameStats[event.gameId] = {
          gameId: event.gameId,
          completions: 0,
          totalCoins: 0,
          totalXP: 0,
          avgStars: 0,
          totalStars: 0,
        }
      }
      gameStats[event.gameId].completions++
      gameStats[event.gameId].totalCoins += event.coinEarned || 0
      gameStats[event.gameId].totalXP += event.xpEarned || 0
      gameStats[event.gameId].totalStars += event.stars || 0
      gameStats[event.gameId].avgStars = (gameStats[event.gameId].totalStars / gameStats[event.gameId].completions).toFixed(2)
      
      // Player stats
      if (!playerStats[event.userId]) {
        playerStats[event.userId] = {
          userId: event.userId,
          userName: event.userName,
          completions: 0,
          totalCoins: 0,
          totalXP: 0,
          avgStars: 0,
          totalStars: 0,
        }
      }
      playerStats[event.userId].completions++
      playerStats[event.userId].totalCoins += event.coinEarned || 0
      playerStats[event.userId].totalXP += event.xpEarned || 0
      playerStats[event.userId].totalStars += event.stars || 0
      playerStats[event.userId].avgStars = (playerStats[event.userId].totalStars / playerStats[event.userId].completions).toFixed(2)
      
      // Event stats (limited mode)
      if (event.eventId) {
        if (!eventStats[event.eventId]) {
          eventStats[event.eventId] = {
            eventId: event.eventId,
            eventName: event.eventName,
            completions: 0,
            totalCoins: 0,
            totalXP: 0,
            avgStars: 0,
            totalStars: 0,
            players: new Set(),
          }
        }
        eventStats[event.eventId].completions++
        eventStats[event.eventId].totalCoins += event.coinEarned || 0
        eventStats[event.eventId].totalXP += event.xpEarned || 0
        eventStats[event.eventId].totalStars += event.stars || 0
        eventStats[event.eventId].avgStars = (eventStats[event.eventId].totalStars / eventStats[event.eventId].completions).toFixed(2)
        eventStats[event.eventId].players.add(event.userId)
      }
    })
    
    // Convert sets to arrays
    Object.values(eventStats).forEach(stat => {
      stat.uniquePlayers = stat.players.size
    })
    
    return {
      totalGames,
      totalCoins,
      totalXP,
      uniquePlayers: Object.keys(playerStats).length,
      gameStats: Object.values(gameStats).sort((a, b) => b.completions - a.completions),
      playerStats: Object.values(playerStats).sort((a, b) => b.completions - a.completions),
      eventStats: Object.values(eventStats).sort((a, b) => b.completions - a.completions),
      rawEvents: events,
    }
  }

  if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: theme.textSecondary }}>Loading...</div>
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>
  if (!analytics) return <div style={{ padding: '20px', color: theme.textSecondary }}>No data</div>

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: theme.text }}>📊 Admin Analytics Dashboard</h1>
      
      {/* Date Range Filter */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        {['7days', '30days', 'all'].map(range => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            style={{
              padding: '8px 16px',
              background: dateRange === range ? theme.primary : theme.surface,
              color: dateRange === range ? 'white' : theme.text,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {range === '7days' ? '7 Days' : range === '30days' ? '30 Days' : 'All Time'}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: `1px solid ${theme.border}` }}>
        {['overview', 'games', 'players', 'events'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? `3px solid ${theme.primary}` : 'none',
              color: tab === t ? theme.primary : theme.textSecondary,
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: tab === t ? 'bold' : 'normal',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            <div style={{ padding: '20px', background: theme.surface, borderRadius: '10px', border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: '14px', color: theme.textSecondary, marginBottom: '8px' }}>Total Games</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: theme.primary }}>{analytics.totalGames}</div>
            </div>
            <div style={{ padding: '20px', background: theme.surface, borderRadius: '10px', border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: '14px', color: theme.textSecondary, marginBottom: '8px' }}>Total Coins</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FFD700' }}>{analytics.totalCoins.toLocaleString()}</div>
            </div>
            <div style={{ padding: '20px', background: theme.surface, borderRadius: '10px', border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: '14px', color: theme.textSecondary, marginBottom: '8px' }}>Total XP</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4AFF4A' }}>{analytics.totalXP.toLocaleString()}</div>
            </div>
            <div style={{ padding: '20px', background: theme.surface, borderRadius: '10px', border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: '14px', color: theme.textSecondary, marginBottom: '8px' }}>Active Players</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: theme.primary }}>{analytics.uniquePlayers}</div>
            </div>
          </div>

          {/* Top Games */}
          <h2 style={{ color: theme.text, marginTop: '30px' }}>🎮 Top 5 Games</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                <th style={{ textAlign: 'left', padding: '12px', color: theme.textSecondary }}>Game</th>
                <th style={{ textAlign: 'right', padding: '12px', color: theme.textSecondary }}>Completions</th>
                <th style={{ textAlign: 'right', padding: '12px', color: theme.textSecondary }}>Avg Stars</th>
                <th style={{ textAlign: 'right', padding: '12px', color: theme.textSecondary }}>Total Coins</th>
              </tr>
            </thead>
            <tbody>
              {analytics.gameStats.slice(0, 5).map(game => (
                <tr key={game.gameId} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ padding: '12px', color: theme.text }}>{game.gameId}</td>
                  <td style={{ textAlign: 'right', padding: '12px', color: theme.text }}>{game.completions}</td>
                  <td style={{ textAlign: 'right', padding: '12px', color: theme.text }}>⭐ {game.avgStars}</td>
                  <td style={{ textAlign: 'right', padding: '12px', color: '#FFD700' }}>{game.totalCoins.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Games Tab */}
      {tab === 'games' && (
        <div>
          <h2 style={{ color: theme.text, marginBottom: '20px' }}>🎮 All Games Performance</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                <th style={{ textAlign: 'left', padding: '12px', color: theme.textSecondary }}>Game</th>
                <th style={{ textAlign: 'right', padding: '12px', color: theme.textSecondary }}>Completions</th>
                <th style={{ textAlign: 'right', padding: '12px', color: theme.textSecondary }}>Avg Stars</th>
                <th style={{ textAlign: 'right', padding: '12px', color: theme.textSecondary }}>Total Coins</th>
                <th style={{ textAlign: 'right', padding: '12px', color: theme.textSecondary }}>Total XP</th>
              </tr>
            </thead>
            <tbody>
              {analytics.gameStats.map(game => (
                <tr key={game.gameId} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ padding: '12px', color: theme.text }}>{game.gameId}</td>
                  <td style={{ textAlign: 'right', padding: '12px', color: theme.text }}>{game.completions}</td>
                  <td style={{ textAlign: 'right', padding: '12px', color: theme.text }}>⭐ {game.avgStars}</td>
                  <td style={{ textAlign: 'right', padding: '12px', color: '#FFD700' }}>{game.totalCoins.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', padding: '12px', color: '#4AFF4A' }}>{game.totalXP.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Players Tab */}
      {tab === 'players' && (
        <div>
          <h2 style={{ color: theme.text, marginBottom: '20px' }}>👥 Player Performance</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                <th style={{ textAlign: 'left', padding: '12px', color: theme.textSecondary }}>Player</th>
                <th style={{ textAlign: 'right', padding: '12px', color: theme.textSecondary }}>Games</th>
                <th style={{ textAlign: 'right', padding: '12px', color: theme.textSecondary }}>Avg Stars</th>
                <th style={{ textAlign: 'right', padding: '12px', color: theme.textSecondary }}>Total Coins</th>
                <th style={{ textAlign: 'right', padding: '12px', color: theme.textSecondary }}>Total XP</th>
              </tr>
            </thead>
            <tbody>
              {analytics.playerStats.map(player => (
                <tr key={player.userId} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ padding: '12px', color: theme.text }}>{player.userName}</td>
                  <td style={{ textAlign: 'right', padding: '12px', color: theme.text }}>{player.completions}</td>
                  <td style={{ textAlign: 'right', padding: '12px', color: theme.text }}>⭐ {player.avgStars}</td>
                  <td style={{ textAlign: 'right', padding: '12px', color: '#FFD700' }}>{player.totalCoins.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', padding: '12px', color: '#4AFF4A' }}>{player.totalXP.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Events Tab */}
      {tab === 'events' && (
        <div>
          <h2 style={{ color: theme.text, marginBottom: '20px' }}>🎉 Event Performance (Limited Mode)</h2>
          {analytics.eventStats.length === 0 ? (
            <p style={{ color: theme.textSecondary }}>No event data yet</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                  <th style={{ textAlign: 'left', padding: '12px', color: theme.textSecondary }}>Event</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: theme.textSecondary }}>Games</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: theme.textSecondary }}>Players</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: theme.textSecondary }}>Avg Stars</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: theme.textSecondary }}>Total Coins</th>
                </tr>
              </thead>
              <tbody>
                {analytics.eventStats.map(event => (
                  <tr key={event.eventId} style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <td style={{ padding: '12px', color: theme.text }}>{event.eventName}</td>
                    <td style={{ textAlign: 'right', padding: '12px', color: theme.text }}>{event.completions}</td>
                    <td style={{ textAlign: 'right', padding: '12px', color: theme.text }}>{event.uniquePlayers}</td>
                    <td style={{ textAlign: 'right', padding: '12px', color: theme.text }}>⭐ {event.avgStars}</td>
                    <td style={{ textAlign: 'right', padding: '12px', color: '#FFD700' }}>{event.totalCoins.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button
          onClick={loadAnalytics}
          style={{
            padding: '10px 20px',
            background: theme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  )
}
