"use client"

import { useState } from "react"
import { PlusIcon, Trash2Icon, SaveIcon, Users, FileText, LogOut, BookOpen } from "lucide-react"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserManual } from "@/components/user-manual"
import type { Server, NoteTemplate } from "@/components/billiards-timer-dashboard"
import { useAuth } from "@/contexts/auth-context"
// import { MenuDataUpload } from "@/components/menu-data-upload" // Removed

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
  // const [showMenuDataUpload, setShowMenuDataUpload] = useState(false) // Removed

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

  const isAdmin = currentUser?.email === "admin@example.com"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[600px] bg-gray-900 text-white border-gray-700 max-h-[80vh] overflow-hidden flex flex-col"
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
          <TabsList className="grid grid-cols-3 bg-gray-800 h-7">
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
          </TabsList>

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

              {/* Admin controls in server tab */}
              {showAdminControls && (
                <div className="pt-3 mt-1 border-t border-gray-700 space-y-2">
                  <h3 className="text-sm font-medium text-cyan-400">Admin Controls</h3>
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      onClick={() => {
                        onClose() // Close settings dialog first
                        onShowUserManagement() // Then show user management
                      }}
                      className="bg-[#000033] hover:bg-[#000066] text-[#FF00FF] border border-[#FF00FF] flex items-center gap-1 h-6 text-xs"
                    >
                      <Users className="h-3 w-3" />
                      <span>User Management</span>
                    </Button>
                    <Button
                      onClick={onShowLogs}
                      className="bg-[#000033] hover:bg-[#000066] text-[#00FFFF] border border-[#00FFFF] flex items-center gap-1 h-6 text-xs"
                    >
                      <FileText className="h-3 w-3" />
                      <span>View Logs</span>
                    </Button>
                    <Button
                      onClick={onLogout}
                      className="bg-[#000033] hover:bg-[#000066] text-[#FF0000] border border-[#FF0000] flex items-center gap-1 col-span-2 h-6 text-xs"
                    >
                      <LogOut className="h-3 w-3" />
                      <span>Logout</span>
                    </Button>
                  </div>
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
            </div>
          </TabsContent>

          <TabsContent value="manual" className="pt-2 pb-0 px-0 overflow-visible">
            <UserManual />
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-row gap-1 pt-2 mt-auto shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-700 bg-gray-800 hover:bg-gray-700 text-white h-7 text-xs"
          >
            Cancel
          </Button>
          {selectedTab !== "manual" && (
            <Button onClick={saveChanges} className="bg-lime-600 hover:bg-lime-700 flex items-center gap-1 h-7 text-xs">
              <SaveIcon className="h-3 w-3" />
              Save Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
