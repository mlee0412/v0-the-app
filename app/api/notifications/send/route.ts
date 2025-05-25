import { NextResponse } from "next/server"
import webPush from "web-push"
import { createClient } from "@supabase/supabase-js"

// Configure web-push with VAPID keys
webPush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@billiardsapp.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || "",
)

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
  try {
    const { title, body, icon, data } = await request.json()

    // Validate required fields
    if (!title || !body) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 })
    }

    // Get all push subscriptions from the database
    const { data: subscriptions, error } = await supabase.from("push_subscriptions").select("*")

    if (error) {
      console.error("Error fetching subscriptions:", error)
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "No subscriptions found" }, { status: 200 })
    }

    // Send push notifications to all subscriptions
    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: icon || "/images/space-billiard-logo.png",
      badge: "/images/space-billiard-logo.png",
      data,
      actions: [
        {
          action: "view",
          title: "View",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ],
    })

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(sub.subscription, notificationPayload)
        return { success: true, endpoint: sub.subscription.endpoint }
      } catch (error) {
        console.error("Error sending notification:", error)

        // If subscription is no longer valid, remove it
        if (error.statusCode === 404 || error.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id)
        }

        return { success: false, endpoint: sub.subscription.endpoint, error }
      }
    })

    const results = await Promise.all(sendPromises)
    const successCount = results.filter((r) => r.success).length

    return NextResponse.json({
      message: `Sent notifications to ${successCount} of ${subscriptions.length} subscriptions`,
      results,
    })
  } catch (error) {
    console.error("Error sending push notifications:", error)
    return NextResponse.json({ error: "Failed to send push notifications" }, { status: 500 })
  }
}
