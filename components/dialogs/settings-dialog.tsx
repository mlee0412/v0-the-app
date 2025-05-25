"use client"

import { useState, useEffect } from "react"
import {
  PlusIcon,
  Trash2Icon,
  SaveIcon,
  Users,
  FileText,
  LogOut,
  BookOpen,
  UserPlus,
  Edit,
  RefreshCw,
} from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserManual } from "@/components/system/user-manual"
import { ScrollArea } from "@/components/ui/scroll-area"
import { USER_ROLE_LABELS, type UserRole } from "@/types/user"
import supabaseAuthService from "@/services/supabase-auth-service"
import { useToast } from "@/hooks/use-toast"
import type { Server, NoteTemplate } from "@/components/system/billiards-timer-dashboard"
import { useAuth } from "@/contexts/auth-context"
import { AddUserDialog } from "@/components/admin/add-user-dialog"

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  servers: Server[]
  noteTemplates: NoteTemplate[]
  onUpdateServers: (servers: Server[]) => void
  onUpdateNoteTemplates: (templates: NoteTemplate[]) => void
  onShowUserManagement: () => void
  onShowLogs: () => void
  onLogout: () => void
  showAdminControls: boolean
}

export function SettingsDialog({
  open,
  onClose,
  servers,
  noteTemplates,
  onUpdateServers,
  onUpdateNoteTemplates,
  onShowUserManagement,
  onShowLogs,
  onLogout,
  showAdminControls,
}: SettingsDialogProps) {
  const { toast } = useToast()
  const { currentUser } = useAuth()
  const [selectedTab, setSelectedTab] = useState("servers")
  const [editedServers, setEditedServers] = useState<Server[]>([...servers])
  const [newServerName, setNewServerName] = useState("")
  const [editedTemplates, setEditedTemplates] = useState<NoteTemplate[]>([...noteTemplates])
  const [newTemplateText, setNewTemplateText] = useState("")

  // User management state
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [adminSubTab, setAdminSubTab] = useState("userList")
  const [searchTerm, setSearchTerm] = useState("")

  // Predefined server list
  const predefinedServers = ["Mike", "Ji", "Gun", "Alex", "Lucy", "Tanya", "Ian", "Rolando", "Alexa", "Diego", "BB"]

  // Initialize servers if empty
  useState(() => {
    if (editedServers.length === 0) {
      const initialServers = predefinedServers.map((name, index) => ({
        id: `server-${index + 1}`,
        name,
        enabled: true,
      }))
      setEditedServers(initialServers)
    }
  })

  // Fetch users when admin tab is selected
  useEffect(() => {
    if (selectedTab === "admin" && adminSubTab === "userList") {
      fetchUsers()
    }
  }, [selectedTab, adminSubTab])

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

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      USER_ROLE_LABELS[user.role as UserRole]?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Add new server
  const addServer = () => {
    if (newServerName.trim()) {
      const newServer: Server = {
        id: Date.now().toString(),
        name: newServerName.trim(),
        enabled: true,
      }
      setEditedServers([...editedServers, newServer])
      setNewServerName("")
    }
  }

  // Remove server
  const removeServer = (id: string) => {
    setEditedServers(editedServers.filter((server) => server.id !== id))
  }

  // Update server name
  const updateServerName = (id: string, name: string) => {
    setEditedServers(editedServers.map((server) => (server.id === id ? { ...server, name } : server)))
  }

  // Toggle server enabled state
  const toggleServerEnabled = (id: string) => {
    setEditedServers(
      editedServers.map((server) => (server.id === id ? { ...server, enabled: !server.enabled } : server)),
    )
  }

  // Add new template
  const addTemplate = () => {
    if (newTemplateText.trim()) {
      const newTemplate: NoteTemplate = {
        id: Date.now().toString(),
        text: newTemplateText.trim(),
      }
      setEditedTemplates([...editedTemplates, newTemplate])
      setNewTemplateText("")
    }
  }

  // Remove template
  const removeTemplate = (id: string) => {
    setEditedTemplates(editedTemplates.filter((template) => template.id !== id))
  }

  // Update template text
  const updateTemplateText = (id: string, text: string) => {
    setEditedTemplates(editedTemplates.map((template) => (template.id === id ? { ...template, text } : template)))
  }

  // Save changes
  const saveChanges = () => {
    if (selectedTab === "servers") {
      onUpdateServers(editedServers)
    } else if (selectedTab === "notes") {
      onUpdateNoteTemplates(editedTemplates)
    }
    onClose()
  }

  // Reset to predefined servers
  const resetToPredefinedServers = () => {
    const initialServers = predefinedServers.map((name, index) => ({
      id: `server-${index + 1}`,
      name,
      enabled: true,
    }))
    setEditedServers(initialServers)
  }

  // Reset to predefined note templates
  const resetToPredefinedTemplates = () => {
    const initialTemplates = [
      { id: "1", text: "VIP guest" },
      { id: "2", text: "Pay at front" },
      { id: "3", text: "Prepaid" },
      { id: "4", text: "Underage" },
      { id: "5", text: "Reservation" },
    ]
    setEditedTemplates(initialTemplates)
  }

  // User management functions
  const handleAddUser = async (userData: any) => {
    try {
      setLoading(true)
      await supabaseAuthService.addUser(userData)
      toast({
        title: "Success",
        description: "User added successfully",
      })
      setAdminSubTab("userList")
      fetchUsers()
    } catch (err) {
      console.error("Error adding user:", err)
      toast({
        title: "Error",
        description: "Failed to add user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (userData: any) => {
    if (!selectedUser) return

    try {
      setLoading(true)
      await supabaseAuthService.updateUser(selectedUser.id, userData)
      toast({
        title: "Success",
        description: "User updated successfully",
      })
      setSelectedUser(null)
      setAdminSubTab("userList")
      fetchUsers()
    } catch (err) {
      console.error("Error updating user:", err)
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
        variant: "destructive",
      })
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
      toast({
        title: "Success",
        description: "User deleted successfully",
      })
      fetchUsers()
    } catch (err) {
      console.error("Error deleting user:", err)
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog className="settings-dialog" open={open} onOpenChange={onClose}>
      <DialogContent
        className="dialog-content sm:max-w-[600px] bg-gray-900 text-white border-gray-700 max-h-[80vh] overflow-hidden flex flex-col"
        onInteractOutside={(e) => e.preventDefault()} // Prevent closing on outside click
        onEscapeKeyDown={(e) => e.preventDefault()} // Prevent closing on Escape key
      >
        {/* Remove the close button by adding a custom DialogHeader without it */}
        <div className="px-6 pt-6 pb-0">
          <h2 className="text-lg font-semibold text-cyan-400 flex justify-between items-center">
            <span>Settings</span>
            {currentUser && (
              <div className="px-2 py-0.5 rounded-lg bg-[#000033] border border-[#00FFFF] text-[#00FFFF] text-xs">
                {currentUser.name || "User"}
              </div>
            )}
          </h2>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid grid-cols-4 bg-gray-800 h-7">
            <TabsTrigger value="servers" className="data-[state=active]:bg-gray-700 h-7 text-xs">
              Servers
            </TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:bg-gray-700 h-7 text-xs">
              Note Templates
            </TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-gray-700 h-7 text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              User Manual
            </TabsTrigger>
            <TabsTrigger value="admin" className="data-[state=active]:bg-gray-700 h-7 text-xs">
              <Users className="h-3 w-3 mr-1" />
              Admin
            </TabsTrigger>
          </TabsList>

          <div className="dialog-body overflow-y-auto" style={{ maxHeight: "calc(80vh - 120px)" }}>
            <TabsContent value="servers" className="pt-2 pb-0 px-0 overflow-visible">
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-fuchsia-400">Server Management</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToPredefinedServers}
                    className="border-fuchsia-400 text-fuchsia-400 hover:bg-fuchsia-900/20 h-6 text-xs"
                  >
                    Reset
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1 mb-2">
                  {editedServers.map((server) => (
                    <div key={server.id} className="flex items-center gap-1 bg-gray-800 rounded p-1">
                      <Input
                        value={server.name}
                        onChange={(e) => updateServerName(server.id, e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white h-6 text-xs flex-1"
                      />
                      <Button
                        variant={server.enabled ? "default" : "outline"}
                        onClick={(e) => {
                          e.preventDefault()
                          toggleServerEnabled(server.id)
                        }}
                        className={`h-5 px-1 text-[9px] touch-manipulation active:scale-95 transition-all duration-75 ${
                          server.enabled
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "border-red-400 text-red-400 hover:bg-red-900/20"
                        }`}
                      >
                        {server.enabled ? "On" : "Off"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeServer(server.id)}
                        className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-900/20 p-0"
                      >
                        <Trash2Icon className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1 mb-2">
                  <Input
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    placeholder="New server name"
                    className="bg-gray-800 border-gray-700 text-white h-6 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={addServer}
                    disabled={!newServerName.trim()}
                    className="h-6 w-6 border-gray-700 bg-gray-800 hover:bg-gray-700 p-0"
                  >
                    <PlusIcon className="h-3 w-3" />
                  </Button>
                </div>
                {selectedTab === "servers" && (
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={saveChanges}
                      className="bg-lime-600 hover:bg-lime-700 flex items-center gap-1 h-7 text-xs"
                    >
                      <SaveIcon className="h-3 w-3" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="pt-2 pb-0 px-0 overflow-visible">
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-yellow-400">Note Templates</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToPredefinedTemplates}
                    className="border-yellow-400 text-yellow-400 hover:bg-yellow-900/20 h-6 text-xs"
                  >
                    Reset
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2 mb-2">
                  {editedTemplates.map((template) => (
                    <div key={template.id} className="flex items-center gap-1">
                      <Input
                        value={template.text}
                        onChange={(e) => updateTemplateText(template.id, e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white h-6 text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTemplate(template.id)}
                        className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-900/20 p-0"
                      >
                        <Trash2Icon className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1 mb-2">
                  <Input
                    value={newTemplateText}
                    onChange={(e) => setNewTemplateText(e.target.value)}
                    placeholder="New note template"
                    className="bg-gray-800 border-gray-700 text-white h-6 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={addTemplate}
                    disabled={!newTemplateText.trim()}
                    className="h-6 w-6 border-gray-700 bg-gray-800 hover:bg-gray-700 p-0"
                  >
                    <PlusIcon className="h-3 w-3" />
                  </Button>
                </div>
                {selectedTab === "notes" && (
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={saveChanges}
                      className="bg-lime-600 hover:bg-lime-700 flex items-center gap-1 h-7 text-xs"
                    >
                      <SaveIcon className="h-3 w-3" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="manual" className="pt-2 pb-0 px-0 overflow-visible">
              <UserManual />
            </TabsContent>

            <TabsContent value="admin" className="pt-2 pb-0 px-0 overflow-visible">
              {showAdminControls ? (
                <div className="space-y-4">
                  <Tabs value={adminSubTab} onValueChange={setAdminSubTab} className="w-full">
                    <TabsList className="grid grid-cols-2 bg-gray-800 h-7">
                      <TabsTrigger value="userList" className="data-[state=active]:bg-gray-700 h-7 text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        User List
                      </TabsTrigger>
                      <TabsTrigger value="userForm" className="data-[state=active]:bg-gray-700 h-7 text-xs">
                        <UserPlus className="h-3 w-3 mr-1" />
                        {selectedUser ? "Edit User" : "Add User"}
                      </TabsTrigger>
                    </TabsList>

                    <div className="mt-2">
                      {adminSubTab === "userList" ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="relative flex-1 max-w-sm">
                              <Input
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white h-7 text-xs"
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={fetchUsers}
                              disabled={loading}
                              className="border-cyan-500 text-cyan-500 hover:bg-cyan-950 h-7 text-xs"
                            >
                              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
                              Refresh
                            </Button>
                          </div>

                          {error && (
                            <div className="bg-red-900/30 border border-red-700 text-red-200 p-2 rounded-md flex items-center text-xs">
                              <p>{error}</p>
                            </div>
                          )}

                          <ScrollArea className="h-[300px] rounded-md border border-gray-700 bg-gray-800 p-2">
                            {loading && !users.length ? (
                              <div className="flex justify-center items-center h-full">
                                <div className="animate-pulse text-gray-400 text-xs">Loading users...</div>
                              </div>
                            ) : filteredUsers.length > 0 ? (
                              <div className="space-y-2">
                                {filteredUsers.map((user) => (
                                  <div
                                    key={user.id}
                                    className="p-2 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 transition-colors"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h3 className="font-medium text-white text-sm">{user.name}</h3>
                                        <p className="text-xs text-gray-400">{user.email || "No email"}</p>
                                        <div className="mt-1 flex items-center gap-1">
                                          <span
                                            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                              user.role === "admin" ||
                                              user.role === "controller" ||
                                              user.role === "manager"
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
                                      <div className="flex gap-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedUser(user)
                                            setAdminSubTab("userForm")
                                          }}
                                          className="h-6 border-cyan-500 text-cyan-500 hover:bg-cyan-950 text-xs"
                                        >
                                          <Edit className="h-3 w-3 mr-1" />
                                          Edit
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDeleteUser(user.id)}
                                          className="h-6 border-red-500 text-red-500 hover:bg-red-950 text-xs"
                                        >
                                          <Trash2Icon className="h-3 w-3 mr-1" />
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex justify-center items-center h-full">
                                <p className="text-gray-400 text-xs">
                                  {searchTerm
                                    ? "No users match your search"
                                    : "No users found. Add some users to get started."}
                                </p>
                              </div>
                            )}
                          </ScrollArea>

                          <div className="flex justify-between items-center mt-2">
                            <Button
                              onClick={() => {
                                setSelectedUser(null)
                                setAdminSubTab("userForm")
                              }}
                              className="bg-[#000033] hover:bg-[#000066] text-[#00FFFF] border border-[#00FFFF] flex items-center gap-1 h-7 text-xs"
                            >
                              <UserPlus className="h-3 w-3" />
                              <span>Add New User</span>
                            </Button>

                            <div className="flex gap-2">
                              <Button
                                onClick={onShowLogs}
                                className="bg-[#000033] hover:bg-[#000066] text-[#00FFFF] border border-[#00FFFF] flex items-center gap-1 h-7 text-xs"
                              >
                                <FileText className="h-3 w-3" />
                                <span>View Logs</span>
                              </Button>

                              <Button
                                onClick={onLogout}
                                className="bg-[#000033] hover:bg-[#000066] text-[#FF0000] border border-[#FF0000] flex items-center gap-1 h-7 text-xs"
                              >
                                <LogOut className="h-3 w-3" />
                                <span>Logout</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <AddUserDialog
                            open={true}
                            onClose={() => {
                              setSelectedUser(null)
                              setAdminSubTab("userList")
                            }}
                            onUserAdded={() => {
                              fetchUsers()
                              setSelectedUser(null)
                              setAdminSubTab("userList")
                            }}
                            editUser={selectedUser}
                          />
                        </div>
                      )}
                    </div>
                  </Tabs>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-400">
                  <p>You don't have admin privileges.</p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
