"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { UserList } from "@/components/admin/user-list"
import { UserForm } from "@/components/admin/user-form"
import { PlusIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import supabaseAuthService from "@/services/supabase-auth-service"
import type { User } from "@/services/user-service"

export function SupabaseUserManagement() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers()

    // Subscribe to user updates
    const unsubscribe = supabaseAuthService.subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers as User[])
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)

    try {
      const fetchedUsers = await supabaseAuthService.getUsers()
      console.log("Fetched users:", fetchedUsers)
      setUsers(fetchedUsers as User[])
    } catch (err: any) {
      console.error("Error fetching users:", err)
      setError(err)
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setIsAddingUser(true)
  }

  const handleEditUser = (user: User) => {
    console.log("Editing user:", user)
    setIsAddingUser(false)
    setEditingUser(user)
  }

  const handleFormClose = () => {
    setIsAddingUser(false)
    setEditingUser(null)
    fetchUsers()
  }

  return (
    <div className="p-2 space-y-4">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-cyan-400">User Management</h2>
          <Button onClick={handleAddUser} className="bg-[#00FFFF] hover:bg-[#00CCCC] text-black">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        <UserList users={users} loading={loading} onEditUser={handleEditUser} onRefresh={fetchUsers} />

        {(isAddingUser || editingUser) && (
          <UserForm user={editingUser} isOpen={isAddingUser || !!editingUser} onClose={handleFormClose} />
        )}
      </div>
    </div>
  )
}
