import { NextResponse } from "next/server"
import webpush from "web-push"

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
let vapidSubject = process.env.VAPID_SUBJECT || ""

// Ensure VAPID subject has mailto: prefix
if (vapidSubject && !vapidSubject.startsWith("mailto:")) {
  vapidSubject = `mailto:${vapidSubject}`
}

if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
  console.error("VAPID keys or subject are missing")
}

// Set VAPID details
try {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey || "", vapidPrivateKey || "")
} catch (error) {
  console.error("Error setting VAPID details:", error)
}

export async function POST(request: Request) {
  try {
    const { subscription, title, body, icon, data } = await request.json()

    if (!subscription) {
      return NextResponse.json({ error: "No subscription provided" }, { status: 400 })
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      notification: {
        title: title || "Billiards Timer",
        body: body || "You have a notification",
        icon: icon || "/images/space-billiard-logo.png",
        badge: "/images/space-billiard-logo.png",
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: 1,
          ...data,
        },
        actions: [
          {
            action: "explore",
            title: "View Details",
          },
        ],
      },
    })

    // Send push notification
    await webpush.sendNotification(subscription, payload)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending push notification:", error)
    return NextResponse.json(
      { error: `Failed to send push notification: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}
