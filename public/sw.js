// This is a simplified service worker for the billiards timer app
// It handles caching, offline support, and push notifications

const CACHE_NAME = "billiards-timer-cache-v1"
const OFFLINE_URL = "/offline"

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  "/",
  "/offline",
  "/images/space-billiard-logo.png",
  "/cosmic-core.png",
  "/cosmic-cyan-magenta.png",
  "/cosmic-dance.png",
  "/cyan-nebula-dream.png",
  "/pixel-starfield.png",
]

// Install event - precache key resources
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing Service Worker...")

  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting()

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Precaching app shell")
      return cache.addAll(PRECACHE_ASSETS)
    }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating Service Worker...")

  // Claim clients to ensure the SW is in control immediately
  event.waitUntil(self.clients.claim())

  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
})

// Fetch event - network-first strategy with fallback to cache
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return

  // Skip browser extensions and analytics
  const url = new URL(event.request.url)
  if (
    !url.origin.includes(self.location.origin) ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache the response for future use
        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone)
        })
        return response
      })
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          // If not in cache, serve the offline page for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL)
          }
          // For other requests, just return a simple response
          return new Response("Network error", { status: 408, headers: { "Content-Type": "text/plain" } })
        })
      }),
  )
})

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push Received:", event)

  let notificationData = {}

  try {
    if (event.data) {
      notificationData = event.data.json()
    }
  } catch (e) {
    console.error("[Service Worker] Error parsing push data:", e)
  }

  const title = notificationData.title || "Billiards Timer"
  const options = {
    body: notificationData.body || "Something important happened!",
    icon: "/images/space-billiard-logo.png",
    badge: "/images/space-billiard-logo.png",
    vibrate: [100, 50, 100],
    data: {
      url: notificationData.url || "/",
      tableId: notificationData.tableId,
      timestamp: new Date().getTime(),
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click event - handle user interaction with notifications
self.addEventListener("notificationclick", (event) => {
  console.log("[Service Worker] Notification click:", event)

  event.notification.close()

  const urlToOpen = event.notification.data?.url || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus()
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    }),
  )
})

// Sync event - handle background sync
self.addEventListener("sync", (event) => {
  console.log("[Service Worker] Background Sync:", event.tag)

  if (event.tag === "sync-tables") {
    event.waitUntil(syncTables())
  }
})

// Function to sync tables data
async function syncTables() {
  try {
    // Get data from IndexedDB that needs to be synced
    const dataToSync = await getDataToSync()

    if (dataToSync && dataToSync.length > 0) {
      // Send data to server
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: dataToSync }),
      })

      if (response.ok) {
        // Clear synced data from IndexedDB
        await clearSyncedData()
      }
    }
  } catch (error) {
    console.error("[Service Worker] Sync failed:", error)
  }
}

// Placeholder functions for IndexedDB operations
async function getDataToSync() {
  // In a real app, this would get data from IndexedDB
  return []
}

async function clearSyncedData() {
  // In a real app, this would clear synced data from IndexedDB
}

// Log when the service worker is ready
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

console.log("[Service Worker] Service Worker Registered")
