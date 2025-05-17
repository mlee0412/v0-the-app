"use client"

import { useEffect, useState } from "react"

export function AdaptiveViewport() {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)

  useEffect(() => {
    // Function to update the viewport height CSS variable
    const updateViewportHeight = () => {
      // Get the visible viewport height
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty("--vh", `${vh}px`)
      setViewportHeight(window.innerHeight)
    }

    // Call once on mount
    updateViewportHeight()

    // Handle device orientation changes and resize
    window.addEventListener("resize", updateViewportHeight)
    window.addEventListener("orientationchange", () => {
      // Slight delay to ensure the browser has completed any UI adjustments
      setTimeout(updateViewportHeight, 100)
    })

    // iOS specific: When virtual keyboard appears and disappears
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      window.visualViewport?.addEventListener("resize", updateViewportHeight)
    }

    // Detect scroll to top to help with iOS address bar hiding
    const handleScroll = () => {
      if (window.scrollY === 0) {
        updateViewportHeight()
      }
    }
    window.addEventListener("scroll", handleScroll)

    return () => {
      window.removeEventListener("resize", updateViewportHeight)
      window.removeEventListener("orientationchange", updateViewportHeight)
      window.removeEventListener("scroll", handleScroll)
      window.visualViewport?.removeEventListener("resize", updateViewportHeight)
    }
  }, [])

  // Add a global class if we're on iOS
  useEffect(() => {
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    if (isIOS) {
      document.documentElement.classList.add("ios-device")
    } else {
      document.documentElement.classList.remove("ios-device")
    }
  }, [])

  return null
}
