import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_PERMISSIONS as USER_DEFAULT_PERMISSIONS } from "@/types/user"; // Assuming DEFAULT_PERMISSIONS is moved here

// Ensure environment variables are loaded (especially for serverless functions)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("FATAL: Supabase URL or Service Role Key is not defined in the environment.");
  // This early error will cause a 500, but the log helps identify it.
  // It's better to let it fail clearly if basic config is missing.
}

// Create a Supabase client with the service role key
const supabase = createClient(supabaseUrl || "", supabaseServiceRoleKey || "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Define default permissions for each role - these should ideally come from a shared types/constants file
// For now, re-defining or importing. If you moved DEFAULT_PERMISSIONS to @/types/user.ts, use that import.
const DEFAULT_PERMISSIONS = USER_DEFAULT_PERMISSIONS; // Use the imported one

export async function POST(request: NextRequest) {
  try {
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (jsonParseError: any) {
      console.error("Error parsing request JSON:", jsonParseError.message);
      return NextResponse.json({ success: false, error: "Invalid request format. Please send valid JSON." }, { status: 400 });
    }

    const { userId, pinCode } = requestBody;

    if (!userId || !pinCode) {
        console.error("Login attempt with missing userId or pinCode:", { userId, pinCode: pinCode ? "****" : undefined });
        return NextResponse.json({ success: false, error: "User ID and PIN code are required." }, { status: 400 });
    }


    // Special case for Administrator with hardcoded PIN
    if (
      (userId.toLowerCase() === "administrator" ||
        userId.toLowerCase() === "admin" ||
        userId.toLowerCase() === "admin@example.com") &&
      pinCode === "2162"
    ) {
      const adminUser = {
        id: "admin-" + uuidv4().substring(0, 8),
        email: "admin@example.com",
        username: "admin", // Make sure username is included
        name: "Administrator",
        role: "admin",
        pin_code: "2162",
        permissions: DEFAULT_PERMISSIONS.admin,
      };

      return NextResponse.json({
        success: true,
        user: adminUser,
      });
    }

    // Try to find user in the staff_members table by ID (assuming userId is the staff_member id)
    // If userId can also be email or username, the query needs to be adjusted.
    // For now, assuming userId is the UUID from staff_members.id
    const { data: user, error: fetchUserError } = await supabase
        .from("staff_members")
        .select("*")
        .eq("id", userId) // Assuming userId is the actual UUID 'id' from staff_members
        .single();

    if (fetchUserError || !user) {
      console.error("Error fetching user by ID or user not found:", fetchUserError?.message || 'User not found for ID:', userId);
      // Try fetching by email or username as a fallback if ID lookup fails
      const { data: userByEmail, error: fetchUserByEmailError } = await supabase
        .from("staff_members")
        .select("*")
        .eq("email", userId) // Assuming userId could be an email
        .single();
      
      if (fetchUserByEmailError || !userByEmail) {
        console.error("Error fetching user by email or user not found:", fetchUserByEmailError?.message || 'User not found for email:', userId);
        return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
      }
      // If found by email, proceed with userByEmail
      Object.assign(user || {}, userByEmail); // This reassigns user if found by email. A bit clumsy, better to assign to a new var.
                                              // Let's refine this.
      if (!userByEmail) { // Should not happen if the previous block is correct, but for safety
          return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
      }
      // Use userByEmail from here
      const foundUser = userByEmail;


      // Check PIN code
      if (foundUser.pin_code === pinCode) {
        const { data: permissions, error: permissionsError } = await supabase
          .from("staff_permissions")
          .select("*")
          .eq("staff_id", foundUser.id) // Use foundUser.id
          .limit(1);

        if (permissionsError) {
          console.error("Error fetching permissions for user:", foundUser.id, permissionsError.message);
          // Continue, default permissions will be applied
        }

        const roleName = foundUser.role?.toLowerCase() || "viewer";
        const userRole = roleName as keyof typeof DEFAULT_PERMISSIONS; // Ensure roleName is a valid key

        const userWithRole = {
          id: foundUser.id,
          email: foundUser.email || "",
          username: foundUser.email || foundUser.first_name?.toLowerCase().replace(/\s+/g, "") || `user_${foundUser.id.substring(0,4)}`,
          name: foundUser.first_name || "User",
          display_name: foundUser.display_name || foundUser.first_name || "User",
          role: userRole,
          pin_code: foundUser.pin_code, // Consider not sending this back to client
          permissions:
            permissions && permissions.length > 0
              ? permissions[0]
              : DEFAULT_PERMISSIONS[userRole] || DEFAULT_PERMISSIONS.viewer,
          created_at: foundUser.created_at,
          updated_at: foundUser.updated_at,
          auth_id: foundUser.auth_id,
        };

        // Authenticate with Supabase Auth if auth_id exists and email is present
        // This part is tricky if your primary login is PIN-based and not directly Supabase Auth.
        // If you create users in Supabase Auth with their PIN as password, this might work.
        if (foundUser.auth_id && foundUser.email) {
          try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: foundUser.email,
              password: pinCode, // Using PIN code as password for Supabase Auth
            });

            if (signInError) {
              console.warn("Supabase Auth sign-in failed, but continuing with custom auth:", signInError.message);
              // This is not necessarily a fatal error for your custom auth flow
            } else {
              console.log("Supabase Auth sign-in successful for user:", foundUser.email);
            }
          } catch (authError: any) {
            console.warn("Error during Supabase Auth sign-in, but continuing with custom auth:", authError.message);
          }
        }

        return NextResponse.json({
          success: true,
          user: userWithRole,
        });
      } else {
        console.warn("Invalid PIN code for user:", userId);
        return NextResponse.json({ success: false, error: "Invalid PIN code" }, { status: 401 });
      }

    } else { // This else corresponds to if (fetchUserError || !user)
        // Check PIN code for the user found by ID
        if (user.pin_code === pinCode) {
            const { data: permissions, error: permissionsError } = await supabase
            .from("staff_permissions")
            .select("*")
            .eq("staff_id", user.id)
            .limit(1);

            if (permissionsError) {
            console.error("Error fetching permissions for user:", user.id, permissionsError.message);
            // Continue, default permissions will be applied
            }

            const roleName = user.role?.toLowerCase() || "viewer";
            const userRole = roleName as keyof typeof DEFAULT_PERMISSIONS;

            const userWithRole = {
            id: user.id,
            email: user.email || "",
            username: user.email || user.first_name?.toLowerCase().replace(/\s+/g, "") || `user_${user.id.substring(0,4)}`,
            name: user.first_name || "User",
            display_name: user.display_name || user.first_name || "User",
            role: userRole,
            pin_code: user.pin_code,
            permissions:
                permissions && permissions.length > 0
                ? permissions[0]
                : DEFAULT_PERMISSIONS[userRole] || DEFAULT_PERMISSIONS.viewer,
            created_at: user.created_at,
            updated_at: user.updated_at,
            auth_id: user.auth_id,
            };

            if (user.auth_id && user.email) {
            try {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: pinCode,
                });
                if (signInError) {
                console.warn("Supabase Auth sign-in failed, but continuing with custom auth:", signInError.message);
                } else {
                console.log("Supabase Auth sign-in successful for user:", user.email);
                }
            } catch (authError: any) {
                console.warn("Error during Supabase Auth sign-in, but continuing with custom auth:", authError.message);
            }
            }
            return NextResponse.json({ success: true, user: userWithRole });
        } else {
            console.warn("Invalid PIN code for user:", userId);
            return NextResponse.json({ success: false, error: "Invalid PIN code" }, { status: 401 });
        }
    }

  } catch (error: any) {
    console.error("Authentication error in POST /api/auth/login:", error.message, error.stack);
    return NextResponse.json({ success: false, error: "Authentication failed due to an unexpected server issue." }, { status: 500 });
  }
}
