"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LockIcon, UserIcon, Loader2 } from "lucide-react"
import { getUsers } from "@/actions/user-actions"
import { toast } from "@/components/ui/use-toast"

interface TouchLoginProps {
  isOpen: boolean
  onClose: () => void
  onLogin: (user: any) => void
}

export function TouchLogin({ isOpen, onClose, onLogin }: TouchLoginProps) {
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [pinCode, setPinCode] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true)
        const fetchedUsers = await getUsers()
        setUsers(fetchedUsers)
        console.log("Fetched users:", fetchedUsers)
      } catch (err) {
        console.error("Error fetching users:", err)
        toast({
          title: "Error",
          description: "Failed to load users. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoadingUsers(false)
      }
    }

    if (isOpen) {
      fetchUsers()
      setPinCode("")
      setError(null)
    }
  }, [isOpen])

  const handleLogin = async () => {
    if (!selectedUser) {
      setError("Please select a user")
      return
    }

    if (pinCode.length !== 4) {
      setError("PIN code must be 4 digits")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Find the selected user
      const user = users.find((u) => u.username === selectedUser)

      if (!user) {
        throw new Error("User not found")
      }

      // Create a user object with permissions
      const userWithPermissions = {
        ...user,
        permissions: {
          canStartSession: user.role !== "viewer",
          canEndSession: user.role !== "viewer",
          canAddTime: user.role !== "viewer",
          canSubtractTime: user.role !== "viewer",
          canUpdateGuests: user.role !== "viewer",
          canAssignServer: user.role === "admin",
          canGroupTables: user.role === "admin",
          canUngroupTable: user.role === "admin",
          canMoveTable: user.role === "admin",
          canUpdateNotes: user.role !== "viewer",
          canViewLogs: true,
          canManageUsers: user.role === "admin",
          canManageSettings: user.role === "admin",
        },
      }

      // Store user in localStorage
      localStorage.setItem("currentUser", JSON.stringify(userWithPermissions))
      onLogin(userWithPermissions)
      onClose()
    } catch (err) {
      console.error("Login error:", err)
      setError("An error occurred during login")
    } finally {
      setLoading(false)
    }
  }

  const handlePinDigit = (digit: string) => {
    if (pinCode.length < 4) {
      setPinCode((prev) => prev + digit)
    }
  }

  const handleBackspace = () => {
    setPinCode((prev) => prev.slice(0, -1))
  }

  const handleClear = () => {
    setPinCode("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-cyan-500 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
            <LockIcon className="h-6 w-6" />
            Login
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Select User
            </label>
            {loadingUsers ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              </div>
            ) : (
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-full h-12 bg-gray-800 border-cyan-500 text-white">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-cyan-500 text-white">
                  {users.map((user) => (
                    <SelectItem key={user.username} value={user.username} className="hover:bg-gray-700">
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* PIN Code Display */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <LockIcon className="h-4 w-4" />
              Enter PIN Code
            </label>
            <div className="flex justify-center gap-2 my-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                    i < pinCode.length ? "border-cyan-500 bg-cyan-500/20" : "border-gray-600"
                  }`}
                >
                  {i < pinCode.length ? "•" : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                onClick={() => handlePinDigit(num.toString())}
                className="h-14 text-xl font-bold bg-gray-800 hover:bg-gray-700 border border-gray-700"
              >
                {num}
              </Button>
            ))}
            <Button
              onClick={handleClear}
              className="h-14 text-xl font-bold bg-red-900 hover:bg-red-800 border border-red-800"
            >
              C
            </Button>
            <Button
              onClick={() => handlePinDigit("0")}
              className="h-14 text-xl font-bold bg-gray-800 hover:bg-gray-700 border border-gray-700"
            >
              0
            </Button>
            <Button
              onClick={handleBackspace}
              className="h-14 text-xl font-bold bg-gray-800 hover:bg-gray-700 border border-gray-700"
            >
              ←
            </Button>
          </div>

          {error && <p className="text-red-500 text-center">{error}</p>}

          <div className="flex justify-between gap-4 mt-6">
            <Button onClick={onClose} className="flex-1 h-12 bg-gray-800 hover:bg-gray-700 border border-gray-700">
              Cancel
            </Button>
            <Button
              onClick={handleLogin}
              disabled={loading || pinCode.length !== 4}
              className="flex-1 h-12 bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
