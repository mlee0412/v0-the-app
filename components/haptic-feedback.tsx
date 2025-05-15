"use client"

import { useEffect } from "react"

interface HapticFeedbackProps {
  enabled?: boolean
}

export function HapticFeedback({ enabled = true }: HapticFeedbackProps) {
  useEffect(() => {
    if (!enabled) return

    // Function to provide haptic feedback
    const triggerHapticFeedback = (intensity: "light" | "medium" | "heavy") => {
      if (!navigator.vibrate) return

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
      }
    }

    // Add event listeners for interactive elements
    const handleButtonTouch = (e: Event) => {
      const target = e.currentTarget as HTMLElement
      const isWarning = target.getAttribute("data-warning") === "true"
      const isDanger = target.getAttribute("data-danger") === "true"

      if (isDanger) {
        triggerHapticFeedback("heavy")
      } else if (isWarning) {
        triggerHapticFeedback("medium")
      } else {
        triggerHapticFeedback("light")
      }
    }

    // Add event listeners to all buttons and interactive elements
    const buttons = document.querySelectorAll("button, [role='button'], .interactive")
    buttons.forEach((button) => {
      button.addEventListener("touchstart", handleButtonTouch)
    })

    // Cleanup
    return () => {
      buttons.forEach((button) => {
        button.removeEventListener("touchstart", handleButtonTouch)
      })
    }
  }, [enabled])

  return null
}
