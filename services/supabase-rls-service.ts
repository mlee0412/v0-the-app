import { getSupabaseClient } from "@/lib/supabase/client"

export async function checkAndSetupRLS() {
  try {
    const supabase = getSupabaseClient()

    // Check if RLS policies exist for staff_members
    const { data: policiesData, error: policiesError } = await supabase.rpc("get_policies_for_table", {
      table_name: "staff_members",
    })

    if (policiesError || !policiesData || policiesData.length === 0) {
      console.warn("Staff tables may not have RLS policies. Please run the setup-staff-rls-policies.sql script.")
      return false
    }

    return true
  } catch (error) {
    console.error("Error checking RLS policies:", error)
    return false
  }
}

// Define a custom RPC function in Supabase to list policies
// Requires enabling the pgcrypto extension and creating the following function:
/*
CREATE OR REPLACE FUNCTION get_policies_for_table(table_name text)
RETURNS TABLE(policyname text, permissive text, roles text[], cmd text, qual text, with_check text) AS $$
BEGIN
  RETURN QUERY SELECT p.policyname::text, p.permissive::text, p.roles::text[], p.cmd::text, p.qual::text, p.with_check::text
  FROM pg_policy p
  JOIN pg_class c ON p.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE c.relname = table_name
  AND n.nspname = 'public';
END;
$$ LANGUAGE plpgsql;
*/
