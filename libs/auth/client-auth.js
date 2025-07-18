import { createBrowserClient } from "@supabase/ssr";
import { useState, useEffect } from "react";

/**
 * Creates a Supabase client for client-side operations
 * @returns {Object} Supabase client instance
 */
export function createClientSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Custom hook to get the current authenticated user
 * @returns {Object} { user, loading, error }
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const supabase = createClientSupabaseClient();

    // Get initial user
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          setError(error);
        } else {
          setUser(user);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, error };
}

/**
 * Custom hook to check if user is authenticated
 * @returns {Object} { isAuthenticated, loading, user }
 */
export function useAuthCheck() {
  const { user, loading, error } = useAuth();
  
  return {
    isAuthenticated: !!user,
    loading,
    user,
    error
  };
}

/**
 * Sign out the current user
 * @returns {Promise} Supabase sign out result
 */
export async function signOut() {
  const supabase = createClientSupabaseClient();
  return await supabase.auth.signOut();
}

/**
 * Get the current session
 * @returns {Promise} Session object or null
 */
export async function getSession() {
  const supabase = createClientSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}