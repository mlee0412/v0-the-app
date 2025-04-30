"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface ExplosionAnimationProps {
  onComplete: () => void
}

export function ExplosionAnimation({ onComplete }: ExplosionAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [progress, setProgress] = useState(0)
  const completedRef = useRef(false)

  // IMPORTANT: Call onComplete after a short timeout
  useEffect(() => {
    console.log("Explosion: Component mounted, setting completion timeout")
    const immediateTimeout = setTimeout(() => {
      console.log("Explosion: Timeout triggered")
      if (!completedRef.current) {
        console.log("Explosion: Forcing completion")
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

    console.log("Explosion: Setting up animation")
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
      maxLife: number
    }> = []
    const explosions: Array<{
      x: number
      y: number
      radius: number
      maxRadius: number
      color: string
      delay: number
    }> = []

    // Create initial explosion
    explosions.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      radius: 0,
      maxRadius: Math.max(window.innerWidth, window.innerHeight) * 0.4,
      color: "rgba(255, 100, 50, 0.8)",
      delay: 0,
    })

    // Add secondary explosions
    for (let i = 0; i < 5; i++) {
      explosions.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * window.innerWidth * 0.5,
        y: window.innerHeight / 2 + (Math.random() - 0.5) * window.innerHeight * 0.5,
        radius: 0,
        maxRadius: Math.random() * 200 + 100,
        color: [
          "rgba(255, 100, 50, 0.8)",
          "rgba(255, 200, 50, 0.8)",
          "rgba(255, 50, 50, 0.8)",
          "rgba(200, 50, 255, 0.8)",
          "rgba(50, 200, 255, 0.8)",
        ][Math.floor(Math.random() * 5)],
        delay: 300 + Math.random() * 500, // Shorter delays
      })
    }

    // Simple animation function
    const animate = () => {
      if (completedRef.current) return

      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      setProgress(progress)

      // Clear canvas with a gradient background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight)
      bgGradient.addColorStop(0, `rgba(40, 0, 0, ${0.95 - progress * 0.3})`)
      bgGradient.addColorStop(1, `rgba(15, 0, 0, ${0.95 - progress * 0.3})`)
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)

      // Process explosions
      explosions.forEach((explosion) => {
        const elapsedSinceDelay = elapsed - explosion.delay
        if (elapsedSinceDelay <= 0) return

        const explosionProgress = Math.min(elapsedSinceDelay / 800, 1) // Faster explosion
        explosion.radius = explosion.maxRadius * explosionProgress

        // Draw shockwave with glow
        if (explosionProgress < 0.9) {
          // Add glow effect
          ctx.shadowBlur = 30
          ctx.shadowColor = explosion.color

          const gradient = ctx.createRadialGradient(
            explosion.x,
            explosion.y,
            0,
            explosion.x,
            explosion.y,
            explosion.radius,
          )

          gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)")
          gradient.addColorStop(0.2, explosion.color)
          gradient.addColorStop(0.7, explosion.color.replace("0.8", `${0.4 * (1 - explosionProgress)}`))
          gradient.addColorStop(1, "rgba(255, 255, 255, 0)")

          ctx.beginPath()
          ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()

          ctx.shadowBlur = 0
        }

        // Create particles
        if (explosionProgress < 0.6 && Math.random() > 0.7) {
          const particleCount = Math.floor(Math.random() * 5) + 3
          for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2
            const speed = 1 + Math.random() * 5
            const size = 1 + Math.random() * 3
            const distance = Math.random() * explosion.radius * 0.8

            particles.push({
              x: explosion.x + Math.cos(angle) * distance,
              y: explosion.y + Math.sin(angle) * distance,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: size,
              color: explosion.color,
              life: 100 + Math.random() * 100,
              maxLife: 100 + Math.random() * 100,
            })
          }
        }
      })

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life -= 3 // Faster particle decay

        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        // Add glow to particles
        ctx.shadowBlur = 5
        ctx.shadowColor = p.color

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2)

        // Parse the rgba color to modify opacity
        const rgbaMatch = p.color.match(/rgba$$(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)$$/)
        if (rgbaMatch) {
          const r = rgbaMatch[1]
          const g = rgbaMatch[2]
          const b = rgbaMatch[3]
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(p.life / p.maxLife) * Number.parseFloat(rgbaMatch[4])})`
        } else {
          ctx.fillStyle = p.color
        }

        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Final flash effect
      if (progress > 0.8) {
        const flashOpacity = (progress - 0.8) / 0.2
        ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity * 0.7})`
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)
      }

      // Continue animation or complete
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else if (!completedRef.current) {
        console.log("Explosion: Animation naturally completed")
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
          background: "linear-gradient(to bottom, #330000, #110000)",
        }}
      />
      <div className="relative z-10 text-center">
        <h2
          className="text-3xl font-bold mb-4 text-red-400"
          style={{
            textShadow: "0 0 10px rgba(255, 50, 50, 0.7), 0 0 20px rgba(255, 50, 50, 0.5)",
          }}
        >
          {progress < 0.3
            ? "Initiating Shutdown Sequence..."
            : progress < 0.6
              ? "Collapsing Cosmic Structure..."
              : progress < 0.8
                ? "Reality Matrix Destabilizing..."
                : "Resetting Universal Parameters..."}
        </h2>
        <div className="w-64 h-3 bg-gray-900 rounded-full overflow-hidden border border-red-800">
          <div
            className="h-full bg-red-500"
            style={{
              width: `${progress * 100}%`,
              boxShadow: "0 0 10px rgba(255, 50, 50, 0.7), 0 0 20px rgba(255, 50, 50, 0.5) inset",
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
