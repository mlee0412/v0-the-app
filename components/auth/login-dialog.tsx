"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LockIcon, UserIcon, XIcon } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { NumberPad } from "@/components/number-pad"
import supabaseAuthService from "@/services/supabase-auth-service"

interface LoginDialogProps {
  open: boolean
  onClose: () => void
}

export function LoginDialog({ open, onClose }: LoginDialogProps) {
  const { login } = useAuth()
  const [selectedUser, setSelectedUser] = useState("")
  const [pinCode, setPinCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [showUserList, setShowUserList] = useState(false)

  // Fetch users when dialog opens
  useEffect(() => {
    if (open) {
      fetchUsers()
      setPinCode("")
      setError("")
    }
  }, [open])

  const fetchUsers = async () => {
    try {
      const usersList = await supabaseAuthService.getUsers()
      setUsers(usersList)
    } catch (err) {
      console.error("Error fetching users:", err)
      setUsers([{ id: "admin", username: "admin", name: "Administrator" }])
    }
  }

  const handleLogin = async () => {
    if (!selectedUser) {
      setError("Please select a username")
      return
    }

    if (!pinCode || pinCode.length < 4) {
      setError("Please enter a 4-digit PIN code")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const success = await login(selectedUser, pinCode)
      if (success) {
        onClose()
      } else {
        setError("Invalid username or PIN code")
      }
    } catch (err) {
      setError("An error occurred during login")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const selectUser = (username: string) => {
    setSelectedUser(username)
    setShowUserList(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-black text-white border-[#00FFFF] space-theme font-mono">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#00FFFF] flex items-center gap-2">
            <LockIcon className="h-5 w-5" />
            Login
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Username Selection */}
          <div className="space-y-2">
            <div className="text-white flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-[#00FFFF]" />
              <span>Select User</span>
            </div>

            <div className="relative">
              <Button
                variant="outline"
                className="w-full justify-between bg-[#000033] border-[#00FFFF] text-white hover:bg-[#000066]"
                onClick={() => setShowUserList(!showUserList)}
              >
                {selectedUser ? users.find((u) => u.username === selectedUser)?.name || selectedUser : "Select a user"}
                <span className="ml-2">▼</span>
              </Button>

              {showUserList && (
                <div className="absolute z-50 mt-1 w-full bg-[#000033] border border-[#00FFFF] rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="sticky top-0 flex justify-between items-center p-2 bg-[#000044] border-b border-[#00FFFF]">
                    <span className="text-[#00FFFF] text-sm">Select User</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-400 hover:text-red-300"
                      onClick={() => setShowUserList(false)}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="p-3 hover:bg-[#000066] cursor-pointer flex items-center gap-2"
                      onClick={() => selectUser(user.username)}
                    >
                      <UserIcon className="h-4 w-4 text-[#00FFFF]" />
                      <span>{user.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PIN Code Entry */}
          <div className="space-y-2">
            <div className="text-white flex items-center gap-2">
              <LockIcon className="h-4 w-4 text-[#00FFFF]" />
              <span>Enter PIN Code</span>
            </div>

            <div className="flex items-center justify-center mb-2">
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-12 h-12 border-2 border-[#00FFFF] rounded-md flex items-center justify-center bg-[#000033]"
                  >
                    {pinCode.length > i ? (
                      <div className="w-4 h-4 rounded-full bg-[#00FFFF]"></div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-[#00FFFF] opacity-30"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <NumberPad value={pinCode} onChange={setPinCode} maxLength={4} />
          </div>

          {error && (
            <div className="p-2 bg-red-900/30 border border-red-800 rounded-md">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleLogin}
            disabled={isLoading || !selectedUser || pinCode.length < 4}
            className="bg-[#00FFFF] hover:bg-[#00CCCC] text-black"
          >
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
