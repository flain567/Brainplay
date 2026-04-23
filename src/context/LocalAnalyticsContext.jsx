import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const LocalAnalyticsContext = createContext(null)

const ANALYTICS_STORAGE_KEY = 'bp_analytics_events'
const MAX_DAILY_LOG_DAYS = 60

// ─── Game metadata for display ──────────────────────────────────────────────
const GAME_META = {
  'memory-card':    { name: 'Memory Card',      emoji: '🃏', category: 'Puzzle' },
  'slither-worm':   { name: 'Slither Worm',     emoji: '🐍', category: 'Action' },
  '2048':           { name: 'Connect Blocks',    emoji: '🔗', category: 'Puzzle' },
  'word-search':    { name: 'Word Search',       emoji: '🔍', category: 'Kata' },
  'space-shooter':  { name: 'Space Shooter',     emoji: '🚀', category: 'Action' },
  'hangman':        { name: 'Hangman',           emoji: '💀', category: 'Kata' },
  'color-sort':     { name: 'Color Sort',        emoji: '🧪', category: 'Puzzle' },
  'sudoku':         { name: 'Sudoku',            emoji: '🔢', category: 'Logika' },
  'jigsaw':         { name: 'Jigsaw Puzzle',     emoji: '🧩', category: 'Puzzle' },
  'memory-pattern': { name: 'Memory Pattern Pro',emoji: '🧠', category: 'Puzzle' },
  'reaction-test':  { name: 'Reaction Test',     emoji: '⚡', category: 'Action' },
  'neon-dash':      { name: 'Neon Dash',         emoji: '💎', category: 'Action' },
  'brick-breaker':  { name: 'Brick Breaker',     emoji: '🧱', category: 'Action' },
  'voxel-racer':    { name: 'Voxel Racer',       emoji: '🚗', category: 'Action' },
  'wordle':         { name: 'Wordle Indonesia',   emoji: '💬', category: 'Kata' },
  'math-challenge': { name: 'Math Challenge',    emoji: '🧮', category: 'Logika' },
  'number-sequence':{ name: 'Number Sequence',   emoji: '🔢', category: 'Logika' },
  'quiz-trivia':    { name: 'Quiz Trivia',       emoji: '🇮🇩', category: 'Pengetahuan' },
  'binary-puzzle':  { name: 'Binary Puzzle',     emoji: '🔲', category: 'Logika' },
  'sliding-puzzle': { name: 'Sliding Puzzle',    emoji: '🧩', category: 'Puzzle' },
  'tower-hanoi':    { name: 'Tower of Hanoi',    emoji: '🗼', category: 'Logika' },
  'minesweeper':    { name: 'Minesweeper',       emoji: '💣', category: 'Logika' },
  'fields-adventure':{ name: 'Fields of Adventure', emoji: '🗺️', category: 'Casual' },
  'letter-tiles':   { name: 'Letter Tiles',      emoji: '🔤', category: 'Kata' },
  'tic-tac-toe':    { name: 'Tic Tac Toe',       emoji: '❌', category: 'Casual' },
  'wordle-indonesia':{ name: 'Wordle Indonesia',  emoji: '🇮🇩', category: 'Kata' },
}

export { GAME_META }

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Init empty analytics data ───────────────────────────────────────────────
function getInitialAnalytics() {
  return {
    events: [],
    limitedModeStats: {},
    gameStats: {},
    dailyLog: {},       // { "2026-04-23": { gamesPlayed, gamesWon, xpEarned, coinsEarned, playTimeSec, gamesById: { gameId: { played, won, bestScore } } } }
    lastReset: new Date().toISOString(),
  }
}

function getEmptyDayLog() {
  return { gamesPlayed: 0, gamesWon: 0, xpEarned: 0, coinsEarned: 0, playTimeSec: 0, gamesById: {} }
}

// ─── Prune old daily logs to keep storage manageable ──────────────────────────
function pruneDailyLog(dailyLog) {
  const keys = Object.keys(dailyLog).sort()
  if (keys.length <= MAX_DAILY_LOG_DAYS) return dailyLog
  const pruned = {}
  keys.slice(-MAX_DAILY_LOG_DAYS).forEach(k => { pruned[k] = dailyLog[k] })
  return pruned
}

