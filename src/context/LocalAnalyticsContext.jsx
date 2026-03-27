import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getJSON, setJSON, StorageKeys } from '../utils/storage.js'

const LocalAnalyticsContext = createContext(null)

const ANALYTICS_STORAGE_KEY = 'bp_analytics_events'

// ─── Init empty analytics data ───────────────────────────────────────────────
function getInitialAnalytics() {
  return {
    events: [],
    limitedModeStats: {}, // { event_id: { view_count, game_count, total_coins, total_xp, avg_stars } }
    gameStats: {}, // { game_id: { plays, completions, total_coins, total_xp } }
    lastReset: new Date().toISOString(),
  }
}

export function LocalAnalyticsProvider({ children }) {
  const [analytics, setAnalytics] = useState(() => {
    const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : getInitialAnalytics()
  })

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(analytics))
  }, [analytics])

  // Track event
  const trackEvent = useCallback((eventName, eventData = {}) => {
    setAnalytics(prev => {
      const newEvent = {
        id: `${Date.now()}-${Math.random()}`,
        name: eventName,
        timestamp: new Date().toISOString(),
        data: eventData,
      }
      
      const events = [...(prev.events || []), newEvent]
      
      // Auto-aggregate limited mode stats
      let limitedModeStats = { ...prev.limitedModeStats }
      if (eventName === 'limited_mode_game_complete' && eventData.event_id) {
        const eventId = eventData.event_id
        if (!limitedModeStats[eventId]) {
          limitedModeStats[eventId] = {
            name: eventData.event_name,
            view_count: 0,
            game_count: 0,
            total_coins: 0,
            total_xp: 0,
            avg_stars: 0,
            total_stars: 0,
          }
        }
        limitedModeStats[eventId].game_count += 1
        limitedModeStats[eventId].total_coins += (eventData.coin_earned || 0)
        limitedModeStats[eventId].total_xp += (eventData.xp_earned || 0)
        limitedModeStats[eventId].total_stars += (eventData.stars || 0)
        limitedModeStats[eventId].avg_stars = Math.round(
          (limitedModeStats[eventId].total_stars / limitedModeStats[eventId].game_count) * 10
        ) / 10
      } else if (eventName === 'limited_mode_view' && eventData.event_id) {
        const eventId = eventData.event_id
        if (!limitedModeStats[eventId]) {
          limitedModeStats[eventId] = {
            name: eventData.event_name,
            view_count: 0,
            game_count: 0,
            total_coins: 0,
            total_xp: 0,
            avg_stars: 0,
            total_stars: 0,
          }
        }
        limitedModeStats[eventId].view_count += 1
      }
      
      // Auto-aggregate game stats
      let gameStats = { ...prev.gameStats }
      if (eventName === 'limited_mode_game_complete' && eventData.game_id) {
        const gameId = eventData.game_id
        if (!gameStats[gameId]) {
          gameStats[gameId] = {
            plays: 0,
            completions: 0,
            total_coins: 0,
            total_xp: 0,
          }
        }
        gameStats[gameId].completions += 1
        gameStats[gameId].total_coins += (eventData.coin_earned || 0)
        gameStats[gameId].total_xp += (eventData.xp_earned || 0)
      }

      return {
        ...prev,
        events,
        limitedModeStats,
        gameStats,
      }
    })
  }, [])

  // Get limited mode stats
  const getLimitedModeStats = useCallback(() => {
    return Object.entries(analytics.limitedModeStats || {}).map(([eventId, stats]) => ({
      eventId,
      ...stats,
    }))
  }, [analytics])

  // Get game stats
  const getGameStats = useCallback(() => {
    return Object.entries(analytics.gameStats || {}).map(([gameId, stats]) => ({
      gameId,
      ...stats,
    }))
  }, [analytics])

  // Get summary
  const getSummary = useCallback(() => {
    const events = analytics.events || []
    const totalEvents = events.length
    const totalCoins = events.reduce((sum, e) => sum + (e.data?.coin_earned || 0), 0)
    const totalXP = events.reduce((sum, e) => sum + (e.data?.xp_earned || 0), 0)
    
    return {
      totalEvents,
      totalCoins,
      totalXP,
      activeEvents: Object.keys(analytics.limitedModeStats || {}).length,
      uniqueGames: Object.keys(analytics.gameStats || {}).length,
    }
  }, [analytics])

  // Reset analytics
  const resetAnalytics = useCallback(() => {
    setAnalytics(getInitialAnalytics())
  }, [])

  // Export as JSON
  const exportJSON = useCallback(() => {
    const dataStr = JSON.stringify(analytics, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `brainplay-analytics-${new Date().toISOString().slice(0,10)}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }, [analytics])

  return (
    <LocalAnalyticsContext.Provider value={{
      analytics,
      trackEvent,
      getLimitedModeStats,
      getGameStats,
      getSummary,
      resetAnalytics,
      exportJSON,
    }}>
      {children}
    </LocalAnalyticsContext.Provider>
  )
}

export function useLocalAnalytics() {
  const context = useContext(LocalAnalyticsContext)
  if (!context) {
    throw new Error('useLocalAnalytics must be used within LocalAnalyticsProvider')
  }
  return context
}
