// ─── BrainPlay Analytics (lazy-loaded Firebase Analytics) ────────────────────
// Tracks: game_played, game_completed, screen_view, session, funnel, economy
// All calls are fire-and-forget — never blocks UI

let _analytics = null
let _analyticsPromise = null
let _logEvent = null

async function getAnalytics() {
  if (_analytics) return { analytics: _analytics, logEvent: _logEvent }
  if (!_analyticsPromise) {
    _analyticsPromise = (async () => {
      try {
        const app = (await import('../firebase.js')).default
        const mod = await import('firebase/analytics')
        _analytics = mod.getAnalytics(app)
        _logEvent = mod.logEvent
        return { analytics: _analytics, logEvent: _logEvent }
      } catch (err) {
        console.warn('[Analytics] Failed to init:', err.message)
        return null
      }
    })()
  }
  return _analyticsPromise
}

// Fire-and-forget event logger
async function track(eventName, params = {}) {
  try {
    const a = await getAnalytics()
    if (a) a.logEvent(a.analytics, eventName, params)
  } catch {
    // Silent fail — analytics should never break the app
  }
}

// ─── Session tracking ────────────────────────────────────────────────────────
let sessionStart = Date.now()

export function trackSessionStart() {
  sessionStart = Date.now()
  track('session_start', {
    timestamp: new Date().toISOString(),
    returning_user: !!localStorage.getItem('bp_onboarded'),
  })
}

export function trackSessionEnd() {
  const duration = Math.round((Date.now() - sessionStart) / 1000)
  track('session_end', { duration_seconds: duration })
}

// ─── Screen / funnel tracking ────────────────────────────────────────────────
export function trackScreenView(screenName) {
  track('screen_view', { screen_name: screenName })
}

// ─── Game events ─────────────────────────────────────────────────────────────
export function trackGameStart(gameId, difficulty) {
  track('game_start', { game_id: gameId, difficulty })
}

export function trackGameComplete(gameId, difficulty, score, stars, timeSec) {
  track('game_complete', {
    game_id: gameId,
    difficulty,
    score,
    stars: stars || 0,
    time_seconds: timeSec || 0,
  })
}

export function trackGameDropoff(gameId, difficulty, reason) {
  track('game_dropoff', {
    game_id: gameId,
    difficulty,
    reason: reason || 'back_button',
  })
}

// ─── Economy events ──────────────────────────────────────────────────────────
export function trackCoinEarn(source, amount) {
  track('coin_earn', { source, amount })
}

export function trackShopPurchase(itemId, category, cost) {
  track('shop_purchase', { item_id: itemId, category, cost })
}

// ─── Onboarding funnel ───────────────────────────────────────────────────────
export function trackOnboardingStep(step) {
  track('onboarding_step', { step })
}

export function trackOnboardingComplete() {
  track('onboarding_complete', {
    timestamp: new Date().toISOString(),
  })
}

// ─── Retention helper — log daily active ─────────────────────────────────────
export function trackDailyActive() {
  const today = new Date().toISOString().slice(0, 10)
  const lastActive = localStorage.getItem('bp_last_active_date')
  if (lastActive !== today) {
    localStorage.setItem('bp_last_active_date', today)
    track('daily_active', { date: today })
  }
}

// ─── Preload analytics after app mount ───────────────────────────────────────
export function preloadAnalytics() {
  getAnalytics()
}
