"use client"

import { useEffect } from "react"

export function PWAInit() {
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered: ", registration)
          })
          .catch((error) => {
            console.log("Service Worker registration failed: ", error)
          })
      })
    }

    // Handle iOS PWA specific behaviors
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    if (isIOS) {
      // Remove any touch test buttons that might be added by iOS
      const removeTouchTestElements = () => {
        // Find and remove elements with text "Touch Test"
        document.querySelectorAll("*").forEach((el) => {
          if (el.textContent?.includes("Touch Test")) {
            if (el instanceof HTMLElement) {
              el.style.display = "none"
              el.style.visibility = "hidden"
              el.style.opacity = "0"
              el.style.pointerEvents = "none"
              el.style.position = "absolute"
              el.style.width = "0"
              el.style.height = "0"
              el.style.overflow = "hidden"
            }
          }
        })
      }

      // Run immediately and set up an observer to catch dynamically added elements
      removeTouchTestElements()

      const observer = new MutationObserver(() => {
        removeTouchTestElements()
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      })

      // Also run periodically as a fallback
      const interval = setInterval(removeTouchTestElements, 500)

      return () => {
        observer.disconnect()
        clearInterval(interval)
      }
    }
  }, [])

  return null
}
