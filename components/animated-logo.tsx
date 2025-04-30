"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"

interface AnimatedLogoProps {
  size?: number
  className?: string
}

export function AnimatedLogo({ size = 40, className = "" }: AnimatedLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create glow effect
    const createGlowEffect = () => {
      const container = containerRef.current
      if (!container) return

      // Reset any existing animations
      container.querySelectorAll(".glow-effect").forEach((el) => el.remove())

      // Create glow element
      const glow = document.createElement("div")
      glow.className = "glow-effect absolute inset-0 rounded-full"
      container.appendChild(glow)

      // Animate the glow
      const animate = () => {
        const hue = (Date.now() / 50) % 360
        glow.style.boxShadow = `0 0 ${8 + Math.sin(Date.now() / 500) * 5}px 2px rgba(0, 255, 255, ${0.5 + Math.sin(Date.now() / 1000) * 0.3})`
        requestAnimationFrame(animate)
      }

      requestAnimationFrame(animate)
    }

    createGlowEffect()

    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.querySelectorAll(".glow-effect").forEach((el) => el.remove())
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 rounded-full bg-black border border-cyan-500"></div>
      <div className="absolute inset-0 rounded-full animate-pulse opacity-50 bg-gradient-to-r from-cyan-500 to-fuchsia-500"></div>
      <div className="relative z-10 w-full h-full p-1">
        <div className="relative w-full h-full">
          <Image src="/images/space-billiard-logo.png" alt="Space Billiard" fill className="object-contain" />
        </div>
      </div>
      <div className="absolute inset-0 rounded-full animate-spin-slow opacity-30 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
    </div>
  )
}
