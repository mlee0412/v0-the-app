"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"

interface SpaceBackgroundAnimationProps {
  intensity?: number
}

export function SpaceBackgroundAnimation({ intensity = 1 }: SpaceBackgroundAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<any>(null)
  const projectRef = useRef<any>(null)
  const sheetRef = useRef<any>(null)
  const objectsRef = useRef<any[]>([])
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Helper functions for color manipulation
    function lightenColor(color: string, percent: number) {
      const num = Number.parseInt(color.replace("#", ""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        G = ((num >> 8) & 0x00ff) + amt,
        B = (num & 0x0000ff) + amt
      return `#${(0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + (B < 255 ? (B < 1 ? 0 : B) : 255)).toString(16).slice(1)}`
    }

    function darkenColor(color: string, percent: number) {
      const num = Number.parseInt(color.replace("#", ""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) - amt,
        G = ((num >> 8) & 0x00ff) - amt,
        B = (num & 0x0000ff) - amt
      return `#${(0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + (B < 255 ? (B < 1 ? 0 : B) : 255)).toString(16).slice(1)}`
    }

    // Create a shooting star with vanilla JS animation
    const createShootingStar = () => {
      const startX = Math.random() * window.innerWidth
      const startY = -50
      const length = Math.random() * 100 + 50
      const angle = Math.PI / 4 + (Math.random() * Math.PI) / 4
      const speed = Math.random() * 5 + 10
      const color = Math.random() > 0.5 ? "#00FFFF" : "#FF00FF"
      const duration = 1000 // Animation duration in ms

      // Create the shooting star object
      const shootingStar = {
        x: startX,
        y: startY,
        startX: startX,
        startY: startY,
        targetX: startX + Math.cos(angle) * length * 2,
        targetY: startY + Math.sin(angle) * length * 2,
        length,
        color,
        opacity: 1,
        active: true,
        startTime: Date.now(),
        duration: duration,
      }

      objectsRef.current.push(shootingStar)
    }

    // Create space objects
    const createSpaceObjects = () => {
      // Clear previous objects
      objectsRef.current = []

      // Create stars (small, numerous)
      const starCount = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 2000), 400) * intensity
      for (let i = 0; i < starCount; i++) {
        const star = {
          type: "star",
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          radius: Math.random() * 1.5 + 0.5,
          color: ["#FFFFFF", "#00FFFF", "#FF00FF", "#FFFF00"][Math.floor(Math.random() * 4)],
          twinkle: Math.random(),
          twinkleSpeed: Math.random() * 0.02 + 0.01,
          opacity: Math.random() * 0.5 + 0.5,
          speedY: Math.random() * 0.3 + 0.1, // Add vertical movement
        }
        objectsRef.current.push(star)
      }

      // Create planets (larger, fewer)
      const planetCount = Math.floor(Math.random() * 3) + 2
      for (let i = 0; i < planetCount; i++) {
        const planet = {
          type: "planet",
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          radius: Math.random() * 30 + 20,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
          rings: Math.random() > 0.5,
          ringColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
          ringWidth: Math.random() * 10 + 5,
          rotation: 0,
          rotationSpeed: (Math.random() - 0.5) * 0.01,
          orbitX: (Math.random() - 0.5) * 2,
          orbitY: (Math.random() - 0.5) * 2,
        }
        objectsRef.current.push(planet)
      }

      // Create asteroids (medium, several)
      const asteroidCount = Math.floor(Math.random() * 10) + 5
      for (let i = 0; i < asteroidCount; i++) {
        const asteroid = {
          type: "asteroid",
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          radius: Math.random() * 8 + 3,
          color: "#A89078",
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.05,
          vertices: Math.floor(Math.random() * 4) + 5,
          roughness: Math.random() * 0.4 + 0.1,
          speedX: (Math.random() - 0.5) * 0.5,
          speedY: (Math.random() - 0.5) * 0.5,
        }
        objectsRef.current.push(asteroid)
      }

      // Create occasional shooting stars
      const shootingStarInterval = setInterval(() => {
        if (Math.random() < 0.1) {
          createShootingStar()
        }
      }, 2000)

      return () => clearInterval(shootingStarInterval)
    }

    // Set canvas dimensions
    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.scale(dpr, dpr)

      // Recreate space objects when resizing
      createSpaceObjects()
    }

    // Draw function
    const draw = () => {
      if (!ctx || !canvas) return

      // Clear canvas with a gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, "rgba(0, 0, 40, 1)")
      gradient.addColorStop(1, "rgba(0, 0, 15, 1)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw grid lines for retro effect
      ctx.strokeStyle = "rgba(0, 255, 255, 0.1)"
      ctx.lineWidth = 1

      // Horizontal grid lines
      for (let y = 0; y < canvas.height; y += 100) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Vertical grid lines
      for (let x = 0; x < canvas.width; x += 100) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }

      const now = Date.now()

      // Draw all space objects
      objectsRef.current.forEach((obj, index) => {
        if (obj.type === "star") {
          // Update star position
          obj.y += obj.speedY
          if (obj.y > canvas.height) {
            obj.y = 0
            obj.x = Math.random() * canvas.width
          }

          // Update star twinkle
          obj.twinkle += obj.twinkleSpeed
          const twinkleOpacity = 0.3 + Math.abs(Math.sin(obj.twinkle)) * 0.7
          const opacity = twinkleOpacity * obj.opacity

          // Draw star with glow
          ctx.beginPath()
          ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2)
          ctx.fillStyle = obj.color.replace("1)", `${opacity})`)
          ctx.shadowBlur = 5
          ctx.shadowColor = obj.color
          ctx.fill()
          ctx.shadowBlur = 0
        } else if (obj.type === "planet") {
          // Update planet position with simple orbit
          obj.x += obj.orbitX
          obj.y += obj.orbitY
          obj.rotation += obj.rotationSpeed

          // Bounce off edges
          if (obj.x - obj.radius < 0 || obj.x + obj.radius > canvas.width) {
            obj.orbitX *= -1
          }
          if (obj.y - obj.radius < 0 || obj.y + obj.radius > canvas.height) {
            obj.orbitY *= -1
          }

          // Draw planet
          ctx.beginPath()
          ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2)

          // Create gradient for planet
          const gradient = ctx.createRadialGradient(
            obj.x - obj.radius * 0.3,
            obj.y - obj.radius * 0.3,
            0,
            obj.x,
            obj.y,
            obj.radius,
          )
          gradient.addColorStop(0, lightenColor(obj.color, 30))
          gradient.addColorStop(1, darkenColor(obj.color, 30))

          ctx.fillStyle = gradient
          ctx.fill()

          // Draw rings if planet has them
          if (obj.rings) {
            ctx.save()
            ctx.translate(obj.x, obj.y)
            ctx.rotate(obj.rotation || 0)
            ctx.scale(1, 0.3) // Flatten to create elliptical rings
            ctx.beginPath()
            ctx.arc(0, 0, obj.radius + obj.ringWidth, 0, Math.PI * 2)
            ctx.arc(0, 0, obj.radius + 2, 0, Math.PI * 2, true)
            ctx.fillStyle = obj.ringColor
            ctx.fill()
            ctx.restore()
          }
        } else if (obj.type === "asteroid") {
          // Update asteroid position
          obj.x += obj.speedX
          obj.y += obj.speedY
          obj.rotation += obj.rotationSpeed

          // Wrap around edges
          if (obj.x < -obj.radius) obj.x = canvas.width + obj.radius
          if (obj.x > canvas.width + obj.radius) obj.x = -obj.radius
          if (obj.y < -obj.radius) obj.y = canvas.height + obj.radius
          if (obj.y > canvas.height + obj.radius) obj.y = -obj.radius

          // Draw asteroid (irregular shape)
          ctx.save()
          ctx.translate(obj.x, obj.y)
          ctx.rotate(obj.rotation)

          ctx.beginPath()
          for (let i = 0; i < obj.vertices; i++) {
            const angle = (i / obj.vertices) * Math.PI * 2
            const radius = obj.radius * (1 - obj.roughness + Math.random() * obj.roughness * 2)
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius

            if (i === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          }
          ctx.closePath()

          // Create gradient for asteroid
          const gradient = ctx.createRadialGradient(-obj.radius * 0.3, -obj.radius * 0.3, 0, 0, 0, obj.radius)
          gradient.addColorStop(0, lightenColor(obj.color, 20))
          gradient.addColorStop(1, darkenColor(obj.color, 20))

          ctx.fillStyle = gradient
          ctx.fill()
          ctx.restore()
        } else if (obj.active) {
          // Shooting star - animate with vanilla JS
          const elapsed = now - obj.startTime
          const progress = Math.min(elapsed / obj.duration, 1)

          // Linear interpolation for position
          obj.x = obj.startX + (obj.targetX - obj.startX) * progress
          obj.y = obj.startY + (obj.targetY - obj.startY) * progress

          // Fade out as it moves
          obj.opacity = 1 - progress

          // Mark as inactive when animation completes
          if (progress >= 1) {
            obj.active = false
          }

          // Draw shooting star
          const angle = Math.atan2(obj.targetY - obj.startY, obj.targetX - obj.startX)
          ctx.beginPath()
          ctx.moveTo(obj.x, obj.y)
          ctx.lineTo(obj.x - Math.cos(angle) * obj.length, obj.y - Math.sin(angle) * obj.length)
          ctx.strokeStyle = obj.color.replace("1)", `${obj.opacity})`)
          ctx.lineWidth = 2
          ctx.shadowBlur = 10
          ctx.shadowColor = obj.color
          ctx.stroke()
          ctx.shadowBlur = 0
        }
      })

      // Remove inactive objects
      objectsRef.current = objectsRef.current.filter((obj) => obj.type || obj.active)

      animationRef.current = requestAnimationFrame(draw)
    }

    // Add resize observer for more reliable size tracking
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize()
    })
    resizeObserver.observe(document.body)

    // Initialize canvas and start animation
    updateCanvasSize()
    window.addEventListener("resize", updateCanvasSize)

    // Start the animation
    const cleanupSpaceObjects = createSpaceObjects()
    animationRef.current = requestAnimationFrame(draw)

    // Cleanup function
    return () => {
      window.removeEventListener("resize", updateCanvasSize)
      resizeObserver.disconnect()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      cleanupSpaceObjects()
    }
  }, [intensity])

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-0 w-screen h-screen">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ background: "linear-gradient(to bottom, #000033, #000011)" }}
      />
    </div>
  )
}
