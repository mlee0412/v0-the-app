import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
  try {
    const { updates } = await request.json()

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "No updates provided or invalid format" }, { status: 400 })
    }

    // Process each update
    const results = await Promise.all(
      updates.map(async (update) => {
        try {
          // Update the table in the database
          const { error } = await supabase.from("tables").upsert(update, { onConflict: "id" })

          return {
            id: update.id,
            success: !error,
            error: error ? error.message : null,
          }
        } catch (err) {
          return {
            id: update.id,
            success: false,
            error: (err as Error).message,
          }
        }
      }),
    )

    // Count successes and failures
    const successCount = results.filter((r) => r.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: failureCount,
      results,
    })
  } catch (error) {
    console.error("Error processing sync updates:", error)
    return NextResponse.json({ error: "Failed to process sync updates" }, { status: 500 })
  }
}
