import { NextResponse } from "next/server"

// This would typically be stored securely in environment variables
// For demo purposes, we're generating a new key pair each time the server starts
// In production, you would use a persistent key pair
let vapidKeys: { publicKey: string; privateKey: string } | null = null

// Generate VAPID keys if they don't exist
async function getVapidKeys() {
  if (!vapidKeys) {
    // In a real app, you would use web-push to generate and store these keys
    // For this demo, we'll create a placeholder
    vapidKeys = {
      publicKey: "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
      privateKey: "UUxI4O8-FbRouAevSmBQ6RLtlwn-eSBKsWEBmgQlgPM",
    }
  }
  return vapidKeys
}

export async function GET() {
  try {
    const keys = await getVapidKeys()

    return NextResponse.json({
      publicKey: keys.publicKey,
    })
  } catch (error) {
    console.error("Error getting VAPID keys:", error)
    return NextResponse.json({ error: "Failed to get public key" }, { status: 500 })
  }
}
