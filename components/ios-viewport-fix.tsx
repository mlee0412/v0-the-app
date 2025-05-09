"use client"

import { useEffect } from "react"

export function IOSViewportFix() {
  useEffect(() => {
    // Fix for iOS viewport height issues
    const setVh = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty("--vh", `${vh}px`)
    }

    // Set initial value
    setVh()

    // Update on resize and orientation change
    window.addEventListener("resize", setVh)
    window.addEventListener("orientationchange", setVh)

    // Additional fix for iOS Safari scrolling
    document.documentElement.style.height = "100%"
    document.body.style.height = "100%"
    document.body.style.overscrollBehavior = "none"

    // Prevent elastic scrolling on iOS
    document.body.addEventListener(
      "touchmove",
      (e) => {
        if (e.target === document.body) {
          e.preventDefault()
        }
      },
      { passive: false },
    )

    return () => {
      window.removeEventListener("resize", setVh)
      window.removeEventListener("orientationchange", setVh)
    }
  }, [])

  return null
}
