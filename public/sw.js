const CACHE_NAME = 'brainplay-v0.9.5'
const PRECACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icon-192.svg',
  '/manifest.json',
]

// Install — cache app shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch — network first, fallback to cache (best for dynamic app)
self.addEventListener('fetch', (e) => {
  // Skip non-GET and cross-origin requests
  if (e.request.method !== 'GET') return
  if (!e.request.url.startsWith(self.location.origin)) return

  // Skip Firebase/API requests
  if (e.request.url.includes('firestore') ||
      e.request.url.includes('googleapis') ||
      e.request.url.includes('firebase')) return

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => {
            // Only cache same-origin assets
            if (e.request.url.startsWith(self.location.origin)) {
              cache.put(e.request, clone)
            }
          })
        }
        return response
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached
          // Fallback to index.html for navigation requests (SPA)
          if (e.request.mode === 'navigate') {
            return caches.match('/index.html')
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' })
        })
      })
  )
})
