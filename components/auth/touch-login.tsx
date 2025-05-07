"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LockIcon, UserIcon } from "lucide-react"
import supabaseAuthService from "@/services/supabase-auth-service"

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

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await supabaseAuthService.getUsers()
        setUsers(users)
      } catch (err) {
        console.error("Error fetching users:", err)
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
      const user = await supabaseAuthService.authenticate(selectedUser, pinCode)

      if (user) {
        // Store user in localStorage
        localStorage.setItem("currentUser", JSON.stringify(user))
        onLogin(user)
        onClose()
      } else {
        setError("Invalid PIN code")
      }
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
