"use client"

import { useEffect, useRef } from "react"

export function TouchInteractionManager() {
  const lastTouchEndRef = useRef(0)
  const touchStartCoordsRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    const isMobile = isIOS || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    if (!isMobile) return

    document.body.classList.add("mobile-device")
    if (isIOS) {
      document.body.classList.add("ios-device")
    }

    // --- Safe Area Insets ---
    const updateSafeAreaInsets = () => {
      const rootStyle = document.documentElement.style
      const safeAreaTop = getComputedStyle(document.documentElement).getPropertyValue("--safe-area-inset-top") || "0px"
      const safeAreaRight =
        getComputedStyle(document.documentElement).getPropertyValue("--safe-area-inset-right") || "0px"
      const safeAreaBottom =
        getComputedStyle(document.documentElement).getPropertyValue("--safe-area-inset-bottom") || "0px"
      const safeAreaLeft =
        getComputedStyle(document.documentElement).getPropertyValue("--safe-area-inset-left") || "0px"

      rootStyle.setProperty("--safe-area-inset-top", safeAreaTop)
      rootStyle.setProperty("--safe-area-inset-right", safeAreaRight)
      rootStyle.setProperty("--safe-area-inset-bottom", safeAreaBottom)
      rootStyle.setProperty("--safe-area-inset-left", safeAreaLeft)
    }

    // Attempt to get actual safe-area-inset values if supported by browser, otherwise use CSS env()
    // This JS part might be redundant if CSS env() is working well.
    // For now, we rely on CSS `env()` and this JS part can be a fallback or removed if CSS is sufficient.
    // updateSafeAreaInsets(); // Initial call
    // window.addEventListener("resize", updateSafeAreaInsets);

    // --- Global Touch Event Handlers ---
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      touchStartCoordsRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }

      // Active state feedback
      const interactiveElement = target.closest(
        '.touch-feedback, button, .btn, [role="button"], .mobile-bottom-nav-item',
      )
      if (interactiveElement) {
        interactiveElement.classList.add("touch-active")
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartCoordsRef.current) return

      // Global pull-to-refresh prevention (conditional)
      const target = e.target as HTMLElement
      if (!target.closest(".scroll-container, .allow-scroll, [data-scroll], .overflow-y-auto, .overflow-auto")) {
        const deltaY = e.touches[0].clientY - touchStartCoordsRef.current.y
        if (window.scrollY === 0 && deltaY > 5) {
          // 5px threshold to detect downward pull
          e.preventDefault()
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      const now = Date.now()

      // Remove active states
      document.querySelectorAll(".touch-active").forEach((el) => {
        el.classList.remove("touch-active")
      })

      const interactiveSelector =
        'button, a, .interactive, [role="button"], .table-card, .no-double-tap, .mobile-bottom-nav-item'
      const closestInteractive = target.closest(interactiveSelector)

      if (closestInteractive && touchStartCoordsRef.current) {
        const endX = e.changedTouches[0].clientX
        const endY = e.changedTouches[0].clientY
        const deltaX = Math.abs(endX - touchStartCoordsRef.current.x)
        const deltaY = Math.abs(endY - touchStartCoordsRef.current.y)

        if (deltaX < 10 && deltaY < 10) {
          // Consider it a tap; synthesize a click for reliability on iOS
          e.preventDefault()
          const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
          closestInteractive.dispatchEvent(clickEvent)
        }

        if (now - lastTouchEndRef.current < 350) {
          // Prevent zoom on double taps
          e.preventDefault()
        }
      }

      lastTouchEndRef.current = now
      touchStartCoordsRef.current = null
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true })
    document.addEventListener("touchmove", handleTouchMove, { passive: false }) // passive:false for preventDefault
    document.addEventListener("touchend", handleTouchEnd, { passive: false }) // passive:false for preventDefault
    const handleTouchCancel = () => {
      // Clean up active states on touchcancel
      document.querySelectorAll(".touch-active").forEach((el) => el.classList.remove("touch-active"))
      touchStartCoordsRef.current = null
    }

    document.addEventListener("touchcancel", handleTouchCancel, { passive: true })

    // --- Dynamically Injected CSS for basic touch interactions ---
    const styleId = "touch-interaction-manager-styles"
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style")
      style.id = styleId
      style.textContent = `
          .touch-active {
            opacity: 0.7 !important; /* Example active state */
            /* transform: scale(0.98); /* Example active state */
            /* transition: transform 0.05s ease, opacity 0.05s ease; */
          }
          /* Global tap highlight removal */
          * {
            -webkit-tap-highlight-color: transparent !important;
          }
          /* Ensure interactive elements have a minimum touch target and cursor */
          button, a, [role="button"], .interactive, .mobile-bottom-nav-item {
            /* min-height: 44px; /* Handled by specific component styles or Tailwind */
            /* min-width: 44px;  /* Handled by specific component styles or Tailwind */
            cursor: pointer;
            touch-action: manipulation; /* Improves responsiveness and prevents some default actions */
          }
        `
      document.head.appendChild(style)
    }

    return () => {
      document.body.classList.remove("mobile-device", "ios-device")
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
      document.removeEventListener("touchcancel", handleTouchCancel)
      // window.removeEventListener("resize", updateSafeAreaInsets);
      const dynamicStyle = document.getElementById(styleId)
      if (dynamicStyle) {
        dynamicStyle.remove()
      }
    }
  }, [])

  return null
}
