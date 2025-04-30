"use client"

import type React from "react"

import { useState, useRef, useEffect, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface HolographicCardProps {
  children: ReactNode
  className?: string
  borderColor?: string
  glowColor?: string
  interactive?: boolean
  onClick?: () => void
}

export function HolographicCard({
  children,
  className,
  borderColor = "#00FFFF",
  glowColor = "rgba(0, 255, 255, 0.5)",
  interactive = true,
  onClick,
}: HolographicCardProps) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Handle mouse movement for 3D effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return

    const card = cardRef.current
    const rect = card.getBoundingClientRect()

    // Calculate mouse position relative to card center
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const mouseX = e.clientX - centerX
    const mouseY = e.clientY - centerY

    // Calculate rotation (limited to +/- 5 degrees)
    const rotateY = (mouseX / (rect.width / 2)) * 5
    const rotateX = -(mouseY / (rect.height / 2)) * 5

    setRotation({ x: rotateX, y: rotateY })
  }

  // Reset rotation when mouse leaves
  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotation({ x: 0, y: 0 })
  }

  // Add subtle animation when not being interacted with
  useEffect(() => {
    if (isHovered || !interactive) return

    const interval = setInterval(() => {
      setRotation({
        x: Math.sin(Date.now() / 2000) * 1,
        y: Math.cos(Date.now() / 2000) * 1,
      })
    }, 50)

    return () => clearInterval(interval)
  }, [isHovered, interactive])

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden rounded-lg transition-all duration-200",
        interactive && "cursor-pointer hover:scale-[1.02]",
        className,
      )}
      style={{
        transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        transformStyle: "preserve-3d",
        boxShadow: `0 0 15px ${glowColor}`,
        border: `2px solid ${borderColor}`,
        background: "linear-gradient(135deg, rgba(0, 20, 40, 0.8), rgba(0, 10, 30, 0.9))",
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Holographic overlay effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0))",
          transform: `translateZ(10px) rotateX(${-rotation.x * 0.5}deg) rotateY(${-rotation.y * 0.5}deg)`,
          transformStyle: "preserve-3d",
          opacity: isHovered ? 0.8 : 0.4,
        }}
      />

      {/* Scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden opacity-20"
        style={{ transform: "translateZ(5px)" }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-full h-[1px] bg-cyan-400"
            style={{
              top: `${i * 10 + ((Date.now() / 50) % 10)}%`,
              animation: `scanline 8s linear infinite ${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10" style={{ transform: "translateZ(20px)" }}>
        {children}
      </div>
    </div>
  )
}
