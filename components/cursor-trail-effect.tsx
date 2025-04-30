"use client"

import { useEffect, useState } from "react"

interface CursorTrailProps {
  enabled?: boolean
  color?: string
  size?: number
  trailLength?: number
  fadeTime?: number
}

interface TrailDot {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  color: string
}

export function CursorTrailEffect({
  enabled = true,
  color = "#00FFFF",
  size = 6,
  trailLength = 10,
  fadeTime = 1000,
}: CursorTrailProps) {
  const [dots, setDots] = useState<TrailDot[]>([])
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (!enabled) return

    // Initialize
    setIsActive(true)

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })

      // Add new dot
      const newDot: TrailDot = {
        id: Date.now(),
        x: e.clientX,
        y: e.clientY,
        size,
        opacity: 0.7,
        color,
      }

      setDots((prevDots) => [...prevDots, newDot].slice(-trailLength))
    }

    // Animation frame for fading dots
    let animationFrame: number
    const animateDots = () => {
      setDots((prevDots) =>
        prevDots
          .map((dot) => ({
            ...dot,
            opacity: dot.opacity - 0.7 / (fadeTime / 16), // Reduce opacity based on frame rate
            size: dot.size * 0.98, // Slightly reduce size
          }))
          .filter((dot) => dot.opacity > 0),
      )

      animationFrame = requestAnimationFrame(animateDots)
    }

    animationFrame = requestAnimationFrame(animateDots)

    // Add event listener
    document.addEventListener("mousemove", handleMouseMove)

    // Cleanup
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(animationFrame)
      setIsActive(false)
    }
  }, [enabled, color, size, trailLength, fadeTime])

  if (!isActive) return null

  return (
    <>
      {dots.map((dot) => (
        <div
          key={dot.id}
          style={{
            position: "fixed",
            left: dot.x,
            top: dot.y,
            width: dot.size,
            height: dot.size,
            borderRadius: "50%",
            backgroundColor: dot.color,
            opacity: dot.opacity,
            pointerEvents: "none",
            zIndex: 9999,
            transform: "translate(-50%, -50%)",
            mixBlendMode: "screen",
            boxShadow: `0 0 ${dot.size * 2}px ${dot.color}`,
          }}
        />
      ))}
    </>
  )
}
