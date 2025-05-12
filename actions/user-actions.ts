"use server"

import { supabaseAdmin } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { User, Permissions } from "@/types/user"
import { v4 as uuidv4 } from "uuid"

// Valid roles that match the database constraint
const VALID_ROLES = [
  "admin",
  "server",
  "viewer",
  "controller",
  "manager",
  "bartender",
  "barback",
  "kitchen",
  "security",
  "karaoke_main",
  "karaoke_staff",
  "staff",
]

// Map UI roles to database-allowed roles
// The database constraint likely only allows admin, server, viewer
const ROLE_MAPPING: Record<string, string> = {
  admin: "admin",
  server: "server",
  viewer: "viewer",
  controller: "admin", // Map to admin
  manager: "admin", // Map to admin
  bartender: "server", // Map to server
  barback: "server", // Map to server
  kitchen: "server", // Map to server
  security: "viewer", // Map to viewer
  karaoke_main: "server", // Map to server
  karaoke_staff: "server", // Map to server
  staff: "server", // Map to server
}

// Store a mapping of user IDs to their original roles
// This is a server-side in-memory cache that will be lost on server restart
// but it's a simple solution that doesn't require database schema changes
const userRoleCache: Record<string, string> = {}

export async function getUsers(): Promise<User[]> {
  try {
    // First, fetch all users
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })

    if (usersError) {
      console.error("Error fetching users:", usersError)
      throw new Error("Failed to fetch users")
    }

    // Then, fetch all roles to map them to users
    const { data: rolesData, error: rolesError } = await supabaseAdmin.from("roles").select("*")

    if (rolesError) {
      console.error("Error fetching roles:", rolesError)
      // Continue with users data only
    }

    // Create a map of role_id to role for quick lookup
    const rolesMap = rolesData
      ? rolesData.reduce(
          (map, role) => {
            map[role.id] = role
            return map
          },
          {} as Record<string, any>,
        )
      : {}

    // Map users with their roles
    const users = usersData.map((user) => {
      // If we have role_id and it exists in our roles map, use that role's data
      const userData = {
        ...user,
        // Add the original role from our cache if it exists
        original_role: userRoleCache[user.id] || null,
      }

      if (user.role_id && rolesMap[user.role_id]) {
        return {
          ...userData,
          roleData: rolesMap[user.role_id],
        }
      }

      // Otherwise just return the user as is
      return userData
    })

    return users || []
  } catch (error) {
    console.error("Error in getUsers:", error)
    throw error
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const { data, error } = await supabaseAdmin.from("users").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching user:", error)
      return null
    }

    // If user has role_id, fetch the role details
    if (data.role_id) {
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from("roles")
        .select("*")
        .eq("id", data.role_id)
        .single()

      if (!roleError && roleData) {
        return {
          ...data,
          roleData,
          original_role: userRoleCache[data.id] || null,
        }
      }
    }

    return {
      ...data,
      original_role: userRoleCache[data.id] || null,
    }
  } catch (error) {
    console.error("Error in getUserById:", error)
    return null
  }
}

