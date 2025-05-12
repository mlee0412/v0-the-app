"use client"

import { useEffect, useState } from "react"

// This component provides mock push notification functionality for development environments
export function MockPushService() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    // Check if we're in a development environment
    const isDevelopment =
      process.env.NODE_ENV === "development" ||
      window.location.hostname.includes("vusercontent.net") ||
      window.location.hostname.includes("localhost")

    if (!isDevelopment) {
      return
    }

    // Set up mock notification functionality
    console.log("Mock push notification service initialized")

    // Store in localStorage to persist across page reloads
    const storedState = localStorage.getItem("mockPushEnabled")
    if (storedState) {
      setEnabled(storedState === "true")
    }

    // Add to window for debugging
    if (typeof window !== "undefined") {
      // @ts-ignore - Adding custom property to window
      window.mockPushService = {
        enable: () => {
          setEnabled(true)
          localStorage.setItem("mockPushEnabled", "true")
          console.log("Mock push notifications enabled")
        },
        disable: () => {
          setEnabled(false)
          localStorage.setItem("mockPushEnabled", "false")
          console.log("Mock push notifications disabled")
        },
        sendNotification: (title: string, options: any) => {
          console.log("Mock notification:", { title, options })
          if (enabled) {
            // Use the browser's notification API directly
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(title, options)
            } else {
              alert(`[Mock Notification] ${title}: ${options.body}`)
            }
          } else {
            console.log("Mock notifications are disabled")
          }
        },
      }
    }
  }, [enabled])

  return null
}
