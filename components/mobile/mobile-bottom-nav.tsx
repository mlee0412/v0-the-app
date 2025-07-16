"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Home, List, Settings, LogOut, User, ActivityIcon as Function, PlusCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { hapticFeedback } from "@/utils/haptic-feedback"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface MobileBottomNavProps {
  onTabChange: (tab: string) => void
  onAddSession: () => void
  activeTab: string
  dayStarted: boolean
  isAdmin: boolean
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
  onShowSettings,
  onLogout,
  onLogin,
}: MobileBottomNavProps) {
  const { isAuthenticated, hasPermission } = useAuth()
  const [showFab, setShowFab] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const availableTabs = ["tables", "logs", "functions"]

  // Determine if we should show the FAB based on permissions and active tab
  useEffect(() => {
    const canAddSession = isAuthenticated && dayStarted && (isAdmin || hasPermission("canStartSession"))
    setShowFab(canAddSession && activeTab === "tables")
  }, [isAuthenticated, isAdmin, hasPermission, dayStarted, activeTab])

  // Update the handleTabClick function to use our enhanced haptic feedback
  const handleTabClick = (tab: string) => {
    // Prevent default behavior to avoid any browser issues
    if (typeof window !== "undefined") {
      // Provide haptic feedback when changing tabs
      hapticFeedback.selection() // Using selection haptic feedback for tab changes

    // Immediately change tab after haptic feedback for snappier UI
    onTabChange(tab)
    } else {
      onTabChange(tab)
    }
  }

  // Update the handleFabClick function for better haptic feedback
  const handleFabClick = () => {
    // Provide stronger haptic feedback for important actions
    hapticFeedback.medium()
    onAddSession()
  }

  // Update the handleSettingsClick function
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    hapticFeedback.selection() // Using selection haptic feedback for settings

    // Call handler directly for quicker response
    onShowSettings()
  }

  // Update the handleAuthClick function
  const handleAuthClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    hapticFeedback.selection() // Using selection haptic feedback for auth actions

    // Trigger action immediately for snappier feel
    if (isAuthenticated) {
      onLogout()
    } else {
      onLogin() // This will trigger the same login dialog as desktop
    }
  }

  // Update the handleTouchEnd function for better swipe experience
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return

    const swipeDistance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50 // Minimum distance to register as a swipe

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      const currentTabIndex = availableTabs.indexOf(activeTab)

      if (swipeDistance > 0 && currentTabIndex < availableTabs.length - 1) {
        // Swipe left - go to next tab
        handleTabClick(availableTabs[currentTabIndex + 1])
        hapticFeedback.selection()
      } else if (swipeDistance < 0 && currentTabIndex > 0) {
        // Swipe right - go to previous tab
        handleTabClick(availableTabs[currentTabIndex - 1])
        hapticFeedback.selection()
      }
    }

    touchStartX.current = null
    touchEndX.current = null
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  return (
    <TooltipProvider>
      {/* Floating Action Button */}
      {showFab && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="fixed bottom-[76px] right-5 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-black flex items-center justify-center shadow-lg shadow-cyan-500/30 z-[999] border-0 transition-transform duration-200 active:scale-95"
              onClick={handleFabClick}
              aria-label="Add new session"
              type="button"
            >
              <PlusCircle className="h-7 w-7" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-black/90 border-cyan-500 text-cyan-300">
            <span className="text-sm font-medium">Add New Session</span>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Bottom Navigation Bar */}
      <nav
        ref={navRef}
        className="fixed bottom-0 left-0 right-0 flex justify-between bg-gradient-to-t from-black/95 to-black/85 backdrop-blur-lg border-t border-cyan-500/15 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.7)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="navigation"
        aria-label="Main navigation"
      >
        <button
          type="button"
          className={`flex flex-col items-center justify-center flex-1 mx-1 py-1.5 rounded-lg ${
            activeTab === "tables"
              ? "text-cyan-400 bg-cyan-500/10"
              : "text-white/60 hover:bg-white/5 active:bg-white/10"
          } transition-colors duration-200`}
          onClick={() => handleTabClick("tables")}
          aria-pressed={activeTab === "tables"}
          aria-label="Tables tab"
        >
          <div className="relative flex items-center justify-center h-7 w-7 mb-1">
            <Home className="h-5 w-5" />
            {activeTab === "tables" && (
              <span className="absolute -bottom-1 left-1/2 w-5 h-0.5 bg-cyan-400 rounded-full transform -translate-x-1/2"></span>
            )}
          </div>
          <span className="text-[10px] font-semibold tracking-wider">TABLES</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center justify-center flex-1 mx-1 py-1.5 rounded-lg ${
            activeTab === "logs" ? "text-cyan-400 bg-cyan-500/10" : "text-white/60 hover:bg-white/5 active:bg-white/10"
          } transition-colors duration-200`}
          onClick={() => handleTabClick("logs")}
          aria-pressed={activeTab === "logs"}
          aria-label="Logs tab"
        >
          <div className="relative flex items-center justify-center h-7 w-7 mb-1">
            <List className="h-5 w-5" />
            {activeTab === "logs" && (
              <span className="absolute -bottom-1 left-1/2 w-5 h-0.5 bg-cyan-400 rounded-full transform -translate-x-1/2"></span>
            )}
          </div>
          <span className="text-[10px] font-semibold tracking-wider">LOGS</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center justify-center flex-1 mx-1 py-1.5 rounded-lg ${
            activeTab === "functions"
              ? "text-cyan-400 bg-cyan-500/10"
              : "text-white/60 hover:bg-white/5 active:bg-white/10"
          } transition-colors duration-200`}
          onClick={() => handleTabClick("functions")}
          aria-pressed={activeTab === "functions"}
          aria-label="Functions tab"
        >
          <div className="relative flex items-center justify-center h-7 w-7 mb-1">
            <Function className="h-5 w-5" />
            {activeTab === "functions" && (
              <span className="absolute -bottom-1 left-1/2 w-5 h-0.5 bg-cyan-400 rounded-full transform -translate-x-1/2"></span>
            )}
          </div>
          <span className="text-[10px] font-semibold tracking-wider">FUNCTIONS</span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center justify-center flex-1 mx-1 py-1.5 rounded-lg text-white/60 hover:bg-white/5 active:bg-white/10 transition-colors duration-200"
          onClick={handleSettingsClick}
          aria-label="Settings"
        >
          <div className="flex items-center justify-center h-7 w-7 mb-1">
            <Settings className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold tracking-wider">SETTINGS</span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center justify-center flex-1 mx-1 py-1.5 rounded-lg text-white/60 hover:bg-white/5 active:bg-white/10 transition-colors duration-200"
          onClick={handleAuthClick}
          aria-label={isAuthenticated ? "Logout" : "Login"}
        >
          <div className="flex items-center justify-center h-7 w-7 mb-1">
            {isAuthenticated ? <LogOut className="h-5 w-5" /> : <User className="h-5 w-5" />}
          </div>
          <span className="text-[10px] font-semibold tracking-wider">{isAuthenticated ? "LOGOUT" : "LOGIN"}</span>
        </button>
      </nav>
    </TooltipProvider>
  )
}
