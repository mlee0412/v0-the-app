"use client"

import { useEffect } from "react"

export function IOSViewportFix() {
  useEffect(() => {
    // Check if we're on iOS
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    if (isIOS) {
      // Add iOS-specific class to body
      document.body.classList.add("ios-device")

      // Set viewport height variable
      const setVh = () => {
        const vh = window.innerHeight * 0.01
        document.documentElement.style.setProperty("--vh", `${vh}px`)
      }

      // Set initial value
      setVh()

      // Update on resize and orientation change
      window.addEventListener("resize", setVh)
      window.addEventListener("orientationchange", setVh)

      // Add meta viewport tag with maximum-scale to prevent zooming
      const existingViewport = document.querySelector('meta[name="viewport"]')
      if (existingViewport) {
        existingViewport.setAttribute(
          "content",
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
        )
      }

      // Add touch-action to body
      document.body.style.touchAction = "manipulation"

      // Prevent elastic overscroll
      document.body.style.overscrollBehavior = "none"

      // Prevent pull-to-refresh
      document.addEventListener(
        "touchmove",
        (e) => {
          // Allow scrolling in elements with the ios-momentum-scroll class
          if (
            e.target &&
            (e.target as HTMLElement).closest &&
            (e.target as HTMLElement).closest(".ios-momentum-scroll")
          ) {
            return
          }

          // Prevent default for all other touch moves
          if (e.touches.length === 1 && e.touches[0].clientY < 10) {
            e.preventDefault()
          }
        },
        { passive: false },
      )

      return () => {
        document.body.classList.remove("ios-device")
        window.removeEventListener("resize", setVh)
        window.removeEventListener("orientationchange", setVh)
        document.body.style.touchAction = ""
        document.body.style.overscrollBehavior = ""
      }
    }
  }, [])

  return null
}
