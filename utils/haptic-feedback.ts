/**
 * Enhanced utility for providing haptic feedback on mobile devices
 * with fallbacks and better patterns
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
      } else if ("Vibration" in window) {
        // @ts-ignore - Fallback for some older devices
        window.Vibration.vibrate(10)
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
        navigator.vibrate(20)
      } else if ("Vibration" in window) {
        // @ts-ignore - Fallback for some older devices
        window.Vibration.vibrate(20)
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
        navigator.vibrate([30, 30, 30])
      } else if ("Vibration" in window) {
        // @ts-ignore - Fallback for some older devices
        window.Vibration.vibrate([30, 30, 30])
      }
    } catch (error) {
      console.error("Haptic feedback error:", error)
    }
  },

  /**
   * Error haptic feedback pattern - distinctive pattern for errors
   */
  error: () => {
    if (typeof navigator === "undefined") return

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([20, 40, 20, 40, 20, 40, 20])
      } else if ("Vibration" in window) {
        // @ts-ignore - Fallback for some older devices
        window.Vibration.vibrate([20, 40, 20, 40, 20, 40, 20])
      }
    } catch (error) {
      console.error("Haptic feedback error:", error)
    }
  },

  /**
   * Success haptic feedback pattern - pleasant pattern for success
   */
  success: () => {
    if (typeof navigator === "undefined") return

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([10, 20, 40, 80])
      } else if ("Vibration" in window) {
        // @ts-ignore - Fallback for some older devices
        window.Vibration.vibrate([10, 20, 40, 80])
      }
    } catch (error) {
      console.error("Haptic feedback error:", error)
    }
  },

  /**
   * Warning haptic feedback pattern
   */
  warning: () => {
    if (typeof navigator === "undefined") return

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([30, 50, 30])
      } else if ("Vibration" in window) {
        // @ts-ignore - Fallback for some older devices
        window.Vibration.vibrate([30, 50, 30])
      }
    } catch (error) {
      console.error("Haptic feedback error:", error)
    }
  },

  /**
   * Selection change haptic feedback - very subtle
   */
  selection: () => {
    if (typeof navigator === "undefined") return

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate(5)
      } else if ("Vibration" in window) {
        // @ts-ignore - Fallback for some older devices
        window.Vibration.vibrate(5)
      }
    } catch (error) {
      console.error("Haptic feedback error:", error)
    }
  },

  /**
   * Custom pattern haptic feedback
   * @param pattern Array of numbers representing vibration durations in ms
   */
  custom: (pattern: number | number[]) => {
    if (typeof navigator === "undefined") return

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate(pattern)
      } else if ("Vibration" in window) {
        // @ts-ignore - Fallback for some older devices
        window.Vibration.vibrate(pattern)
      }
    } catch (error) {
      console.error("Haptic feedback error:", error)
    }
  },
}
