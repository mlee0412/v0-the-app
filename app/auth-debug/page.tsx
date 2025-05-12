"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthDebugPage() {
  const auth = useAuth()
  const [localStorageUser, setLocalStorageUser] = useState<any>(null)

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("currentUser")
      if (storedUser) {
        setLocalStorageUser(JSON.parse(storedUser))
      }
    } catch (error) {
      console.error("Error parsing stored user:", error)
    }
  }, [])

  const handleForceLogin = () => {
    // Create a hardcoded admin user
    const adminUser = {
      id: "admin-" + Date.now(),
      username: "admin",
      name: "Administrator",
      role: "admin",
      permissions: {
        canStartSession: true,
        canEndSession: true,
        canAddTime: true,
        canSubtractTime: true,
        canUpdateGuests: true,
        canAssignServer: true,
        canGroupTables: true,
        canUngroupTable: true,
        canMoveTable: true,
        canUpdateNotes: true,
        canViewLogs: true,
        canManageUsers: true,
        canManageSettings: true,
      },
    }

    // Store in localStorage
    localStorage.setItem("currentUser", JSON.stringify(adminUser))

    // Reload the page to update auth state
    window.location.reload()
  }

  const handleClearAuth = () => {
    localStorage.removeItem("currentUser")
    window.location.reload()
  }

  const handleGoToDashboard = () => {
    window.location.href = "/"
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Authentication Debug</CardTitle>
          <CardDescription>Check the current authentication state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Auth Context State:</h3>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto mt-2">
                {JSON.stringify(
                  {
                    isAuthenticated: auth.isAuthenticated,
                    isAdmin: auth.isAdmin,
                    isServer: auth.isServer,
                    currentUser: auth.currentUser,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-medium">localStorage User:</h3>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto mt-2">
                {JSON.stringify(localStorageUser, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button onClick={handleForceLogin} className="w-full sm:w-auto">
            Force Admin Login
          </Button>
          <Button onClick={handleClearAuth} variant="destructive" className="w-full sm:w-auto">
            Clear Auth
          </Button>
          <Button onClick={handleGoToDashboard} variant="outline" className="w-full sm:w-auto">
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
