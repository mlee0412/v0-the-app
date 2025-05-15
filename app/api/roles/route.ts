import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    // Create a Supabase client with the service role key
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("Fetching roles from public.roles table")

    // Fetch roles from the roles table
    const { data: roles, error } = await supabase.from("roles").select("id, role_name, description").order("role_name")

    if (error) {
      console.error("Error fetching roles:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`Successfully fetched ${roles.length} roles`)

    return NextResponse.json(roles)
  } catch (error: any) {
    console.error("Unexpected error fetching roles:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
