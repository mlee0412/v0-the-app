"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ShieldIcon } from "lucide-react"
import userService, { type User, type UserRole, type Permission, DEFAULT_PERMISSIONS } from "@/services/user-service"
import { SupabaseUserManagement } from "@/components/admin/supabase-user-management"

interface UserManagementDialogProps {
  open: boolean
  onClose: () => void
}

const SupabaseUserManagementPlaceholder = () => {
  return (
    <div>
      {/* Supabase User Management Component Content */}
      <p>Supabase User Management Component</p>
    </div>
  )
}

export function UserManagementDialog({ open, onClose }: UserManagementDialogProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedTab, setSelectedTab] = useState("users")
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newRole, setNewRole] = useState<UserRole>("viewer")
  const [newName, setNewName] = useState("")
  const [permissions, setPermissions] = useState<Permission>(DEFAULT_PERMISSIONS.viewer)
  const [error, setError] = useState("")

  // Load users on open
  useEffect(() => {
    if (open) {
      setUsers(userService.getUsers())
      resetForm()
    }
  }, [open])

  const resetForm = () => {
    setEditingUser(null)
    setNewUsername("")
    setNewPassword("")
    setNewRole("viewer")
    setNewName("")
    setPermissions(DEFAULT_PERMISSIONS.viewer)
    setError("")
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setNewUsername(user.username)
    setNewPassword("") // Don't show existing password
    setNewRole(user.role)
    setNewName(user.name)
    setPermissions(user.permissions || DEFAULT_PERMISSIONS[user.role])
  }

  const handleRoleChange = (role: UserRole) => {
    setNewRole(role)
    // Update permissions based on role
    setPermissions(DEFAULT_PERMISSIONS[role])
  }

  const handlePermissionChange = (permission: keyof Permission, value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: value,
    }))
  }

  const handleSaveUser = () => {
    if (!newUsername || !newName) {
      setError("Username and name are required")
      return
    }

    // Check if username is already taken (except by the current editing user)
    const existingUser = userService.getUserByUsername(newUsername)
    if (existingUser && existingUser.id !== editingUser?.id) {
      setError("Username already exists")
      return
    }

    if (editingUser) {
      // Update existing user
      const updatedUser: User = {
        ...editingUser,
        username: newUsername,
        name: newName,
        role: newRole,
        permissions,
      }

      // Only update password if a new one is provided
      if (newPassword) {
        updatedUser.password = newPassword
      }

      userService.updateUser(updatedUser)
    } else {
      // Create new user
      if (!newPassword) {
        setError("Password is required for new users")
        return
      }

      const newUser: User = {
        id: Date.now().toString(),
        username: newUsername,
        password: newPassword,
        name: newName,
        role: newRole,
        permissions,
      }

      userService.addUser(newUser)
    }

    // Refresh users list
    setUsers(userService.getUsers())
    resetForm()
  }

  const handleDeleteUser = (userId: string) => {
    userService.deleteUser(userId)
    setUsers(userService.getUsers())
    if (editingUser?.id === userId) {
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] bg-gray-900 text-white border-gray-700 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl text-cyan-400 flex items-center gap-2">
            <ShieldIcon className="h-6 w-6" />
            User Management
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1">
          <SupabaseUserManagement />
        </div>

        <DialogFooter className="mt-4 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-700 bg-gray-800 hover:bg-gray-700 text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
