// Configuration for middleware authentication and route protection
export const middlewareConfig = {
  // Routes that require authentication
  protectedRoutes: [
    "/dashboard",
    "/dashboard/**", // All dashboard sub-routes
    "/profile",
    "/settings",
    "/api/user/**", // Protected API routes
    "/api/feedback", // Feedback API routes
  ],

  // Routes that should redirect authenticated users away (login, register, etc.)
  authRoutes: ["/auth", "/signin", "/signup", "/login", "/register"],

  // Public routes that don't require authentication
  publicRoutes: [
    "/",
    "/about",
    "/pricing",
    "/blog",
    "/blog/**",
    "/contact",
    "/privacy-policy",
    "/tos",
    "/terms-of-service",
  ],

  // API routes that don't require authentication
  publicApiRoutes: [
    "/api/auth/**",
    "/api/webhook/**",
    "/api/health",
    "/api/status",
  ],

  // Default redirect paths
  redirects: {
    // Where to redirect unauthenticated users
    signInPath: "/auth",
    // Where to redirect authenticated users after login
    afterSignInPath: "/dashboard",
    // Where to redirect after logout
    afterSignOutPath: "/",
  },

  // Middleware settings
  settings: {
    // Whether to preserve the original URL after authentication
    preserveRedirectPath: true,
    // Query parameter name for storing redirect URL
    redirectParam: "redirectTo",
    // Whether to enable debug logging
    debug: process.env.NODE_ENV === "development",
  },
};

// Helper function to check if a path matches any pattern in an array
function matchesPath(pathname, patterns) {
  return patterns.some((pattern) => {
    if (pattern.endsWith("/**")) {
      // Match the base path and all sub-paths
      const basePath = pattern.slice(0, -3);
      return pathname.startsWith(basePath);
    }
    return pathname === pattern || pathname.startsWith(pattern + "/");
  });
}

// Check if a route is protected
export function isProtectedRoute(pathname) {
  return matchesPath(pathname, middlewareConfig.protectedRoutes);
}

// Check if a route is an auth route
export function isAuthRoute(pathname) {
  return matchesPath(pathname, middlewareConfig.authRoutes);
}

// Check if a route is public
export function isPublicRoute(pathname) {
  return matchesPath(pathname, middlewareConfig.publicRoutes);
}

// Check if an API route is public
export function isPublicApiRoute(pathname) {
  return matchesPath(pathname, middlewareConfig.publicApiRoutes);
}

// Get the appropriate redirect URL based on authentication state
export function getRedirectUrl(isAuthenticated, currentPath, request) {
  const { redirects, settings } = middlewareConfig;

  if (!isAuthenticated) {
    // User is not authenticated, redirect to sign-in
    const signInUrl = new URL(redirects.signInPath, request.url);

    // Preserve the original path if enabled
    if (settings.preserveRedirectPath && currentPath !== "/") {
      signInUrl.searchParams.set(settings.redirectParam, currentPath);
    }

    return signInUrl;
  } else {
    // User is authenticated, check for redirect parameter
    const url = new URL(currentPath, request.url);
    const redirectTo = url.searchParams.get(settings.redirectParam);

    if (redirectTo && !isAuthRoute(redirectTo)) {
      // Redirect to the originally requested page
      return new URL(redirectTo, request.url);
    }

    // Default redirect for authenticated users
    return new URL(redirects.afterSignInPath, request.url);
  }
}

// Debug logging helper
export function debugLog(message, data = null) {
  if (middlewareConfig.settings.debug) {
    console.log(`[Auth Middleware] ${message}`, data || "");
  }
}
