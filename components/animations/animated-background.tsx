"use client"

import { useEffect, useRef } from "react"

interface AnimatedBackgroundProps {
  intensity?: number
}

export function AnimatedBackground({ intensity = 1 }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<
    Array<{
      x: number
      y: number
      size: number
      color: string
      speed: number
      twinkle: number
      twinkleSpeed: number
    }>
  >([])
  const enemiesRef = useRef<
    Array<{
      x: number
      y: number
      size: number
      color: string
      type: number
      direction: number
      speed: number
      phase: number
    }>
  >([])
  const gridRef = useRef<
    Array<{
      x: number
      y: number
      size: number
      color: string
      opacity: number
      pulse: number
    }>
  >([])

  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas to full screen with high resolution
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.scale(dpr, dpr)

      // Reinitialize background when resizing to ensure proper coverage
      initBackground()
    }

    // Initialize stars, enemies, and grid
    const initBackground = () => {
      // Create stars
      const stars = []
      const starCount = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 3000), 300) * intensity
      const starColors = ["#FFFFFF", "#00FFFF", "#FF00FF", "#FFFF00", "#00FF00", "#FF0000"]

      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          size: Math.random() * 2 + 0.5,
          color: starColors[Math.floor(Math.random() * starColors.length)],
          speed: Math.random() * 0.3 + 0.1,
          twinkle: Math.random(),
          twinkleSpeed: Math.random() * 0.03 + 0.01,
        })
      }
      starsRef.current = stars

      // Create Galaga-style enemies that occasionally fly across the screen
      const enemies = []
      const enemyCount = Math.floor(Math.random() * 5) + 3
      const enemyColors = ["#FF0000", "#00FFFF", "#FFFF00", "#FF00FF"]

      for (let i = 0; i < enemyCount; i++) {
        enemies.push({
          x: Math.random() * window.innerWidth,
          y: -50 - Math.random() * 200,
          size: Math.random() * 10 + 15,
          color: enemyColors[Math.floor(Math.random() * enemyColors.length)],
          type: Math.floor(Math.random() * 3),
          direction: Math.random() > 0.5 ? 1 : -1,
          speed: Math.random() * 1 + 0.5,
          phase: Math.random() * Math.PI * 2,
        })
      }
      enemiesRef.current = enemies

      // Create grid lines
      const grid = []
      const gridSpacing = 100
      const gridColor = "#00FFFF"

      // Horizontal grid lines
      for (let y = 0; y < window.innerHeight; y += gridSpacing) {
        grid.push({
          x: 0,
          y,
          size: window.innerWidth,
          color: gridColor,
          opacity: 0.1,
          pulse: Math.random() * Math.PI * 2,
        })
      }

      // Vertical grid lines
      for (let x = 0; x < window.innerWidth; x += gridSpacing) {
        grid.push({
          x,
          y: 0,
          size: window.innerHeight,
          color: gridColor,
          opacity: 0.1,
          pulse: Math.random() * Math.PI * 2,
        })
      }

      gridRef.current = grid
    }

    // Draw the background
    const drawBackground = () => {
      if (!ctx || !canvas) return

      // Clear canvas with a gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, "rgba(0, 0, 40, 1)")
      gradient.addColorStop(1, "rgba(0, 0, 15, 1)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw grid
      gridRef.current.forEach((line, index) => {
        line.pulse += 0.01
        line.opacity = 0.05 + Math.sin(line.pulse) * 0.03

        ctx.beginPath()
        ctx.strokeStyle = line.color.replace("1)", `${line.opacity})`)
        ctx.lineWidth = 1

        if (index < gridRef.current.length / 2) {
          // Horizontal line
          ctx.moveTo(0, line.y)
          ctx.lineTo(line.size, line.y)
        } else {
          // Vertical line
          ctx.moveTo(line.x, 0)
          ctx.lineTo(line.x, line.size)
        }

        ctx.stroke()
      })

      // Draw stars with twinkling effect
      starsRef.current.forEach((star) => {
        star.y += star.speed
        star.twinkle += star.twinkleSpeed

        // Reset star if it goes off screen
        if (star.y > window.innerHeight) {
          star.y = 0
          star.x = Math.random() * window.innerWidth
        }

        // Calculate twinkle effect
        const twinkleOpacity = 0.3 + Math.abs(Math.sin(star.twinkle)) * 0.7
        const twinkleSize = star.size * (0.8 + Math.abs(Math.sin(star.twinkle)) * 0.4)

        // Draw star with glow
        ctx.beginPath()
        ctx.arc(star.x, star.y, twinkleSize, 0, Math.PI * 2)
        ctx.fillStyle = star.color.replace("1)", `${twinkleOpacity})`)
        ctx.shadowBlur = 5
        ctx.shadowColor = star.color
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // Occasionally add a new enemy
      if (Math.random() < 0.005) {
        const enemyColors = ["#FF0000", "#00FFFF", "#FFFF00", "#FF00FF"]
        enemiesRef.current.push({
          x: Math.random() * window.innerWidth,
          y: -50,
          size: Math.random() * 10 + 15,
          color: enemyColors[Math.floor(Math.random() * enemyColors.length)],
          type: Math.floor(Math.random() * 3),
          direction: Math.random() > 0.5 ? 1 : -1,
          speed: Math.random() * 1 + 0.5,
          phase: Math.random() * Math.PI * 2,
        })
      }

      // Draw Galaga-style enemies
      enemiesRef.current.forEach((enemy, index) => {
        enemy.y += enemy.speed
        enemy.phase += 0.05
        enemy.x += Math.sin(enemy.phase) * 2 * enemy.direction

        // Remove enemy if it goes off screen
        if (enemy.y > window.innerHeight + 50) {
          enemiesRef.current.splice(index, 1)
          return
        }

        // Draw enemy based on type
        ctx.save()
        ctx.translate(enemy.x, enemy.y)

        // Glow effect
        ctx.shadowBlur = 10
        ctx.shadowColor = enemy.color

        switch (enemy.type) {
          case 0: // Basic enemy (butterfly)
            ctx.fillStyle = enemy.color
            ctx.beginPath()
            ctx.moveTo(0, -enemy.size / 2)
            ctx.lineTo(enemy.size / 2, enemy.size / 2)
            ctx.lineTo(-enemy.size / 2, enemy.size / 2)
            ctx.closePath()
            ctx.fill()

            // Wings
            ctx.beginPath()
            ctx.moveTo(enemy.size / 2, 0)
            ctx.lineTo(enemy.size, enemy.size / 3)
            ctx.lineTo(enemy.size / 2, enemy.size / 2)
            ctx.closePath()
            ctx.fill()

            ctx.beginPath()
            ctx.moveTo(-enemy.size / 2, 0)
            ctx.lineTo(-enemy.size, enemy.size / 3)
            ctx.lineTo(-enemy.size / 2, enemy.size / 2)
            ctx.closePath()
            ctx.fill()
            break

          case 1: // Boss enemy (flagship)
            ctx.fillStyle = enemy.color
            ctx.beginPath()
            ctx.arc(0, 0, enemy.size / 2, 0, Math.PI * 2)
            ctx.fill()

            // Top part
            ctx.beginPath()
            ctx.moveTo(-enemy.size / 2, 0)
            ctx.lineTo(0, -enemy.size)
            ctx.lineTo(enemy.size / 2, 0)
            ctx.closePath()
            ctx.fill()
            break

          case 2: // Bee enemy
            ctx.fillStyle = enemy.color
            ctx.beginPath()
            ctx.arc(0, 0, enemy.size / 2, 0, Math.PI * 2)
            ctx.fill()

            // Wings
            ctx.beginPath()
            ctx.moveTo(enemy.size / 2, -enemy.size / 4)
            ctx.lineTo(enemy.size, 0)
            ctx.lineTo(enemy.size / 2, enemy.size / 4)
            ctx.closePath()
            ctx.fill()

            ctx.beginPath()
            ctx.moveTo(-enemy.size / 2, -enemy.size / 4)
            ctx.lineTo(-enemy.size, 0)
            ctx.lineTo(-enemy.size / 2, enemy.size / 4)
            ctx.closePath()
            ctx.fill()
            break
        }

        ctx.restore()
      })

      // Occasionally add a shooting star
      if (Math.random() < 0.002) {
        drawShootingStar()
      }

      animationRef.current = requestAnimationFrame(drawBackground)
    }

    // Draw a shooting star
    const drawShootingStar = () => {
      const x = Math.random() * window.innerWidth
      const y = (Math.random() * window.innerHeight) / 3
      const length = Math.random() * 100 + 50
      const angle = Math.PI / 4 + (Math.random() * Math.PI) / 4
      const speed = Math.random() * 5 + 10
      const color = Math.random() > 0.5 ? "#00FFFF" : "#FF00FF"

      let currentX = x
      let currentY = y
      let opacity = 1

      const animate = () => {
        if (!ctx) return

        ctx.beginPath()
        ctx.moveTo(currentX, currentY)

        currentX += Math.cos(angle) * speed
        currentY += Math.sin(angle) * speed

        ctx.lineTo(currentX, currentY)
        ctx.strokeStyle = color.replace("1)", `${opacity})`)
        ctx.lineWidth = 2
        ctx.shadowBlur = 10
        ctx.shadowColor = color
        ctx.stroke()
        ctx.shadowBlur = 0

        opacity -= 0.02

        if (opacity > 0 && currentY < window.innerHeight && currentX < window.innerWidth) {
          requestAnimationFrame(animate)
        }
      }

      animate()
    }

    // Handle window resize
    window.addEventListener("resize", resizeCanvas)

    // Add resize observer for more reliable size tracking
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
    })
    resizeObserver.observe(document.body)

    resizeCanvas()

    // Start animation
    drawBackground()

    // Cleanup function
    return () => {
      window.removeEventListener("resize", resizeCanvas)
      resizeObserver.disconnect()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [intensity])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: "linear-gradient(to bottom, #000033, #000011)" }}
    />
  )
}
