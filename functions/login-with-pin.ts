import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { email, passcode } = await req.json()

    // Validate inputs
    if (!email || !passcode) {
      return new Response(JSON.stringify({ error: "Email and passcode are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Verify passcode using the database function
    const { data: verifyResult, error: verifyError } = await supabase.rpc("verify_passcode", {
      email,
      passcode,
    })

    if (verifyError || !verifyResult) {
      return new Response(JSON.stringify({ error: "Invalid email or passcode" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*, role:roles(name)")
      .eq("email", email)
      .single()

    if (userError || !userData) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Get auth user by email
    const { data: authData, error: authError } = await supabase.auth.admin.getUserByEmail(email)

    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Auth user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Create a new session
    const { data: session, error: sessionError } = await supabase.auth.admin.createSession({
      userId: authData.user.id,
      properties: {
        role: userData.role.name,
      },
    })

    if (sessionError) {
      return new Response(JSON.stringify({ error: "Failed to create session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(
      JSON.stringify({
        session: session,
        user: {
          ...userData,
          role: userData.role.name,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
