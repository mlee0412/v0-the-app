/**
 * Utility for providing haptic feedback on mobile devices
 */
export const hapticFeedback = {
  /**
   * Light haptic feedback for subtle interactions
   */
  light: () => {
    if (typeof navigator === "undefined") return

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate(10)
      }
    } catch (error) {
      console.error("Haptic feedback error:", error)
    }
  },

  /**
   * Medium haptic feedback for standard interactions
   */
  medium: () => {
    if (typeof navigator === "undefined") return

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate(15)
      }
    } catch (error) {
      console.error("Haptic feedback error:", error)
    }
  },

  /**
   * Strong haptic feedback for important interactions
   */
  strong: () => {
    if (typeof navigator === "undefined") return

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([20, 30, 20])
      }
    } catch (error) {
      console.error("Haptic feedback error:", error)
    }
  },

  /**
   * Error haptic feedback pattern
   */
  error: () => {
    if (typeof navigator === "undefined") return

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([20, 40, 30, 40, 20])
      }
    } catch (error) {
      console.error("Haptic feedback error:", error)
    }
  },

  /**
   * Success haptic feedback pattern
   */
  success: () => {
    if (typeof navigator === "undefined") return

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([10, 20, 40])
      }
    } catch (error) {
      console.error("Haptic feedback error:", error)
    }
  },
}
