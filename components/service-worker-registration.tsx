"use client"

import { useEffect, useState } from "react"

export function ServiceWorkerRegistration() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      registerServiceWorker()
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      // Register the service worker
      const reg = await navigator.serviceWorker.register("/sw.js")
      console.log("Service Worker registered successfully:", reg)
      setRegistration(reg)

      // Set up push notification support if available
      if ("PushManager" in window) {
        console.log("Push notifications are supported")

        // Check if we already have permission
        const permission = Notification.permission
        if (permission === "granted") {
          console.log("Notification permission already granted")
        } else if (permission === "denied") {
          console.log("Notification permission denied")
        }
      }
    } catch (error) {
      console.error("Service Worker registration failed:", error)
    }
  }

  return null
}
