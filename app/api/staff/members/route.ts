import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create a Supabase client with the service role key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// GET handler to fetch all staff members
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from("staff_members")
      .select(`
        id, 
        first_name, 
        display_name, 
        email, 
        phone, 
        native_language, 
        pin_code, 
        role, 
        auth_id,
        created_at, 
        updated_at
      `)
      .order("first_name")

    if (error) {
      console.error("Error fetching staff members:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in GET /api/staff/members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST handler to create a new staff member
export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()

    // 1. Create auth user if email is provided
    let authId = null
    if (userData.email && userData.pin_code) {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.pin_code,
        email_confirm: true,
      })

      if (authError) {
        console.error("Error creating auth user:", authError)
        return NextResponse.json({ error: authError.message }, { status: 500 })
      }

      authId = authUser.user.id
    }

    // 2. Insert into staff_members
    const { data: staffMember, error: staffError } = await supabase
      .from("staff_members")
      .insert([
        {
          first_name: userData.first_name,
          display_name: userData.display_name || userData.first_name,
          email: userData.email,
          phone: userData.phone || null,
          native_language: userData.native_language || "English",
          pin_code: userData.pin_code,
          role: userData.role,
          auth_id: authId,
        },
      ])
      .select()

    if (staffError) {
      console.error("Error creating staff member:", staffError)

      // Clean up auth user if staff creation failed
      if (authId) {
        await supabase.auth.admin.deleteUser(authId)
      }

      return NextResponse.json({ error: staffError.message }, { status: 500 })
    }

    // 3. Insert default permissions
    if (staffMember && staffMember.length > 0) {
      const staffId = staffMember[0].id
      const role = staffMember[0].role?.toLowerCase() || "viewer"

      // Get default permissions for the role
      const defaultPermissions = getDefaultPermissionsForRole(role)

      // Insert permissions directly instead of using the function
      const { error: permError } = await supabase.from("staff_permissions").insert([
        {
          staff_id: staffId,
          ...defaultPermissions,
        },
      ])

      if (permError) {
        console.error("Error creating permissions:", permError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json(staffMember?.[0] || {})
  } catch (error: any) {
    console.error("Error in POST /api/staff/members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to get default permissions based on role
function getDefaultPermissionsForRole(role: string) {
  const adminPermissions = {
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
  }

  const serverPermissions = {
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
  }

  const viewerPermissions = {
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
  }

  switch (role) {
    case "admin":
    case "manager":
    case "controller":
      return adminPermissions
    case "server":
      return serverPermissions
    default:
      return viewerPermissions
  }
}
