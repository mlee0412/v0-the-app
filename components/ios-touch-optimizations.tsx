"use client"

import { useEffect } from "react"

export function IOSTouchOptimizations() {
  useEffect(() => {
    // Only run on iOS devices
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    if (!isIOS) return

    // Add iOS class to the body
    document.body.classList.add("ios-device")

    // Fix for double-tap issues
    document.addEventListener(
      "touchend",
      (e) => {
        // Prevent double-tap zoom for interactive elements
        if (
          e.target &&
          (e.target as HTMLElement).tagName &&
          ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
        ) {
          e.preventDefault()
        }

        // For elements with specific classes
        if (
          e.target &&
          (e.target as HTMLElement).classList &&
          ((e.target as HTMLElement).classList.contains("table-card") ||
            (e.target as HTMLElement).classList.contains("interactive") ||
            (e.target as HTMLElement).classList.contains("no-double-tap"))
        ) {
          e.preventDefault()
        }
      },
      { passive: false },
    )

    // Apply active state class for better visual feedback
    document.addEventListener(
      "touchstart",
      (e) => {
        if (
          e.target &&
          (e.target as HTMLElement).classList &&
          (e.target as HTMLElement).classList.contains("touch-feedback")
        ) {
          ;(e.target as HTMLElement).classList.add("active")
        }
      },
      { passive: true },
    )

    document.addEventListener(
      "touchend",
      (e) => {
        // Remove active state from all elements
        document.querySelectorAll(".touch-feedback.active").forEach((el) => {
          el.classList.remove("active")
        })
      },
      { passive: true },
    )

    // Prevent pull-to-refresh on iOS Safari
    let startY: number

    document.addEventListener(
      "touchstart",
      (e) => {
        startY = e.touches[0].clientY
      },
      { passive: true },
    )

    document.addEventListener(
      "touchmove",
      (e) => {
        // Allow scrolling in elements with scrollable content
        if (
          e.target &&
          ((e.target as HTMLElement).closest(".scroll-container") || (e.target as HTMLElement).closest(".allow-scroll"))
        ) {
          return
        }

        // Prevent pull-to-refresh when scrolled to top
        const deltaY = e.touches[0].clientY - startY
        if (window.scrollY === 0 && deltaY > 5) {
          e.preventDefault()
        }
      },
      { passive: false },
    )

    // Add CSS variables for safe area insets
    const updateSafeAreaInsets = () => {
      // Get any available safe area inset information
      // @ts-ignore
      const top = (window as any).env?.["safe-area-inset-top"] || 0
      // @ts-ignore
      const right = (window as any).env?.["safe-area-inset-right"] || 0
      // @ts-ignore
      const bottom = (window as any).env?.["safe-area-inset-bottom"] || 0
      // @ts-ignore
      const left = (window as any).env?.["safe-area-inset-left"] || 0

      // Apply as CSS variables
      document.documentElement.style.setProperty("--safe-area-inset-top", `${top}px`)
      document.documentElement.style.setProperty("--safe-area-inset-right", `${right}px`)
      document.documentElement.style.setProperty("--safe-area-inset-bottom", `${bottom}px`)
      document.documentElement.style.setProperty("--safe-area-inset-left", `${left}px`)
    }

    updateSafeAreaInsets()
    window.addEventListener("resize", updateSafeAreaInsets)

    return () => {
      document.body.classList.remove("ios-device")
      window.removeEventListener("resize", updateSafeAreaInsets)
    }
  }, [])

  return null
}
