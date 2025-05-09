"use client"

import { useEffect } from "react"

export function RemoveTouchTest() {
  useEffect(() => {
    // Function to safely hide elements
    const hideElement = (el: Element) => {
      if (el instanceof HTMLElement) {
        try {
          el.style.display = "none"
          el.style.visibility = "hidden"
          el.style.opacity = "0"
          el.style.pointerEvents = "none"
          el.style.position = "absolute"
          el.style.width = "0"
          el.style.height = "0"
          el.style.overflow = "hidden"
        } catch (err) {
          console.log("Error hiding element:", err)
        }
      }
    }

    // Function to safely remove elements
    const removeElement = (el: Element) => {
      try {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      } catch (err) {
        // Fall back to hiding if removal fails
        hideElement(el)
      }
    }

    // Function to remove the Touch Test button
    const removeTouchTest = () => {
      if (typeof document === "undefined") return

      try {
        // Find buttons by text content
        document.querySelectorAll("button, a, div, span").forEach((el) => {
          try {
            if (el.textContent?.includes("Touch Test")) {
              hideElement(el)
            }
          } catch (err) {
            // Ignore errors for individual elements
          }
        })

        // Find by class or ID
        const selectors = [".touch-test", "#touch-test", '[data-testid="touch-test"]', '[aria-label="Touch Test"]']

        selectors.forEach((selector) => {
          try {
            document.querySelectorAll(selector).forEach(hideElement)
          } catch (err) {
            // Ignore invalid selectors
          }
        })

        // Handle mobile-bottom-nav
        const nav = document.querySelector(".mobile-bottom-nav")
        if (nav) {
          try {
            // Hide any children beyond the 5th
            const children = Array.from(nav.children)
            children.forEach((child, index) => {
              if (index >= 5) {
                hideElement(child)
              }
            })

            // Check for Touch Test in nav items
            children.forEach((child) => {
              if (child.textContent?.includes("Touch Test")) {
                hideElement(child)
              }
            })
          } catch (err) {
            console.log("Error processing nav children:", err)
          }
        }
      } catch (err) {
        console.log("Error in removeTouchTest:", err)
      }
    }

    // Run immediately
    removeTouchTest()

    // Set up a MutationObserver to catch dynamically added elements
    let observer: MutationObserver | null = null
    try {
      observer = new MutationObserver(() => {
        try {
          removeTouchTest()
        } catch (err) {
          console.log("Error in MutationObserver callback:", err)
        }
      })

      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        })
      }
    } catch (err) {
      console.log("Error setting up MutationObserver:", err)
    }

    // Also run periodically as a fallback
    const interval = setInterval(() => {
      try {
        removeTouchTest()
      } catch (err) {
        console.log("Error in interval callback:", err)
      }
    }, 1000)

    return () => {
      if (observer) {
        try {
          observer.disconnect()
        } catch (err) {
          console.log("Error disconnecting observer:", err)
        }
      }
      clearInterval(interval)
    }
  }, [])

  return null
}
