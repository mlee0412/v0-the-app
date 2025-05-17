"use client"

import { useEffect } from "react"

// This component adds a global touch handler to improve iOS touch responsiveness
export function DirectTouchHandler() {
  useEffect(() => {
    // Function to handle direct touch events
    const handleDirectTouch = (e: TouchEvent) => {
      // Get the element that was touched
      const target = e.target as HTMLElement

      // Look for table card elements
      const tableCard = target.closest(".table-card")
      if (tableCard) {
        // Find the click handler
        const clickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
        })

        // Dispatch the click event directly
        tableCard.dispatchEvent(clickEvent)
      }
    }

    // Only add this for iOS devices
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    if (isIOS) {
      // Add the touch handler
      document.addEventListener("touchend", handleDirectTouch, { passive: false })
    }

    return () => {
      if (isIOS) {
        document.removeEventListener("touchend", handleDirectTouch)
      }
    }
  }, [])

  return null
}
