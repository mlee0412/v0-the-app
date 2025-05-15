"use client"

import { useEffect } from "react"

export function IOSTouchFix() {
  useEffect(() => {
    // Check if we're on iOS
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    if (isIOS) {
      // Fix for iOS 100vh issue
      const fixViewportHeight = () => {
        const vh = window.innerHeight * 0.01
        document.documentElement.style.setProperty("--vh", `${vh}px`)
      }

      // Fix for iOS input focus scrolling
      const inputs = document.querySelectorAll("input, textarea")
      inputs.forEach((input) => {
        input.addEventListener("focus", () => {
          document.body.classList.add("input-focused")
        })
        input.addEventListener("blur", () => {
          document.body.classList.remove("input-focused")
        })
      })

      // Initial call and add resize listener
      fixViewportHeight()
      window.addEventListener("resize", fixViewportHeight)

      return () => {
        window.removeEventListener("resize", fixViewportHeight)
        inputs.forEach((input) => {
          input.removeEventListener("focus", () => {
            document.body.classList.add("input-focused")
          })
          input.removeEventListener("blur", () => {
            document.body.classList.remove("input-focused")
          })
        })
      }
    }
  }, [])

  return (
    <>
      {/* iOS viewport height fix */}
      <style jsx global>{`
        :root {
          --vh: 1vh;
        }
        .ios-height {
          height: calc(var(--vh, 1vh) * 100);
        }
        .input-focused {
          position: relative;
        }
      `}</style>
    </>
  )
}
