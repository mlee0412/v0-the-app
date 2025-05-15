import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create a Supabase client with the service role key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "")

// GET handler to fetch a specific staff member
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

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
      .eq("id", id)
      .single()

    if (error) {
      console.error(`Error fetching staff member ${id}:`, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error(`Error in GET /api/staff/members/${params.id}:`, error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT handler to update a staff member
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const userData = await request.json()

    const { data, error } = await supabase
      .from("staff_members")
      .update({
        first_name: userData.first_name,
        display_name: userData.display_name || userData.first_name,
        email: userData.email,
        phone: userData.phone || null,
        native_language: userData.native_language || "English",
        pin_code: userData.pin_code,
        role: userData.role,
      })
      .eq("id", id)
      .select()

    if (error) {
      console.error(`Error updating staff member ${id}:`, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data?.[0] || {})
  } catch (error) {
    console.error(`Error in PUT /api/staff/members/${params.id}:`, error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE handler to delete a staff member
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Get the auth_id first
    const { data: user, error: fetchError } = await supabase
      .from("staff_members")
      .select("auth_id")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error(`Error fetching staff member ${id} for deletion:`, fetchError)
    }

    // Delete permissions first (foreign key constraint)
    const { error: permError } = await supabase.from("staff_permissions").delete().eq("staff_id", id)

    if (permError) {
      console.error(`Error deleting permissions for staff member ${id}:`, permError)
    }

    // Delete from staff_members table
    const { error } = await supabase.from("staff_members").delete().eq("id", id)

    if (error) {
      console.error(`Error deleting staff member ${id}:`, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If there's an auth_id, delete the auth user too
    if (user?.auth_id) {
      try {
        await supabase.auth.admin.deleteUser(user.auth_id)
      } catch (authError) {
        console.error(`Error deleting auth user for staff member ${id}:`, authError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`Error in DELETE /api/staff/members/${params.id}:`, error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
