"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NumberPad } from "@/components/number-pad"
import { Loader2, AlertCircle } from "lucide-react"
import { getRoles } from "@/actions/user-actions"

export function UserForm({ initialData = null, onSubmit, onCancel, isLoading = false }) {
  const [name, setName] = useState(initialData?.name || "")
  const [username, setUsername] = useState(initialData?.username || "")
  const [role, setRole] = useState(initialData?.role || "")
  const [pinCode, setPinCode] = useState("")
  const [showPinPad, setShowPinPad] = useState(false)
  const [changingPassword, setChangingPassword] = useState(!initialData)
  const [roles, setRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    async function loadRoles() {
      try {
        const fetchedRoles = await getRoles()
        setRoles(fetchedRoles)
      } catch (error) {
        console.error("Failed to load roles:", error)
      } finally {
        setRolesLoading(false)
      }
    }

    loadRoles()
  }, [])

  const validateForm = () => {
    const errors = {}

    if (!name.trim()) {
      errors.name = "Name is required"
    }

    if (!username.trim()) {
      errors.username = "Username is required"
    } else if (username.includes(" ")) {
      errors.username = "Username cannot contain spaces"
    }

    if (!role) {
      errors.role = "Role is required"
    }

    if ((!initialData || changingPassword) && (!pinCode || pinCode.length !== 4)) {
      errors.pinCode = "PIN code must be exactly 4 digits"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    onSubmit({
      name,
      username,
      role,
      pin_code: changingPassword ? pinCode : undefined,
      changingPassword,
    })
  }

  // Format role name for display
  const formatRoleName = (name) => {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className={validationErrors.name ? "text-red-400" : ""}>
            Display Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (validationErrors.name) {
                setValidationErrors((prev) => ({ ...prev, name: "" }))
              }
            }}
            className={`bg-gray-800 border-${validationErrors.name ? "red-500" : "gray-700"}`}
          />
          {validationErrors.name && (
            <p className="text-sm text-red-400 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {validationErrors.name}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="username" className={validationErrors.username ? "text-red-400" : ""}>
            Username
          </Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              if (validationErrors.username) {
                setValidationErrors((prev) => ({ ...prev, username: "" }))
              }
            }}
            className={`bg-gray-800 border-${validationErrors.username ? "red-500" : "gray-700"}`}
          />
          {validationErrors.username && (
            <p className="text-sm text-red-400 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {validationErrors.username}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role" className={validationErrors.role ? "text-red-400" : ""}>
            Role
          </Label>
          {rolesLoading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
              <span className="text-sm text-gray-400">Loading roles...</span>
            </div>
          ) : (
            <Select
              value={role}
              onValueChange={(value) => {
                setRole(value)
                if (validationErrors.role) {
                  setValidationErrors((prev) => ({ ...prev, role: "" }))
                }
              }}
            >
              <SelectTrigger className={`bg-gray-800 border-${validationErrors.role ? "red-500" : "gray-700"}`}>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {roles.length > 0 ? (
                  roles.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      {formatRoleName(r.name)}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="controller">Controller</SelectItem>
                    <SelectItem value="bartender">Bartender</SelectItem>
                    <SelectItem value="barback">Barback</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="karaoke_main">Karaoke Main</SelectItem>
                    <SelectItem value="karaoke_staff">Karaoke Staff</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          )}
          {validationErrors.role && (
            <p className="text-sm text-red-400 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {validationErrors.role}
            </p>
          )}
        </div>

        {initialData && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="changePassword"
              checked={changingPassword}
              onChange={(e) => setChangingPassword(e.target.checked)}
              className="rounded bg-gray-800 border-gray-700 text-cyan-500 focus:ring-cyan-500"
            />
            <Label htmlFor="changePassword" className="text-sm">
              Change PIN code
            </Label>
          </div>
        )}

        {(!initialData || changingPassword) && (
          <div className="space-y-2">
            <Label htmlFor="pinCode" className={validationErrors.pinCode ? "text-red-400" : ""}>
              PIN Code (4 digits)
            </Label>
            <div className="flex gap-2">
              <Input
                id="pinCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={pinCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 4)
                  setPinCode(value)
                  if (validationErrors.pinCode) {
                    setValidationErrors((prev) => ({ ...prev, pinCode: "" }))
                  }
                }}
                className={`bg-gray-800 border-${validationErrors.pinCode ? "red-500" : "gray-700"}`}
                placeholder="Enter 4-digit PIN"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPinPad(!showPinPad)}
                className="bg-gray-800 border-gray-700"
              >
                {showPinPad ? "Hide" : "Keypad"}
              </Button>
            </div>
            {validationErrors.pinCode && (
              <p className="text-sm text-red-400 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {validationErrors.pinCode}
              </p>
            )}
            {showPinPad && (
              <div className="mt-2">
                <NumberPad
                  value={pinCode}
                  onChange={(value) => {
                    setPinCode(value)
                    if (validationErrors.pinCode) {
                      setValidationErrors((prev) => ({ ...prev, pinCode: "" }))
                    }
                  }}
                  maxLength={4}
                  onClose={() => setShowPinPad(false)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-700 text-white">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {initialData ? "Updating..." : "Creating..."}
            </>
          ) : initialData ? (
            "Update User"
          ) : (
            "Create User"
          )}
        </Button>
      </div>
    </form>
  )
}
