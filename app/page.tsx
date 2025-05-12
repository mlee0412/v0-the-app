"use client"

import { useEffect, useState } from "react"
import { BilliardsTimerDashboard } from "@/components/billiards-timer-dashboard"
import TouchLoginDialog from "@/components/auth/touch-login-dialog"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [showLoginDialog, setShowLoginDialog] = useState(false)

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
        setIsAuthenticated(false)
        setShowLoginDialog(true)
      }
    }

    checkAuth()
  }, [])

  // Handle login dialog close
  const handleLoginClose = () => {
    setShowLoginDialog(false)

    // Check auth again after dialog closes
    const storedUser = localStorage.getItem("currentUser")
    setIsAuthenticated(!!storedUser)
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
