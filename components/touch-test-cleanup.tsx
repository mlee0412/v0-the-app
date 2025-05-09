"use client"

import { useEffect } from "react"

export function TouchTestCleanup() {
  useEffect(() => {
    // Function to remove any touch test buttons
    const removeTouchTestButtons = () => {
      // Find and remove by various selectors
      const selectors = [
        ".touch-test-button",
        '[data-testid="touch-test-button"]',
        'button[aria-label="Touch Test"]',
        ".mobile-bottom-nav-item.touch-test",
        // Look for text content containing "Touch Test"
        'button:contains("Touch Test")',
        // Look for elements with "Touch" and "Test" in their text
        '*:contains("Touch Test")',
      ]

      selectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector)
          elements.forEach((el) => {
            if (el instanceof HTMLElement) {
              el.style.display = "none"
              el.style.visibility = "hidden"
              el.style.opacity = "0"
              el.style.pointerEvents = "none"
              el.style.position = "absolute"
              el.style.width = "0"
              el.style.height = "0"
              el.style.overflow = "hidden"

              // Try to remove from DOM if possible
              if (el.parentNode) {
                el.parentNode.removeChild(el)
              }
            }
          })
        } catch (e) {
          // Ignore errors from invalid selectors
        }
      })

      // Also look for text nodes containing "Touch Test"
      const walkDOM = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || ""
          if (text.includes("Touch Test")) {
            const parent = node.parentElement
            if (parent && parent.tagName === "BUTTON") {
              parent.style.display = "none"
              parent.style.visibility = "hidden"
            }
          }
        }
        node.childNodes.forEach(walkDOM)
      }

      walkDOM(document.body)
    }

    // Run on mount
    removeTouchTestButtons()

    // Set up a mutation observer to catch dynamically added buttons
    const observer = new MutationObserver((mutations) => {
      removeTouchTestButtons()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  return null
}
