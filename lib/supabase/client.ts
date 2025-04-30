import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Ensure we don't recreate the client on every import in a browser environment
let supabaseClient: ReturnType<typeof createClient> | null = null

// Update the getSupabaseClient function to handle missing environment variables better
export const getSupabaseClient = () => {
  // Always create a new client in a server context to avoid sharing between requests
  if (typeof window === "undefined") {
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        auth: {
          persistSession: false,
        },
      },
    )
  }

  // In the browser, reuse the client instance
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

    if (!supabaseUrl || !supabaseKey) {
      console.warn("Supabase URL or key is missing. Some features may not work correctly.")
    }

    supabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
      },
    })

    // Add a property to check if properly configured
    Object.defineProperty(supabaseClient, "isProperlyConfigured", {
      value: !!(supabaseUrl && supabaseKey),
      writable: false,
    })

    // Only validate connection if we have credentials
    if (supabaseUrl && supabaseKey) {
      supabaseClient.auth.getSession().then(({ data, error }) => {
        if (error) {
          console.error("Supabase connection error:", error.message)
          window.dispatchEvent(new CustomEvent("supabase-disconnected"))
        } else {
          console.log("Supabase connection established")
          window.dispatchEvent(new CustomEvent("supabase-connected"))
        }
      })
    }
  }

  return supabaseClient
}

// Helper method to check if environment variables are configured
export const isSupabaseConfigured = () => {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

// Helper to reset the client (useful for testing and after logout)
export const resetSupabaseClient = () => {
  supabaseClient = null
}
