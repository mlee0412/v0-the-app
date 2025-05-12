import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
  try {
    const { logs } = await request.json()

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json({ error: "No logs provided or invalid format" }, { status: 400 })
    }

    // Process each log
    const results = await Promise.all(
      logs.map(async (log) => {
        try {
          // Insert the log into the database
          const { error } = await supabase.from("logs").insert(log)

          return {
            id: log.id,
            success: !error,
            error: error ? error.message : null,
          }
        } catch (err) {
          return {
            id: log.id,
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
    console.error("Error processing sync logs:", error)
    return NextResponse.json({ error: "Failed to process sync logs" }, { status: 500 })
  }
}
