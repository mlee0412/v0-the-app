"use client"

import { useEffect } from "react"

/**
 * This component fixes touch events on iOS devices by adding a global touch handler
 * that responds to taps on elements with the "table-card" class.
 */
export function IosTouchFix() {
  useEffect(() => {
    // Check if we're on iOS
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    if (!isIOS) return

    console.log("iOS device detected, applying touch fixes")

    // Add a class to the body for CSS targeting
    document.body.classList.add("ios-device")

    // iOS-specific touch event handler with improved logging
    const handleTouchStart = (event: TouchEvent) => {
      console.log("Touch event detected", event.target)

      // Find if touch target is or is within a table card
      let element = event.target as HTMLElement
      let tableCard = null

      // Walk up the DOM tree looking for a table-card
      while (element && !tableCard) {
        if (element.classList && element.classList.contains("table-card")) {
          tableCard = element
          console.log("Table card found", tableCard)
        }
        element = element.parentElement as HTMLElement
      }

      // If we found a table card, make sure it has an onclick handler
      if (tableCard) {
        // Flag to prevent double execution
        const alreadyHandled = (tableCard as any).__iosTouchHandled

        if (!alreadyHandled) {
          console.log("Handling touch on table card")
          // Mark as handled
          ;(tableCard as any).__iosTouchHandled = true

          // Force the click after a small delay
          setTimeout(() => {
            // Simulate a click on the card
            console.log("Simulating click on table card")
            tableCard.click()

            // Reset the handled flag after a delay
            setTimeout(() => {
              ;(tableCard as any).__iosTouchHandled = false
            }, 300)
          }, 10)
        }
      }
    }

    // Add the touch event listener with debugging
    console.log("Adding iOS touch event listener")
    document.addEventListener("touchstart", handleTouchStart, { passive: false })

    // Add a test element to verify touch handling is working
    const testElement = document.createElement("div")
    testElement.className = "ios-touch-test"
    testElement.style.position = "fixed"
    testElement.style.bottom = "10px"
    testElement.style.right = "10px"
    testElement.style.padding = "10px"
    testElement.style.background = "rgba(255,255,255,0.5)"
    testElement.style.zIndex = "9999"
    testElement.style.borderRadius = "5px"
    testElement.textContent = "Touch Test"
    testElement.addEventListener("click", () => {
      console.log("Test element clicked")
      alert("Touch handling is working!")
    })
    document.body.appendChild(testElement)

    // Clean up
    return () => {
      console.log("Cleaning up iOS touch fixes")
      document.removeEventListener("touchstart", handleTouchStart)
      document.body.classList.remove("ios-device")
      if (testElement.parentNode) {
        testElement.parentNode.removeChild(testElement)
      }
    }
  }, [])

  return null
}

// Export with both naming conventions for backward compatibility
export const IOSTouchFix = IosTouchFix
