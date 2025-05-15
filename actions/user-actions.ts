"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import type { User, Permissions, UserRole } from "@/types/user"
import { ADMIN_LEVEL_ROLES, STAFF_LEVEL_ROLES } from "@/types/user"

export async function getUsers(): Promise<User[]> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching users:", error)
    throw new Error("Failed to fetch users")
  }

  return data || []
}

export async function getUserById(id: string): Promise<User | null> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.from("users").select("*").eq("id", id).single()

  if (error) {
    console.error("Error fetching user:", error)
    return null
  }

  return data
}

export async function createUser(userData: {
  name: string
  username: string
  email: string
  role: string
  password?: string
}): Promise<User> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // First create the auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password || Math.random().toString(36).slice(-8),
    email_confirm: true,
    user_metadata: {
      name: userData.name,
      role: userData.role,
    },
  })

  if (authError) {
    console.error("Error creating auth user:", authError)
    throw new Error(authError.message || "Failed to create user")
  }

  // The users table should be populated automatically via the trigger we set up
  // But we'll update it with additional info
  const { data, error } = await supabase
    .from("users")
    .update({
      username: userData.username,
      role: userData.role,
    })
    .eq("id", authData.user.id)
    .select()
    .single()

  if (error) {
    console.error("Error updating user data:", error)
    throw new Error("User created but failed to update additional details")
  }

  // Create default permissions
  await createDefaultPermissions(authData.user.id, userData.role)

  revalidatePath("/admin/users")
  return data
}

export async function updateUser(userData: {
  id: string
  name: string
  username: string
  email: string
  role: string
}): Promise<User> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Update auth user metadata
  const { error: authError } = await supabase.auth.admin.updateUserById(userData.id, {
    email: userData.email,
    user_metadata: {
      name: userData.name,
      role: userData.role,
    },
  })

  if (authError) {
    console.error("Error updating auth user:", authError)
    throw new Error(authError.message || "Failed to update user")
  }

  // Update user in our custom table
  const { data, error } = await supabase
    .from("users")
    .update({
      name: userData.name,
      username: userData.username,
      role: userData.role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userData.id)
    .select()
    .single()

  if (error) {
    console.error("Error updating user data:", error)
    throw new Error("Failed to update user details")
  }

  revalidatePath("/admin/users")
  return data
}

export async function deleteUser(id: string): Promise<void> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Delete the auth user (this should cascade to our users table)
  const { error } = await supabase.auth.admin.deleteUser(id)

  if (error) {
    console.error("Error deleting user:", error)
    throw new Error("Failed to delete user")
  }

  revalidatePath("/admin/users")
}

export async function getUserPermissions(userId: string): Promise<Permissions | null> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.from("user_permissions").select("*").eq("user_id", userId).single()

  if (error) {
    console.error("Error fetching user permissions:", error)
    return null
  }

  return data
}

export async function updateUserPermissions(userId: string, permissions: Permissions): Promise<void> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { error } = await supabase
    .from("user_permissions")
    .update({
      ...permissions,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)

  if (error) {
    console.error("Error updating user permissions:", error)
    throw new Error("Failed to update user permissions")
  }

  revalidatePath("/admin/users")
}

async function createDefaultPermissions(userId: string, role: string): Promise<void> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Set default permissions based on role
  const permissions: Permissions = {
    // Admin level roles - full access
    can_start_session: ADMIN_LEVEL_ROLES.includes(role as UserRole) || role === "server",
    can_end_session: ADMIN_LEVEL_ROLES.includes(role as UserRole) || role === "server",
    can_add_time: ADMIN_LEVEL_ROLES.includes(role as UserRole) || role === "server",
    can_subtract_time: ADMIN_LEVEL_ROLES.includes(role as UserRole),
    can_update_guests: ADMIN_LEVEL_ROLES.includes(role as UserRole) || role === "server",
    can_assign_server: ADMIN_LEVEL_ROLES.includes(role as UserRole),
    can_group_tables: ADMIN_LEVEL_ROLES.includes(role as UserRole),
    can_ungroup_table: ADMIN_LEVEL_ROLES.includes(role as UserRole),
    can_move_table: ADMIN_LEVEL_ROLES.includes(role as UserRole),
    can_update_notes: ADMIN_LEVEL_ROLES.includes(role as UserRole) || role === "server",
    can_view_logs: ADMIN_LEVEL_ROLES.includes(role as UserRole) || STAFF_LEVEL_ROLES.includes(role as UserRole),
    can_manage_users: ADMIN_LEVEL_ROLES.includes(role as UserRole),
    can_manage_settings: ADMIN_LEVEL_ROLES.includes(role as UserRole),
  }

  const { error } = await supabase.from("user_permissions").insert({
    user_id: userId,
    ...permissions,
  })

  if (error) {
    console.error("Error creating default permissions:", error)
    throw new Error("Failed to create default permissions")
  }
}
