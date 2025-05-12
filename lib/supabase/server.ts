import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Get environment variables with fallbacks and validation
const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    console.warn("NEXT_PUBLIC_SUPABASE_URL is not defined")
  }
  return url || ""
}

const getSupabaseServiceKey = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is not defined")
  }
  return key || ""
}

const getSupabaseAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined")
  }
  return key || ""
}

// Create a lazy-loaded admin client to prevent initialization errors
let _supabaseAdmin: ReturnType<typeof createClient> | null = null

export const supabaseAdmin = (() => {
  const getClient = () => {
    const url = getSupabaseUrl()
    const serviceKey = getSupabaseServiceKey()

    // Only create client if we have both URL and key
    if (url && serviceKey && !_supabaseAdmin) {
      _supabaseAdmin = createClient<Database>(url, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    }

    return _supabaseAdmin
  }

  // Return a proxy that only tries to access the client when methods are called
  return new Proxy({} as ReturnType<typeof createClient>, {
    get: (target, prop) => {
      const client = getClient()
      if (!client) {
        console.error("Supabase admin client could not be initialized due to missing environment variables")
        // Return a no-op function that returns a rejected promise
        if (typeof prop === "string" && prop !== "then") {
          return () => Promise.reject(new Error("Supabase admin client not initialized"))
        }
      }
      return client ? (client as any)[prop] : undefined
    },
  })
})()

// Helper function to create a client with cookies
export function createBrowserClient(cookieStore: any) {
  const url = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()

  // Check if we have the required values
  if (!url || !anonKey) {
    console.error("Cannot create Supabase browser client: missing environment variables")

    // Return a dummy client that won't crash but will log errors
    return new Proxy({} as ReturnType<typeof createClient>, {
      get: (target, prop) => {
        if (typeof prop === "string" && prop !== "then") {
          return () => Promise.reject(new Error("Supabase client not initialized due to missing environment variables"))
        }
        return undefined
      },
    }) as ReturnType<typeof createClient>
  }

  // Create the actual client if we have the required values
  return createClient<Database>(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options })
      },
    },
  })
}
