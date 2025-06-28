"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NumberPad } from "@/components/auth/number-pad"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AddUserDialogProps {
  open: boolean
  onClose: () => void
  onUserAdded?: () => void
  editUser?: any // Add this prop for editing existing users
}

export function AddUserDialog({ open, onClose, onUserAdded, editUser }: AddUserDialogProps) {
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [nativeLanguage, setNativeLanguage] = useState("English")
  const [pinCode, setPinCode] = useState("")
  const [role, setRole] = useState("")
  const [roles, setRoles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [error, setError] = useState("")
  const [showPinPad, setShowPinPad] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // Fetch roles when dialog opens
  useEffect(() => {
    if (open) {
      fetchRoles()

      // If we have an editUser, populate the form with their data
      if (editUser) {
        setIsEditMode(true)
        setName(
          editUser.name ||
            editUser.first_name ||
            editUser.display_name ||
            "",
        )
        setPhone(editUser.phone || "")
        setNativeLanguage(editUser.native_language || "English")
        setPinCode(editUser.pin_code || "")
        setRole(editUser.role || "")
      } else {
        resetForm()
        setIsEditMode(false)
      }
    }
  }, [open, editUser])

  const resetForm = () => {
    setName("")
    setPhone("")
    setNativeLanguage("English")
    setPinCode("")
    setRole("")
    setError("")
    setShowPinPad(false)
  }

  const fetchRoles = async () => {
    try {
      setIsLoadingRoles(true)
      const response = await fetch("/api/staff/roles")
      if (!response.ok) {
        throw new Error("Failed to fetch roles")
      }
      const data = await response.json()
      setRoles(data)
    } catch (err) {
      console.error("Error fetching roles:", err)
      toast({
        title: "Error",
        description: "Failed to load roles. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingRoles(false)
    }
  }

  const handleSubmit = async () => {
    // Validate inputs
    if (!name.trim()) {
      setError("Name is required")
      return
    }

    if (!pinCode || pinCode.length !== 4 || !/^\d+$/.test(pinCode)) {
      setError("PIN code must be exactly 4 digits")
      return
    }

    if (!role) {
      setError("Please select a role")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const userData = {
        name,
        phone,
        native_language: nativeLanguage,
        pin_code: pinCode,
        role,
      }

      let response

      if (isEditMode && editUser) {
        // Update existing user
        response = await fetch(`/api/staff/members/${editUser.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        })
      } else {
        // Create new user
        response = await fetch("/api/staff/members", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        })
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || (isEditMode ? "Failed to update user" : "Failed to create user"))
      }

      toast({
        title: "Success",
        description: isEditMode ? "User updated successfully" : "User created successfully",
      })

      resetForm()
      onClose()
      if (onUserAdded) onUserAdded()
    } catch (err: any) {
      console.error(isEditMode ? "Error updating user:" : "Error creating user:", err)
      setError(
        err.message ||
          (isEditMode ? "Failed to update user. Please try again." : "Failed to create user. Please try again."),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] bg-black text-white border-[#00FFFF] space-theme font-mono overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#00FFFF]">{isEditMode ? "Edit User" : "Add New User"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto pr-2">
          <div className="space-y-4 py-4 mb-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="bg-[#000033] border-[#00FFFF] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number"
                inputMode="numeric"
                className="bg-[#000033] border-[#00FFFF] text-white"
              />
              <p className="text-sm text-gray-400">Leave blank if not available.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nativeLanguage">Native Language</Label>
              <Select value={nativeLanguage} onValueChange={setNativeLanguage}>
                <SelectTrigger className="bg-[#000033] border-[#00FFFF] text-white">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent className="bg-[#000033] border-[#00FFFF] text-white">
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="Chinese">Chinese</SelectItem>
                  <SelectItem value="Korean">Korean</SelectItem>
                  <SelectItem value="Japanese">Japanese</SelectItem>
                  <SelectItem value="Vietnamese">Vietnamese</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pinCode">PIN Code (4 digits)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="pinCode"
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
                  <NumberPad
                    value={pinCode}
                    onChange={setPinCode}
                    maxLength={4}
                    onClose={() => setShowPinPad(false)}
                    showLoginButton={false}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="bg-[#000033] border-[#00FFFF] text-white">
                  <SelectValue placeholder={isLoadingRoles ? "Loading roles..." : "Select role"} />
                </SelectTrigger>
                <SelectContent className="bg-[#000033] border-[#00FFFF] text-white max-h-[300px]">
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.role_name}>
                      {role.role_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="p-2 bg-red-900/30 border border-red-800 rounded-md">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="bg-[#00FFFF] hover:bg-[#00CCCC] text-black">
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isEditMode ? "Updating User..." : "Creating User..."}
              </div>
            ) : isEditMode ? (
              "Update User"
            ) : (
              "Create User"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
