"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users, RefreshCw, AlertCircle, Edit, Trash2, Settings2 } from "lucide-react"; // Added Settings2
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { USER_ROLE_LABELS, type UserRole } from "@/types/user";
import supabaseAuthService, { type User as StaffUser } from "@/services/supabase-auth-service";
import { useToast } from "@/hooks/use-toast";
import { PermissionsForm } from "@/components/admin/permissions-form";
import { AddUserDialog } from "@/components/admin/add-user-dialog";

export function SupabaseUserManagement() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<StaffUser | null>(null);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<StaffUser | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("userList"); // "userList", "addUserDialog", "editUserDialog", "permissions"
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedUsers = await supabaseAuthService.getUsers();
      setUsers(fetchedUsers || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err instanceof Error ? err.message : "Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(
    (user) =>
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (USER_ROLE_LABELS[user.role as UserRole] &&
        USER_ROLE_LABELS[user.role as UserRole]?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleUserAddedOrUpdated = () => {
    fetchUsers();
    setShowAddUserDialog(false);
    setSelectedUserForEdit(null);
    setActiveTab("userList");
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    try {
      setLoading(true);
      await supabaseAuthService.deleteUser(userId);
      toast({
        title: "User Deleted",
        description: "The user has been successfully deleted.",
      });
      fetchUsers(); 
      if (selectedUserForEdit?.id === userId) setSelectedUserForEdit(null);
      if (selectedUserForPermissions?.id === userId) setSelectedUserForPermissions(null);
      setActiveTab("userList");
    } catch (err) {
      console.error("Error deleting user:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete user.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (user: StaffUser) => {
    setSelectedUserForEdit(user);
    setSelectedUserForPermissions(null);
    setShowAddUserDialog(true); // Open the dialog for editing
    // setActiveTab("editUserDialog"); // Tab will be managed by dialog opening
  };

  const openPermissionsForm = (user: StaffUser) => {
    setSelectedUserForPermissions(user);
    setSelectedUserForEdit(null); 
    setShowAddUserDialog(false); 
    setActiveTab("permissions");
  };

  const openAddDialog = () => {
    setSelectedUserForEdit(null);
    setSelectedUserForPermissions(null);
    setShowAddUserDialog(true); // Open the dialog for adding
    // setActiveTab("addUserDialog"); // Tab will be managed by dialog opening
  };
  
  const closeAndResetForms = () => {
    setShowAddUserDialog(false);
    setSelectedUserForEdit(null);
    setSelectedUserForPermissions(null);
    setActiveTab("userList");
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(value) => {
          if (value === "userList") {
            closeAndResetForms();
          }
          setActiveTab(value);
        }} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-gray-800 h-auto md:h-8">
          <TabsTrigger value="userList" className="data-[state=active]:bg-gray-700 h-8 text-xs md:text-sm">
            <Users className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            User List
          </TabsTrigger>
          <TabsTrigger value="addUserTrigger" onClick={openAddDialog} className="data-[state=active]:bg-gray-700 h-8 text-xs md:text-sm">
            <UserPlus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Add User
          </TabsTrigger>
          {/* Conditional tabs for edit/permissions are removed; these will be modal dialogs or inline forms */}
        </TabsList>

        <TabsContent value="userList" className="space-y-4 mt-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2">
            <div className="relative flex-1 w-full md:max-w-sm">
              <Input
                placeholder="Search users (name, email, role)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={loading}
              className="border-cyan-500 text-cyan-500 hover:bg-cyan-950 w-full md:w-auto"
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

          <ScrollArea className="h-[400px] md:h-[500px] rounded-md border border-gray-700 bg-gray-800 p-4">
            {loading && !users.length ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-pulse text-gray-400">Loading users...</div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-850 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-white">{user.name || user.username}</h3>
                        <p className="text-sm text-gray-400">{user.email || "No email provided"}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              ADMIN_LEVEL_ROLES.includes(user.role as UserRole)
                                ? "bg-purple-900/50 text-purple-300 border border-purple-700"
                                : user.role === "server"
                                  ? "bg-blue-900/50 text-blue-300 border border-blue-700"
                                  : "bg-gray-700 text-gray-300 border border-gray-600"
                            }`}
                          >
                            {USER_ROLE_LABELS[user.role as UserRole] || user.role}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2 md:mt-0 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          className="h-8 border-cyan-500 text-cyan-500 hover:bg-cyan-950 text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPermissionsForm(user)}
                          className="h-8 border-purple-500 text-purple-500 hover:bg-purple-950 text-xs"
                        >
                           <Settings2 className="h-3 w-3 mr-1" /> Permissions
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="h-8 border-red-500 text-red-500 hover:bg-red-950 text-xs"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-full">
                <p className="text-gray-400">
                  {searchTerm ? "No users match your search." : "No users found."}
                </p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        
        {/* This content is primarily for the "permissions" tab if a user is selected for it */}
        {selectedUserForPermissions && activeTab === 'permissions' && (
          <TabsContent value="permissions" className="space-y-4 mt-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-purple-400">Permissions for: {selectedUserForPermissions.name}</h2>
                <Button variant="outline" onClick={closeAndResetForms} className="h-8 text-xs">Back to List</Button>
              </div>
              <PermissionsForm 
                userId={selectedUserForPermissions.id} 
                onSaved={() => {
                  fetchUsers(); 
                  closeAndResetForms();
                }} 
              />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Add/Edit User Dialog controlled by state */}
      {(showAddUserDialog || selectedUserForEdit) && (
        <AddUserDialog
          open={showAddUserDialog || !!selectedUserForEdit}
          onClose={closeAndResetForms}
          onUserAdded={handleUserAddedOrUpdated}
          editUser={selectedUserForEdit}
        />
      )}
    </div>
  );
}
