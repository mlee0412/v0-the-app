import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Function to format phone number to E.164 format
function formatToE164(phoneNumber: string): string | null {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, "")

  // If no digits, return null
  if (!digitsOnly || digitsOnly.length === 0) {
    return null
  }

  // Assume US number if 10 digits (add +1)
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`
  }

  // If already has country code (11+ digits), just add +
  if (digitsOnly.length >= 11) {
    return `+${digitsOnly}`
  }

  // If less than 10 digits, it's invalid
  return null
}

export async function GET() {
  try {
    // Create a Supabase client with the service role key
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Fetch users with their role names
    const { data, error } = await supabase
      .from("users")
      .select(`
        id, 
        name, 
        display_name, 
        email, 
        phone, 
        native_language, 
        pin_code, 
        role_id,
        roles:role_id (role_name)
      `)
      .order("name")

    if (error) {
      console.error("Error fetching users:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format the response to include role_name directly
    const formattedUsers = data.map((user) => ({
      id: user.id,
      name: user.name,
      display_name: user.display_name || user.name,
      email: user.email,
      phone: user.phone,
      native_language: user.native_language,
      role_id: user.role_id,
      role: user.roles?.role_name || "viewer",
    }))

    return NextResponse.json(formattedUsers)
  } catch (error: any) {
    console.error("Unexpected error fetching users:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Create a Supabase client with the service role key
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const userData = await request.json()
    const { name, display_name, email, phone, native_language, pin_code, role_id } = userData

    // Validate required fields
    if (!name || !email || !pin_code || !role_id || !native_language) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("Creating auth user with email:", email)

    // Format phone number to E.164 or set to undefined if invalid/empty
    let formattedPhone: string | undefined = undefined
    if (phone && phone.trim() !== "") {
      const e164Phone = formatToE164(phone)
      if (e164Phone) {
        formattedPhone = e164Phone
        console.log("Formatted phone number to E.164:", formattedPhone)
      } else {
        console.log("Invalid phone number format, skipping phone")
      }
    }

    // Create user auth options
    const createUserOptions: any = {
      email,
      password: pin_code,
      email_confirm: true,
    }

    // Only add phone if it's valid
    if (formattedPhone) {
      createUserOptions.phone = formattedPhone
      createUserOptions.phone_confirm = true
    }

    // 1. Create user in auth.users using admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser(createUserOptions)

    if (authError) {
      console.error("Error creating auth user:", authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    console.log("Auth user created successfully:", authUser.user.id)

    // 2. Insert into public.users with auth_id
    const { data: publicUser, error: publicError } = await supabase
      .from("users")
      .insert([
        {
          name,
          display_name: display_name || name,
          email,
          phone: formattedPhone || phone || null, // Store the formatted phone or original or null
          native_language,
          pin_code,
          role_id,
          auth_id: authUser.user.id,
        },
      ])
      .select()

    if (publicError) {
      console.error("Error creating public user:", publicError)

      // Attempt to clean up the auth user if public user creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id)

      return NextResponse.json({ error: publicError.message }, { status: 500 })
    }

    console.log("Public user created successfully:", publicUser[0].id)

    // 3. Call RPC to create default permissions
    const { error: rpcError } = await supabase.rpc("initialize_user_permissions_rpc", { user_id: publicUser[0].id })

    if (rpcError) {
      console.error("Error initializing permissions:", rpcError)
      // We don't fail the request here since the user was created successfully
    }

    return NextResponse.json({
      success: true,
      user: publicUser[0],
    })
  } catch (error: any) {
    console.error("Unexpected error creating user:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
