"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NumberPad } from "@/components/auth/number-pad"
import { Eye, EyeOff } from "lucide-react"
import type { UserRole } from "@/types/user"
import { USER_ROLE_LABELS } from "@/types/user"

interface UserFormProps {
  onSubmit: (userData: any) => void
  onCancel: () => void
  initialData?: any
  isLoading?: boolean
}

export function UserForm({ onSubmit, onCancel, initialData, isLoading = false }: UserFormProps) {
  const [email, setEmail] = useState(initialData?.email || "")
  const [name, setName] = useState(initialData?.name || "")
  const [pinCode, setPinCode] = useState(initialData?.pin_code || initialData?.pin || "")
  const [role, setRole] = useState<UserRole>(initialData?.role || "viewer")
  const [showPinPad, setShowPinPad] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState("")

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setEmail(initialData.email || "")
      setName(initialData.name || "")
      setPinCode(initialData.pin_code || initialData.pin || "")
      setRole(initialData.role || "viewer")
      setError("")
    }
  }, [initialData])

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate email
    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    // Validate PIN code
    if (pinCode.length !== 4 || !/^\d+$/.test(pinCode)) {
      setError("PIN code must be exactly 4 digits")
      return
    }

    setError("")
    onSubmit({
      email,
      name,
      pin_code: pinCode,
      role,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="bg-[#000033] border-[#00FFFF] text-white"
          />
          <p className="text-sm text-gray-400">Email address will be used for login.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display Name"
            required
            className="bg-[#000033] border-[#00FFFF] text-white"
          />
          <p className="text-sm text-gray-400">This name will appear in the login dropdown.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin_code">PIN Code</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="pin_code"
                type={showPin ? "text" : "password"}
                value={pinCode}
                onChange={(e) => {
                  const value = e.target.value
                  if (/^\d{0,4}$/.test(value)) {
                    setPinCode(value)
                  }
                }}
                placeholder="4-digit PIN"
                maxLength={4}
                className="bg-[#000033] border-[#00FFFF] text-white pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-gray-400"
                onClick={() => setShowPin(!showPin)}
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-[#00FFFF] bg-[#000033] text-[#00FFFF]"
              onClick={() => setShowPinPad(!showPinPad)}
            >
              {showPinPad ? "Hide Pad" : "Use Pad"}
            </Button>
          </div>
          <p className="text-sm text-gray-400">Must be exactly 4 digits (0-9).</p>

          {showPinPad && (
            <div className="mt-2 p-3 border border-[#00FFFF] rounded-md bg-[#000022]">
              <div className="flex justify-between items-center mb-2">
                <div className="text-[#00FFFF]">Enter 4-digit PIN</div>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 border border-[#00FFFF] rounded-md flex items-center justify-center"
                    >
                      {pinCode.length > i ? (showPin ? pinCode[i] : "•") : ""}
                    </div>
                  ))}
                </div>
              </div>
              <NumberPad value={pinCode} onChange={setPinCode} maxLength={4} onClose={() => setShowPinPad(false)} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
            <SelectTrigger className="bg-[#000033] border-[#00FFFF] text-white">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent className="bg-[#000033] border-[#00FFFF] text-white max-h-[300px]">
              {/* Admin Level Roles */}
              <div className="px-2 py-1.5 text-xs font-semibold text-cyan-400 border-b border-cyan-800">
                Admin Level Roles
              </div>
              <SelectItem value="admin">{USER_ROLE_LABELS.admin}</SelectItem>
              <SelectItem value="controller">{USER_ROLE_LABELS.controller}</SelectItem>
              <SelectItem value="manager">{USER_ROLE_LABELS.manager}</SelectItem>

              {/* Staff Level Roles */}
              <div className="px-2 py-1.5 text-xs font-semibold text-cyan-400 border-b border-cyan-800 mt-2">
                Staff Roles
              </div>
              <SelectItem value="server">{USER_ROLE_LABELS.server}</SelectItem>
              <SelectItem value="bartender">{USER_ROLE_LABELS.bartender}</SelectItem>
              <SelectItem value="barback">{USER_ROLE_LABELS.barback}</SelectItem>
              <SelectItem value="kitchen">{USER_ROLE_LABELS.kitchen}</SelectItem>
              <SelectItem value="security">{USER_ROLE_LABELS.security}</SelectItem>
              <SelectItem value="karaoke_main">{USER_ROLE_LABELS.karaoke_main}</SelectItem>
              <SelectItem value="karaoke_staff">{USER_ROLE_LABELS.karaoke_staff}</SelectItem>

              {/* View Only Roles */}
              <div className="px-2 py-1.5 text-xs font-semibold text-cyan-400 border-b border-cyan-800 mt-2">
                View Only Roles
              </div>
              <SelectItem value="viewer">{USER_ROLE_LABELS.viewer}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-400">This determines the user's base access level.</p>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !email || !name || !pinCode || pinCode.length < 4}
          className="bg-[#00FFFF] hover:bg-[#00CCCC] text-black"
        >
          {isLoading ? "Saving..." : initialData ? "Update User" : "Create User"}
        </Button>
      </div>
    </form>
  )
}
