// Defines the shape of a permission set
export interface Permission {
  canStartSession: boolean;
  canEndSession: boolean;
  canAddTime: boolean;
  canSubtractTime: boolean;
  canUpdateGuests: boolean;
  canAssignServer: boolean;
  canGroupTables: boolean;
  canUngroupTable: boolean;
  canMoveTable: boolean;
  canUpdateNotes: boolean;
  canViewLogs: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  // Add any other permission flags here if they exist in your staff_permissions table
}

// Defines the available user roles in the system
export type UserRole =
  | "admin"
  | "manager"
  | "controller"
  | "server"
  | "bartender"
  | "barback"
  | "kitchen"
  | "security"
  | "karaoke_main"
  | "karaoke_staff"
  | "viewer";

// Defines the structure for a user/staff member
// This aligns with the data structure used by supabaseAuthService and staff_members table
export interface User {
  id: string; // Typically UUID from staff_members
  name: string; // Corresponds to first_name or display_name
  username?: string; // Optional, might be derived from email or be a separate field
  email?: string | null; // Email can be null
  role: UserRole;
  // pin_code is intentionally omitted from the client-side User object for security.
  // The API handles PIN verification.
  permissions?: Permission; // The resolved permissions for the user
  auth_id?: string | null; // Link to Supabase auth.users.id, can be null
  display_name?: string | null; // Actual display name
  first_name?: string; // If you need to distinguish from display_name
  created_at?: string;
  updated_at?: string;
  pin_code?: string; // This might be returned by your API, but consider if client needs it post-login.
                     // For user objects stored in client state/localStorage, it's best to omit.
}

// Maps UserRole to human-readable labels
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  controller: "Controller",
  manager: "Manager",
  server: "Server",
  bartender: "Bartender",
  barback: "Barback",
  kitchen: "Kitchen",
  security: "Security",
  karaoke_main: "Karaoke Main",
  karaoke_staff: "Karaoke Staff",
  viewer: "Viewer",
};

// Groups roles by general permission levels
export const ADMIN_LEVEL_ROLES: UserRole[] = ["admin", "manager", "controller"];
export const STAFF_LEVEL_ROLES: UserRole[] = [
  "server",
  "bartender",
  "barback",
  "kitchen",
  "security",
  "karaoke_main",
  "karaoke_staff",
];
export const VIEW_ONLY_ROLES: UserRole[] = ["viewer"];

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<UserRole, Permission> = {
  admin: {
    canStartSession: true, canEndSession: true, canAddTime: true, canSubtractTime: true,
    canUpdateGuests: true, canAssignServer: true, canGroupTables: true, canUngroupTable: true,
    canMoveTable: true, canUpdateNotes: true, canViewLogs: true, canManageUsers: true, canManageSettings: true,
  },
  controller: {
    canStartSession: true, canEndSession: true, canAddTime: true, canSubtractTime: true,
    canUpdateGuests: true, canAssignServer: true, canGroupTables: true, canUngroupTable: true,
    canMoveTable: true, canUpdateNotes: true, canViewLogs: true, canManageUsers: true, canManageSettings: true,
  },
  manager: {
    canStartSession: true, canEndSession: true, canAddTime: true, canSubtractTime: true,
    canUpdateGuests: true, canAssignServer: true, canGroupTables: true, canUngroupTable: true,
    canMoveTable: true, canUpdateNotes: true, canViewLogs: true, canManageUsers: true, canManageSettings: true,
  },
  server: {
    canStartSession: true, canEndSession: true, canAddTime: true, canSubtractTime: false,
    canUpdateGuests: true, canAssignServer: false, 
    canGroupTables: false, canUngroupTable: false, canMoveTable: false,
    canUpdateNotes: true, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
  bartender: {
    canStartSession: false, canEndSession: false, canAddTime: false, canSubtractTime: false,
    canUpdateGuests: false, canAssignServer: false, canGroupTables: false, canUngroupTable: false,
    canMoveTable: false, canUpdateNotes: false, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
  barback: {
    canStartSession: false, canEndSession: false, canAddTime: false, canSubtractTime: false,
    canUpdateGuests: false, canAssignServer: false, canGroupTables: false, canUngroupTable: false,
    canMoveTable: false, canUpdateNotes: false, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
  kitchen: {
    canStartSession: false, canEndSession: false, canAddTime: false, canSubtractTime: false,
    canUpdateGuests: false, canAssignServer: false, canGroupTables: false, canUngroupTable: false,
    canMoveTable: false, canUpdateNotes: false, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
  security: {
    canStartSession: false, canEndSession: false, canAddTime: false, canSubtractTime: false,
    canUpdateGuests: false, canAssignServer: false, canGroupTables: false, canUngroupTable: false,
    canMoveTable: false, canUpdateNotes: false, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
  karaoke_main: {
    canStartSession: false, canEndSession: false, canAddTime: false, canSubtractTime: false,
    canUpdateGuests: false, canAssignServer: false, canGroupTables: false, canUngroupTable: false,
    canMoveTable: false, canUpdateNotes: false, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
  karaoke_staff: {
    canStartSession: false, canEndSession: false, canAddTime: false, canSubtractTime: false,
    canUpdateGuests: false, canAssignServer: false, canGroupTables: false, canUngroupTable: false,
    canMoveTable: false, canUpdateNotes: false, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
  viewer: {
    canStartSession: false, canEndSession: false, canAddTime: false, canSubtractTime: false,
    canUpdateGuests: false, canAssignServer: false, canGroupTables: false, canUngroupTable: false,
    canMoveTable: false, canUpdateNotes: false, canViewLogs: false, canManageUsers: false, canManageSettings: false,
  },
};
