"use client"

import { useEffect } from "react"

export function IOSTouchFix() {
  useEffect(() => {
    if (typeof window === "undefined") return

    // Check if we're on iOS
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    if (!isIOS) return

    // Prevent double-tap zoom
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const now = Date.now()
      const lastTap = (e.target as any)._lastTap || 0
      const delay = 300 // ms

      if (lastTap && now - lastTap < delay) {
        e.preventDefault()
      }
      ;(e.target as any)._lastTap = now
    }

    document.addEventListener("touchend", preventDoubleTapZoom, false)

    // Fix for iOS momentum scrolling
    const scrollableElements = document.querySelectorAll(".ios-momentum-scroll")
    scrollableElements.forEach((el) => {
      el.addEventListener(
        "touchmove",
        (e) => {
          e.stopPropagation()
        },
        { passive: true },
      )
    })

    // Fix for iOS safe areas
    document.documentElement.style.setProperty("--safe-area-inset-top", "env(safe-area-inset-top)")
    document.documentElement.style.setProperty("--safe-area-inset-right", "env(safe-area-inset-right)")
    document.documentElement.style.setProperty("--safe-area-inset-bottom", "env(safe-area-inset-bottom)")
    document.documentElement.style.setProperty("--safe-area-inset-left", "env(safe-area-inset-left)")

    return () => {
      document.removeEventListener("touchend", preventDoubleTapZoom)
      scrollableElements.forEach((el) => {
        el.removeEventListener("touchmove", (e) => {
          e.stopPropagation()
        })
      })
    }
  }, [])

  return null
}
