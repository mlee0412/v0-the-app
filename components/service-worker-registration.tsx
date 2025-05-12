"use client"

import { useEffect, useState } from "react"

export function ServiceWorkerRegistration() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only register service worker in production environment
    if (typeof window !== "undefined" && "serviceWorker" in navigator && shouldRegisterServiceWorker()) {
      registerServiceWorker()
    } else {
      console.log("Service Worker not registered - development environment detected")
    }
  }, [])

  // Check if we should register the service worker
  const shouldRegisterServiceWorker = (): boolean => {
    // Don't register in development environments
    if (process.env.NODE_ENV === "development") {
      return false
    }

    // Don't register in preview environments
    if (
      window.location.hostname.includes("vusercontent.net") ||
      window.location.hostname.includes("localhost") ||
      window.location.hostname.includes("127.0.0.1")
    ) {
      return false
    }

    return true
  }

  const registerServiceWorker = async () => {
    try {
      // Check if the sw.js file exists before trying to register it
      const swResponse = await fetch("/sw.js", { method: "HEAD" })
      if (!swResponse.ok) {
        throw new Error(`Service worker file not found (${swResponse.status})`)
      }

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
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error("Service Worker registration failed:", errorMessage)
      setError(`Service Worker registration failed: ${errorMessage}`)

      // Log additional debugging information
      console.debug("Browser:", navigator.userAgent)
      console.debug("Location:", window.location.href)
      console.debug("Protocol:", window.location.protocol)
    }
  }

  // Optionally render an error message in development for debugging
  if (error && process.env.NODE_ENV === "development") {
    return (
      <div className="hidden">
        {/* Hidden error message for debugging */}
        Service worker error: {error}
      </div>
    )
  }

  // This component doesn't render anything visible in production
  return null
}
