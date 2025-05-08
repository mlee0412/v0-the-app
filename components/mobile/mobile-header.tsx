"use client"

import { ConnectionStatus } from "@/components/connection-status"
import { AnimatedLogo } from "@/components/animated-logo"

export function MobileHeader() {
  return (
    <header className="w-full bg-black/80 border-b border-cyan-500/50 shadow-lg shadow-cyan-500/20 backdrop-blur-sm py-2 px-3">
      <div className="flex items-center justify-between">
        {/* Logo and title */}
        <div className="flex items-center space-x-2">
          <AnimatedLogo size={32} />
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
              SPACE BILLIARD
            </h1>
          </div>
        </div>

        {/* Connection status */}
        <ConnectionStatus />
      </div>
    </header>
  )
}