// Updated createUser function to work with existing schema
export async function createUser(formData: {
  name: string
  username: string
  email: string // We'll still collect this but not use it in the insert
  role: string
  pin_code?: string
}): Promise<User> {
  // Validate PIN code
  if (formData.pin_code && (formData.pin_code.length !== 4 || !/^\d+$/.test(formData.pin_code))) {
    throw new Error("PIN code must be exactly 4 digits")
  }

  // Validate role - make sure formData.role exists before checking includes
  if (!formData.role || !VALID_ROLES.includes(formData.role)) {
    throw new Error(`Invalid role: ${formData.role || "undefined"}. Valid roles are: ${VALID_ROLES.join(", ")}`)
  }

  try {
    // Get role_id from role name
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("name", formData.role)
      .single()

    let role_id = null
    if (roleError) {
      console.warn("Role not found, using role name only:", formData.role)
    } else {
      role_id = roleData.id
    }

    // Map role to allowed values for the database constraint
    const mappedRole = ROLE_MAPPING[formData.role] || "viewer" // Default to viewer if mapping not found
    console.log(`Mapped UI role ${formData.role} to database role ${mappedRole}`)

    // Generate a UUID for the user
    const userId = uuidv4()

    // Store the original role in our cache
    userRoleCache[userId] = formData.role

    // Insert directly into users table without the email field
    console.log("Inserting user directly into users table...")

    // First, let's check the schema to see what columns are available
    const { data: columns, error: columnsError } = await supabaseAdmin.rpc("get_table_columns", { table_name: "users" })

    if (columnsError) {
      console.error("Error checking table schema:", columnsError)
      // Continue anyway, we'll try with the known columns
    } else {
      console.log("Available columns in users table:", columns)
    }

    // Create the insert data object with only the fields we know exist
    const insertData: any = {
      id: userId,
      username: formData.username,
      name: formData.name,
      role: mappedRole, // Use the mapped role that satisfies the constraint
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Only add role_id if we have it
    if (role_id) {
      insertData.role_id = role_id
    }

    // Only add pin_code if provided
    if (formData.pin_code) {
      insertData.pin_code = formData.pin_code
    }

    // Insert the user
    const { data: userData, error: userError } = await supabaseAdmin.from("users").insert(insertData).select().single()

    if (userError) {
      console.error("Error inserting user:", userError)
      throw new Error(`Failed to create user: ${userError.message}`)
    }

    // Create default permissions for the user
    await createDefaultPermissions(userId, formData.role) // Use original role for permissions

    revalidatePath("/admin/users")
    return {
      ...userData,
      original_role: formData.role,
    }
  } catch (error: any) {
    console.error("Error in createUser:", error)
    throw new Error(error.message || "Failed to create user")
  }
}

export async function updateUser(userData: {
  id: string
  name: string
  username: string
  role: string
  pin_code?: string
  changingPassword?: boolean
}): Promise<User> {
  // Validate PIN code if changing password
  if (
    userData.changingPassword &&
    userData.pin_code &&
    (userData.pin_code.length !== 4 || !/^\d+$/.test(userData.pin_code))
  ) {
    throw new Error("PIN code must be exactly 4 digits")
  }

  // Validate role - make sure userData.role exists before checking includes
  if (!userData.role || !VALID_ROLES.includes(userData.role)) {
    throw new Error(`Invalid role: ${userData.role || "undefined"}. Valid roles are: ${VALID_ROLES.join(", ")}`)
  }

  try {
    // Get role_id from role name
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("name", userData.role)
      .single()

    let role_id = null
    if (roleError) {
      console.warn("Role not found, using role name only:", userData.role)
    } else {
      role_id = roleData.id
    }

    // Map role to allowed values for the database constraint
    const mappedRole = ROLE_MAPPING[userData.role] || "viewer" // Default to viewer if mapping not found
    console.log(`Mapped UI role ${userData.role} to database role ${mappedRole}`)

    // Store the original role in our cache
    userRoleCache[userData.id] = userData.role

    // Update user in our custom table first
    const updateData: any = {
      name: userData.name,
      username: userData.username,
      role: mappedRole, // Use the mapped role that satisfies the constraint
      updated_at: new Date().toISOString(),
    }

    // Only set role_id if we found a valid role
    if (role_id) {
      updateData.role_id = role_id
    }

    // Only update pin_code if changing password
    if (userData.changingPassword && userData.pin_code) {
      updateData.pin_code = userData.pin_code
    }

    // Update directly in the users table
    const { data, error } = await supabaseAdmin.from("users").update(updateData).eq("id", userData.id).select().single()

    if (error) {
      console.error("Error updating user data:", error)
      throw new Error("Failed to update user details: " + (error.message || "Unknown error"))
    }

    revalidatePath("/admin/users")
    return {
      ...data,
      original_role: userData.role,
    }
  } catch (error: any) {
    console.error("Error in updateUser:", error)
    throw new Error(error.message || "Failed to update user")
  }
}

export async function deleteUser(id: string): Promise<void> {
  try {
    // Delete directly from the users table
    const { error } = await supabaseAdmin.from("users").delete().eq("id", id)

    if (error) {
      console.error("Error deleting user:", error)
      throw new Error("Failed to delete user: " + (error.message || "Unknown error"))
    }

    // Also try to delete permissions
    try {
      await supabaseAdmin.from("user_permissions").delete().eq("user_id", id)
    } catch (permError) {
      console.warn("Non-critical error deleting permissions:", permError)
      // Continue anyway
    }

    // Remove from our role cache
    delete userRoleCache[id]

    revalidatePath("/admin/users")
  } catch (error: any) {
    console.error("Error in deleteUser:", error)
    throw new Error(error.message || "Failed to delete user")
  }
}

export async function getUserPermissions(userId: string): Promise<Permissions | null> {
  const { data, error } = await supabaseAdmin.from("user_permissions").select("*").eq("user_id", userId).single()

  if (error) {
    console.error("Error fetching user permissions:", error)
    return null
  }

  return data
}

export async function updateUserPermissions(userId: string, permissions: Permissions): Promise<void> {
  try {
    // Check if permissions record exists
    const { data: existingPermissions, error: checkError } = await supabaseAdmin
      .from("user_permissions")
      .select("user_id")
      .eq("user_id", userId)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "not found" error
      console.error("Error checking permissions:", checkError)
      throw new Error(`Failed to check existing permissions: ${checkError.message || "Unknown error"}`)
    }

    let updateError

    if (existingPermissions) {
      // Update existing permissions
      const { error } = await supabaseAdmin
        .from("user_permissions")
        .update({
          ...permissions,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)

      updateError = error
    } else {
      // Insert new permissions
      const { error } = await supabaseAdmin.from("user_permissions").insert({
        user_id: userId,
        ...permissions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      updateError = error
    }

    if (updateError) {
      console.error("Error updating user permissions:", updateError)
      throw new Error(`Failed to update user permissions: ${updateError.message || "Unknown error"}`)
    }

    revalidatePath("/admin/users")
  } catch (error: any) {
    console.error("Error in updateUserPermissions:", error)
    throw new Error(error.message || "Failed to update user permissions")
  }
}

async function createDefaultPermissions(userId: string, role: string): Promise<void> {
  // Set default permissions based on role
  const permissions: Permissions = {
    can_start_session: role !== "viewer",
    can_end_session: role !== "viewer",
    can_add_time: role !== "viewer",
    can_subtract_time: role === "admin" || role === "controller" || role === "manager",
    can_update_guests: role !== "viewer",
    can_assign_server: role === "admin" || role === "controller" || role === "manager",
    can_group_tables: role === "admin" || role === "controller" || role === "manager",
    can_ungroup_table: role === "admin" || role === "controller" || role === "manager",
    can_move_table: role === "admin" || role === "controller" || role === "manager",
    can_update_notes: role !== "viewer",
    can_view_logs: role !== "viewer" && role !== "barback" && role !== "kitchen",
    can_manage_users: role === "admin" || role === "controller",
    can_manage_settings: role === "admin" || role === "controller",
  }

  try {
    const { error } = await supabaseAdmin.from("user_permissions").insert({
      user_id: userId,
      ...permissions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error creating default permissions:", error)
      throw new Error("Failed to create default permissions")
    }
  } catch (error) {
    console.error("Error in createDefaultPermissions:", error)
    // Don't throw here, as this is a secondary operation
  }
}

export async function getRoles() {
  const { data, error } = await supabaseAdmin.from("roles").select("*").order("name")

  if (error) {
    console.error("Error fetching roles:", error)
    throw new Error("Failed to fetch roles")
  }

  return data || []
}
