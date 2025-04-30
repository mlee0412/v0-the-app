"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface BigBangAnimationProps {
  onComplete: () => void
}

export function BigBangAnimation({ onComplete }: BigBangAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [animationPhase, setAnimationPhase] = useState(0)
  const [animationText, setAnimationText] = useState("Initializing...")
  const completedRef = useRef(false)

  // IMPORTANT: Call onComplete after a short timeout
  useEffect(() => {
    console.log("BigBang: Component mounted, setting completion timeout")
    const immediateTimeout = setTimeout(() => {
      console.log("BigBang: Timeout triggered")
      if (!completedRef.current) {
        console.log("BigBang: Forcing completion")
        completedRef.current = true
        onComplete()
      }
    }, 1500) // Short timeout - 1.5 seconds max

    return () => {
      clearTimeout(immediateTimeout)
    }
  }, [onComplete])

  // Set up the animation
  useEffect(() => {
    if (!canvasRef.current || completedRef.current) return

    console.log("BigBang: Setting up animation")
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions with device pixel ratio for higher resolution
    const pixelRatio = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * pixelRatio
    canvas.height = window.innerHeight * pixelRatio
    ctx.scale(pixelRatio, pixelRatio)

    // Set canvas CSS dimensions
    canvas.style.width = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`

    // Animation variables
    let radius = 0
    let hue = 220
    const startTime = Date.now()
    const duration = 1200 // Slightly longer but still fast
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      color: string
      life: number
    }> = []
    const stars: Array<{
      x: number
      y: number
      size: number
      opacity: number
      twinkleSpeed: number
    }> = []

    // Create background stars
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
      })
    }

    // Simple animation function
    const animate = () => {
      if (completedRef.current) return

      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Clear canvas with a gradient background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight)
      bgGradient.addColorStop(0, "rgba(0, 0, 40, 0.95)")
      bgGradient.addColorStop(1, "rgba(0, 0, 15, 0.95)")
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)

      // Draw stars
      stars.forEach((star) => {
        const twinkle = Math.sin(Date.now() * star.twinkleSpeed) * 0.3 + 0.7
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`
        ctx.fill()
      })

      // Update animation phase based on progress
      setAnimationPhase(Math.floor(progress * 4) + 1)
      setAnimationText(
        progress < 0.25
          ? "Initializing Universe..."
          : progress < 0.5
            ? "Creating Cosmic Structure..."
            : progress < 0.75
              ? "Expanding Space-Time..."
              : "Stabilizing Reality Matrix...",
      )

      // Draw expanding circle
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      radius = progress * Math.max(window.innerWidth, window.innerHeight) * 0.5

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
      gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`)
      gradient.addColorStop(0.4, `hsla(${hue + 30}, 100%, 60%, 0.7)`)
      gradient.addColorStop(0.7, `hsla(${hue + 60}, 100%, 50%, 0.4)`)
      gradient.addColorStop(1, "transparent")

      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      // Add glow effect
      ctx.shadowBlur = 20
      ctx.shadowColor = `hsla(${hue}, 100%, 70%, 0.8)`
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius * 0.8, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.2)`
      ctx.fill()
      ctx.shadowBlur = 0

      // Create particles
      if (progress > 0.2 && progress < 0.8 && Math.random() > 0.7) {
        const angle = Math.random() * Math.PI * 2
        const distance = Math.random() * radius * 0.8
        const particleX = centerX + Math.cos(angle) * distance
        const particleY = centerY + Math.sin(angle) * distance

        particles.push({
          x: particleX,
          y: particleY,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          size: Math.random() * 3 + 1,
          color: `hsla(${hue + Math.random() * 60}, 100%, 70%, 0.8)`,
          life: 100,
        })
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life -= 2

        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (p.life / 100), 0, Math.PI * 2)
        ctx.fillStyle = p.color.replace("0.8", `${(p.life / 100) * 0.8}`)
        ctx.fill()
      }

      // Shift hue
      hue = (hue + 0.5) % 360

      // Continue animation or complete
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else if (!completedRef.current) {
        console.log("BigBang: Animation naturally completed")
        completedRef.current = true
        onComplete()
      }
    }

    // Start animation
    animate()
  }, [onComplete])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          background: "linear-gradient(to bottom, #000033, #000011)",
        }}
      />
      <div className="relative z-10 text-center">
        <h2
          className="text-3xl font-bold mb-4 text-cyan-400"
          style={{
            textShadow: "0 0 10px rgba(0, 255, 255, 0.7), 0 0 20px rgba(0, 255, 255, 0.5)",
          }}
        >
          {animationText}
        </h2>
        <div className="w-64 h-3 bg-gray-900 rounded-full overflow-hidden border border-cyan-800">
          <div
            className="h-full bg-cyan-400 transition-all duration-300"
            style={{
              width: `${Math.min(100, (animationPhase / 4) * 100)}%`,
              boxShadow: "0 0 10px rgba(0, 255, 255, 0.7), 0 0 20px rgba(0, 255, 255, 0.5) inset",
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
