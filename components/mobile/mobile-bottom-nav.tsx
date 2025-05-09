"use client"

import { useState, useEffect } from "react"
import { Home, List, Settings, LogOut, User, Maximize, Minimize, PlayCircle, StopCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface MobileBottomNavProps {
  onTabChange: (tab: string) => void
  onAddSession: () => void
  activeTab: string
  dayStarted: boolean
  isAdmin: boolean
  onStartDay: () => void
  onEndDay: () => void
  onShowSettings: () => void
  onLogout: () => void
  onLogin: () => void
  onToggleFullScreen: () => void
}

export function MobileBottomNav({
  onTabChange,
  onAddSession,
  activeTab,
  dayStarted,
  isAdmin,
  onStartDay,
  onEndDay,
  onShowSettings,
  onLogout,
  onLogin,
  onToggleFullScreen,
}: MobileBottomNavProps) {
  const { isAuthenticated, hasPermission } = useAuth()
  const [showFab, setShowFab] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)

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

  // Determine if we should show the FAB based on permissions and active tab
  useEffect(() => {
    const canAddSession = isAuthenticated && dayStarted && (isAdmin || hasPermission("canStartSession"))
    setShowFab(canAddSession && activeTab === "tables")
  }, [isAuthenticated, isAdmin, hasPermission, dayStarted, activeTab])

  // Provide haptic feedback on tab change if supported
  const handleTabClick = (tab: string) => {
    if (navigator.vibrate && window.matchMedia("(max-width: 768px)").matches) {
      navigator.vibrate(10) // Short vibration for feedback
    }
    onTabChange(tab)
  }

  // Handle FAB click with haptic feedback
  const handleFabClick = () => {
    if (navigator.vibrate && window.matchMedia("(max-width: 768px)").matches) {
      navigator.vibrate([15, 10, 15]) // Pattern for important action
    }
    onAddSession()
  }

  return (
    <>
      {/* Floating Action Button */}
      {showFab && (
        <button className="mobile-fab touch-feedback" onClick={handleFabClick} aria-label="Add new session">
          <span className="plus-icon">+</span>
        </button>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav safe-area-bottom">
        <button
          className={`mobile-bottom-nav-item ${activeTab === "tables" ? "active" : ""}`}
          onClick={() => handleTabClick("tables")}
        >
          <Home className="mobile-bottom-nav-icon" size={22} />
          <span className="mobile-bottom-nav-label">Tables</span>
        </button>

        <button
          className={`mobile-bottom-nav-item ${activeTab === "logs" ? "active" : ""}`}
          onClick={() => handleTabClick("logs")}
        >
          <List className="mobile-bottom-nav-icon" size={22} />
          <span className="mobile-bottom-nav-label">Logs</span>
        </button>

        <button className={`mobile-bottom-nav-item`} onClick={onShowSettings}>
          <Settings className="mobile-bottom-nav-icon" size={22} />
          <span className="mobile-bottom-nav-label">Settings</span>
        </button>

        {isAuthenticated ? (
          <button className={`mobile-bottom-nav-item`} onClick={onLogout}>
            <LogOut className="mobile-bottom-nav-icon" size={22} />
            <span className="mobile-bottom-nav-label">Logout</span>
          </button>
        ) : (
          <button className={`mobile-bottom-nav-item`} onClick={onLogin}>
            <User className="mobile-bottom-nav-icon" size={22} />
            <span className="mobile-bottom-nav-label">Login</span>
          </button>
        )}

        {isAuthenticated && isAdmin && (
          <button className={`mobile-bottom-nav-item`} onClick={dayStarted ? onEndDay : onStartDay}>
            {dayStarted ? (
              <>
                <StopCircle className="mobile-bottom-nav-icon text-red-500" size={22} />
                <span className="mobile-bottom-nav-label text-red-500">End Day</span>
              </>
            ) : (
              <>
                <PlayCircle className="mobile-bottom-nav-icon text-green-500" size={22} />
                <span className="mobile-bottom-nav-label text-green-500">Start Day</span>
              </>
            )}
          </button>
        )}

        <button className={`mobile-bottom-nav-item`} onClick={onToggleFullScreen}>
          {isFullScreen ? (
            <>
              <Minimize className="mobile-bottom-nav-icon" size={22} />
              <span className="mobile-bottom-nav-label">Exit Full</span>
            </>
          ) : (
            <>
              <Maximize className="mobile-bottom-nav-icon" size={22} />
              <span className="mobile-bottom-nav-label">Full</span>
            </>
          )}
        </button>
      </nav>
    </>
  )
}
