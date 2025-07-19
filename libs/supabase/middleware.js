import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import {
  isProtectedRoute,
  isAuthRoute,
  isPublicRoute,
  isPublicApiRoute,
  getRedirectUrl,
  debugLog,
} from "../middleware-config.js";
import { createAuthenticatedSupabaseClient } from "../auth/server-auth.js";

export async function updateSession(request) {
  const url = request.nextUrl.clone();

  // Skip middleware for static files and API routes that don't need auth
  if (
    url.pathname.startsWith("/_next/") ||
    (url.pathname.startsWith("/api/") && isPublicApiRoute(url.pathname))
  ) {
    return NextResponse.next();
  }

  debugLog("Processing request", { pathname: url.pathname });

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get the current user
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    debugLog("Auth error", error.message);
  }

  debugLog("User authenticated", !!user);

  // Check route types
  const isProtected = isProtectedRoute(url.pathname);
  const isAuth = isAuthRoute(url.pathname);
  const isPublic = isPublicRoute(url.pathname);

  debugLog("Route analysis", {
    isProtected,
    isAuth,
    isPublic,
    pathname: url.pathname,
  });

  // Handle protected API routes FIRST (before general protected routes)
  if (
    url.pathname.startsWith("/api/") &&
    isProtectedRoute(url.pathname) &&
    !user
  ) {
    debugLog("Unauthorized API access");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Handle protected routes
  if (isProtected && !user) {
    debugLog("Redirecting unauthenticated user to auth");
    const redirectUrl = getRedirectUrl(false, url.pathname, request);
    return NextResponse.redirect(redirectUrl);
  }

  // Handle auth routes when user is already authenticated
  if (isAuth && user) {
    debugLog("Redirecting authenticated user away from auth route");
    const redirectUrl = getRedirectUrl(true, url.pathname, request);
    return NextResponse.redirect(redirectUrl);
  }

  debugLog("Request allowed");
  return supabaseResponse;
}

// Enhanced helper functions with better error handling
export async function requireAuth(request) {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error("Authentication required");
    }

    return user;
  } catch (error) {
    throw new Error("Authentication required");
  }
}

export async function getAuthUser(request) {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    return { user, error };
  } catch (error) {
    return { user: null, error };
  }
}
