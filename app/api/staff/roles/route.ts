import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create a Supabase client with the service role key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "")

// GET handler to fetch all roles
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase.from("staff_roles").select("*").order("role_name")

    if (error) {
      console.error("Error fetching roles:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/staff/roles:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST handler to create a new role
export async function POST(request: NextRequest) {
  try {
    const roleData = await request.json()

    const { data, error } = await supabase.from("staff_roles").insert([roleData]).select()

    if (error) {
      console.error("Error creating role:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data?.[0] || {})
  } catch (error) {
    console.error("Error in POST /api/staff/roles:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
