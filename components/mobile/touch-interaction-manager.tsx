"use client"

import { useEffect } from "react"

export function TouchInteractionManager() {
  useEffect(() => {
    if (typeof window === "undefined") return

    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    if (!isMobile) return

    // Add mobile class to body
    document.body.classList.add("mobile-device")

    // Prevent double-tap zoom on interactive elements
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const target = e.target as HTMLElement

      // Check if the element or its parents have interactive classes
      if (
        target.closest('button, a, .interactive, [role="button"], .table-card, .no-double-tap') ||
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.getAttribute("role") === "button"
      ) {
        e.preventDefault()

        // Still allow the click event to fire
        setTimeout(() => {
          const clickEvent = new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: true,
          })
          target.dispatchEvent(clickEvent)
        }, 10)
      }
    }

    // Add active state for better touch feedback
    const addActiveState = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('.touch-feedback, button, .btn, [role="button"]')) {
        const element = target.closest('.touch-feedback, button, .btn, [role="button"]') as HTMLElement
        element.classList.add("touch-active")
      }
    }

    const removeActiveState = () => {
      document.querySelectorAll(".touch-active").forEach((el) => {
        el.classList.remove("touch-active")
      })
    }

    // Prevent pull-to-refresh on iOS Safari when at the top of the page
    let startY = 0

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      // Allow scrolling in scrollable elements
      if ((e.target as HTMLElement).closest(".scroll-container, .allow-scroll, [data-scroll]")) {
        return
      }

      // Prevent pull-to-refresh
      const deltaY = e.touches[0].clientY - startY
      if (window.scrollY === 0 && deltaY > 5) {
        e.preventDefault()
      }
    }

    // Add event listeners
    document.addEventListener("touchend", preventDoubleTapZoom, { passive: false })
    document.addEventListener("touchstart", addActiveState, { passive: true })
    document.addEventListener("touchend", removeActiveState, { passive: true })
    document.addEventListener("touchcancel", removeActiveState, { passive: true })
    document.addEventListener("touchstart", handleTouchStart, { passive: true })
    document.addEventListener("touchmove", handleTouchMove, { passive: false })

    // Add CSS for touch feedback
    const style = document.createElement("style")
    style.textContent = `
      .touch-active {
        opacity: 0.7 !important;
        transform: scale(0.98) !important;
        transition: transform 0.1s ease, opacity 0.1s ease !important;
      }
      
      /* Improve touch targets */
      button, a, [role="button"], .interactive {
        min-height: 44px;
        min-width: 44px;
      }
      
      /* Remove tap highlight on iOS */
      * {
        -webkit-tap-highlight-color: transparent;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.body.classList.remove("mobile-device")
      document.removeEventListener("touchend", preventDoubleTapZoom)
      document.removeEventListener("touchstart", addActiveState)
      document.removeEventListener("touchend", removeActiveState)
      document.removeEventListener("touchcancel", removeActiveState)
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.head.removeChild(style)
    }
  }, [])

  return null
}
