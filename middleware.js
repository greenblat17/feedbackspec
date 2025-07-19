import { updateSession } from "./libs/supabase/middleware.js";
import { NextResponse } from "next/server";

export async function middleware(request) {
  try {
    return await updateSession(request);
  } catch (error) {
    console.error("[Middleware Error]", error);

    // For API routes, return JSON error
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    // For regular routes, continue without auth (will be handled by page-level protection)
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * - Static files (.svg, .png, .jpg, .jpeg, .gif, .webp)
     * - API routes that don't need auth
     */
    "/((?!_next/static|_next/image|favicon.ico|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)",
  ],
};
