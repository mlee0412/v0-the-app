"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NumberPad } from "@/components/number-pad"

interface UserFormProps {
  onSubmit: (userData: any) => void
  onCancel: () => void
  initialData?: any
  isLoading?: boolean
}

export function UserForm({ onSubmit, onCancel, initialData, isLoading = false }: UserFormProps) {
  const [username, setUsername] = useState(initialData?.username || "")
  const [name, setName] = useState(initialData?.name || "")
  const [pinCode, setPinCode] = useState(initialData?.pin_code || initialData?.pin || "1234")
  const [role, setRole] = useState(initialData?.role || "viewer")
  const [showPinPad, setShowPinPad] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      username,
      name,
      pin_code: pinCode,
      role,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username (no spaces)"
            required
            className="bg-[#000033] border-[#00FFFF] text-white"
          />
          <p className="text-sm text-gray-400">Unique identifier for the user (no spaces).</p>
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
            <div
              className="flex-1 bg-[#000033] border border-[#00FFFF] rounded-md px-3 py-2 text-white cursor-pointer"
              onClick={() => setShowPinPad(!showPinPad)}
            >
              {pinCode ? "••••".substring(0, pinCode.length) : "Enter PIN"}
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-[#00FFFF] bg-[#000033] text-[#00FFFF]"
              onClick={() => setShowPinPad(!showPinPad)}
            >
              {showPinPad ? "Hide" : "Set PIN"}
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
                      {pinCode.length > i ? "•" : ""}
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
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="bg-[#000033] border-[#00FFFF] text-white">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent className="bg-[#000033] border-[#00FFFF] text-white">
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="server">Server</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-400">This determines the user's base access level.</p>
        </div>
      </div>

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
          disabled={isLoading || !username || !name || !pinCode || pinCode.length < 4}
          className="bg-[#00FFFF] hover:bg-[#00CCCC] text-black"
        >
          {isLoading ? "Saving..." : initialData ? "Update User" : "Create User"}
        </Button>
      </div>
    </form>
  )
}
