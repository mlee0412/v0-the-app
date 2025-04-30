import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

// Re-export createClient for use in other files
export { createClient }
