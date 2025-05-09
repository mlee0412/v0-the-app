"use client"

import { useState, useEffect } from "react"
import { Home, List, Settings, LogOut, User, Maximize, Minimize } from "lucide-react"
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
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-bottom-nav-item ${activeTab === "tables" ? "active" : ""}`}
          onClick={() => handleTabClick("tables")}
        >
          <Home className="mobile-bottom-nav-icon" size={20} />
          <span className="mobile-bottom-nav-label">TABLES</span>
        </button>

        <button
          className={`mobile-bottom-nav-item ${activeTab === "logs" ? "active" : ""}`}
          onClick={() => handleTabClick("logs")}
        >
          <List className="mobile-bottom-nav-icon" size={20} />
          <span className="mobile-bottom-nav-label">LOGS</span>
        </button>

        <button className={`mobile-bottom-nav-item`} onClick={onShowSettings}>
          <Settings className="mobile-bottom-nav-icon" size={20} />
          <span className="mobile-bottom-nav-label">SETTINGS</span>
        </button>

        {isAuthenticated ? (
          <button className={`mobile-bottom-nav-item`} onClick={onLogout}>
            <LogOut className="mobile-bottom-nav-icon" size={20} />
            <span className="mobile-bottom-nav-label">LOGOUT</span>
          </button>
        ) : (
          <button className={`mobile-bottom-nav-item`} onClick={onLogin}>
            <User className="mobile-bottom-nav-icon" size={20} />
            <span className="mobile-bottom-nav-label">LOGIN</span>
          </button>
        )}

        <button className={`mobile-bottom-nav-item`} onClick={onToggleFullScreen}>
          {isFullScreen ? (
            <>
              <Minimize className="mobile-bottom-nav-icon" size={20} />
              <span className="mobile-bottom-nav-label">EXIT</span>
            </>
          ) : (
            <>
              <Maximize className="mobile-bottom-nav-icon" size={20} />
              <span className="mobile-bottom-nav-label">FULL</span>
            </>
          )}
        </button>
      </nav>
    </>
  )
}
