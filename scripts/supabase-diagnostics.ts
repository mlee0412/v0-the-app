import { getSupabaseClient } from "@/lib/supabase/client"

async function runDiagnostics() {
  console.log("🔍 Starting Supabase connection diagnostics...")

  // Check environment variables
  console.log("\n📋 Checking environment variables:")
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL is missing or empty")
  } else {
    console.log(`✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl.substring(0, 8)}...`)
  }

  if (!supabaseKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or empty")
  } else {
    console.log(`✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey.substring(0, 3)}...`)
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Cannot proceed with diagnostics due to missing environment variables")
    return
  }

  try {
    // Initialize Supabase client
    console.log("\n🔌 Initializing Supabase client...")
    const supabase = getSupabaseClient()
    console.log("✅ Supabase client initialized")

    // Test basic connection
    console.log("\n🔄 Testing basic connection...")
    const { data: connectionTest, error: connectionError } = await supabase
      .from("_test_connection")
      .select("*")
      .limit(1)
      .catch((err) => {
        return { data: null, error: err }
      })

    if (connectionError) {
      if (connectionError.code === "PGRST116") {
        console.log("✅ Basic connection successful (table doesn't exist, but connection works)")
      } else {
        console.error(`❌ Connection error: ${connectionError.message}`)
        console.error("Error details:", connectionError)
      }
    } else {
      console.log("✅ Basic connection successful")
    }

    // Test specific tables
    const tables = ["billiard_tables", "servers", "session_logs", "note_templates", "system_settings"]
    console.log("\n📊 Testing access to specific tables:")

    for (const table of tables) {
      try {
        console.log(`\nTesting table: ${table}`)
        const { data, error } = await supabase.from(table).select("count").single()

        if (error) {
          if (error.code === "PGRST116") {
            console.error(`❌ Table "${table}" does not exist`)
          } else {
            console.error(`❌ Error accessing "${table}": ${error.message}`)
            console.error("Error details:", error)
          }
        } else {
          console.log(`✅ Successfully connected to "${table}" table`)
          console.log(`   Row count: ${data.count}`)
        }
      } catch (err) {
        console.error(`❌ Exception when testing "${table}": ${err}`)
      }
    }

    // Test permissions with a write operation
    console.log("\n🔒 Testing write permissions...")
    try {
      // Try to insert and then immediately delete a test record
      const testId = `test-${Date.now()}`
      const { error: insertError } = await supabase.from("servers").insert({
        id: testId,
        name: "TEST_SERVER_DELETE_ME",
        enabled: true,
      })

      if (insertError) {
        console.error(`❌ Write permission test failed: ${insertError.message}`)
        console.error("Error details:", insertError)
      } else {
        console.log("✅ Write operation successful")

        // Clean up the test record
        const { error: deleteError } = await supabase.from("servers").delete().eq("id", testId)
        if (deleteError) {
          console.error(`⚠️ Could not clean up test record: ${deleteError.message}`)
        } else {
          console.log("✅ Clean-up successful")
        }
      }
    } catch (err) {
      console.error(`❌ Exception during write test: ${err}`)
    }

    // Test RLS policies
    console.log("\n🛡️ Testing RLS policies...")
    try {
      const { data: rlsData, error: rlsError } = await supabase.rpc("get_current_user_id")

      if (rlsError) {
        console.error(`❌ Could not check RLS context: ${rlsError.message}`)
      } else {
        console.log(`✅ Current RLS identity: ${rlsData || "anonymous"}`)
      }
    } catch (err) {
      console.error(`❌ Exception during RLS test: ${err}`)
      console.log("ℹ️ This may be normal if the function doesn't exist")
    }

    console.log("\n🏁 Diagnostics complete!")
  } catch (error) {
    console.error("❌ Fatal error during diagnostics:", error)
  }
}

// Run the diagnostics
runDiagnostics()
