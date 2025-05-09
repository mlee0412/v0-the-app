"use client"

import { useState, useEffect } from "react"
import { Home, List, Settings, LogOut, User, ActivityIcon } from "lucide-react"
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
}: MobileBottomNavProps) {
  const { isAuthenticated, hasPermission } = useAuth()
  const [showFab, setShowFab] = useState(false)

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

  // Effect to remove any touch test buttons that might be added dynamically
  useEffect(() => {
    const removeTouchTestButtons = () => {
      if (typeof document !== "undefined") {
        const nav = document.querySelector(".mobile-bottom-nav")
        if (nav) {
          // Remove any children after the 5th one
          Array.from(nav.children).forEach((child, index) => {
            if (index >= 5) {
              child.remove()
            }
          })

          // Also check for any elements with "Touch Test" text
          Array.from(nav.children).forEach((child) => {
            if (child.textContent?.includes("Touch Test")) {
              child.remove()
            }
          })
        }
      }
    }

    // Run immediately and set up an interval
    removeTouchTestButtons()
    const interval = setInterval(removeTouchTestButtons, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* Floating Action Button */}
      {showFab && (
        <button className="mobile-fab touch-feedback" onClick={handleFabClick} aria-label="Add new session">
          <span className="plus-icon">+</span>
        </button>
      )}

      {/* Bottom Navigation Bar - IMPORTANT: Only 5 items allowed */}
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

        <button
          className={`mobile-bottom-nav-item ${activeTab === "functions" ? "active" : ""}`}
          onClick={() => handleTabClick("functions")}
        >
          <ActivityIcon className="mobile-bottom-nav-icon" size={20} />
          <span className="mobile-bottom-nav-label">FUNCTIONS</span>
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
      </nav>
    </>
  )
}
