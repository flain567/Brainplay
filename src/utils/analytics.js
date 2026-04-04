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

// ─── Limited Mode / Event Tracking ───────────────────────────────────────────
export function trackLimitedModeView(eventId, eventName, weekNumber) {
  track('limited_mode_view', {
    event_id: eventId,
    event_name: eventName,
    week_number: weekNumber,
    timestamp: new Date().toISOString(),
  })
}

export function trackLimitedModeGameStart(eventId, eventName, gameId, difficulty) {
  track('limited_mode_game_start', {
    event_id: eventId,
    event_name: eventName,
    game_id: gameId,
    difficulty,
    timestamp: new Date().toISOString(),
  })
}

export function trackLimitedModeGameComplete(eventId, eventName, gameId, difficulty, score, stars, coinEarned, xpEarned) {
  track('limited_mode_game_complete', {
    event_id: eventId,
    event_name: eventName,
    game_id: gameId,
    difficulty,
    score,
    stars: stars || 0,
    coin_earned: coinEarned || 0,
    xp_earned: xpEarned || 0,
    timestamp: new Date().toISOString(),
  })
}

export function trackLimitedModeBonus(eventId, eventName, bonusType, reward) {
  track('limited_mode_bonus', {
    event_id: eventId,
    event_name: eventName,
    bonus_type: bonusType, // 'claim', 'earn', etc
    reward,
    timestamp: new Date().toISOString(),
  })
}

// ─── Firestore Analytics (send events to cloud for admin dashboard) ──────────
let _firestore = null
let _firestorePromise = null
let _collection = null
let _addDoc = null
let _serverTimestamp = null

async function getFirestore2() {
  if (_firestore) return { db: _firestore, addDoc: _addDoc, serverTimestamp: _serverTimestamp }
  if (!_firestorePromise) {
    _firestorePromise = (async () => {
      try {
        const { getDb } = await import('../firebase.js')
        const mod = await import('firebase/firestore')
        const db = await getDb()
        _firestore = db
        _collection = mod.collection
        _addDoc = mod.addDoc
        _serverTimestamp = mod.serverTimestamp
        return { db: _firestore, addDoc: _addDoc, serverTimestamp: _serverTimestamp, collection: _collection }
      } catch (err) {
        console.warn('[Firestore Analytics] Failed to init:', err.message)
        return null
      }
    })()
  }
  return _firestorePromise
}

// Send game completion event to Firestore for admin analytics
// Rate limit: max 1 analytics event per 3 seconds
let lastAnalyticsSend = 0

export async function sendGameAnalyticsToFirestore(userId, userName, gameId, difficulty, score, stars, coinEarned, xpEarned, eventId = null, eventName = null) {
  try {
    // Rate limit check
    const now = Date.now()
    if (now - lastAnalyticsSend < 3000) return
    lastAnalyticsSend = now

    // Auth check — required by hardened rules
    const { auth } = await import('../firebase.js')
    if (!auth.currentUser) return

    const fs = await getFirestore2()
    if (!fs) return
    
    const { db, addDoc, serverTimestamp, collection } = fs
    const eventsCollection = collection(db, 'analytics_events')
    
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    
    await addDoc(eventsCollection, {
      userId,
      userName,
      gameId,
      difficulty,
      score,
      stars: stars || 0,
      coinEarned: coinEarned || 0,
      xpEarned: xpEarned || 0,
      eventId: eventId || null,
      eventName: eventName || null,
      timestamp: serverTimestamp(),
      date: dateStr,
      type: 'game_complete',
    })
  } catch (err) {
    console.warn('[Firestore Analytics] Failed to send:', err.message)
  }
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
