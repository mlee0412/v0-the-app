// File: app/api/staff/members/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Ensure environment variables are loaded and checked at the top
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: any; // Declare supabase outside the conditional block

if (supabaseUrl && supabaseServiceRoleKey) {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
} else {
  console.error(
    "API_STAFF_MEMBERS_ROUTE (all members): FATAL ERROR - Supabase URL or Service Role Key is not defined in the environment."
  );
}

// GET handler to fetch all staff members
export async function GET(request: NextRequest) {
  console.log("API_STAFF_MEMBERS_GET (all members): Received request");

  if (!supabase) {
    console.error("API_STAFF_MEMBERS_GET (all members): Supabase client not initialized.");
    return NextResponse.json(
      { error: "Server configuration error.", details: "Supabase client not initialized." },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await supabase
      .from("staff_members")
      .select(`
        id,
        first_name,
        display_name,
        email,
        phone,
        native_language,
        pin_code,
        role,
        auth_id,
        created_at,
        updated_at
      `)
      .order("first_name");

    if (error) {
      console.error(
        "API_STAFF_MEMBERS_GET (all members): Error fetching staff members from Supabase:",
        JSON.stringify(error, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to fetch staff members.", details: error.message },
        { status: 500 }
      );
    }

    console.log(`API_STAFF_MEMBERS_GET (all members): Successfully fetched ${data?.length || 0} staff members.`);
    return NextResponse.json(data || []); 
  } catch (error: any) {
    console.error("API_STAFF_MEMBERS_GET (all members): Unexpected error in GET handler:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Internal server error.", details: error.message },
      { status: 500 }
    );
  }
}

// POST handler to create a new staff member
export async function POST(request: NextRequest) {
  console.log("API_STAFF_MEMBERS_POST (all members): Received request for new member");

  if (!supabase) {
    console.error("API_STAFF_MEMBERS_POST (all members): Supabase client not initialized.");
    return NextResponse.json(
      { error: "Server configuration error.", details: "Supabase client not initialized." },
      { status: 500 }
    );
  }

  try {
    let userData;
    try {
      userData = await request.json();
    } catch (jsonParseError: any) {
      console.error("API_STAFF_MEMBERS_POST (all members): Error parsing request JSON:", jsonParseError.message);
      return NextResponse.json({ error: "Invalid request body. Please send valid JSON." }, { status: 400 });
    }

    const name = userData.name || userData.first_name;

    if (!name || !userData.pin_code || !userData.role) {
      console.error(
        "API_STAFF_MEMBERS_POST (all members): Missing required fields (name/first_name, pin_code, role)."
      );
      return NextResponse.json(
        { error: "Missing required fields: name, pin_code, and role are required." },
        { status: 400 }
      );
    }

    let authId = null;
    if (userData.email && userData.pin_code) {
      console.log("API_STAFF_MEMBERS_POST (all members): Attempting to create Supabase auth user for email:", userData.email);
      const { data: authUserResponse, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.pin_code, 
        email_confirm: true, 
        user_metadata: {
          display_name: userData.display_name || userData.first_name,
          role: userData.role,
        },
      });

      if (authError) {
        console.error("API_STAFF_MEMBERS_POST (all members): Error creating Supabase auth user:", JSON.stringify(authError, null, 2));
      } else if (authUserResponse && authUserResponse.user) {
        authId = authUserResponse.user.id;
        console.log("API_STAFF_MEMBERS_POST (all members): Supabase auth user created with ID:", authId);
      } else {
         console.warn("API_STAFF_MEMBERS_POST (all members): Supabase auth.admin.createUser did not return a user or an error as expected.");
      }
    }

    const staffMemberData = {
      first_name: name,
      display_name: userData.display_name || name,
      email: userData.email || null,
      phone: userData.phone || null,
      native_language: userData.native_language || "English",
      pin_code: userData.pin_code,
      role: userData.role,
      auth_id: authId, 
    };

    const { data: staffMember, error: staffError } = await supabase
      .from("staff_members")
      .insert([staffMemberData])
      .select()
      .single(); 

    if (staffError) {
      console.error(
        "API_STAFF_MEMBERS_POST (all members): Error creating staff member in database:",
        JSON.stringify(staffError, null, 2)
      );
      if (authId) {
        console.log("API_STAFF_MEMBERS_POST (all members): Attempting to clean up auth user due to staff creation failure:", authId);
        await supabase.auth.admin.deleteUser(authId).catch((delErr: any) => console.error("API_STAFF_MEMBERS_POST (all members): Cleanup auth user failed:", delErr.message));
      }
      return NextResponse.json(
        { error: "Failed to create staff member record.", details: staffError.message },
        { status: 500 }
      );
    }
    console.log("API_STAFF_MEMBERS_POST (all members): Staff member created successfully:", staffMember);
    
    return NextResponse.json(staffMember || {});
  } catch (error: any) {
    console.error("API_STAFF_MEMBERS_POST (all members): Unexpected error in POST handler:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Internal server error during user creation.", details: error.message },
      { status: 500 }
    );
  }
}
