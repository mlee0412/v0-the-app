import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { title, body, userId, tableId } = await request.json()

    if (!title || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create Supabase client
    const supabase = createClient()

    // Get all subscriptions for the user (or all users if userId is not provided)
    const query = supabase.from("push_subscriptions").select("*")
    if (userId) {
      query.eq("user_id", userId)
    }

    const { data: subscriptions, error } = await query

    if (error) {
      console.error("Error fetching subscriptions:", error)
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "No subscriptions found" }, { status: 404 })
    }

    // In a real implementation, you would use web-push to send notifications
    // For this demo, we'll just log the notifications that would be sent
    console.log(`Would send notification to ${subscriptions.length} subscribers:`, {
      title,
      body,
      data: { tableId },
    })

    // Log the notification in the database
    await supabase.from("notification_logs").insert({
      title,
      body,
      user_id: userId,
      table_id: tableId,
      sent_at: new Date().toISOString(),
      recipients_count: subscriptions.length,
    })

    return NextResponse.json({
      success: true,
      sentTo: subscriptions.length,
    })
  } catch (error) {
    console.error("Error sending push notifications:", error)
    return NextResponse.json({ error: "Failed to send push notifications" }, { status: 500 })
  }
}
