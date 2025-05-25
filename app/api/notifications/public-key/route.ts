import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Return the VAPID public key from environment variables
    return NextResponse.json({
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })
  } catch (error) {
    console.error("Error getting public key:", error)
    return NextResponse.json({ error: "Failed to get public key" }, { status: 500 })
  }
}
