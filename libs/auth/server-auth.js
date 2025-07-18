import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Creates an authenticated Supabase client for server-side operations
 * @returns {Object} Authenticated Supabase client
 */
export function createAuthenticatedSupabaseClient() {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

/**
 * Gets the authenticated user from the current request
 * @returns {Promise<Object|null>} User object or null if not authenticated
 */
export async function getAuthenticatedUser() {
  const supabase = createAuthenticatedSupabaseClient();
  
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}