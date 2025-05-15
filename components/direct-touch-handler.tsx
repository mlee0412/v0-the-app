"use client"

import { useEffect } from "react"

// This component adds a global touch handler to improve iOS touch responsiveness
export function DirectTouchHandler() {
  const triggerHapticFeedback = (intensity: "light" | "medium" | "heavy" = "light") => {
    // Check if the navigator supports vibration
    if (navigator.vibrate) {
      switch (intensity) {
        case "light":
          navigator.vibrate(10)
          break
        case "medium":
          navigator.vibrate(15)
          break
        case "heavy":
          navigator.vibrate([20, 30, 20])
          break
        default:
          navigator.vibrate(10)
      }
    }
  }

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

  useEffect(() => {
    // Add event listeners for touch events
    const handleTouchStart = () => {
      triggerHapticFeedback("light")
    }

    const handleTouchEnd = () => {
      // Optional: add different feedback for touch end
    }

    // Add these event listeners to interactive elements
    const interactiveElements = document.querySelectorAll(
      'button, [role="button"], .table-card, .interactive, .clickable, .tappable',
    )

    interactiveElements.forEach((element) => {
      element.addEventListener("touchstart", handleTouchStart)
      element.addEventListener("touchend", handleTouchEnd)
    })

    return () => {
      // Clean up event listeners
      interactiveElements.forEach((element) => {
        element.removeEventListener("touchstart", handleTouchStart)
        element.removeEventListener("touchend", handleTouchEnd)
      })
    }
  }, [])

  // Remove any touch test buttons that might be in the DOM
  useEffect(() => {
    // Function to remove touch test buttons
    const removeTouchTestButtons = () => {
      const touchTestButtons = document.querySelectorAll(".touch-test-button")
      touchTestButtons.forEach((button) => {
        button.remove()
      })
    }

    // Run on mount and periodically check
    removeTouchTestButtons()
    const interval = setInterval(removeTouchTestButtons, 1000)

    return () => clearInterval(interval)
  }, [])

  return null
}