export function LocalAnalyticsProvider({ children }) {
  const [analytics, setAnalytics] = useState(() => {
    const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Ensure dailyLog exists (migration)
      if (!parsed.dailyLog) parsed.dailyLog = {}
      return parsed
    }
    return getInitialAnalytics()
  })

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(analytics))
  }, [analytics])

  // ─── Listen to game results for daily log ─────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const { gameId, won, score, timeSec } = e.detail || {}
      if (!gameId) return

      setAnalytics(prev => {
        const todayKey = getTodayKey()
        const dailyLog = { ...prev.dailyLog }
        const day = dailyLog[todayKey] ? { ...dailyLog[todayKey] } : getEmptyDayLog()

        day.gamesPlayed = (day.gamesPlayed || 0) + 1
        if (won) day.gamesWon = (day.gamesWon || 0) + 1
        if (timeSec) day.playTimeSec = (day.playTimeSec || 0) + timeSec

        // Per-game tracking
        const gamesById = { ...day.gamesById }
        if (!gamesById[gameId]) gamesById[gameId] = { played: 0, won: 0, bestScore: 0 }
        gamesById[gameId] = { ...gamesById[gameId] }
        gamesById[gameId].played += 1
        if (won) gamesById[gameId].won += 1
        if (score && score > (gamesById[gameId].bestScore || 0)) {
          gamesById[gameId].bestScore = score
        }
        day.gamesById = gamesById

        dailyLog[todayKey] = day
        return { ...prev, dailyLog: pruneDailyLog(dailyLog) }
      })
    }

    window.addEventListener('bp-game-result', handler)
    return () => window.removeEventListener('bp-game-result', handler)
  }, [])

  // Track event (existing)
  const trackEvent = useCallback((eventName, eventData = {}) => {
    setAnalytics(prev => {
      const newEvent = {
        id: `${Date.now()}-${Math.random()}`,
        name: eventName,
        timestamp: new Date().toISOString(),
        data: eventData,
      }
      
      const events = [...(prev.events || []), newEvent]
      
      // --- Auto-update dailyLog for coin/xp events ---
      const todayKey = getTodayKey()
      const dailyLog = { ...prev.dailyLog }
      const day = dailyLog[todayKey] ? { ...dailyLog[todayKey] } : getEmptyDayLog()
      if (eventData.coin_earned) day.coinsEarned = (day.coinsEarned || 0) + eventData.coin_earned
      if (eventData.xp_earned) day.xpEarned = (day.xpEarned || 0) + eventData.xp_earned
      dailyLog[todayKey] = day

      // Auto-aggregate limited mode stats
      let limitedModeStats = { ...prev.limitedModeStats }
      if (eventName === 'limited_mode_game_complete' && eventData.event_id) {
        const eventId = eventData.event_id
        if (!limitedModeStats[eventId]) {
          limitedModeStats[eventId] = {
            name: eventData.event_name,
            view_count: 0, game_count: 0, total_coins: 0, total_xp: 0, avg_stars: 0, total_stars: 0,
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
            view_count: 0, game_count: 0, total_coins: 0, total_xp: 0, avg_stars: 0, total_stars: 0,
          }
        }
        limitedModeStats[eventId].view_count += 1
      }
      
      // Auto-aggregate game stats
      let gameStats = { ...prev.gameStats }
      if (eventName === 'limited_mode_game_complete' && eventData.game_id) {
        const gameId = eventData.game_id
        if (!gameStats[gameId]) {
          gameStats[gameId] = { plays: 0, completions: 0, total_coins: 0, total_xp: 0 }
        }
        gameStats[gameId].completions += 1
        gameStats[gameId].total_coins += (eventData.coin_earned || 0)
        gameStats[gameId].total_xp += (eventData.xp_earned || 0)
      }

      return { ...prev, events, limitedModeStats, gameStats, dailyLog: pruneDailyLog(dailyLog) }
    })
  }, [])

  // ─── Get daily trend data ──────────────────────────────────────────────────
  const getDailyTrend = useCallback((days = 7) => {
    const log = analytics.dailyLog || {}
    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const dayData = log[key] || getEmptyDayLog()
      result.push({
        date: key,
        label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        shortLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        ...dayData,
      })
    }
    return result
  }, [analytics.dailyLog])

  // ─── Get heatmap data (last 30 days) ──────────────────────────────────────
  const getHeatmapData = useCallback((days = 30) => {
    const log = analytics.dailyLog || {}
    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const dayData = log[key]
      result.push({
        date: key,
        dayOfWeek: d.getDay(),
        dayLabel: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        dateLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        count: dayData?.gamesPlayed || 0,
      })
    }
    return result
  }, [analytics.dailyLog])

  // ─── Get top games across all daily logs ───────────────────────────────────
  const getTopGames = useCallback((limit = 5) => {
    const log = analytics.dailyLog || {}
    const totals = {}
    Object.values(log).forEach(day => {
      Object.entries(day.gamesById || {}).forEach(([gameId, data]) => {
        if (!totals[gameId]) totals[gameId] = { played: 0, won: 0, bestScore: 0 }
        totals[gameId].played += data.played || 0
        totals[gameId].won += data.won || 0
        if ((data.bestScore || 0) > totals[gameId].bestScore) {
          totals[gameId].bestScore = data.bestScore
        }
      })
    })
    return Object.entries(totals)
      .map(([gameId, data]) => ({
        gameId,
        name: GAME_META[gameId]?.name || gameId,
        emoji: GAME_META[gameId]?.emoji || '🎮',
        category: GAME_META[gameId]?.category || 'Lainnya',
        ...data,
        winRate: data.played > 0 ? Math.round((data.won / data.played) * 100) : 0,
      }))
      .sort((a, b) => b.played - a.played)
      .slice(0, limit)
  }, [analytics.dailyLog])

  // ─── Get category distribution ─────────────────────────────────────────────
  const getCategoryDistribution = useCallback(() => {
    const log = analytics.dailyLog || {}
    const cats = {}
    Object.values(log).forEach(day => {
      Object.entries(day.gamesById || {}).forEach(([gameId, data]) => {
        const cat = GAME_META[gameId]?.category || 'Lainnya'
        cats[cat] = (cats[cat] || 0) + (data.played || 0)
      })
    })
    const total = Object.values(cats).reduce((s, v) => s + v, 0) || 1
    const CATEGORY_COLORS = {
      'Puzzle': '#FDCB6E', 'Action': '#FF6B6B', 'Kata': '#A29BFE',
      'Logika': '#00CEC9', 'Casual': '#4ECDC4', 'Pengetahuan': '#0984E3', 'Lainnya': '#636E72',
    }
    return Object.entries(cats)
      .map(([name, count]) => ({
        name, count,
        pct: Math.round((count / total) * 100),
        color: CATEGORY_COLORS[name] || '#636E72',
      }))
      .sort((a, b) => b.count - a.count)
  }, [analytics.dailyLog])

  // ─── Smart insights ────────────────────────────────────────────────────────
  const getInsights = useCallback(() => {
    const insights = []
    const trend7 = getDailyTrend(7)
    const trend14 = getDailyTrend(14)
    const topGames = getTopGames(10)
    const heatmap = getHeatmapData(30)

    // 1. Most played game
    if (topGames.length > 0) {
      const top = topGames[0]
      insights.push({
        id: 'top_game', icon: '🏆', type: 'success',
        title: 'Game Favorit',
        text: `${top.emoji} ${top.name} adalah game yang paling sering kamu mainkan (${top.played}x).`,
      })
    }

    // 2. Best win rate
    const qualifiedGames = topGames.filter(g => g.played >= 3)
    if (qualifiedGames.length > 0) {
      const best = qualifiedGames.reduce((a, b) => a.winRate > b.winRate ? a : b)
      if (best.winRate > 0) {
        insights.push({
          id: 'best_winrate', icon: '🎯', type: 'info',
          title: 'Win Rate Tertinggi',
          text: `Kamu punya win rate ${best.winRate}% di ${best.emoji} ${best.name}. Keren!`,
        })
      }
    }

    // 3. Activity trend (compare this week vs last week)
    const thisWeek = trend7.slice(-7).reduce((s, d) => s + d.gamesPlayed, 0)
    const lastWeek = trend14.slice(0, 7).reduce((s, d) => s + d.gamesPlayed, 0)
    if (lastWeek > 0) {
      const change = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
      if (change > 0) {
        insights.push({
          id: 'activity_up', icon: '📈', type: 'success',
          title: 'Aktivitas Naik!',
          text: `Kamu bermain ${change}% lebih banyak minggu ini dibanding minggu lalu.`,
        })
      } else if (change < -20) {
        insights.push({
          id: 'activity_down', icon: '📉', type: 'warning',
          title: 'Aktivitas Turun',
          text: `Aktivitas bermain turun ${Math.abs(change)}% dari minggu lalu. Yuk main lagi!`,
        })
      }
    }

    // 4. Most active day of week
    const dayTotals = [0, 0, 0, 0, 0, 0, 0]
    const dayCounts = [0, 0, 0, 0, 0, 0, 0]
    heatmap.forEach(d => {
      dayTotals[d.dayOfWeek] += d.count
      if (d.count > 0) dayCounts[d.dayOfWeek] += 1
    })
    const avgPerDay = dayTotals.map((t, i) => dayCounts[i] > 0 ? t / dayCounts[i] : 0)
    const bestDayIdx = avgPerDay.indexOf(Math.max(...avgPerDay))
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    if (avgPerDay[bestDayIdx] > 0) {
      insights.push({
        id: 'best_day', icon: '📅', type: 'info',
        title: 'Hari Favorit',
        text: `Kamu paling aktif bermain di hari ${dayNames[bestDayIdx]}.`,
      })
    }

    // 5. Streak encouragement
    const recentDays = heatmap.slice(-7)
    const activeDays = recentDays.filter(d => d.count > 0).length
    if (activeDays >= 5) {
      insights.push({
        id: 'streak_great', icon: '🔥', type: 'success',
        title: 'Konsisten!',
        text: `Kamu bermain ${activeDays} dari 7 hari terakhir. Pertahankan streak-mu!`,
      })
    } else if (activeDays <= 2 && activeDays > 0) {
      insights.push({
        id: 'streak_low', icon: '💡', type: 'tip',
        title: 'Tips',
        text: 'Coba main setiap hari untuk mendapatkan bonus streak XP multiplier!',
      })
    }

    // 6. Total play time
    const totalTimeSec = Object.values(analytics.dailyLog || {}).reduce((s, d) => s + (d.playTimeSec || 0), 0)
    if (totalTimeSec > 3600) {
      const hours = Math.round(totalTimeSec / 3600 * 10) / 10
      insights.push({
        id: 'playtime', icon: '⏱️', type: 'info',
        title: 'Total Bermain',
        text: `Kamu sudah bermain selama ${hours} jam. Waktu yang well-spent!`,
      })
    }

    // 7. Try new game recommendation
    if (topGames.length > 0 && topGames.length < 5) {
      const playedIds = new Set(topGames.map(g => g.gameId))
      const unplayed = Object.entries(GAME_META)
        .filter(([id]) => !playedIds.has(id))
        .slice(0, 3)
      if (unplayed.length > 0) {
        const [id, meta] = unplayed[Math.floor(Math.random() * unplayed.length)]
        insights.push({
          id: 'try_new', icon: '🧭', type: 'tip',
          title: 'Coba Game Baru',
          text: `Belum pernah main ${meta.emoji} ${meta.name}? Coba sekarang!`,
        })
      }
    }

    return insights
  }, [getDailyTrend, getTopGames, getHeatmapData, analytics.dailyLog])

  // ─── Existing helpers ──────────────────────────────────────────────────────
  const getLimitedModeStats = useCallback(() => {
    return Object.entries(analytics.limitedModeStats || {}).map(([eventId, stats]) => ({
      eventId, ...stats,
    }))
  }, [analytics])

  const getGameStats = useCallback(() => {
    return Object.entries(analytics.gameStats || {}).map(([gameId, stats]) => ({
      gameId, ...stats,
    }))
  }, [analytics])

  const getSummary = useCallback(() => {
    const events = analytics.events || []
    const totalEvents = events.length
    const totalCoins = events.reduce((sum, e) => sum + (e.data?.coin_earned || 0), 0)
    const totalXP = events.reduce((sum, e) => sum + (e.data?.xp_earned || 0), 0)
    
    return {
      totalEvents, totalCoins, totalXP,
      activeEvents: Object.keys(analytics.limitedModeStats || {}).length,
      uniqueGames: Object.keys(analytics.gameStats || {}).length,
    }
  }, [analytics])

  const resetAnalytics = useCallback(() => {
    setAnalytics(getInitialAnalytics())
  }, [])

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
      // New deep analytics
      getDailyTrend,
      getHeatmapData,
      getTopGames,
      getCategoryDistribution,
      getInsights,
      GAME_META,
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
