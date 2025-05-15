"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Users, RefreshCw, AlertCircle } from "lucide-react"
import { UserForm } from "@/components/admin/user-form"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { USER_ROLE_LABELS, type UserRole } from "@/types/user"
import supabaseAuthService from "@/services/supabase-auth-service"

export function SupabaseUserManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("users")
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Fetch users on component mount and when refreshTrigger changes
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const fetchedUsers = await supabaseAuthService.getUsers()
        setUsers(fetchedUsers)
        setError(null)
      } catch (err) {
        console.error("Error fetching users:", err)
        setError("Failed to load users. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [refreshTrigger])

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      USER_ROLE_LABELS[user.role as UserRole]?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddUser = async (userData: any) => {
    try {
      setLoading(true)
      await supabaseAuthService.addUser(userData)
      setShowAddForm(false)
      setRefreshTrigger((prev) => prev + 1) // Trigger refresh
    } catch (err) {
      console.error("Error adding user:", err)
      setError("Failed to add user. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (userData: any) => {
    if (!selectedUser) return

    try {
      setLoading(true)
      await supabaseAuthService.updateUser(selectedUser.id, userData)
      setSelectedUser(null)
      setRefreshTrigger((prev) => prev + 1) // Trigger refresh
    } catch (err) {
      console.error("Error updating user:", err)
      setError("Failed to update user. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    try {
      setLoading(true)
      await supabaseAuthService.deleteUser(userId)
      if (selectedUser?.id === userId) {
        setSelectedUser(null)
      }
      setRefreshTrigger((prev) => prev + 1) // Trigger refresh
    } catch (err) {
      console.error("Error deleting user:", err)
      setError("Failed to delete user. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const refreshUsers = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 bg-gray-800 h-8">
          <TabsTrigger value="users" className="data-[state=active]:bg-gray-700 h-8">
            <Users className="h-4 w-4 mr-2" />
            User List
          </TabsTrigger>
          <TabsTrigger value="add" className="data-[state=active]:bg-gray-700 h-8">
            <UserPlus className="h-4 w-4 mr-2" />
            {selectedUser ? "Edit User" : "Add User"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshUsers}
              disabled={loading}
              className="border-cyan-500 text-cyan-500 hover:bg-cyan-950"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded-md flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <ScrollArea className="h-[400px] rounded-md border border-gray-700 bg-gray-800 p-4">
            {loading && !users.length ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-pulse text-gray-400">Loading users...</div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-white">{user.name}</h3>
                        <p className="text-sm text-gray-400">{user.email || "No email"}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              user.role === "admin" || user.role === "controller" || user.role === "manager"
                                ? "bg-purple-900/50 text-purple-300 border border-purple-700"
                                : user.role === "server" ||
                                    user.role === "bartender" ||
                                    user.role === "barback" ||
                                    user.role === "kitchen" ||
                                    user.role === "security" ||
                                    user.role === "karaoke_main" ||
                                    user.role === "karaoke_staff"
                                  ? "bg-blue-900/50 text-blue-300 border border-blue-700"
                                  : "bg-gray-800 text-gray-300 border border-gray-600"
                            }`}
                          >
                            {USER_ROLE_LABELS[user.role as UserRole] || user.role}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user)
                            setActiveTab("add")
                          }}
                          className="h-8 border-cyan-500 text-cyan-500 hover:bg-cyan-950"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="h-8 border-red-500 text-red-500 hover:bg-red-950"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-full">
                <p className="text-gray-400">
                  {searchTerm ? "No users match your search" : "No users found. Add some users to get started."}
                </p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="add" className="space-y-4 mt-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-medium text-cyan-400 mb-4">{selectedUser ? "Edit User" : "Add New User"}</h2>
            <UserForm
              initialData={selectedUser}
              onSubmit={selectedUser ? handleUpdateUser : handleAddUser}
              onCancel={() => {
                setSelectedUser(null)
                setActiveTab("users")
              }}
              isLoading={loading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
