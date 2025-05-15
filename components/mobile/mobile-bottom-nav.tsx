"use client"

import { useState, useEffect } from "react"
import { List, Settings, LogOut, User, ActivityIcon as Function, LayoutGrid, PlusCircle } from "lucide-react"
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

  return (
    <>
      {/* Floating Action Button */}
      {showFab && (
        <button className="mobile-fab touch-feedback" onClick={handleFabClick} aria-label="Add new session">
          <span className="plus-icon">+</span>
        </button>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 border-t border-cyan-500/50 backdrop-blur-md z-50 safe-area-padding">
        <div className="container mx-auto px-2">
          <div className="flex items-center justify-around py-2">
            {/* Make sure each button has proper touch area */}
            <button
              onClick={() => onTabChange("tables")}
              className={`flex flex-col items-center justify-center p-2 rounded-md min-w-[60px] min-h-[60px] touch-feedback ${
                activeTab === "tables" ? "bg-cyan-900/50 text-cyan-400" : "text-gray-400"
              }`}
              aria-label="Tables"
            >
              <LayoutGrid className="h-5 w-5 mb-1" />
              <span className="text-xs">Tables</span>
            </button>

            <button
              onClick={() => handleTabClick("logs")}
              className={`flex flex-col items-center justify-center p-2 rounded-md min-w-[60px] min-h-[60px] touch-feedback ${
                activeTab === "logs" ? "bg-cyan-900/50 text-cyan-400" : "text-gray-400"
              }`}
              aria-label="Logs"
            >
              <List className="h-5 w-5 mb-1" size={20} />
              <span className="text-xs">Logs</span>
            </button>

            <button
              onClick={() => handleTabClick("functions")}
              className={`flex flex-col items-center justify-center p-2 rounded-md min-w-[60px] min-h-[60px] touch-feedback ${
                activeTab === "functions" ? "bg-cyan-900/50 text-cyan-400" : "text-gray-400"
              }`}
              aria-label="Functions"
            >
              <Function className="h-5 w-5 mb-1" size={20} />
              <span className="text-xs">Functions</span>
            </button>

            <button
              onClick={onShowSettings}
              className={`flex flex-col items-center justify-center p-2 rounded-md min-w-[60px] min-h-[60px] touch-feedback text-gray-400`}
              aria-label="Settings"
            >
              <Settings className="h-5 w-5 mb-1" size={20} />
              <span className="text-xs">Settings</span>
            </button>

            {isAuthenticated ? (
              <button
                onClick={onLogout}
                className={`flex flex-col items-center justify-center p-2 rounded-md min-w-[60px] min-h-[60px] touch-feedback text-gray-400`}
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5 mb-1" size={20} />
                <span className="text-xs">Logout</span>
              </button>
            ) : (
              <button
                onClick={onLogin}
                className={`flex flex-col items-center justify-center p-2 rounded-md min-w-[60px] min-h-[60px] touch-feedback text-gray-400`}
                aria-label="Login"
              >
                <User className="h-5 w-5 mb-1" size={20} />
                <span className="text-xs">Login</span>
              </button>
            )}

            {/* Add data attributes for haptic feedback */}
            {showFab && (
              <button
                onClick={onAddSession}
                className="flex flex-col items-center justify-center p-2 rounded-md min-w-[60px] min-h-[60px] bg-cyan-900/30 text-cyan-400 touch-feedback"
                aria-label="Add Session"
                data-warning="true"
              >
                <PlusCircle className="h-6 w-6 mb-1" />
                <span className="text-xs">Add</span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
