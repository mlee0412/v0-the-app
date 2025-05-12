import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Set VAPID details
webpush.setVapidDetails(
  "mailto:you@example.com", // Replace with your email
  "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEdOkHndftQ+y/qbNYFUCDnT4qYbel" +
    "RsU9eT+TL4zBlGn8Po3F8rGlHTSgJOsdA3wIO8LuOBisOTVI+wYeYP6yLA==",
  "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgSP4LB2+PInoLvKnJ" +
    "N4fTadjdLIC25VoQdv48jJ+aTsChRANCAAR06Qed1+1D7L+ps1gVQIOdPipht6VG" +
    "xT15P5MvjMGUafw+jcXysaUdNKAk6x0DfAg7wu44GKw5NUj7Bh5g/rIs",
)

export async function POST(request: Request) {
  try {
    const { userId, title, body, url, actionId, actions } = await request.json()

    // Validate required fields
    if (!title || !body) {
      return NextResponse.json({ error: "Missing required fields: title and body" }, { status: 400 })
    }

    // Get user's subscription
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId)
      .single()

    if (subscriptionError || !subscriptionData) {
      return NextResponse.json({ error: "Subscription not found for user" }, { status: 404 })
    }

    // Parse subscription
    const subscription = JSON.parse(subscriptionData.subscription)

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body,
      url: url || "/",
      actionId,
      actions: actions || [{ action: "view", title: "View" }],
      timestamp: Date.now(),
    })

    // Send notification
    await webpush.sendNotification(subscription, payload)

    // Log notification
    await supabase.from("notification_logs").insert({
      user_id: userId,
      title,
      body,
      sent_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending push notification:", error)
    return NextResponse.json({ error: "Failed to send push notification" }, { status: 500 })
  }
}

// Handle subscription creation/update
export async function PUT(request: Request) {
  try {
    const { userId, subscription } = await request.json()

    if (!userId || !subscription) {
      return NextResponse.json({ error: "Missing required fields: userId and subscription" }, { status: 400 })
    }

    // Save subscription to database
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        subscription: JSON.stringify(subscription),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )

    if (error) {
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving push subscription:", error)
    return NextResponse.json({ error: "Failed to save push subscription" }, { status: 500 })
  }
}

// Handle subscription deletion
export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing required field: userId" }, { status: 400 })
    }

    // Remove subscription from database
    const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", userId)

    if (error) {
      return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting push subscription:", error)
    return NextResponse.json({ error: "Failed to delete push subscription" }, { status: 500 })
  }
}
