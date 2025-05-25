// This is the service worker for the billiards timer app

// Cache name
const CACHE_NAME = "billiards-timer-cache-v1"

// Assets to cache
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/images/space-billiard-logo.png",
  "/sounds/critical.mp3",
  "/sounds/notification.mp3",
  "/sounds/success.mp3",
]

// Install event - cache assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache")
      return cache.addAll(ASSETS_TO_CACHE)
    }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
})

// Fetch event - serve from cache if available
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        return response
      }

      // Clone the request
      const fetchRequest = event.request.clone()

      // Make network request
      return fetch(fetchRequest).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response
        }

        // Clone the response
        const responseToCache = response.clone()

        // Cache the response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      })
    }),
  )
})

// Push event - handle push notifications
self.addEventListener("push", (event) => {
  if (!event.data) {
    console.log("Push event but no data")
    return
  }

  try {
    const data = event.data.json()

    const options = {
      body: data.body || "New notification",
      icon: data.icon || "/images/space-billiard-logo.png",
      badge: data.badge || "/images/space-billiard-logo.png",
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: data.actions || [
        {
          action: "view",
          title: "View",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ],
    }

    event.waitUntil(self.registration.showNotification(data.title || "Billiards Timer", options))
  } catch (error) {
    console.error("Error showing notification:", error)
  }
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const notificationData = event.notification.data

  if (event.action === "dismiss") {
    return
  }

  // Default action or 'view' action
  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Get notification URL
        const url = notificationData.url || "/"

        // If a window is already open, focus it and navigate
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus()
            client.navigate(url)
            return
          }
        }

        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      }),
  )
})

// Notification close event
self.addEventListener("notificationclose", (event) => {
  // You can track notification close events here if needed
  console.log("Notification closed", event.notification)
})
