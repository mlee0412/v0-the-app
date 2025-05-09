const CACHE_NAME = "space-billiards-cache-v1"

// Add URLs of resources you want to cache
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/images/space-billiard-logo.png",
  "/images/space-billiard-logo-512.png",
  "/sounds/success.mp3",
  "/sounds/error.mp3",
]

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Cache opened")
        return cache.addAll(urlsToCache)
      })
      .then(() => self.skipWaiting()),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => self.clients.claim()),
  )
})

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  // Skip Supabase API requests
  if (event.request.url.includes("supabase.co")) {
    return
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Cache hit - return the response from cache
        if (response) {
          return response
        }

        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone()

        return fetch(fetchRequest).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          // Clone the response because it's a one-time use stream
          const responseToCache = response.clone()

          caches.open(CACHE_NAME).then((cache) => {
            // Don't cache API requests
            if (!event.request.url.includes("/api/")) {
              cache.put(event.request, responseToCache)
            }
          })

          return response
        })
      })
      .catch(() => {
        // If both cache and network fail, serve an offline fallback
        if (event.request.mode === "navigate") {
          return caches.match("/offline.html")
        }
      }),
  )
})

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-tables") {
    event.waitUntil(syncTables())
  }
})

// Push notification event handler
self.addEventListener("push", (event) => {
  const data = event.data.json()

  const options = {
    body: data.body,
    icon: "/images/space-billiard-logo.png",
    badge: "/images/notification-badge.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
    },
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  event.waitUntil(clients.openWindow(event.notification.data.url))
})

// Helper function for background sync
async function syncTables() {
  // Get all pending actions from IndexedDB
  // Implement your IndexedDB logic here
  // For each pending action, send to server
  // If successful, remove from pending actions
}
