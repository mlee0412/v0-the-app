"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LockIcon, UserIcon } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface LoginDialogProps {
  open: boolean
  onClose: () => void
}

export function LoginDialog({ open, onClose }: LoginDialogProps) {
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Update the handleLogin function to handle the specific login type
  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please enter both username and password")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // For Admin login, use the first user in the database with password 2162
      // For Viewer login, use a predefined viewer account with password 0000
      const success = await login(username, password)
      if (success) {
        onClose()
      } else {
        setError("Invalid username or password")
      }
    } catch (err) {
      setError("An error occurred during login")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
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

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white">
              Username
            </Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-[#00FFFF]" />
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="pl-10 bg-[#000033] border-[#00FFFF] text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              Password
            </Label>
            <div className="relative">
              <LockIcon className="absolute left-3 top-2.5 h-5 w-5 text-[#00FFFF]" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="pl-10 bg-[#000033] border-[#00FFFF] text-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLogin()
                  }
                }}
              />
            </div>
          </div>

          {error && <p className="text-[#FF0000] text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
          >
            Cancel
          </Button>
          <Button onClick={handleLogin} disabled={isLoading} className="bg-[#00FFFF] hover:bg-[#00CCCC] text-black">
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
