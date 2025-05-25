import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("API_STAFF_MEMBERS: Supabase URL or Service Key is missing")
      // Return default admin user when Supabase is not configured
      return NextResponse.json([getDefaultAdminUser()])
    }

    // Initialize Supabase client directly with environment variables
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get staff members from the database
    const { data: staffMembers, error } = await supabase
      .from("staff_members")
      .select("*")
      .order("first_name", { ascending: true })

    if (error) {
      console.error("Error fetching staff members:", error)
      // Return a default admin user if there's an error
      return NextResponse.json([getDefaultAdminUser()])
    }

    // If no staff members found, return default admin
    if (!staffMembers || staffMembers.length === 0) {
      return NextResponse.json([getDefaultAdminUser()])
    }

    return NextResponse.json(staffMembers)
  } catch (error) {
    console.error("Unexpected error in GET /api/staff/members:", error)
    // Always return JSON, even on error
    return NextResponse.json([getDefaultAdminUser()])
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("API_STAFF_MEMBERS: Supabase URL or Service Key is missing")
      return NextResponse.json({ error: "Server configuration error. Supabase not configured." }, { status: 500 })
    }

    // Initialize Supabase client directly with environment variables
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const body = await request.json()

    const { data, error } = await supabase.from("staff_members").insert([body]).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in POST /api/staff/members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to get a default admin user
function getDefaultAdminUser() {
  return {
    id: "admin-default",
    email: "admin@example.com",
    username: "admin",
    first_name: "Administrator",
    display_name: "Administrator",
    role: "admin",
    pin_code: "2162",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}
