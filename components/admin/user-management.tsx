"use client"

/**
 * @deprecated This component has been replaced by SupabaseUserManagement
 * Please use components/admin/supabase-user-management.tsx instead
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { UserList } from "@/components/admin/user-list"
import { UserForm } from "@/components/admin/user-form"
import { useUsers } from "@/hooks/use-users"
import { PlusIcon } from "lucide-react"
import type { User } from "@/types/user"

export function UserManagement() {
  console.warn("UserManagement is deprecated. Please use SupabaseUserManagement instead.")

  // Redirect to the new component implementation
  const { users, loading, error, refreshUsers } = useUsers()
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const handleAddUser = () => {
    setEditingUser(null)
    setIsAddingUser(true)
  }

  const handleEditUser = (user: User) => {
    setIsAddingUser(false)
    setEditingUser(user)
  }

  const handleFormClose = () => {
    setIsAddingUser(false)
    setEditingUser(null)
    refreshUsers()
  }

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive rounded-lg">
        <h3 className="text-lg font-medium text-destructive">Error loading users</h3>
        <p className="mt-1">{error.message}</p>
        <Button variant="outline" className="mt-4" onClick={refreshUsers}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Users</h2>
        <Button onClick={handleAddUser}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <UserList users={users} loading={loading} onEditUser={handleEditUser} onRefresh={refreshUsers} />

      {(isAddingUser || editingUser) && (
        <UserForm user={editingUser} isOpen={isAddingUser || !!editingUser} onClose={handleFormClose} />
      )}
    </div>
  )
}
