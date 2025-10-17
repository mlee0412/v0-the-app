"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LockIcon, UserIcon, XIcon, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { NumberPad } from "@/components/auth/number-pad"

interface LoginDialogProps {
  open: boolean
  onClose: () => void
}

export function LoginDialog({ open, onClose }: LoginDialogProps) {
  const { login } = useAuth()
  const [selectedUser, setSelectedUser] = useState("")
  const [selectedUserName, setSelectedUserName] = useState("")
  const [pinCode, setPinCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [showUserList, setShowUserList] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const userCacheRef = useRef<any[] | null>(null)

  const fetchUsers = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && userCacheRef.current) {
      setUsers(userCacheRef.current)
      setIsLoadingUsers(false)
      return
    }

    try {
      setIsLoadingUsers(true)
      const response = await fetch("/api/staff/members")
      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }
      const data = await response.json()
      userCacheRef.current = data
      setUsers(data)
    } catch (err) {
      console.error("Error fetching users:", err)
      const fallback = [{ id: "admin", first_name: "Administrator" }]
      userCacheRef.current = fallback
      setUsers(fallback)
    } finally {
      setIsLoadingUsers(false)
    }
  }, [])

  // Prefetch users once on mount to warm cache
  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  // Fetch users when dialog opens to ensure latest data
  useEffect(() => {
    if (open) {
      void fetchUsers()
      setPinCode("")
      setError("")
    }
  }, [open, fetchUsers])

  const handleLogin = async () => {
    if (!selectedUser) {
      setError("Please select a user")
      return
    }

    if (!pinCode || pinCode.length !== 4) {
      setError("Please enter a valid 4-digit PIN code")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const success = await login(selectedUser, pinCode)
      if (success) {
        onClose()
      } else {
        setError("Invalid PIN code")
      }
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "An error occurred during login")
    } finally {
      setIsLoading(false)
    }
  }

  const selectUser = (userId: string, userName: string) => {
    setSelectedUser(userId)
    setSelectedUserName(userName)
    setShowUserList(false)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[420px] bg-black text-white border-[#00FFFF] space-theme font-mono">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#00FFFF] flex items-center gap-2">
            <LockIcon className="h-5 w-5" />
            Login
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-4">
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
                disabled={isLoadingUsers}
              >
                {isLoadingUsers ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading users...
                  </div>
                ) : selectedUserName ? (
                  selectedUserName
                ) : (
                  "Select a user"
                )}
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
                      onClick={() => selectUser(user.id, user.display_name || user.first_name)}
                    >
                      <UserIcon className="h-4 w-4 text-[#00FFFF]" />
                      <span>{user.display_name || user.first_name}</span>
                    </div>
                  ))}
                  {/* Add admin user option */}
                  <div
                    className="p-3 hover:bg-[#000066] cursor-pointer flex items-center gap-2 border-t border-[#00FFFF]/30"
                    onClick={() => selectUser("admin", "Administrator")}
                  >
                    <UserIcon className="h-4 w-4 text-[#00FFFF]" />
                    <span>Administrator</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PIN Code Entry */}
          <div className="space-y-2">
            <div className="text-white flex items-center gap-2">
              <LockIcon className="h-4 w-4 text-[#00FFFF]" />
              <span>Enter PIN Code (4 digits)</span>
            </div>

            <div className="flex items-center justify-center mb-4">
              <div className="flex gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-12 h-12 border-2 border-[#00FFFF] rounded-md flex items-center justify-center bg-[#000033]"
                  >
                    {pinCode.length > i ? (
                      <div className="w-5 h-5 rounded-full bg-[#00FFFF]"></div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-[#00FFFF] opacity-30"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <NumberPad
              value={pinCode}
              onChange={setPinCode}
              maxLength={4}
              showLoginButton={true}
              onLogin={handleLogin}
              isPending={isLoading}
            />
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
            className="w-full border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
