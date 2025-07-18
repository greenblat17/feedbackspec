# Authentication Middleware Guide

## 🔐 Overview

This guide explains how to use the comprehensive authentication middleware system that's been set up for your FeedbackSpec application.

## 🏗️ Architecture

The authentication system consists of several layers:

1. **Edge Middleware** (`middleware.js`) - Runs on every request
2. **Route Configuration** (`libs/middleware-config.js`) - Defines protected and public routes
3. **Auth Utilities** (`libs/auth-utils.js`) - Helper functions and hooks
4. **Layout Protection** (`app/dashboard/layout.js`) - Server-side page protection
5. **API Protection** - Middleware for API routes

## 🛣️ Route Protection

### Automatic Protection

Routes are automatically protected based on the configuration in `libs/middleware-config.js`:

```javascript
// Protected routes (require authentication)
protectedRoutes: [
  "/dashboard",
  "/dashboard/**", // All dashboard sub-routes
  "/profile",
  "/settings",
  "/api/user/**", // Protected API routes
];

// Auth routes (redirect if already authenticated)
authRoutes: ["/auth", "/signin", "/signup", "/login", "/register"];
```

### Adding New Protected Routes

To protect a new route, simply add it to the `protectedRoutes` array:

```javascript
protectedRoutes: [
  "/dashboard",
  "/dashboard/**",
  "/admin", // New protected route
  "/admin/**", // All admin sub-routes
  "/profile",
  "/settings",
];
```

## 🔒 Page Protection

### Server-Side Protection (Recommended)

Use the layout-based protection for entire sections:

```javascript
// app/admin/layout.js
import { redirect } from "next/navigation";
import { authServer } from "@/libs/auth-utils";

export default async function AdminLayout({ children }) {
  const user = await authServer.requireAuth(); // Redirects if not authenticated

  return <>{children}</>;
}
```

### Client-Side Protection

Use the `useAuth` hook for client-side authentication:

```javascript
// components/ProtectedComponent.js
import { useAuth } from "@/libs/auth-utils";
import { useRouter } from "next/navigation";

export default function ProtectedComponent() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    router.push("/auth");
    return null;
  }

  return <div>Protected content for {user.email}</div>;
}
```

## 🌐 API Route Protection

### Basic API Protection

Protect API routes using the `withAuthAPI` wrapper:

```javascript
// app/api/protected/route.js
import { withAuthAPI } from "@/libs/auth-utils";
import { NextResponse } from "next/server";

async function handler(request) {
  const user = request.user; // Available after authentication

  return NextResponse.json({
    message: `Hello ${user.email}!`,
    userId: user.id,
  });
}

export const GET = withAuthAPI(handler);
export const POST = withAuthAPI(handler);
```

### Role-Based API Protection

```javascript
// app/api/admin/route.js
import { withAuthAPI, hasRole } from "@/libs/auth-utils";
import { NextResponse } from "next/server";

async function handler(request) {
  const user = request.user;

  if (!hasRole(user, "admin")) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return NextResponse.json({ message: "Admin access granted" });
}

export const GET = withAuthAPI(handler);
```

## 🎣 Authentication Hooks

### useAuth Hook

```javascript
import { useAuth } from "@/libs/auth-utils";

export default function MyComponent() {
  const { user, loading, error, isAuthenticated, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!isAuthenticated) return <div>Please log in</div>;

  return (
    <div>
      <h1>Welcome {user.email}</h1>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

## 🔧 Configuration

### Middleware Configuration

Update `libs/middleware-config.js` to customize the authentication behavior:

```javascript
export const middlewareConfig = {
  // Enable/disable debug logging
  settings: {
    debug: process.env.NODE_ENV === "development",
    preserveRedirectPath: true,
  },

  // Customize redirect URLs
  redirects: {
    signInPath: "/auth",
    afterSignInPath: "/dashboard",
    afterSignOutPath: "/",
  },
};
```

### Environment Variables

Ensure these environment variables are set:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🛡️ Security Features

### Automatic Redirects

- **Unauthenticated users** accessing protected routes → Redirected to login
- **Authenticated users** accessing auth routes → Redirected to dashboard
- **Original URL preservation** → Users return to their intended destination after login

### API Security

- **401 Unauthorized** responses for unauthenticated API requests
- **403 Forbidden** responses for insufficient permissions
- **Request context** - User information available in `request.user`

### Session Management

- **Automatic session refresh** on each request
- **Cookie-based authentication** with secure defaults
- **Server-side session validation**

## 📋 Examples

### Protected Dashboard Page

```javascript
// app/dashboard/analytics/page.js
import { authServer } from "@/libs/auth-utils";

export default async function AnalyticsPage() {
  const user = await authServer.requireAuth();

  return (
    <div>
      <h1>Analytics Dashboard</h1>
      <p>Welcome {user.email}</p>
    </div>
  );
}
```

### Protected API with Permissions

```javascript
// app/api/analytics/route.js
import { withAuthAPI, hasPermission } from "@/libs/auth-utils";

async function handler(request) {
  const user = request.user;

  if (!hasPermission(user, "view_analytics")) {
    return Response.json({ error: "Permission denied" }, { status: 403 });
  }

  // Fetch analytics data
  const analyticsData = await getAnalyticsData(user.id);

  return Response.json({ data: analyticsData });
}

export const GET = withAuthAPI(handler);
```

## 🐛 Debugging

### Enable Debug Mode

Set debug mode in `libs/middleware-config.js`:

```javascript
settings: {
  debug: true, // Enable debug logging
}
```

### Check Authentication State

```javascript
// In any component
import { useAuth } from "@/libs/auth-utils";

const { user, loading, error } = useAuth();
console.log("Auth state:", { user, loading, error });
```

### Server-Side Debugging

```javascript
// In any server component
import { authServer } from "@/libs/auth-utils";

const { user, error } = await authServer.getCurrentUser();
console.log("Server auth state:", { user, error });
```

## 🔄 Migration Guide

If you're migrating from the old authentication system:

1. **Remove manual auth checks** from components
2. **Add routes to middleware config** instead of individual checks
3. **Use `useAuth` hook** instead of direct Supabase calls
4. **Update API routes** to use `withAuthAPI`

## 🚀 Best Practices

1. **Use server-side protection** for pages when possible
2. **Protect API routes** with `withAuthAPI`
3. **Use the `useAuth` hook** for client-side auth state
4. **Configure routes centrally** in middleware config
5. **Handle loading states** properly in components
6. **Use role-based access control** for sensitive features

This authentication middleware provides a robust, scalable foundation for your application's security needs. 🔐✨
