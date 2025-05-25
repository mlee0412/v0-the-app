import webPush from "web-push"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    if (req.method !== "POST") {
      return new NextResponse(JSON.stringify({ message: "Method Not Allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    const subscription = await req.json()

    // Ensure VAPID_SUBJECT is properly formatted with mailto: prefix
    const vapidSubject = process.env.VAPID_SUBJECT || "admin@billiardsapp.com"
    const formattedSubject = vapidSubject.startsWith("mailto:") ? vapidSubject : `mailto:${vapidSubject}`

    webPush.setVapidDetails(
      formattedSubject,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
      process.env.VAPID_PRIVATE_KEY || "",
    )

    const payload = JSON.stringify({
      title: "Billiards App Update",
      body: "A new game is waiting for you!",
    })

    webPush.sendNotification(subscription, payload).catch((error) => {
      console.error("Error sending notification: ", error)
    })

    return new NextResponse(JSON.stringify({ message: "Notification sent" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("Error in POST: ", error)
    return new NextResponse(JSON.stringify({ message: "Internal Server Error", error: error }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}
