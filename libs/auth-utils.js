import { createClient } from "./supabase/client.js";
import { createClient as createServerClient } from "./supabase/server.js";
import { redirect } from "next/navigation";
import config from "../config.js";
import { useState, useEffect } from "react";

// Client-side authentication utilities
export class AuthClient {
  constructor() {
    this.supabase = createClient();
  }

  // Get current user on client-side
  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();
    return { user, error };
  }

  // Check if user is authenticated
  async isAuthenticated() {
    const { user } = await this.getCurrentUser();
    return !!user;
  }

  // Sign out user
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return this.supabase.auth.onAuthStateChange(callback);
  }
}

// Server-side authentication utilities
export class AuthServer {
  constructor() {
    this.supabase = createServerClient();
  }

  // Get current user on server-side
  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();
    return { user, error };
  }

  // Check if user is authenticated
  async isAuthenticated() {
    const { user } = await this.getCurrentUser();
    return !!user;
  }

  // Require authentication (throws if not authenticated)
  async requireAuth() {
    const { user, error } = await this.getCurrentUser();
    if (!user || error) {
      redirect(config.auth.loginUrl);
    }
    return user;
  }

  // Get session
  async getSession() {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession();
    return { session, error };
  }
}

// Singleton instances
export const authClient = new AuthClient();
export const authServer = new AuthServer();

// Higher-order component for protecting pages
export function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    // This will be handled by middleware and layout protection
    return <Component {...props} />;
  };
}

// Hook for client-side authentication
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { user, error } = await authClient.getCurrentUser();
        setUser(user);
        setError(error);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = authClient.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setError(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    signOut: authClient.signOut.bind(authClient),
  };
}

// API route protection helper
export function withAuthAPI(handler) {
  return async function authenticatedHandler(request, context) {
    try {
      const { user } = await authServer.getCurrentUser();

      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Add user to request context
      request.user = user;
      return handler(request, context);
    } catch (error) {
      console.error("[API Auth Error]", error);
      return Response.json({ error: "Authentication failed" }, { status: 401 });
    }
  };
}

// Role-based access control
export function hasRole(user, requiredRole) {
  if (!user || !user.user_metadata) return false;

  const userRole = user.user_metadata.role || "user";
  const roleHierarchy = {
    user: 1,
    admin: 2,
    super_admin: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Check if user has specific permission
export function hasPermission(user, permission) {
  if (!user || !user.user_metadata) return false;

  const permissions = user.user_metadata.permissions || [];
  return permissions.includes(permission);
}

// Development utilities
export const devUtils = {
  // Mock user for development
  mockUser: {
    id: "dev-user-123",
    email: "dev@example.com",
    user_metadata: {
      role: "admin",
      permissions: ["read", "write", "delete"],
    },
  },

  // Force authentication state in development
  forceAuth: (isAuth = true) => {
    if (process.env.NODE_ENV === "development") {
      localStorage.setItem("dev-auth", isAuth.toString());
    }
  },

  // Check if development auth is enabled
  isDevAuthEnabled: () => {
    if (process.env.NODE_ENV === "development") {
      return localStorage.getItem("dev-auth") === "true";
    }
    return false;
  },
};
