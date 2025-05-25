import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create a Supabase client with the service role key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "")

// GET handler to fetch permissions for a staff member
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const { data, error } = await supabase.from("staff_permissions").select("*").eq("staff_id", id).single()

    if (error) {
      console.error(`Error fetching permissions for staff member ${id}:`, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error(`Error in GET /api/staff/permissions/${params.id}:`, error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT handler to update permissions for a staff member
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const permissions = await request.json()

    const { data, error } = await supabase.from("staff_permissions").update(permissions).eq("staff_id", id).select()

    if (error) {
      console.error(`Error updating permissions for staff member ${id}:`, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data?.[0] || {})
  } catch (error) {
    console.error(`Error in PUT /api/staff/permissions/${params.id}:`, error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
