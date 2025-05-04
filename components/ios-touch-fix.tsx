"use client"

import { useEffect } from "react"

/**
 * This component fixes touch events on iOS devices by adding a global touch handler
 * that responds to taps on elements with the "table-card" class.
 */
export function IOSTouchFix() {
  useEffect(() => {
    // Check if we're on iOS
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    if (!isIOS) return

    // iOS-specific touch event handler
    const handleTouchStart = (event: TouchEvent) => {
      // Find if touch target is or is within a table card
      let element = event.target as HTMLElement
      let tableCard = null

      // Walk up the DOM tree looking for a table-card
      while (element && !tableCard) {
        if (element.classList && element.classList.contains("table-card")) {
          tableCard = element
        }
        element = element.parentElement as HTMLElement
      }

      // If we found a table card, make sure it has an onclick handler
      if (tableCard) {
        // Flag to prevent double execution
        const alreadyHandled = (tableCard as any).__iosTouchHandled

        if (!alreadyHandled) {
          // Mark as handled
          ;(tableCard as any).__iosTouchHandled = true

          // Force the click after a small delay
          setTimeout(() => {
            // Simulate a click on the card
            tableCard.click()

            // Reset the handled flag after a delay
            setTimeout(() => {
              ;(tableCard as any).__iosTouchHandled = false
            }, 300)
          }, 10)
        }
      }
    }

    // Add the touch event listener
    document.addEventListener("touchstart", handleTouchStart, { passive: false })

    // Clean up
    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
    }
  }, [])

  return null
}
