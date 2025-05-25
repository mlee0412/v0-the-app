import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    // Get staff_id from query params
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get("staff_id")

    if (!staffId) {
      return NextResponse.json({ error: "staff_id is required" }, { status: 400 })
    }

    // Create a Supabase client with the service role key
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Fetch permissions for the staff member
    const { data, error } = await supabase.from("staff_permissions").select("*").eq("staff_id", staffId).single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching permissions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || {})
  } catch (error: any) {
    console.error("Unexpected error fetching permissions:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { staff_id, permissions } = await request.json()

    if (!staff_id || !permissions) {
      return NextResponse.json({ error: "staff_id and permissions are required" }, { status: 400 })
    }

    // Create a Supabase client with the service role key
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check if permissions exist for this staff member
    const { data: existingPerms, error: checkError } = await supabase
      .from("staff_permissions")
      .select("id")
      .eq("staff_id", staff_id)

    if (checkError) {
      console.error("Error checking permissions:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    let result

    // Update or insert permissions
    if (existingPerms && existingPerms.length > 0) {
      // Update existing permissions
      const { data, error } = await supabase
        .from("staff_permissions")
        .update(permissions)
        .eq("staff_id", staff_id)
        .select()

      if (error) {
        console.error("Error updating permissions:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      result = data
    } else {
      // Insert new permissions
      const { data, error } = await supabase
        .from("staff_permissions")
        .insert([{ staff_id, ...permissions }])
        .select()

      if (error) {
        console.error("Error inserting permissions:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      result = data
    }

    return NextResponse.json({
      success: true,
      permissions: result?.[0] || permissions,
    })
  } catch (error: any) {
    console.error("Unexpected error updating permissions:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
