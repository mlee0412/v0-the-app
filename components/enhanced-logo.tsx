"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface EnhancedLogoProps {
  width?: number
  height?: number
  className?: string
  intensity?: "low" | "medium" | "high"
  interactive?: boolean
  emitParticles?: boolean
}

export function EnhancedLogo({
  width = 48,
  height = 48,
  className = "",
  intensity = "medium",
  interactive = true,
  emitParticles = true,
}: EnhancedLogoProps) {
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [particles, setParticles] = useState<
    Array<{
      id: number
      x: number
      y: number
      size: number
      color: string
      opacity: number
      vx: number
      vy: number
      life: number
    }>
  >([])

  const logoRef = useRef<HTMLDivElement>(null)
  const particleContainerRef = useRef<HTMLDivElement>(null)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [useProceduralLogo, setUseProceduralLogo] = useState(false)
  const requestRef = useRef<number>()
  const lastEmitTimeRef = useRef(0)

  // Intensity multipliers
  const intensityValues = {
    low: 0.5,
    medium: 1,
    high: 1.5,
  }

  const intensityMultiplier = intensityValues[intensity]

  // Handle mouse move for 3D effect with parallax
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!logoRef.current || !interactive) return

    const rect = logoRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const mouseX = e.clientX - centerX
    const mouseY = e.clientY - centerY

    // Calculate rotation (limited to +/- 20 degrees)
    const rotateY = (mouseX / (rect.width / 2)) * 20 * intensityMultiplier
    const rotateX = -(mouseY / (rect.height / 2)) * 20 * intensityMultiplier

    // Add subtle z-rotation for more dynamic effect
    const rotateZ = ((mouseX * mouseY) / (rect.width * rect.height)) * 5 * intensityMultiplier

    setRotation({ x: rotateX, y: rotateY, z: rotateZ })

    // Emit particles on mouse move when hovered
    if (isHovered && emitParticles) {
      const now = Date.now()
      if (now - lastEmitTimeRef.current > 100) {
        // Limit emission rate
        emitParticle(2)
        lastEmitTimeRef.current = now
      }
    }
  }

  // Handle mouse enter/leave
  const handleMouseEnter = () => {
    if (!interactive) return
    setIsHovered(true)
    // Emit a burst of particles on hover
    if (emitParticles) {
      emitParticle(5)
    }
  }

  const handleMouseLeave = () => {
    if (!interactive) return
    setIsHovered(false)
    setIsPressed(false)
    setRotation({ x: 0, y: 0, z: 0 })
  }

  // Handle mouse down/up for press effect
  const handleMouseDown = () => {
    if (!interactive) return
    setIsPressed(true)
    // Emit a burst of particles on press
    if (emitParticles) {
      emitParticle(8)
    }
  }

  const handleMouseUp = () => {
    if (!interactive) return
    setIsPressed(false)
  }

  // Emit particles
  const emitParticle = (count: number) => {
    if (!logoRef.current || !emitParticles) return

    const rect = logoRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const radius = Math.min(rect.width, rect.height) / 2

    const newParticles = Array.from({ length: count }, () => {
      // Random angle and distance from center
      const angle = Math.random() * Math.PI * 2
      const distance = Math.random() * radius * 0.8

      // Calculate position
      const x = centerX + Math.cos(angle) * distance
      const y = centerY + Math.sin(angle) * distance

      // Random velocity
      const speed = 0.5 + Math.random() * 2
      const vx = Math.cos(angle) * speed
      const vy = Math.sin(angle) * speed

      // Random color
      const colors = ["#00FFFF", "#FF00FF", "#FFFFFF"]
      const color = colors[Math.floor(Math.random() * colors.length)]

      return {
        id: Date.now() + Math.random(),
        x,
        y,
        size: 1 + Math.random() * 3,
        color,
        opacity: 0.7 + Math.random() * 0.3,
        vx,
        vy,
        life: 30 + Math.random() * 70, // Frames of life
      }
    })

    setParticles((prev) => [...prev, ...newParticles])
  }

  // Update particles
  const updateParticles = () => {
    setParticles((prev) =>
      prev
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          opacity: p.opacity * 0.95,
          size: p.size * 0.97,
          life: p.life - 1,
        }))
        .filter((p) => p.life > 0 && p.opacity > 0.01),
    )

    requestRef.current = requestAnimationFrame(updateParticles)
  }

  // Add subtle animation when not being interacted with
  useEffect(() => {
    if (isHovered || !interactive) return

    const interval = setInterval(() => {
      setRotation({
        x: Math.sin(Date.now() / 2000) * 5 * intensityMultiplier,
        y: Math.cos(Date.now() / 2000) * 5 * intensityMultiplier,
        z: Math.sin(Date.now() / 3000) * 2 * intensityMultiplier,
      })

      // Occasionally emit particles even when not hovered
      if (emitParticles && Math.random() < 0.05) {
        emitParticle(1)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [isHovered, interactive, intensityMultiplier, emitParticles])

  // Start particle animation
  useEffect(() => {
    if (emitParticles) {
      requestRef.current = requestAnimationFrame(updateParticles)
      return () => {
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current)
        }
      }
    }
  }, [emitParticles])

  // Handle image load error
  const handleImageError = () => {
    console.log("Logo image failed to load, using procedural logo")
    setUseProceduralLogo(true)
  }

  // Calculate scale based on press state
  const scale = isPressed ? 0.92 : isHovered ? 1.05 : 1

  // Calculate shadow intensity based on state
  const shadowIntensity = isPressed ? 0.7 : isHovered ? 1.2 : 1

  // Calculate z-translation for press effect
  const zTranslate = isPressed ? -10 : 0

  return (
    <div
      ref={logoRef}
      className={cn("relative cursor-pointer transition-transform", interactive && "hover:scale-105", className)}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        perspective: "1000px",
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* Particle container */}
      {emitParticles && (
        <div
          ref={particleContainerRef}
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 20 }}
        >
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                backgroundColor: particle.color,
                opacity: particle.opacity,
                boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
                transform: `translateZ(${30 + particle.life / 5}px)`,
                zIndex: 30,
              }}
            />
          ))}
        </div>
      )}

      {/* 3D container with rotation and scale */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `
            rotateX(${rotation.x}deg) 
            rotateY(${rotation.y}deg) 
            rotateZ(${rotation.z}deg)
            scale(${scale})
            translateZ(${zTranslate}px)
          `,
          transformStyle: "preserve-3d",
          transition: isHovered ? "transform 0.1s ease-out" : "transform 0.5s ease-out",
        }}
      >
        {/* Background glow layer (furthest back) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(0,255,255,0.3) 0%, rgba(0,0,30,0) 70%)`,
            transform: "translateZ(-30px) scale(1.2)",
            filter: "blur(10px)",
            opacity: 0.7 * shadowIntensity * intensityMultiplier,
          }}
        />

        {/* Deep shadow layer */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `
              0 0 30px rgba(0, 255, 255, ${0.4 * shadowIntensity * intensityMultiplier}), 
              0 0 60px rgba(0, 255, 255, ${0.2 * shadowIntensity * intensityMultiplier})
            `,
            transform: "translateZ(-20px) scale(1.1)",
            opacity: 0.8,
          }}
        />

        {/* Cyan glow layer */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `
              0 0 20px rgba(0, 255, 255, ${0.8 * shadowIntensity * intensityMultiplier}), 
              0 0 40px rgba(0, 255, 255, ${0.4 * shadowIntensity * intensityMultiplier})
            `,
            transform: "translateZ(-15px) scale(1.05)",
            opacity: 0.9,
            animation: "pulse 3s infinite alternate",
          }}
        />

        {/* Magenta glow layer */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `
              0 0 15px rgba(255, 0, 255, ${0.7 * shadowIntensity * intensityMultiplier}), 
              0 0 30px rgba(255, 0, 255, ${0.3 * shadowIntensity * intensityMultiplier})
            `,
            transform: "translateZ(-10px) scale(1.03)",
            opacity: 0.8,
            animation: "pulse 4s infinite alternate-reverse",
          }}
        />

        {/* Base layer with subtle glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `
              0 0 10px rgba(255, 255, 255, ${0.5 * shadowIntensity * intensityMultiplier}), 
              inset 0 0 5px rgba(255, 255, 255, ${0.5 * shadowIntensity * intensityMultiplier})
            `,
            transform: "translateZ(-5px) scale(1.01)",
            opacity: 0.9,
          }}
        />

        {/* Procedural logo (fallback) */}
        {useProceduralLogo ? (
          <div
            className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #000033, #000066)",
              border: `2px solid rgba(0, 255, 255, ${0.8 * intensityMultiplier})`,
              boxShadow: `
                0 0 10px rgba(0, 255, 255, ${0.8 * intensityMultiplier}) inset,
                0 0 20px rgba(0, 255, 255, ${0.4 * intensityMultiplier})
              `,
              transform: "translateZ(0)",
            }}
          >
            <div
              className="text-[#00FFFF] font-bold text-xl"
              style={{
                textShadow: `0 0 5px rgba(0, 255, 255, ${0.8 * intensityMultiplier})`,
                transform: "translateZ(5px)",
              }}
            >
              SB
            </div>
          </div>
        ) : (
          /* Actual logo image with enhanced styling */
          <div className="relative w-full h-full" style={{ transform: "translateZ(0)" }}>
            <Image
              src="/images/space-billiard-logo.png"
              alt="Space Billiard Logo"
              width={width}
              height={height}
              className="object-contain rounded-full"
              style={{
                filter: `
                  brightness(${1.3 + (isHovered ? 0.2 : 0) * intensityMultiplier}) 
                  contrast(${1.2 * intensityMultiplier}) 
                  drop-shadow(0 0 10px rgba(0, 255, 255, ${0.8 * intensityMultiplier}))
                `,
              }}
              onLoad={() => setLogoLoaded(true)}
              onError={handleImageError}
            />
          </div>
        )}

        {/* Holographic overlay - moves opposite to main rotation for parallax effect */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0))",
            transform: `
              translateZ(10px) 
              rotateX(${-rotation.x * 0.7}deg) 
              rotateY(${-rotation.y * 0.7}deg)
            `,
            transformStyle: "preserve-3d",
            opacity: isHovered ? 0.8 : 0.4,
          }}
        />

        {/* Scanline effect */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
          style={{
            transform: "translateZ(15px)",
            opacity: 0.15,
            mixBlendMode: "screen",
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-[1px] bg-cyan-400"
              style={{
                top: `${i * 20 + ((Date.now() / 100) % 20)}%`,
                animation: "scanline 8s linear infinite",
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>

        {/* Top highlight */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 60%)",
            transform: "translateZ(20px)",
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  )
}
