"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, Trash2, Edit, Key } from "lucide-react"
import { createUser, getUsers, updateUser, deleteUser, getRoles } from "@/actions/user-actions"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { PermissionsForm } from "./permissions-form"
import type { User } from "@/types/user"

// Changed from default export to named export
export function SupabaseUserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editFormOpen, setEditFormOpen] = useState(false)
  const [passwordFormOpen, setPasswordFormOpen] = useState(false)
  const [permissionsFormOpen, setPermissionsFormOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    role: "staff",
    pin_code: "",
  })
  const [editData, setEditData] = useState({
    id: "",
    name: "",
    username: "",
    role: "",
  })
  const [passwordData, setPasswordData] = useState({
    id: "",
    pin_code: "",
  })

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await getUsers()
      setUsers(data)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const data = await getRoles()
      setRoles(data)
    } catch (error) {
      console.error("Error fetching roles:", error)
      toast({
        title: "Error",
        description: "Failed to load roles. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value }))
  }

  const handleEditRoleChange = (value: string) => {
    setEditData((prev) => ({ ...prev, role: value }))
  }

  const validatePinCode = (code: string) => {
    return /^\d{4}$/.test(code)
  }

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.pin_code && !validatePinCode(formData.pin_code)) {
      toast({
        title: "Invalid PIN Code",
        description: "PIN code must be exactly 4 digits",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      console.log("Creating user with data:", formData)
      const user = await createUser(formData)
      console.log("User created:", user)
      toast({
        title: "Success",
        description: "User created successfully",
      })
      setFormOpen(false)
      setFormData({
        name: "",
        username: "",
        email: "",
        role: "staff",
        pin_code: "",
      })
      fetchUsers()
    } catch (error: any) {
      console.error("Error saving user:", error)
      toast({
        title: "Error",
        description: `Error saving user: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      await updateUser({
        id: editData.id,
        name: editData.name,
        username: editData.username,
        role: editData.role,
      })
      toast({
        title: "Success",
        description: "User updated successfully",
      })
      setEditFormOpen(false)
      fetchUsers()
    } catch (error: any) {
      console.error("Error updating user:", error)
      toast({
        title: "Error",
        description: `Error updating user: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePinCode(passwordData.pin_code)) {
      toast({
        title: "Invalid PIN Code",
        description: "PIN code must be exactly 4 digits",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      await updateUser({
        id: passwordData.id,
        name: selectedUser?.name || "",
        username: selectedUser?.username || "",
        role: selectedUser?.role || "",
        pin_code: passwordData.pin_code,
        changingPassword: true,
      })
      toast({
        title: "Success",
        description: "Password updated successfully",
      })
      setPasswordFormOpen(false)
      setPasswordData({
        id: "",
        pin_code: "",
      })
    } catch (error: any) {
      console.error("Error updating password:", error)
      toast({
        title: "Error",
        description: `Error updating password: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    try {
      setLoading(true)
      await deleteUser(id)
      toast({
        title: "Success",
        description: "User deleted successfully",
      })
      fetchUsers()
    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: `Error deleting user: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openEditForm = (user: User) => {
    setSelectedUser(user)
    setEditData({
      id: user.id,
      name: user.name || "",
      username: user.username || "",
      role: user.role || "",
    })
    setEditFormOpen(true)
  }

  const openPasswordForm = (user: User) => {
    setSelectedUser(user)
    setPasswordData({
      id: user.id,
      pin_code: "",
    })
    setPasswordFormOpen(true)
  }

  const openPermissionsForm = (user: User) => {
    setSelectedUser(user)
    setPermissionsFormOpen(true)
  }

  const getRoleName = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId)
    return role ? role.name : "Unknown"
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>Create a new user account.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitUser}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">
                    Username
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <Select value={formData.role} onValueChange={handleRoleChange}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pin_code" className="text-right">
                    PIN Code
                  </Label>
                  <Input
                    id="pin_code"
                    name="pin_code"
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    value={formData.pin_code}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="4-digit PIN"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage user accounts and permissions.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && users.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Username</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{user.name}</td>
                      <td className="py-3 px-4">{user.username}</td>
                      <td className="py-3 px-4">
                        {user.roleData
                          ? user.roleData.name.charAt(0).toUpperCase() + user.roleData.name.slice(1)
                          : user.role_id
                            ? getRoleName(user.role_id)
                            : user.role}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => openEditForm(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => openPasswordForm(user)}>
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => openPermissionsForm(user)}>
                            <span className="text-xs font-bold">P</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the user {user.name}. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editFormOpen} onOpenChange={setEditFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={editData.name}
                  onChange={handleEditInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-username" className="text-right">
                  Username
                </Label>
                <Input
                  id="edit-username"
                  name="username"
                  value={editData.username}
                  onChange={handleEditInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">
                  Role
                </Label>
                <Select value={editData.role} onValueChange={handleEditRoleChange}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordFormOpen} onOpenChange={setPasswordFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change PIN Code</DialogTitle>
            <DialogDescription>Update user's PIN code.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pin_code" className="text-right">
                  New PIN
                </Label>
                <Input
                  id="pin_code"
                  name="pin_code"
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  value={passwordData.pin_code}
                  onChange={handlePasswordInputChange}
                  className="col-span-3"
                  placeholder="4-digit PIN"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update PIN"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permissionsFormOpen} onOpenChange={setPermissionsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>User Permissions</DialogTitle>
            <DialogDescription>Manage permissions for {selectedUser?.name}.</DialogDescription>
          </DialogHeader>
          {selectedUser && <PermissionsForm userId={selectedUser.id} onSaved={() => setPermissionsFormOpen(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Also add a default export that exports the named function
// This allows both import styles to work
export default SupabaseUserManagement
