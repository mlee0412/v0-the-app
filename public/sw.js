// Service Worker for Billiards Timer App

// Cache name
const CACHE_NAME = "billiards-timer-cache-v1"

// Files to cache
const urlsToCache = ["/", "/index.html", "/manifest.json", "/images/space-billiard-logo.png"]

// Install event - cache assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Install")
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell")
      return cache.addAll(urlsToCache)
    }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activate")
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key)
            return caches.delete(key)
          }
        }),
      )
    }),
  )
  return self.clients.claim()
})

// Fetch event - serve from cache if available
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Cache hit - return response
        if (response) {
          return response
        }

        // Clone the request
        const fetchRequest = event.request.clone()

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          // Clone the response
          const responseToCache = response.clone()

          caches.open(CACHE_NAME).then((cache) => {
            // Don't cache API requests
            if (!event.request.url.includes("/api/")) {
              cache.put(event.request, responseToCache)
            }
          })

          return response
        })
      }),
    )
  }
})

// Push event - handle push notifications
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push received:", event)

  let notificationData = {}

  try {
    if (event.data) {
      notificationData = event.data.json()
    }
  } catch (error) {
    console.error("[Service Worker] Error parsing push data:", error)
    notificationData = {
      notification: {
        title: "New Notification",
        body: "Something happened in the Billiards Timer app",
        icon: "/images/space-billiard-logo.png",
      },
    }
  }

  const title = notificationData.notification?.title || "Billiards Timer"
  const options = {
    body: notificationData.notification?.body || "You have a new notification",
    icon: notificationData.notification?.icon || "/images/space-billiard-logo.png",
    badge: "/images/space-billiard-logo.png",
    vibrate: [100, 50, 100, 50, 100],
    data: notificationData.notification?.data || {},
    actions: notificationData.notification?.actions || [
      {
        action: "explore",
        title: "View Details",
      },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("[Service Worker] Notification click:", event)

  event.notification.close()

  // Handle notification click - open app or specific page
  const urlToOpen = event.notification.data?.url || "/"

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        // Check if there is already a window/tab open with the target URL
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i]
          // If so, focus it
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus()
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      }),
  )
})

// Sync event for background syncing
self.addEventListener("sync", (event) => {
  console.log("[Service Worker] Sync event:", event)

  if (event.tag === "sync-tables") {
    event.waitUntil(
      // Implement background sync logic here
      fetch("/api/tables/sync")
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to sync tables")
          }
          return response.json()
        })
        .then((data) => {
          console.log("[Service Worker] Tables synced successfully:", data)
        })
        .catch((error) => {
          console.error("[Service Worker] Error syncing tables:", error)
        }),
    )
  }
})

// Periodic sync for regular updates (if supported)
self.addEventListener("periodicsync", (event) => {
  console.log("[Service Worker] Periodic Sync:", event)

  if (event.tag === "update-tables") {
    event.waitUntil(
      // Implement periodic sync logic here
      fetch("/api/tables")
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to update tables")
          }
          return response.json()
        })
        .then((data) => {
          console.log("[Service Worker] Tables updated successfully:", data)

          // Notify the user if there are important updates
          if (data.hasImportantUpdates) {
            return self.registration.showNotification("Tables Updated", {
              body: "There are important updates to your tables",
              icon: "/images/space-billiard-logo.png",
              badge: "/images/space-billiard-logo.png",
              vibrate: [100, 50, 100],
            })
          }
        })
        .catch((error) => {
          console.error("[Service Worker] Error updating tables:", error)
        }),
    )
  }
})

// Message event for communication with the app
self.addEventListener("message", (event) => {
  console.log("[Service Worker] Message received:", event.data)

  if (event.data.action === "skipWaiting") {
    self.skipWaiting()
  }
})
