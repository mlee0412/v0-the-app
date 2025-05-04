"use client"

import { useState, useEffect } from "react"
import { Home, Clock, Settings, Users, List, Plus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface MobileBottomNavProps {
  onTabChange: (tab: string) => void
  onAddSession: () => void
  activeTab: string
  dayStarted: boolean
}

export function MobileBottomNav({ onTabChange, onAddSession, activeTab, dayStarted }: MobileBottomNavProps) {
  const { isAuthenticated, isAdmin, hasPermission } = useAuth()
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

  return (
    <>
      {/* Floating Action Button */}
      {showFab && (
        <button className="mobile-fab touch-feedback" onClick={handleFabClick} aria-label="Add new session">
          <Plus size={24} />
        </button>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-bottom-nav-item ${activeTab === "tables" ? "active" : ""}`}
          onClick={() => handleTabClick("tables")}
        >
          <Home className="mobile-bottom-nav-icon" size={24} />
          <span className="mobile-bottom-nav-label">Tables</span>
        </button>

        <button
          className={`mobile-bottom-nav-item ${activeTab === "sessions" ? "active" : ""}`}
          onClick={() => handleTabClick("sessions")}
        >
          <Clock className="mobile-bottom-nav-icon" size={24} />
          <span className="mobile-bottom-nav-label">Sessions</span>
        </button>

        <button
          className={`mobile-bottom-nav-item ${activeTab === "servers" ? "active" : ""}`}
          onClick={() => handleTabClick("servers")}
        >
          <Users className="mobile-bottom-nav-icon" size={24} />
          <span className="mobile-bottom-nav-label">Servers</span>
        </button>

        <button
          className={`mobile-bottom-nav-item ${activeTab === "logs" ? "active" : ""}`}
          onClick={() => handleTabClick("logs")}
        >
          <List className="mobile-bottom-nav-icon" size={24} />
          <span className="mobile-bottom-nav-label">Logs</span>
        </button>

        <button
          className={`mobile-bottom-nav-item ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => handleTabClick("settings")}
        >
          <Settings className="mobile-bottom-nav-icon" size={24} />
          <span className="mobile-bottom-nav-label">Settings</span>
        </button>
      </nav>
    </>
  )
}
