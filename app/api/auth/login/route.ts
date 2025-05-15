import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"

// Create a Supabase client with the service role key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Define default permissions for each role
const DEFAULT_PERMISSIONS = {
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
  manager: {
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
  controller: {
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
    canSubtractTime: false,
    canUpdateGuests: true,
    canAssignServer: false,
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

export async function POST(request: NextRequest) {
  try {
    const { userId, pinCode } = await request.json()

    // Special case for Administrator with hardcoded PIN
    if (
      (userId.toLowerCase() === "administrator" ||
        userId.toLowerCase() === "admin" ||
        userId.toLowerCase() === "admin@example.com") &&
      pinCode === "2162"
    ) {
      const adminUser = {
        id: "admin-" + uuidv4().substring(0, 8),
        email: "admin@example.com",
        username: "admin",
        name: "Administrator",
        role: "admin",
        pin_code: "2162",
        permissions: DEFAULT_PERMISSIONS.admin,
      }

      return NextResponse.json({
        success: true,
        user: adminUser,
      })
    }

    // Try to find user in the staff_members table by ID
    const { data: user, error } = await supabase.from("staff_members").select("*").eq("id", userId).single()

    if (error) {
      console.error("Error fetching user:", error)
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Check PIN code
    if (user.pin_code === pinCode) {
      // Get permissions if they exist
      const { data: permissions, error: permissionsError } = await supabase
        .from("staff_permissions")
        .select("*")
        .eq("staff_id", user.id)
        .limit(1)

      if (permissionsError) {
        console.error("Error fetching permissions:", permissionsError)
      }

      const roleName = user.role?.toLowerCase() || "viewer"

      const userWithRole = {
        id: user.id,
        email: user.email || "",
        username: user.email || user.first_name.toLowerCase().replace(/\s+/g, ""),
        name: user.first_name,
        display_name: user.display_name || user.first_name,
        role: roleName,
        pin_code: user.pin_code,
        permissions:
          permissions && permissions.length > 0
            ? permissions[0]
            : DEFAULT_PERMISSIONS[roleName] || DEFAULT_PERMISSIONS.viewer,
        created_at: user.created_at,
        updated_at: user.updated_at,
        auth_id: user.auth_id,
      }

      // Authenticate with Supabase Auth if auth_id exists
      if (user.auth_id && user.email) {
        try {
          // Try to sign in with email and password (PIN code)
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: pinCode,
          })

          if (signInError) {
            console.warn("Supabase Auth sign-in failed, but continuing with custom auth:", signInError)
          }
        } catch (authError) {
          console.warn("Error during Supabase Auth sign-in, but continuing with custom auth:", authError)
        }
      }

      return NextResponse.json({
        success: true,
        user: userWithRole,
      })
    }

    return NextResponse.json({ success: false, error: "Invalid PIN code" }, { status: 401 })
  } catch (error) {
    console.error("Authentication error:", error)
    return NextResponse.json({ success: false, error: "Authentication failed" }, { status: 500 })
  }
}
