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
  Loader2,
  Settings,
  AlertTriangle,
  Bell,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserManual } from "@/components/user-manual"
import { NotificationSettings } from "@/components/notification-settings"
import type { Server, NoteTemplate } from "@/components/billiards-timer-dashboard"
import { useAuth } from "@/contexts/auth-context"
import { getUsers } from "@/actions/user-actions"
import type { User } from "@/types/user"

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
  const { currentUser } = useAuth()
  const [selectedTab, setSelectedTab] = useState("servers")
  const [editedServers, setEditedServers] = useState<Server[]>([...servers])
  const [newServerName, setNewServerName] = useState("")
  const [editedTemplates, setEditedTemplates] = useState<NoteTemplate[]>([...noteTemplates])
  const [newTemplateText, setNewTemplateText] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [warningDialogOpen, setWarningDialogOpen] = useState(false)
  const [warningMessage, setWarningMessage] = useState("")

  // Check if user has admin privileges
  const hasAdminAccess =
    currentUser?.role === "admin" || currentUser?.role === "controller" || currentUser?.role === "manager"

  // Fetch users from database
  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open])

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const fetchedUsers = await getUsers()
      setUsers(fetchedUsers)

      // Update servers list based on users
      const updatedServers = fetchedUsers.map((user) => ({
        id: user.id,
        name: user.name,
        enabled: servers.some((s) => s.id === user.id)
          ? servers.find((s) => s.id === user.id)?.enabled || false
          : user.role !== "viewer", // Default enable all non-viewers
      }))

      setEditedServers(updatedServers)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

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
    if (!hasAdminAccess) {
      showWarning("Only administrators, controllers, and managers can change server status.")
      return
    }

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

  // Handle admin actions with permission check
  const handleAdminAction = (action: () => void, actionName: string) => {
    if (!hasAdminAccess) {
      showWarning(`Only administrators, controllers, and managers can ${actionName}.`)
      return
    }

    onClose() // Close settings dialog first
    action() // Then perform the action
  }

  // Show warning dialog
  const showWarning = (message: string) => {
    setWarningMessage(message)
    setWarningDialogOpen(true)
  }

  return (
    <>
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

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full flex flex-col h-full">
            <TabsList className="grid grid-cols-5 bg-gray-800 h-7">
              <TabsTrigger value="servers" className="data-[state=active]:bg-gray-700 h-7 text-xs">
                Servers
              </TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:bg-gray-700 h-7 text-xs">
                Notes
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-gray-700 h-7 text-xs">
                <Bell className="h-3 w-3 mr-1" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="manual" className="data-[state=active]:bg-gray-700 h-7 text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                Manual
              </TabsTrigger>
              {/* Only show admin tab for users with appropriate roles */}
              {hasAdminAccess && showAdminControls && (
                <TabsTrigger value="admin" className="data-[state=active]:bg-gray-700 h-7 text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  Admin
                </TabsTrigger>
              )}
            </TabsList>

            <div className="dialog-body flex-1 overflow-hidden flex flex-col">
              <TabsContent value="servers" className="pt-2 pb-0 px-0 overflow-hidden flex-1 flex flex-col">
                <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-fuchsia-400">Server Management</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchUsers}
                      className="border-fuchsia-400 text-fuchsia-400 hover:bg-fuchsia-900/20 h-6 text-xs"
                    >
                      Refresh
                    </Button>
                  </div>

                  <div className="flex-1 overflow-auto pr-1 mb-2">
                    {loadingUsers ? (
                      <div className="flex justify-center items-center h-[200px]">
                        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {editedServers.map((server) => {
                          // Find the corresponding user to get their role
                          const user = users.find((u) => u.id === server.id)
                          const userRole = user?.role || "viewer"

                          return (
                            <div key={server.id} className="flex items-center gap-1 bg-gray-800 rounded p-1">
                              <div className="flex-1 flex items-center">
                                <span className="text-white text-sm">{server.name}</span>
                                {userRole && (
                                  <span
                                    className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                      userRole === "admin"
                                        ? "bg-purple-900 text-purple-200"
                                        : userRole === "server"
                                          ? "bg-blue-900 text-blue-200"
                                          : "bg-gray-700 text-gray-300"
                                    }`}
                                  >
                                    {userRole}
                                  </span>
                                )}
                              </div>
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
                                } ${!hasAdminAccess ? "opacity-50" : ""}`}
                              >
                                {server.enabled ? "Active" : "Inactive"}
                              </Button>
                            </div>
                          )
                        })}

                        {editedServers.length === 0 && !loadingUsers && (
                          <div className="text-center py-4 text-gray-400 text-sm">
                            No servers found. Add users in User Management.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {hasAdminAccess && (
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
                  )}
                </div>
              </TabsContent>

              <TabsContent value="notes" className="pt-2 pb-0 px-0 overflow-hidden flex-1 flex flex-col">
                <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
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

                  <div className="flex-1 overflow-auto grid grid-cols-1 gap-2 mb-2 pr-1">
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
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="pt-4 pb-0 px-4 overflow-auto flex-1">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-cyan-400 mb-3">Notification Settings</h3>
                  <NotificationSettings />
                </div>
              </TabsContent>

              <TabsContent value="manual" className="pt-2 pb-0 px-0 overflow-auto flex-1">
                <UserManual />
              </TabsContent>

              {/* Admin Tab - Only rendered if user has access */}
              {hasAdminAccess && (
                <TabsContent value="admin" className="pt-2 pb-0 px-0 overflow-auto flex-1">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-cyan-400 mb-3">Admin Controls</h3>
                      <div className="grid grid-cols-1 gap-3">
                        <Button
                          onClick={() => handleAdminAction(onShowUserManagement, "access user management")}
                          className="bg-[#000033] hover:bg-[#000066] text-[#FF00FF] border border-[#FF00FF] flex items-center justify-center gap-2 h-10"
                        >
                          <Users className="h-4 w-4" />
                          <span>User Management</span>
                        </Button>
                        <Button
                          onClick={() => handleAdminAction(onShowLogs, "view system logs")}
                          className="bg-[#000033] hover:bg-[#000066] text-[#00FFFF] border border-[#00FFFF] flex items-center justify-center gap-2 h-10"
                        >
                          <FileText className="h-4 w-4" />
                          <span>View System Logs</span>
                        </Button>
                        <Button
                          onClick={onLogout}
                          className="bg-[#000033] hover:bg-[#000066] text-[#FF0000] border border-[#FF0000] flex items-center justify-center gap-2 h-10 mt-4"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Logout</span>
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-gray-800 rounded-md border border-gray-700">
                      <h4 className="text-sm font-medium text-amber-400 mb-2">System Information</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-gray-400">User:</div>
                        <div className="text-white">{currentUser?.name || "Unknown"}</div>
                        <div className="text-gray-400">Role:</div>
                        <div className="text-white">{currentUser?.role || "Unknown"}</div>
                        <div className="text-gray-400">Version:</div>
                        <div className="text-white">1.5.2</div>
                        <div className="text-gray-400">Database:</div>
                        <div className="text-white">Connected</div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}
            </div>

            <DialogFooter className="dialog-footer flex flex-row gap-1 pt-2 mt-auto shrink-0">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-700 bg-gray-800 hover:bg-gray-700 text-white h-7 text-xs"
              >
                Cancel
              </Button>
              {(selectedTab === "servers" || selectedTab === "notes") && (
                <Button
                  onClick={saveChanges}
                  className="bg-lime-600 hover:bg-lime-700 flex items-center gap-1 h-7 text-xs"
                >
                  <SaveIcon className="h-3 w-3" />
                  Save Changes
                </Button>
              )}
            </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Warning Dialog for unauthorized actions */}
      <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
        <DialogContent className="bg-gray-900 border-red-500 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-400">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Permission Denied
            </DialogTitle>
            <DialogDescription className="text-gray-300">{warningMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setWarningDialogOpen(false)} className="bg-red-600 hover:bg-red-700 text-white">
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
