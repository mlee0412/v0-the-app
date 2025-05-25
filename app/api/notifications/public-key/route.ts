import { NextResponse } from "next/server"

export async function GET() {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    if (!publicKey) {
      console.error("VAPID public key is missing")
      return NextResponse.json({ error: "VAPID public key is not configured" }, { status: 500 })
    }

    return NextResponse.json({ publicKey })
  } catch (error) {
    console.error("Error retrieving VAPID public key:", error)
    return NextResponse.json({ error: "Failed to retrieve VAPID public key" }, { status: 500 })
  }
}
