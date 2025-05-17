"use client"

import { ConnectionStatus } from "@/components/connection-status"
import { EnhancedLogo } from "@/components/enhanced-logo"
import { EnhancedDigitalClock } from "@/components/enhanced-digital-clock"

interface MobileHeaderProps {
  currentTime?: Date
}

export function MobileHeader({ currentTime }: MobileHeaderProps) {
  return (
    <header className="w-full bg-black/80 border-b border-cyan-500/50 shadow-lg shadow-cyan-500/20 backdrop-blur-sm py-2 px-3">
      <div className="flex items-center justify-between">
        {/* Logo and title */}
        <div className="flex items-center space-x-2">
          <EnhancedLogo width={40} height={40} intensity="medium" interactive={true} emitParticles={true} />
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
              SPACE BILLIARD
            </h1>
          </div>
        </div>

        {/* Digital clock - now with self-contained time management */}
        <EnhancedDigitalClock currentTime={currentTime} />

        {/* Connection status */}
        <ConnectionStatus />
      </div>
    </header>
  )
}
