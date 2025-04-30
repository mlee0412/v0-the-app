"use client"

import { forwardRef } from "react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SpaceButtonProps extends ButtonProps {
  glowColor?: string
  hoverEffect?: "glow" | "pulse" | "float" | "none"
}

export const SpaceButton = forwardRef<HTMLButtonElement, SpaceButtonProps>(
  ({ className, glowColor = "rgba(0, 255, 255, 0.5)", hoverEffect = "glow", children, ...props }, ref) => {
    // Determine hover effect class
    const hoverClass = {
      glow: "transition-all duration-300 hover:brightness-125 hover:shadow-lg",
      pulse: "transition-all duration-300 hover:animate-pulse",
      float: "transition-all duration-300 hover:-translate-y-1",
      none: "",
    }[hoverEffect]

    return (
      <Button
        ref={ref}
        className={cn(
          "relative overflow-hidden font-mono whitespace-nowrap flex items-center justify-center",
          hoverClass,
          className,
        )}
        style={{
          boxShadow: `0 0 10px ${glowColor}`,
        }}
        {...props}
      >
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-[1px] bg-white"
              style={{
                top: `${i * 30 + ((Date.now() / 100) % 30)}%`,
              }}
            />
          ))}
        </div>

        {/* Button content */}
        <div className="relative z-10 flex items-center justify-center gap-1">{children}</div>
      </Button>
    )
  },
)

SpaceButton.displayName = "SpaceButton"
