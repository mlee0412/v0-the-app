import { createClient } from "@supabase/supabase-js"

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Missing Supabase environment variables")
  console.error("Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set")
  process.exit(1)
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log("Testing Supabase connection...")
  console.log(`URL: ${supabaseUrl}`)

  try {
    // Test connection by querying system_settings
    const { data, error } = await supabase.from("system_settings").select("count")

    if (error) {
      console.error("Connection failed:", error.message)

      // Check if table doesn't exist
      if (error.code === "PGRST116") {
        console.log("\nThe system_settings table doesn't exist yet.")
        console.log("You may need to run the setup scripts to create your tables.")
      }

      process.exit(1)
    }

    console.log("Connection successful!")

    // Test querying each table
    const tables = ["billiard_tables", "session_logs", "system_settings", "servers", "note_templates"]

    console.log("\nChecking tables:")

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select("count")

        if (error) {
          console.log(`- ${table}: ❌ (${error.message})`)
        } else {
          console.log(`- ${table}: ✅`)
        }
      } catch (err) {
        console.log(`- ${table}: ❌ (${(err as Error).message})`)
      }
    }

    console.log("\nTest completed successfully!")
  } catch (err) {
    console.error("Error testing connection:", (err as Error).message)
    process.exit(1)
  }
}

testConnection()
