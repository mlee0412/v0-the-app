"use client";

import React, { useState, useEffect } from "react";
import {
  PlusIcon,
  Trash2Icon,
  SaveIcon,
  Users,
  FileText,
  BookOpen,
  UserPlus,
  Bell,
  Eye,
  Volume2,
  Palette,
  Maximize as MaximizeIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManual } from "@/components/system/user-manual";
import { ScrollArea } from "@/components/ui/scroll-area";
import { USER_ROLE_LABELS, type UserRole } from "@/types/user";
import supabaseAuthService from "@/services/supabase-auth-service";
import { useToast } from "@/hooks/use-toast";
import type { Server, NoteTemplate, SystemSettings as DashboardSystemSettings } from "@/components/system/billiards-timer-dashboard";
import { useAuth } from "@/contexts/auth-context";
import { AddUserDialog } from "@/components/admin/add-user-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PushNotificationManager } from "@/components/notifications/push-notification-manager";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAnimation } from "@/contexts/animation-context";

interface SettingsDialogProps {
  open: boolean,
  onClose: () => void,
  servers: Server[],
  noteTemplates: NoteTemplate[],
  onUpdateServers: (servers: Server[]) => void,
  onUpdateNoteTemplates: (templates: NoteTemplate[]) => void,
  onShowUserManagement: () => void,
  onShowLogs: () => void,
  onLogout: () => void,
  showAdminControls: boolean,
  currentSettings: DashboardSystemSettings,
  onUpdateSettings: (updatedSettings: Partial<DashboardSystemSettings>) => void,
  onApplyHighContrast: (enabled: boolean) => void,
  onApplyLargeText: (enabled: boolean) => void,
  onApplySoundEffects: (enabled: boolean) => void,
  onApplyShowTableCardAnimations: (enabled: boolean) => void,
  highContrastMode: boolean,
  largeTextMode: boolean,
  soundEffectsEnabled: boolean
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
  currentSettings,
  onUpdateSettings,
  onApplyHighContrast,
  onApplyLargeText,
  onApplySoundEffects,
  onApplyShowTableCardAnimations,
  highContrastMode,
  largeTextMode,
  soundEffectsEnabled,
}: SettingsDialogProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [selectedTab, setSelectedTab] = useState("appearance");
  const [editedServers, setEditedServers] = useState<Server[]>([]);
  const [newServerName, setNewServerName] = useState("");
  const [editedTemplates, setEditedTemplates] = useState<NoteTemplate[]>([]);
  const [newTemplateText, setNewTemplateText] = useState("");

  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any | null>(null);
  const [adminSubTab, setAdminSubTab] = useState("userList");
  const [searchTermUsers, setSearchTermUsers] = useState("");

  const { backgroundEnabled, setBackgroundEnabled } = useAnimation();
  const predefinedTemplates = [
      { id: "1", text: "VIP guest" }, { id: "2", text: "Pay at front" },
      { id: "3", text: "Prepaid" }, { id: "4", text: "Underage" },
      { id: "5", text: "Reservation" },
  ];

  const fetchStaffServers = async (currentServers: Server[]) => {
    try {
      const response = await fetch("/api/staff/members");
      if (!response.ok) {
        throw new Error("Failed to fetch staff members");
      }
      const data = await response.json();
      const serverStatusMap = new Map(currentServers.map((s) => [s.id, s.enabled]));
      const mappedServers: Server[] = data.map((member: any) => ({
        id: member.id,
        name: member.display_name || member.first_name,
        enabled: serverStatusMap.get(member.id) ?? true,
      }));
      setEditedServers(mappedServers);
    } catch (error) {
      console.error("Error fetching staff members:", error);
      setEditedServers(currentServers);
    }
  };

  useEffect(() => {
    if (open) {
      fetchStaffServers(servers);
      setEditedTemplates(noteTemplates.length > 0 ? [...noteTemplates] : predefinedTemplates);
      setSelectedTab(showAdminControls ? "appearance" : "servers");
    }
  }, [open, servers, noteTemplates, showAdminControls]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const fetchedUsers = await supabaseAuthService.getUsers();
      setUsers(fetchedUsers);
      setErrorUsers(null);
    } catch (err) {
      console.error("Error fetching users:", err);
      setErrorUsers("Failed to load users. Please try again.");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (open && selectedTab === "admin" && adminSubTab === "userList") {
      fetchUsers();
    }
  }, [open, selectedTab, adminSubTab]);

  const filteredUsers = users.filter(
    (user) =>
      (user.name || "").toLowerCase().includes(searchTermUsers.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(searchTermUsers.toLowerCase()) ||
      (USER_ROLE_LABELS[user.role as UserRole] || "").toLowerCase().includes(searchTermUsers.toLowerCase())
  );

  const addServer = () => {
    if (newServerName.trim()) {
      const newServer: Server = {
        id: `server-${Date.now().toString()}`, name: newServerName.trim(), enabled: true,
      };
      setEditedServers((prev) => [...prev, newServer]);
      setNewServerName("");
    }
  };
  const removeServer = (id: string) => setEditedServers((prev) => prev.filter((server) => server.id !== id));
  const updateServerName = (id: string, name: string) => setEditedServers((prev) => prev.map((server) => (server.id === id ? { ...server, name } : server)));
  const toggleServerEnabled = (id: string) => setEditedServers((prev) => prev.map((server) => (server.id === id ? { ...server, enabled: !server.enabled } : server)));

  const addTemplate = () => {
    if (newTemplateText.trim()) {
      const newTemplate: NoteTemplate = {
        id: `template-${Date.now().toString()}`, text: newTemplateText.trim(),
      };
      setEditedTemplates((prev) => [...prev, newTemplate]);
      setNewTemplateText("");
    }
  };
  const removeTemplate = (id: string) => setEditedTemplates((prev) => prev.filter((template) => template.id !== id));
  const updateTemplateText = (id: string, text: string) => setEditedTemplates((prev) => prev.map((template) => (template.id === id ? { ...template, text } : template)));

  const saveCurrentTabChanges = () => {
    if (selectedTab === "servers") {
      onUpdateServers(editedServers);
      toast({ title: "Server list updated." });
    } else if (selectedTab === "notes") {
      onUpdateNoteTemplates(editedTemplates);
      toast({ title: "Note templates updated." });
    }
  };
  
  const handleAnimationToggle = (enabled: boolean) => onApplyShowTableCardAnimations(enabled);
  const handleSoundToggle = (enabled: boolean) => onApplySoundEffects(enabled);
  const handleHighContrastToggle = (enabled: boolean) => onApplyHighContrast(enabled);
  const handleLargeTextToggle = (enabled: boolean) => onApplyLargeText(enabled);

  const resetToPredefinedTemplates = () => setEditedTemplates(predefinedTemplates);
  
  const SettingItem = ({
    id,
    label,
    description,
    checked,
    onCheckedChange,
    icon: Icon,
    disabled = false,
  }: {
    id: string;
    label: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    icon: React.ElementType;
    disabled?: boolean;
  }) => (
    <div
      className="flex flex-row items-center justify-between p-3 border border-cyan-700/30 rounded-lg bg-slate-800/40 hover:bg-slate-700/50 transition-colors shadow-sm"
      onClick={() => !disabled && onCheckedChange(!checked)}
    >
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium text-cyan-200 flex items-center">
          <Icon className="h-4 w-4 mr-2 text-cyan-400 shrink-0" />
          {label}
        </Label>
        <p className="text-xs text-slate-400 pl-6">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        onClick={(e) => e.stopPropagation()}
        className="data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-slate-600 shrink-0"
        thumbClassName="bg-slate-900"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "sm:max-w-2xl w-[95vw] md:w-full bg-black/90 text-white border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/30 backdrop-blur-lg",
          "flex flex-col h-[90vh] md:h-[85vh] p-0" // p-0 is important here
        )}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-4 sm:px-6 py-3 border-b border-cyan-700/30 shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-bold text-cyan-300 flex justify-between items-center">
            <span className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Settings
            </span>
            {currentUser && (
              <div className="px-2 py-1 rounded-md bg-slate-800/70 border border-cyan-800/50 text-cyan-400 text-xs font-mono">
                {currentUser.name || "User"}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-4 sm:px-6 pt-3 shrink-0">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid grid-cols-3 sm:grid-cols-5 bg-slate-800/70 h-auto sm:h-10 rounded-md">
              {["Appearance", "Servers", "Notes", "Manual", ...(showAdminControls ? ["Admin"] : [])].map(tabLabel => (
                <TabsTrigger
                  key={tabLabel}
                  value={tabLabel.toLowerCase().replace(/\s+/g, '')}
                  className="data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-300 data-[state=active]:shadow-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 h-full text-xs sm:text-sm px-1 py-1.5 sm:px-3 flex items-center justify-center gap-1 sm:gap-1.5 transition-all duration-150"
                >
                  {tabLabel === "Appearance" && <Eye className="h-3.5 w-3.5 shrink-0" />}
                  {tabLabel === "Servers" && <Users className="h-3.5 w-3.5 shrink-0" />}
                  {tabLabel === "Notes" && <FileText className="h-3.5 w-3.5 shrink-0" />}
                  {tabLabel === "Manual" && <BookOpen className="h-3.5 w-3.5 shrink-0" />}
                  {tabLabel === "Admin" && <Users className="h-3.5 w-3.5 shrink-0" />}
                  <span className="hidden sm:inline truncate">{tabLabel}</span>
                  <span className="sm:hidden">{ tabLabel.substring(0,3) }</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* MODIFIED: This div is now flex-1 and scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4">
           <Tabs value={selectedTab} className="w-full"> {/* Kept inner Tabs for content association */}
              <TabsContent value="appearance" className="mt-0 space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-cyan-400 mb-3 border-b border-cyan-700/30 pb-2">Display & Sound</h3>
                  <div className="space-y-3">
                    <SettingItem id="tableCardAnimations" label="Table Card Animations" description="Pulsing and particle effects on table cards." checked={currentSettings.showTableCardAnimations} onCheckedChange={handleAnimationToggle} icon={Eye} />
                    <SettingItem id="backgroundAnimation" label="Background Animation" description="Animated space backdrop." checked={backgroundEnabled} onCheckedChange={setBackgroundEnabled} icon={Bell} />
                    <SettingItem id="soundEffects" label="Sound Effects" description="Enable UI sound effects for actions." checked={currentSettings.soundEnabled}  onCheckedChange={handleSoundToggle} icon={Volume2} />
                  </div>
                </div>
                <Separator className="my-5 bg-cyan-700/20" />
                <div>
                  <h3 className="text-base font-semibold text-cyan-400 mb-3 border-b border-cyan-700/30 pb-2">Accessibility</h3>
                  <div className="space-y-3">
                    <SettingItem id="highContrastMode" label="High Contrast Mode" description="Increase text and UI element contrast." checked={highContrastMode}  onCheckedChange={handleHighContrastToggle} icon={Palette} />
                    <SettingItem id="largeTextMode" label="Large Text Mode" description="Increase text size for better readability." checked={largeTextMode} onCheckedChange={handleLargeTextToggle} icon={MaximizeIcon} />
                  </div>
                </div>
                <Separator className="my-5 bg-cyan-700/20" />
                <div>
                  <h3 className="text-base font-semibold text-cyan-400 mb-3 border-b border-cyan-700/30 pb-2">Notifications</h3>
                   <PushNotificationManager />
                </div>
              </TabsContent>

              <TabsContent value="servers" className="mt-0">
                <div className="space-y-3">
                  <div className="flex items-center mb-2">
                    <h3 className="text-base font-semibold text-fuchsia-400">Server Management</h3>
                  </div>
                  {/* MODIFIED: ScrollArea to take available height in its tab */}
                  <ScrollArea className="max-h-[calc(90vh-350px)] sm:max-h-[calc(85vh-350px)] pr-2 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {editedServers.map((server) => (
                        <div key={server.id} className="flex items-center gap-2 bg-slate-800/50 rounded-md p-2 border border-slate-700/50">
                          <Input value={server.name} onChange={(e) => updateServerName(server.id, e.target.value)} className="bg-slate-900/70 border-slate-700 text-gray-100 h-8 text-sm flex-1"/>
                          <Switch id={`server-enabled-${server.id}`} checked={server.enabled} onCheckedChange={() => toggleServerEnabled(server.id)} 
                            className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-slate-600" thumbClassName="bg-slate-900"/>
                          <Button variant="ghost" size="icon" onClick={() => removeServer(server.id)} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/30 p-0">
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex items-center gap-2 pt-2">
                    <Input value={newServerName} onChange={(e) => setNewServerName(e.target.value)} placeholder="New server name" className="bg-slate-900/70 border-slate-700 text-gray-100 h-8 text-sm"/>
                    <Button variant="outline" size="icon" onClick={addServer} disabled={!newServerName.trim()} className="h-8 w-8 border-green-500/70 bg-slate-800/50 hover:bg-green-900/30 text-green-400 p-0">
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-end pt-3">
                    <Button onClick={saveCurrentTabChanges} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5 h-8 text-xs px-3">
                      <SaveIcon className="h-4 w-4" />Save Servers
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-0">
                 <div className="space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-base font-semibold text-yellow-400">Note Templates</h3>
                    <Button variant="outline" size="sm" onClick={resetToPredefinedTemplates} className="border-yellow-500/70 text-yellow-400 hover:bg-yellow-900/30 h-7 text-xs px-2">Reset Templates</Button>
                  </div>
                  <ScrollArea className="max-h-[calc(90vh-350px)] sm:max-h-[calc(85vh-320px)] pr-2 custom-scrollbar">
                    <div className="grid grid-cols-1 gap-2.5">
                      {editedTemplates.map((template) => (
                        <div key={template.id} className="flex items-center gap-2 bg-slate-800/50 rounded-md p-2 border border-slate-700/50">
                          <Input value={template.text} onChange={(e) => updateTemplateText(template.id, e.target.value)} className="bg-slate-900/70 border-slate-700 text-gray-100 h-8 text-sm flex-1"/>
                          <Button variant="ghost" size="icon" onClick={() => removeTemplate(template.id)} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/30 p-0">
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex items-center gap-2 pt-2">
                    <Input value={newTemplateText} onChange={(e) => setNewTemplateText(e.target.value)} placeholder="New note template text" className="bg-slate-900/70 border-slate-700 text-gray-100 h-8 text-sm"/>
                    <Button variant="outline" size="icon" onClick={addTemplate} disabled={!newTemplateText.trim()} className="h-8 w-8 border-green-500/70 bg-slate-800/50 hover:bg-green-900/30 text-green-400 p-0">
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-end pt-3">
                    <Button onClick={saveCurrentTabChanges} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5 h-8 text-xs px-3">
                      <SaveIcon className="h-4 w-4" />Save Templates
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="mt-0">
                <ScrollArea className="max-h-[calc(90vh-200px)] sm:h-[calc(85vh-240px)] pr-2 custom-scrollbar"> {/* Adjusted height */}
                   <UserManual />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="admin" className="mt-0">
                {showAdminControls ? (
                   <ScrollArea className="max-h-[calc(90vh-200px)] sm:h-[calc(85vh-240px)] pr-2 custom-scrollbar"> {/* Adjusted height */}
                    <div className="space-y-4">
                      {/* ... Admin content ... (kept as is for brevity, ensure its internal scroll areas are adjusted if needed) */}
                       <Tabs value={adminSubTab} onValueChange={setAdminSubTab} className="w-full">
                        <TabsList className="grid grid-cols-2 bg-slate-800/70 h-8">
                          <TabsTrigger value="userList" className="data-[state=active]:bg-cyan-700/40 data-[state=active]:text-cyan-300 text-xs">
                            <Users className="h-3.5 w-3.5 mr-1" />User List
                          </TabsTrigger>
                          <TabsTrigger value="userForm" className="data-[state=active]:bg-cyan-700/40 data-[state=active]:text-cyan-300 text-xs">
                            <UserPlus className="h-3.5 w-3.5 mr-1" />{selectedUserForEdit ? "Edit User" : "Add User"}
                          </TabsTrigger>
                        </TabsList>
                        <div className="mt-3">
                          {adminSubTab === "userList" ? (
                            <div className="space-y-3">
                              <Input
                                placeholder="Search users..."
                                value={searchTermUsers}
                                onChange={(e) => setSearchTermUsers(e.target.value)}
                                className="bg-slate-900/70 border-slate-700 text-gray-100 h-8 text-sm"
                              />
                              {loadingUsers && (
                                <p className="text-sm text-gray-400">Loading users...</p>
                              )}
                              {errorUsers && (
                                <p className="text-sm text-red-400">{errorUsers}</p>
                              )}
                              {!loadingUsers && !errorUsers && (
                                <div className="space-y-2">
                                  {filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                      <div
                                        key={user.id}
                                        className="flex items-center justify-between p-2 border border-slate-700/50 rounded-md bg-slate-800/50 hover:bg-slate-700/50 cursor-pointer"
                                        onClick={() => {
                                          setSelectedUserForEdit(user);
                                          setAdminSubTab("userForm");
                                        }}
                                      >
                                        <div>
                                          <p className="text-sm text-gray-100">
                                            {user.display_name || user.name}
                                          </p>
                                          <p className="text-xs text-slate-400">
                                            {USER_ROLE_LABELS[user.role as UserRole]}
                                          </p>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm text-gray-400">No users found.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <AddUserDialog open={true} onClose={() => { setSelectedUserForEdit(null); setAdminSubTab("userList");}} onUserAdded={() => { fetchUsers(); setSelectedUserForEdit(null); setAdminSubTab("userList"); }} editUser={selectedUserForEdit} />
                            </div>
                          )}
                        </div>
                      </Tabs>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="p-4 text-center text-gray-400">
                    <p>You don't have admin privileges to manage users.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
        </div>
        
        <DialogFooter className="px-4 sm:px-6 py-3 border-t border-cyan-700/30 shrink-0">
          <Button onClick={onClose} className="w-full bg-slate-700/80 hover:bg-slate-600/80 text-gray-200 h-9 text-sm sm:text-base border border-slate-600">
            Close Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
