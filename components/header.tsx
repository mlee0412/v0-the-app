"use client"

import { useState, useEffect } from "react"
import { Settings, LogOut, RefreshCw, Maximize, Minimize, User, PlayCircle, StopCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConnectionStatus } from "@/components/connection-status"
import { AnimatedLogo } from "@/components/animated-logo"
import type { Table, Server, LogEntry } from "@/components/billiards-timer-dashboard"

interface HeaderProps {
  currentTime: Date
  isAuthenticated: boolean
  isAdmin: boolean
  dayStarted: boolean
  hasPermission: (permission: string) => boolean
  onStartDay: () => void
  onEndDay: () => void
  onShowSettings: () => void
  onLogout: () => void
  onLogin: () => void
  onSync: () => void
  onToggleFullScreen: () => void
  tables: Table[]
  logs: LogEntry[]
  servers: Server[]
  animationComplete: boolean
}

export function Header({
  currentTime,
  isAuthenticated,
  isAdmin,
  dayStarted,
  hasPermission,
  onStartDay,
  onEndDay,
  onShowSettings,
  onLogout,
  onLogin,
  onSync,
  onToggleFullScreen,
  tables,
  logs,
  servers,
  animationComplete,
}: HeaderProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [activeTables, setActiveTables] = useState(0)
  const [currentTimeString, setCurrentTimeString] = useState("")
  const [currentDateString, setCurrentDateString] = useState("")

  // Check if fullscreen is active
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(
        !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullscreenElement ||
          (document as any).msFullscreenElement
        ),
      )
    }

    document.addEventListener("fullscreenchange", handleFullScreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullScreenChange)
    document.addEventListener("mozfullscreenchange", handleFullScreenChange)
    document.addEventListener("MSFullscreenChange", handleFullScreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullScreenChange)
      document.removeEventListener("mozfullscreenchange", handleFullScreenChange)
      document.removeEventListener("MSFullscreenChange", handleFullScreenChange)
    }
  }, [])

  // Update active tables count
  useEffect(() => {
    setActiveTables(tables.filter((table) => table.isActive).length)
  }, [tables])

  // Format time and date
  useEffect(() => {
    const updateTimeAndDate = () => {
      // Format time as HH:MM:SS
      const hours = currentTime.getHours().toString().padStart(2, "0")
      const minutes = currentTime.getMinutes().toString().padStart(2, "0")
      const seconds = currentTime.getSeconds().toString().padStart(2, "0")
      setCurrentTimeString(`${hours}:${minutes}:${seconds}`)

      // Format date as Day, Month DD, YYYY
      const options: Intl.DateTimeFormatOptions = {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }
      setCurrentDateString(currentTime.toLocaleDateString("en-US", options))
    }

    updateTimeAndDate()
  }, [currentTime])

  // Handle sync with animation
  const handleSync = async () => {
    setIsSyncing(true)
    await onSync()
    setTimeout(() => setIsSyncing(false), 1000)
  }

  return (
    <header className="w-full bg-black/80 border-b border-cyan-500/50 shadow-lg shadow-cyan-500/20 backdrop-blur-sm">
      <div className="container mx-auto px-2 py-2">
        {/* Main header row */}
        <div className="flex items-center justify-between">
          {/* Logo and title */}
          <div className="flex items-center space-x-3">
            <AnimatedLogo size={48} />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
                SPACE BILLIARD
              </h1>
              <span className="text-xs text-gray-400">{currentDateString}</span>
            </div>
          </div>

          {/* Digital clock */}
          <div className="flex items-center space-x-2">
            <div className="bg-black border border-cyan-500 rounded-md px-3 py-1 shadow-lg shadow-cyan-500/20">
              <span className="text-2xl font-mono text-cyan-400">{currentTimeString}</span>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center space-x-2">
            {/* Connection status */}
            <ConnectionStatus />

            {/* Active tables indicator */}
            {dayStarted && (
              <div className="flex items-center bg-black/60 border border-cyan-800 rounded-md px-2 py-1">
                <span className="text-xs text-gray-400 mr-1">Active:</span>
                <span className="text-sm font-bold text-cyan-400">{activeTables}</span>
              </div>
            )}

            {/* Day control buttons - now on the same level as other buttons when authenticated */}
            {isAuthenticated && isAdmin && (
              <>
                {!dayStarted ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-green-600 bg-black/60 hover:bg-green-950 text-green-500 hover:text-green-400"
                    onClick={onStartDay}
                    disabled={!animationComplete}
                  >
                    <PlayCircle className="h-4 w-4 mr-1" />
                    START
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-red-600 bg-black/60 hover:bg-red-950 text-red-500 hover:text-red-400"
                    onClick={onEndDay}
                    disabled={!animationComplete}
                  >
                    <StopCircle className="h-4 w-4 mr-1" />
                    END
                  </Button>
                )}
              </>
            )}

            {/* Control buttons */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-cyan-700 bg-black/60 hover:bg-cyan-950 hover:text-cyan-400"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin text-cyan-400" : "text-gray-400"}`} />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-cyan-700 bg-black/60 hover:bg-cyan-950 hover:text-cyan-400"
              onClick={onToggleFullScreen}
            >
              {isFullScreen ? (
                <Minimize className="h-4 w-4 text-gray-400" />
              ) : (
                <Maximize className="h-4 w-4 text-gray-400" />
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-cyan-700 bg-black/60 hover:bg-cyan-950 hover:text-cyan-400"
              onClick={onShowSettings}
            >
              <Settings className="h-4 w-4 text-gray-400" />
            </Button>

            {isAuthenticated ? (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-red-700 bg-black/60 hover:bg-red-950 hover:text-red-400"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4 text-red-400" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-cyan-700 bg-black/60 hover:bg-cyan-950 hover:text-cyan-400 text-xs px-2"
                onClick={onLogin}
              >
                <User className="h-3 w-3 mr-1 text-gray-400" />
                <span>Login</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
