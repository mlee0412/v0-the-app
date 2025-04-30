"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import type { Table, Server, LogEntry } from "@/components/billiards-timer-dashboard"
import { Maximize, Minimize, Settings, LogOut, User, Eye, RefreshCw, Clock, AlertTriangle } from "lucide-react"

interface EnhancedHeaderProps {
  currentTime: Date
  isAuthenticated: boolean
  isAdmin: boolean
  dayStarted: boolean
  hasPermission: (permission: string) => boolean
  onStartDay: () => void
  onEndDay: () => void
  onShowSettings: () => void
  onLogout: () => void
  onAdminLogin: () => void
  onViewerLogin: () => void
  onSync: () => Promise<boolean>
  onToggleFullScreen: () => void
  tables: Table[]
  logs: LogEntry[]
  servers: Server[]
  animationComplete: boolean
}

export function EnhancedHeader({
  currentTime,
  isAuthenticated,
  isAdmin,
  dayStarted,
  hasPermission,
  onStartDay,
  onEndDay,
  onShowSettings,
  onLogout,
  onAdminLogin,
  onViewerLogin,
  onSync,
  onToggleFullScreen,
  tables,
  logs,
  servers,
  animationComplete,
}: EnhancedHeaderProps) {
  const { offlineMode } = useSupabaseData()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Check if we're in fullscreen mode
  useEffect(() => {
    const handleFullScreenChange = () => {
      const isCurrentlyFullScreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullscreenElement ||
        (document as any).msFullscreenElement
      )
      setIsFullScreen(isCurrentlyFullScreen)
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

  // Handle sync button click
  const handleSync = async () => {
    setIsSyncing(true)
    await onSync()
    setTimeout(() => setIsSyncing(false), 1000)
  }

  // Count active tables
  const activeTables = tables.filter((table) => table.isActive).length

  // Format time as HH:MM AM/PM
  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  // Format date as Month Day, Year
  const formattedDate = currentTime.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  // Get day of week
  const dayOfWeek = currentTime.toLocaleDateString("en-US", { weekday: "short" })

  return (
    <header className="mb-4">
      {/* Main header bar */}
      <div className="bg-[#000033]/90 p-3 rounded-md border-b-2 border-[#00FFFF] shadow-[0_0_15px_rgba(0,255,255,0.5)]">
        <div className="flex justify-between items-center">
          {/* Left side - Logo and title */}
          <div className="flex items-center">
            <div className="mr-3 w-10 h-10 bg-[#000033] border-2 border-[#00FFFF] rounded-full flex items-center justify-center">
              <span className="text-[#00FFFF] text-xl font-bold">SB</span>
            </div>
            <div>
              <h1 className="text-[#FF00FF] text-2xl font-bold tracking-wider">SPACE BILLIARD</h1>
              <div className="text-[#00FFFF] text-xs">
                {dayOfWeek} • {formattedDate}
              </div>
            </div>
          </div>

          {/* Center - Digital clock */}
          <div className="bg-[#000033] border border-[#00FFFF] rounded-md p-2 px-4">
            <div className="flex items-center justify-center text-[#00FFFF] text-2xl font-mono">
              <Clock className="h-5 w-5 mr-2" />
              {formattedTime}
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-2">
            {/* Connection status */}
            <div
              className={`px-2 py-1 rounded-md ${offlineMode ? "bg-red-900/50 text-red-400" : "bg-green-900/50 text-green-400"} text-xs flex items-center`}
            >
              {offlineMode ? (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Offline
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-400 mr-1"></div>
                  Online
                </>
              )}
            </div>

            {/* Sync button */}
            <Button
              variant="outline"
              size="sm"
              className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
              Sync
            </Button>

            {/* Fullscreen button */}
            <Button
              variant="outline"
              size="sm"
              className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
              onClick={onToggleFullScreen}
            >
              {isFullScreen ? <Minimize className="h-4 w-4 mr-1" /> : <Maximize className="h-4 w-4 mr-1" />}
              {isFullScreen ? "Exit" : "Full"}
            </Button>

            {/* Admin/Viewer buttons */}
            {isAuthenticated ? (
              <>
                {/* Settings button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
                  onClick={onShowSettings}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </Button>

                {/* Logout button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#FF3300] bg-[#330000] hover:bg-[#660000] text-[#FF3300]"
                  onClick={onLogout}
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#FF00FF] bg-[#330033] hover:bg-[#660066] text-[#FF00FF]"
                  onClick={onAdminLogin}
                >
                  <User className="h-4 w-4 mr-1" />
                  Admin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
                  onClick={onViewerLogin}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Day controls and active tables indicator */}
      <div className="flex justify-center items-center mt-3 gap-4">
        {isAdmin && (
          <>
            {!dayStarted ? (
              <Button
                size="sm"
                className="bg-[#00FF33] hover:bg-[#00CC00] text-black font-bold border-2 border-[#00FF33] shadow-[0_0_10px_rgba(0,255,51,0.7)]"
                onClick={onStartDay}
                disabled={!animationComplete}
              >
                START DAY
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-[#FF3300] hover:bg-[#CC0000] text-white font-bold border-2 border-[#FF3300] shadow-[0_0_10px_rgba(255,51,0,0.7)]"
                onClick={onEndDay}
                disabled={!animationComplete}
              >
                END DAY
              </Button>
            )}
          </>
        )}

        {/* Active tables indicator */}
        <div className="bg-black/80 p-1 px-3 rounded-md border border-gray-500 flex items-center">
          <div className="text-sm text-white">
            <span className="font-bold text-[#00FFFF]">{activeTables}</span> active tables
          </div>
        </div>
      </div>
    </header>
  )
}
