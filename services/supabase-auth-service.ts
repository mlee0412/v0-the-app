import { getSupabaseClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";
// Import types from the canonical source
import { type UserRole, type User, type Permission, ADMIN_LEVEL_ROLES, USER_ROLE_LABELS } from "@/types/user";

// Define default permissions for each role (remains here as it's service-specific default logic)
const DEFAULT_PERMISSIONS: Record<UserRole, Permission> = {
  admin: {
    canStartSession: true, canQuickStart: true, canEndSession: true, canAddTime: true, canSubtractTime: true,
    canUpdateGuests: true, canAssignServer: true, canGroupTables: true, canUngroupTable: true,
    canMoveTable: true, canUpdateNotes: true, canViewLogs: true, canManageUsers: true, canManageSettings: true,
  },
  controller: {
    canStartSession: true, canQuickStart: true, canEndSession: true, canAddTime: true, canSubtractTime: true,
    canUpdateGuests: true, canAssignServer: true, canGroupTables: true, canUngroupTable: true,
    canMoveTable: true, canUpdateNotes: true, canViewLogs: true, canManageUsers: true, canManageSettings: true,
  },
  manager: {
    canStartSession: true, canQuickStart: true, canEndSession: true, canAddTime: true, canSubtractTime: true,
    canUpdateGuests: true, canAssignServer: true, canGroupTables: true, canUngroupTable: true,
    canMoveTable: true, canUpdateNotes: true, canViewLogs: true, canManageUsers: true, canManageSettings: true,
  },
  server: {
    canStartSession: true, canQuickStart: true, canEndSession: true, canAddTime: true, canSubtractTime: false,
    canUpdateGuests: true, canAssignServer: false, canGroupTables: false, canUngroupTable: false,
    canMoveTable: false, canUpdateNotes: true, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
  bartender: {
    canStartSession: false, canQuickStart: false, canEndSession: false, canAddTime: false, canSubtractTime: false,
    canUpdateGuests: false, canAssignServer: false, canGroupTables: false, canUngroupTable: false,
    canMoveTable: false, canUpdateNotes: false, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
  barback: {
    canStartSession: false, canQuickStart: false, canEndSession: false, canAddTime: false, canSubtractTime: false,
    canUpdateGuests: false, canAssignServer: false, canGroupTables: false, canUngroupTable: false,
    canMoveTable: false, canUpdateNotes: false, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
  kitchen: {
    canStartSession: false, canQuickStart: false, canEndSession: false, canAddTime: false, canSubtractTime: false,
    canUpdateGuests: false, canAssignServer: false, canGroupTables: false, canUngroupTable: false,
    canMoveTable: false, canUpdateNotes: false, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
  security: {
    canStartSession: false, canQuickStart: false, canEndSession: false, canAddTime: false, canSubtractTime: false,
    canUpdateGuests: false, canAssignServer: false, canGroupTables: false, canUngroupTable: false,
    canMoveTable: false, canUpdateNotes: false, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
  karaoke_main: {
    canStartSession: false, canQuickStart: false, canEndSession: false, canAddTime: false, canSubtractTime: false,
    canUpdateGuests: false, canAssignServer: false, canGroupTables: false, canUngroupTable: false,
    canMoveTable: false, canUpdateNotes: false, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
  karaoke_staff: {
    canStartSession: false, canQuickStart: false, canEndSession: false, canAddTime: false, canSubtractTime: false,
    canUpdateGuests: false, canAssignServer: false, canGroupTables: false, canUngroupTable: false,
    canMoveTable: false, canUpdateNotes: false, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
  viewer: {
    canStartSession: false, canQuickStart: false, canEndSession: false, canAddTime: false, canSubtractTime: false,
    canUpdateGuests: false, canAssignServer: false, canGroupTables: false, canUngroupTable: false,
    canMoveTable: false, canUpdateNotes: false, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
};

// User interface is now imported from @/types/user
// Permission interface is now imported from @/types/user

class SupabaseAuthService {
  // DEFAULT_PERMISSIONS is now directly accessible if needed by other modules,
  // or it can remain here if it's only for this service's internal logic.
  // For clarity and if it's core to role definitions, it could also live in types/user.ts
  public static readonly DEFAULT_PERMISSIONS = DEFAULT_PERMISSIONS;

  private isBrowser = typeof window !== "undefined";
  private supabase = getSupabaseClient();
  private currentUser: User | null = null; // Now uses the imported User type

  constructor() {
    if (this.isBrowser) {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        try {
          this.currentUser = JSON.parse(storedUser) as User;
        } catch (e) {
          console.error("Error parsing stored user:", e);
          localStorage.removeItem("currentUser");
        }
      }
    }
  }

  async authenticate(userId: string, pinCode: string): Promise<User | null> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, pinCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Authentication error:", errorData);
        return null;
      }

      const data = await response.json();

      if (data.success && data.user) {
        // Ensure the user object conforms to the User type from @/types/user
        const authenticatedUser: User = {
            id: data.user.id,
            name: data.user.name || data.user.first_name || "Unknown",
            username: data.user.username,
            email: data.user.email,
            role: data.user.role as UserRole, // Cast to UserRole
            pin_code: data.user.pin_code,
            permissions: data.user.permissions || DEFAULT_PERMISSIONS[data.user.role as UserRole],
            auth_id: data.user.auth_id,
            display_name: data.user.display_name || data.user.name,
            created_at: data.user.created_at,
            updated_at: data.user.updated_at,
        };
        this.currentUser = authenticatedUser;
        if (this.isBrowser) {
          localStorage.setItem("currentUser", JSON.stringify(authenticatedUser));
        }
        return authenticatedUser;
      }
      return null;
    } catch (error) {
      console.error("Authentication error:", error);
      return null;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const response = await fetch("/api/staff/members");
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();

      const formattedUsers: User[] = (data || []).map((user: any) => ({
        id: user.id,
        email: user.email || null, // API might return empty string, make it null if so
        username: user.username || user.email || (user.first_name ? user.first_name.toLowerCase().replace(/\s+/g, "") : undefined),
        name: user.first_name || "Unknown",
        display_name: user.display_name || user.first_name,
        role: (user.role?.toLowerCase() || "viewer") as UserRole,
        pin_code: user.pin_code,
        permissions: user.permissions || DEFAULT_PERMISSIONS[(user.role?.toLowerCase() || "viewer") as UserRole],
        created_at: user.created_at,
        updated_at: user.updated_at,
        auth_id: user.auth_id,
      }));

      if (!formattedUsers.some((u) => u.role === "admin" && (u.email === "admin@example.com" || u.username === "admin"))) {
        formattedUsers.push({
          id: "admin-" + uuidv4().substring(0, 8),
          email: "admin@example.com",
          username: "admin",
          name: "Administrator",
          display_name: "Administrator",
          role: "admin",
          pin_code: "2162",
          permissions: DEFAULT_PERMISSIONS.admin,
        });
      }
      return formattedUsers;
    } catch (error) {
      console.error("Error fetching users:", error);
      return [
        {
          id: "admin-" + uuidv4().substring(0, 8),
          email: "admin@example.com",
          username: "admin",
          name: "Administrator",
          display_name: "Administrator",
          role: "admin",
          pin_code: "2162",
          permissions: DEFAULT_PERMISSIONS.admin,
        },
      ];
    }
  }

  async addUser(userData: Partial<User>): Promise<User | null> { // Use Partial<User> for input
    try {
      const response = await fetch("/api/staff/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      const newUser = await response.json() as User; // Cast to User
      this.broadcastUserUpdate();
      return newUser;
    } catch (error) {
      console.error("Error adding user:", error);
      throw error;
    }
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User | null> { // Use Partial<User>
    try {
      const response = await fetch(`/api/staff/members/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      const updatedUser = await response.json() as User; // Cast to User
      this.broadcastUserUpdate();
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/staff/members/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      this.broadcastUserUpdate();
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  async getUserPermissions(userId: string): Promise<Permission | null> {
    try {
      const response = await fetch(`/api/staff/permissions/${userId}`);
      if (!response.ok) {
         const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      return await response.json() as Permission; // Cast to Permission
    } catch (error) {
      console.error("Error getting user permissions:", error);
      return null;
    }
  }

  async updateUserPermissions(userId: string, permissions: Partial<Permission>): Promise<Permission | null> { // Use Partial<Permission>
    try {
      const response = await fetch(`/api/staff/permissions/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(permissions),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      const updatedPermissions = await response.json() as Permission; // Cast to Permission
      this.broadcastUserUpdate(); // Permissions change might affect user object
      return updatedPermissions;
    } catch (error) {
      console.error("Error updating permissions:", error);
      throw error;
    }
  }

  async getRoles(): Promise<Array<{ id: string; role_name: UserRole; description?: string }>> {
    try {
      const response = await fetch("/api/staff/roles");
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching roles:", error);
      throw error;
    }
  }

  async hasPermission(permissionKey: keyof Permission): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return false;
      if (ADMIN_LEVEL_ROLES.includes(user.role)) return true;
      if (user.permissions && permissionKey in user.permissions) {
        return !!user.permissions[permissionKey];
      }
      return DEFAULT_PERMISSIONS[user.role]?.[permissionKey] || false;
    } catch (error) {
      console.error("Error checking permission:", error);
      return false;
    }
  }

  isAuthenticated(): boolean { // Made synchronous
    if (!this.isBrowser) return false;
    return !!localStorage.getItem("currentUser");
  }

  getCurrentUser(): User | null { // Made synchronous
     if (!this.isBrowser) return null;
    const userJson = localStorage.getItem("currentUser");
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as User;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  isAdmin(): boolean { // Made synchronous
    const user = this.getCurrentUser();
    return !!user && ADMIN_LEVEL_ROLES.includes(user.role);
  }

  isServer(): boolean { // Made synchronous
    const user = this.getCurrentUser();
    return user?.role === "server";
  }

  async logout() { // Kept async for Supabase signout
    if (this.isBrowser) {
      localStorage.removeItem("currentUser");
    }
    this.currentUser = null;
    try {
      await this.supabase.auth.signOut();
    } catch (error) {
      console.error("Error logging out from Supabase:", error);
    }
  }

  subscribeToUsers(callback: (users: User[]) => void): () => void {
    if (!this.isBrowser) return () => {};

    let subscription: any = null; // Supabase RealtimeChannel
    try {
      subscription = this.supabase
        .channel("staff-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "staff_members" },
          () => { this.getUsers().then(callback); }
        )
        .subscribe();
    } catch (error) {
      console.error("Error setting up Supabase subscription for users:", error);
    }

    const handleUserUpdate = () => { this.getUsers().then(callback); };
    window.addEventListener("supabase-user-update", handleUserUpdate);

    return () => {
      if (subscription) {
        this.supabase.removeChannel(subscription);
      }
      window.removeEventListener("supabase-user-update", handleUserUpdate);
    };
  }

  broadcastUserUpdate() {
    if (!this.isBrowser) return;
    window.dispatchEvent(new CustomEvent("supabase-user-update"));
  }
}

const supabaseAuthService = new SupabaseAuthService();
export default supabaseAuthService;
