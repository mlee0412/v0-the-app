"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"

interface SpaceBackgroundAnimationProps {
  intensity?: number
}

export function SpaceBackgroundAnimation({ intensity = 1 }: SpaceBackgroundAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Create stars
    const stars: { x: number; y: number; radius: number; color: string; velocity: number }[] = []
    const starCount = Math.floor(150 * intensity) // Adjust star count based on intensity

    for (let i = 0; i < starCount; i++) {
      const radius = Math.random() * 1.5 * intensity
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: radius,
        color: `rgba(255, 255, 255, ${0.5 + Math.random() * 0.5})`,
        velocity: (0.05 + Math.random() * 0.1) * intensity,
      })
    }

    // Create nebula clouds
    const nebulae: {
      x: number
      y: number
      radius: number
      color: string
      velocity: number
      opacity: number
    }[] = []
    const nebulaCount = Math.floor(5 * intensity)

    const nebulaColors = [
      "rgba(41, 121, 255, 0.1)", // Blue
      "rgba(255, 41, 117, 0.1)", // Pink
      "rgba(128, 0, 128, 0.1)", // Purple
      "rgba(0, 255, 255, 0.1)", // Cyan
      "rgba(0, 128, 0, 0.1)", // Green
    ]

    for (let i = 0; i < nebulaCount; i++) {
      nebulae.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 50 + Math.random() * 100 * intensity,
        color: nebulaColors[Math.floor(Math.random() * nebulaColors.length)],
        velocity: (0.02 + Math.random() * 0.05) * intensity,
        opacity: 0.05 + Math.random() * 0.1,
      })
    }

    // Animation loop
    let animationFrameId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw background
      ctx.fillStyle = theme === "dark" ? "rgba(0, 0, 0, 0.9)" : "rgba(10, 10, 30, 0.9)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw nebulae
      nebulae.forEach((nebula) => {
        const gradient = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.radius)
        gradient.addColorStop(0, nebula.color.replace("0.1", `${nebula.opacity}`))
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)")
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2)
        ctx.fill()

        // Move nebula
        nebula.x += nebula.velocity
        if (nebula.x > canvas.width + nebula.radius) {
          nebula.x = -nebula.radius
          nebula.y = Math.random() * canvas.height
        }
      })

      // Draw stars
      stars.forEach((star) => {
        ctx.fillStyle = star.color
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fill()

        // Add twinkle effect
        if (Math.random() > 0.99) {
          star.radius = Math.random() * 1.5 * intensity
        }

        // Move star
        star.x += star.velocity
        if (star.x > canvas.width + star.radius) {
          star.x = -star.radius
          star.y = Math.random() * canvas.height
        }
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [intensity, theme, mounted])

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
      style={{ opacity: 0.8 }}
    />
  )
}
