// Add a deprecation notice to this service as it's being replaced by supabase-auth-service

/**
 * @deprecated This service has been replaced by supabase-auth-service.ts
 * Please use that service for user management functionality.
 */

// User types and roles
import supabaseAuthService from "./supabase-auth-service"

export type UserRole = "admin" | "server" | "viewer"

export interface Permission {
  canStartSession: boolean
  canEndSession: boolean
  canAddTime: boolean
  canSubtractTime: boolean
  canUpdateGuests: boolean
  canAssignServer: boolean
  canGroupTables: boolean
  canUngroupTable: boolean
  canMoveTable: boolean
  canUpdateNotes: boolean
  canViewLogs: boolean
  canManageUsers: boolean
  canManageSettings: boolean
}

export interface User {
  id: string
  username: string
  password: string
  role: UserRole
  name: string
  permissions: Permission
}

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<UserRole, Permission> = {
  admin: {
    canStartSession: true,
    canEndSession: true,
    canAddTime: true,
    canSubtractTime: true,
    canUpdateGuests: true,
    canAssignServer: true,
    canGroupTables: true,
    canUngroupTable: true,
    canMoveTable: true,
    canUpdateNotes: true,
    canViewLogs: true,
    canManageUsers: true,
    canManageSettings: true,
  },
  server: {
    canStartSession: true,
    canEndSession: true,
    canAddTime: true,
    canSubtractTime: true,
    canUpdateGuests: true,
    canAssignServer: false, // Servers can only manage their own tables
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: true,
    canViewLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  viewer: {
    canStartSession: false,
    canEndSession: false,
    canAddTime: false,
    canSubtractTime: false,
    canUpdateGuests: false,
    canAssignServer: false,
    canGroupTables: false,
    canUngroupTable: false,
    canMoveTable: false,
    canUpdateNotes: false,
    canViewLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
}

// Default admin user
const DEFAULT_ADMIN: User = {
  id: "admin",
  username: "admin",
  password: "2162", // Changed from admin123 to 2162
  role: "admin",
  name: "Administrator",
  permissions: DEFAULT_PERMISSIONS.admin,
}

// Default users
const DEFAULT_USERS: User[] = [
  DEFAULT_ADMIN,
  {
    id: "server1",
    username: "server1",
    password: "server123",
    role: "server",
    name: "Server 1",
    permissions: DEFAULT_PERMISSIONS.server,
  },
  {
    id: "server2",
    username: "server2",
    password: "server123",
    role: "server",
    name: "Server 2",
    permissions: DEFAULT_PERMISSIONS.server,
  },
  {
    id: "viewer",
    username: "viewer",
    password: "viewer123",
    role: "viewer",
    name: "Viewer",
    permissions: DEFAULT_PERMISSIONS.viewer,
  },
]

class UserService {
  private initialized = false
  private isBrowser = typeof window !== "undefined"

  constructor() {
    this.initialize()
  }

  private async initialize() {
    if (!this.isBrowser) return
    this.initialized = true
  }

  async getUsers(): Promise<User[]> {
    return supabaseAuthService.getUsers()
  }

  async addUser(user: User) {
    return supabaseAuthService.addUser(user)
  }

  async updateUser(user: User) {
    return supabaseAuthService.updateUser(user)
  }

  async deleteUser(userId: string) {
    return supabaseAuthService.deleteUser(userId)
  }

  getUserById(userId: string): Promise<User | null> {
    return supabaseAuthService.getUserById(userId)
  }

  getUserByUsername(username: string): Promise<User | null> {
    return supabaseAuthService.getUserByUsername(username)
  }

  getUsersByRole(role: UserRole): Promise<User[]> {
    return supabaseAuthService.getUsersByRole(role)
  }

  authenticate(username: string, password: string): Promise<User | null> {
    return supabaseAuthService.authenticate(username, password)
  }

  getCurrentUser(): Promise<User | null> {
    return supabaseAuthService.getCurrentUser()
  }

  logout() {
    return supabaseAuthService.logout()
  }

  isAuthenticated(): Promise<boolean> {
    return supabaseAuthService.isAuthenticated()
  }

  hasRole(role: UserRole): Promise<boolean> {
    return supabaseAuthService.hasRole(role)
  }

  isAdmin(): Promise<boolean> {
    return supabaseAuthService.isAdmin()
  }

  isServer(): Promise<boolean> {
    return supabaseAuthService.isServer()
  }

  hasPermission(permission: keyof Permission): Promise<boolean> {
    return supabaseAuthService.hasPermission(permission)
  }

  // Subscribe to user changes
  subscribeToUsers(callback: (users: User[]) => void): () => void {
    return supabaseAuthService.subscribeToUsers(callback)
  }
}

const userService = new UserService()
export default userService
