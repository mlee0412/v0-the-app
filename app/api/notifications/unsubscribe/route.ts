import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { endpoint, userId } = await request.json()

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 })
    }

    // Create Supabase client
    const supabase = createClient()

    // Remove the subscription from the database
    const { error } = await supabase.from("push_subscriptions").delete().match({ endpoint })

    if (error) {
      console.error("Error removing subscription:", error)
      return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error)
    return NextResponse.json({ error: "Failed to unsubscribe from push notifications" }, { status: 500 })
  }
}
