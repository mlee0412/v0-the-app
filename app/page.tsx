"use client"

import { useEffect, useState } from "react"
import { BilliardsTimerDashboard } from "@/components/billiards-timer-dashboard"
import TouchLoginDialog from "@/components/auth/touch-login-dialog"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem("currentUser")
        setIsAuthenticated(!!storedUser)

        // If not authenticated, show login dialog
        if (!storedUser) {
          setShowLoginDialog(true)
        }
      } catch (error) {
        console.error("Error checking authentication:", error)
        setInitError("Failed to check authentication status. Using guest mode.")
        setIsAuthenticated(false)
        setShowLoginDialog(true)
      }
    }

    // Set a timeout to prevent the app from being stuck in loading state
    const timeoutId = setTimeout(() => {
      if (isAuthenticated === null) {
        console.warn("Authentication check timed out, continuing as guest")
        setInitError("Authentication check timed out. Using guest mode.")
        setIsAuthenticated(false)
        setShowLoginDialog(true)
      }
    }, 3000) // 3 second timeout

    checkAuth()

    return () => clearTimeout(timeoutId)
  }, [])

  // Handle login dialog close
  const handleLoginClose = () => {
    setShowLoginDialog(false)

    // Check auth again after dialog closes
    try {
      const storedUser = localStorage.getItem("currentUser")
      setIsAuthenticated(!!storedUser)
    } catch (error) {
      console.error("Error checking authentication after login:", error)
      setInitError("Failed to verify login. Using guest mode.")
      setIsAuthenticated(false)
    }
  }

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <main>
      {initError && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-600/70 text-white p-2 text-sm z-50">
          <p>{initError}</p>
        </div>
      )}

      {isAuthenticated ? (
        <BilliardsTimerDashboard />
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <button
            onClick={() => setShowLoginDialog(true)}
            className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
          >
            Login to Access Dashboard
          </button>
        </div>
      )}

      {showLoginDialog && <TouchLoginDialog onClose={handleLoginClose} />}
    </main>
  )
}
