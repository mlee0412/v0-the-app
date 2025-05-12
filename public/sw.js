// Cache name
const CACHE_NAME = "billiards-timer-cache-v1"

// Files to cache
const urlsToCache = ["/", "/index.html", "/offline.html", "/manifest.json", "/images/space-billiard-logo.png"]

// Install event
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Install")
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching all: app shell and content")
      return cache.addAll(urlsToCache)
    }),
  )
})

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response
      }
      return fetch(event.request)
        .then((res) => {
          return caches.open(CACHE_NAME).then((cache) => {
            // Don't cache API requests or other dynamic content
            if (
              !event.request.url.includes("/api/") &&
              !event.request.url.includes("chrome-extension") &&
              event.request.method === "GET"
            ) {
              cache.put(event.request.url, res.clone())
            }
            return res
          })
        })
        .catch(() => {
          // If the request is for a page, return the offline page
          if (event.request.destination === "document") {
            return caches.match("/offline.html")
          }
          // Otherwise return a simple offline message
          return new Response("You are offline", {
            headers: { "Content-Type": "text/plain" },
          })
        })
    }),
  )
})

// Activate event
self.addEventListener("activate", (event) => {
  const cacheAllowlist = [CACHE_NAME]

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
})

// Push event
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push Received.")

  let data = { title: "Billiards Timer", body: "New notification" }

  try {
    if (event.data) {
      data = event.data.json()
    }
  } catch (e) {
    console.error("Error parsing push notification data", e)
  }

  const options = {
    body: data.body,
    icon: "/images/space-billiard-logo.png",
    badge: "/images/space-billiard-logo.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
    },
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("[Service Worker] Notification click received.")

  event.notification.close()

  event.waitUntil(clients.openWindow(event.notification.data.url || "/"))
})

// Background sync event
self.addEventListener("sync", (event) => {
  console.log("[Service Worker] Background Sync", event.tag)

  if (event.tag === "sync-tables") {
    event.waitUntil(syncTables())
  } else if (event.tag === "sync-logs") {
    event.waitUntil(syncLogs())
  }
})

// Function to sync tables data
async function syncTables() {
  try {
    // Get data from IndexedDB that needs to be synced
    const offlineData = await getOfflineTablesData()

    if (offlineData && offlineData.length > 0) {
      // Send data to server
      const response = await fetch("/api/sync-tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tables: offlineData }),
      })

      if (response.ok) {
        // Clear synced data from IndexedDB
        await clearSyncedTablesData(offlineData)
        console.log("[Service Worker] Tables synced successfully")
      } else {
        throw new Error("Failed to sync tables data")
      }
    }
  } catch (error) {
    console.error("[Service Worker] Error syncing tables:", error)
    throw error
  }
}

// Function to sync logs data
async function syncLogs() {
  try {
    // Get data from IndexedDB that needs to be synced
    const offlineData = await getOfflineLogsData()

    if (offlineData && offlineData.length > 0) {
      // Send data to server
      const response = await fetch("/api/sync-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ logs: offlineData }),
      })

      if (response.ok) {
        // Clear synced data from IndexedDB
        await clearSyncedLogsData(offlineData)
        console.log("[Service Worker] Logs synced successfully")
      } else {
        throw new Error("Failed to sync logs data")
      }
    }
  } catch (error) {
    console.error("[Service Worker] Error syncing logs:", error)
    throw error
  }
}

// Helper functions for IndexedDB operations
// These are placeholders and would need to be implemented with actual IndexedDB code
async function getOfflineTablesData() {
  // This would retrieve data from IndexedDB
  return []
}

async function clearSyncedTablesData(syncedData) {
  // This would remove synced data from IndexedDB
  return true
}

async function getOfflineLogsData() {
  // This would retrieve data from IndexedDB
  return []
}

async function clearSyncedLogsData(syncedData) {
  // This would remove synced data from IndexedDB
  return true
}
