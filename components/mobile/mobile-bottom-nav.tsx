"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Home, List, Settings, LogOut, User, ActivityIcon as Function } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { hapticFeedback } from "@/utils/haptic-feedback"

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
    // Prevent default behavior to avoid any browser issues
    if (typeof window !== "undefined") {
      // Provide haptic feedback when changing tabs
      hapticFeedback.selection()

      // Small delay to ensure UI feedback before tab change
      setTimeout(() => {
        onTabChange(tab)
      }, 10)
    } else {
      onTabChange(tab)
    }
  }

  // Handle FAB click with haptic feedback
  const handleFabClick = () => {
    // Provide stronger haptic feedback for important actions
    hapticFeedback.success()
    onAddSession()
  }

  // Handle settings click
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    hapticFeedback.selection()

    // Small delay to ensure UI feedback
    setTimeout(() => {
      onShowSettings()
    }, 10)
  }

  // Handle login/logout click
  const handleAuthClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    hapticFeedback.selection()

    // Small delay to ensure UI feedback
    setTimeout(() => {
      if (isAuthenticated) {
        onLogout()
      } else {
        onLogin()
      }
    }, 10)
  }

  return (
    <>
      {/* Floating Action Button */}
      {showFab && (
        <button
          className="mobile-fab touch-feedback"
          onClick={handleFabClick}
          aria-label="Add new session"
          type="button"
        >
          <span className="plus-icon">+</span>
        </button>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button
          type="button"
          className={`mobile-bottom-nav-item ${activeTab === "tables" ? "active" : ""}`}
          onClick={() => handleTabClick("tables")}
        >
          <Home className="mobile-bottom-nav-icon" size={20} />
          <span className="mobile-bottom-nav-label">TABLES</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-nav-item ${activeTab === "logs" ? "active" : ""}`}
          onClick={() => handleTabClick("logs")}
        >
          <List className="mobile-bottom-nav-icon" size={20} />
          <span className="mobile-bottom-nav-label">LOGS</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-nav-item ${activeTab === "functions" ? "active" : ""}`}
          onClick={() => handleTabClick("functions")}
        >
          <Function className="mobile-bottom-nav-icon" size={20} />
          <span className="mobile-bottom-nav-label">FUNCTIONS</span>
        </button>

        <button type="button" className={`mobile-bottom-nav-item`} onClick={handleSettingsClick}>
          <Settings className="mobile-bottom-nav-icon" size={20} />
          <span className="mobile-bottom-nav-label">SETTINGS</span>
        </button>

        <button type="button" className={`mobile-bottom-nav-item`} onClick={handleAuthClick}>
          {isAuthenticated ? (
            <>
              <LogOut className="mobile-bottom-nav-icon" size={20} />
              <span className="mobile-bottom-nav-label">LOGOUT</span>
            </>
          ) : (
            <>
              <User className="mobile-bottom-nav-icon" size={20} />
              <span className="mobile-bottom-nav-label">LOGIN</span>
            </>
          )}
        </button>
      </nav>
    </>
  )
}
