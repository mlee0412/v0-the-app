"use client"

import { ConnectionStatus } from "@/components/connection-status"
import { EnhancedLogo } from "@/components/enhanced-logo"
import { EnhancedDigitalClock } from "@/components/enhanced-digital-clock"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"

interface MobileHeaderProps {
  currentTime?: Date
  isAuthenticated: boolean
  onLogin: () => void
  onLogout: () => void
  activeTables: number
  dayStarted: boolean
}

export function MobileHeader({
  currentTime,
  isAuthenticated,
  onLogin,
  onLogout,
  activeTables,
  dayStarted,
}: MobileHeaderProps) {
  return (
    <header className="w-full">
      <div className="flex items-center justify-between px-3 py-2 bg-black/80 border-b border-cyan-500/50 shadow-lg shadow-cyan-500/20 backdrop-blur-sm safe-area-padding">
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

        {/* Ensure buttons have proper spacing */}
        <div className="flex items-center space-x-3">
          {/* Ensure buttons have proper spacing */}
          <ConnectionStatus />

          {/* Active tables indicator with proper spacing */}
          {dayStarted && (
            <div className="flex items-center bg-black/60 border border-cyan-800 rounded-md px-2 py-1 mr-2">
              <span className="text-xs text-gray-400 mr-1">Active:</span>
              <span className="text-sm font-bold text-cyan-400">{activeTables}</span>
            </div>
          )}

          {/* Login button with proper spacing */}
          {!isAuthenticated ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-cyan-700 bg-black/60 hover:bg-cyan-950 hover:text-cyan-400 text-xs px-2 login-button"
              onClick={onLogin}
            >
              <User className="h-3 w-3 mr-1 text-gray-400" />
              <span>Login</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-red-700 bg-black/60 hover:bg-red-950 hover:text-red-400"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4 text-red-400" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
