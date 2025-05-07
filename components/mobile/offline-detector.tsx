"use client"

import { useState, useEffect, useRef } from "react"
import { WifiOff, Wifi } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export function OfflineDetector() {
  const [isOnline, setIsOnline] = useState(true)
  const [showBanner, setShowBanner] = useState(false) // Start with banner hidden
  const [lastStatus, setLastStatus] = useState<boolean | null>(null) // Track last status to prevent duplicate notifications
  const { isAuthenticated, isAdmin, currentUser } = useAuth()
  const statusChangeTimeout = useRef<NodeJS.Timeout | null>(null)
  const MIN_STATUS_CHANGE_INTERVAL = 10000 // 10 seconds minimum between status changes

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)
    setLastStatus(navigator.onLine)

    // Only show banner initially if offline
    setShowBanner(!navigator.onLine)

    // Add event listeners with debouncing
    const handleOnline = () => {
      // Clear any existing timeout
      if (statusChangeTimeout.current) {
        clearTimeout(statusChangeTimeout.current)
      }

      // Add a small delay to ensure network is stable
      statusChangeTimeout.current = setTimeout(() => {
        setIsOnline(true)

        // Only show banner if status changed
        if (lastStatus === false) {
          setShowBanner(true)
          setLastStatus(true)

          // Auto-hide after 5 seconds
          setTimeout(() => {
            setShowBanner(false)
          }, 5000)
        }
      }, 2000) // 2 second delay to ensure network is stable
    }

    const handleOffline = () => {
      // Clear any existing timeout
      if (statusChangeTimeout.current) {
        clearTimeout(statusChangeTimeout.current)
      }

      // Add a small delay to prevent false offline reports
      statusChangeTimeout.current = setTimeout(() => {
        setIsOnline(false)

        // Only show banner if status changed
        if (lastStatus !== false) {
          setShowBanner(true)
          setLastStatus(false)
        }
      }, 1000) // 1 second delay
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Custom event listeners for Supabase connection status
    const handleSupabaseConnected = () => {
      if (!isOnline) return // Don't update if browser reports offline

      setIsOnline(true)

      // Only show banner if status changed
      if (lastStatus === false) {
        setShowBanner(true)
        setLastStatus(true)

        // Auto-hide after 5 seconds
        setTimeout(() => {
          setShowBanner(false)
        }, 5000)
      }
    }

    const handleSupabaseDisconnected = () => {
      // Don't immediately go offline, wait for browser to confirm
      if (!navigator.onLine) {
        setIsOnline(false)

        // Only show banner if status changed
        if (lastStatus !== false) {
          setShowBanner(true)
          setLastStatus(false)
        }
      }
    }

    window.addEventListener("supabase-connected", handleSupabaseConnected)
    window.addEventListener("supabase-disconnected", handleSupabaseDisconnected)

    // Clean up
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("supabase-connected", handleSupabaseConnected)
      window.removeEventListener("supabase-disconnected", handleSupabaseDisconnected)

      if (statusChangeTimeout.current) {
        clearTimeout(statusChangeTimeout.current)
      }
    }
  }, [lastStatus])

  // Don't auto-show banner on clicks anymore
  // Instead, add a manual toggle function that can be called from a button
  const toggleBanner = () => {
    setShowBanner((prev) => !prev)

    // Auto-hide after 5 seconds if online
    if (isOnline) {
      setTimeout(() => {
        setShowBanner(false)
      }, 5000)
    }
  }

  if (!showBanner) return null

  // Get user display name
  const userDisplay = isAuthenticated && currentUser ? currentUser.name || currentUser.username : "Guest"

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 p-2 text-center text-sm flex items-center justify-center transition-colors duration-300 ${
        isOnline ? "bg-green-600 text-white" : "bg-red-600 text-white"
      }`}
      onClick={() => setShowBanner(false)} // Allow clicking to dismiss
    >
      {isOnline ? <Wifi className="h-4 w-4 mr-2" /> : <WifiOff className="h-4 w-4 mr-2" />}
      <span>
        {isOnline ? "Connected" : "Offline Mode"}
        {isAuthenticated && <span> ({userDisplay})</span>}
      </span>
    </div>
  )
}
