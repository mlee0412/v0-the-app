"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

export function SupabaseInitializer({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false)
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        // Check if Supabase is accessible by checking the health endpoint
        // This avoids querying specific tables that might not exist yet
        const { error: healthError } = await supabase.rpc("get_service_status", {}).maybeSingle()

        // If the RPC doesn't exist, try a simpler approach
        if (healthError) {
          // Try to get the current timestamp from Supabase
          const { data, error } = await supabase.from("billiard_tables").select("count").limit(1)

          // If that fails too, check if it's just because the table doesn't exist
          if ((error && error.code === "PGRST116") || error?.message?.includes("does not exist")) {
            console.log("Tables not yet created, but connection is working")
            // This is fine - tables just don't exist yet
          } else if (error) {
            console.error("Error connecting to Supabase:", error)
            toast({
              title: "Database Connection Issue",
              description: "Could not verify database tables. The app will still try to function.",
              variant: "destructive",
            })
          }
        }

        // We're initialized regardless of errors
        setInitialized(true)
      } catch (err) {
        console.error("Unexpected error initializing Supabase:", err)
        setInitialized(true) // Still mark as initialized to prevent blocking the UI
      }
    }

    initializeSupabase()
  }, [supabase, toast])

  // Don't show any RLS warnings, just render the children
  return <>{children}</>
}
