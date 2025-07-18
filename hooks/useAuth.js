'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGet, usePost, usePut } from './useAPI';

/**
 * Custom hook for authentication operations
 */
export function useAuth() {
  // Get user profile
  const {
    data: profileData,
    loading: loadingProfile,
    error: profileError,
    refetch: refetchProfile,
    mutate: mutateProfile,
  } = useGet('/api/user/profile');

  // Update user profile
  const {
    execute: updateProfile,
    loading: updatingProfile,
    error: updateProfileError,
  } = usePut('/api/user/profile');

  // Local state for auth status
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setAuthLoading(true);
        
        // Check if we have a session by trying to fetch profile
        await refetchProfile();
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [refetchProfile]);

  // Update authentication status when profile data changes
  useEffect(() => {
    if (profileData) {
      setIsAuthenticated(true);
    } else if (profileError) {
      setIsAuthenticated(false);
    }
  }, [profileData, profileError]);

  // Helper to update profile optimistically
  const updateProfileOptimistic = useCallback(async (updates) => {
    const originalData = profileData;

    try {
      // Optimistically update UI
      if (profileData) {
        mutateProfile({
          ...profileData,
          data: { ...profileData.data, ...updates },
        });
      }

      // Make API call
      const result = await updateProfile({ body: updates });

      // Update with real data
      if (result.success && profileData) {
        mutateProfile({
          ...profileData,
          data: result.data,
        });
      }

      return result;
    } catch (error) {
      // Rollback on error
      if (originalData) {
        mutateProfile(originalData);
      }
      throw error;
    }
  }, [updateProfile, mutateProfile, profileData]);

  // Helper to sign out
  const signOut = useCallback(async () => {
    try {
      // Clear local state
      setIsAuthenticated(false);
      mutateProfile(null);

      // Redirect to sign out
      window.location.href = '/api/auth/signout';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [mutateProfile]);

  // Helper to sign in
  const signIn = useCallback((provider = 'google') => {
    window.location.href = `/api/auth/signin?provider=${provider}`;
  }, []);

  return {
    // Data
    user: profileData?.data || null,
    profile: profileData?.data || null,
    
    // Auth state
    isAuthenticated,
    authLoading,
    
    // Loading states
    loading: loadingProfile || updatingProfile,
    loadingProfile,
    updatingProfile,

    // Errors
    error: profileError || updateProfileError,
    profileError,
    updateProfileError,

    // Actions
    refetchProfile,
    updateProfile: updateProfileOptimistic,
    signOut,
    signIn,

    // Raw actions
    updateProfileRaw: updateProfile,
  };
}

/**
 * Hook for protected routes
 */
export function useProtectedRoute(redirectTo = '/signin') {
  const { isAuthenticated, authLoading } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setShouldRedirect(true);
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (shouldRedirect) {
      window.location.href = redirectTo;
    }
  }, [shouldRedirect, redirectTo]);

  return {
    isAuthenticated,
    authLoading,
    shouldRedirect,
  };
}

/**
 * Hook for role-based access control
 */
export function useRoleAccess(requiredRole = 'user') {
  const { user, isAuthenticated, authLoading } = useAuth();

  const hasAccess = isAuthenticated && user?.role && (
    user.role === requiredRole || 
    user.role === 'admin' // Admin has access to everything
  );

  const hasRole = useCallback((role) => {
    return user?.role === role;
  }, [user?.role]);

  const hasAnyRole = useCallback((roles) => {
    return roles.includes(user?.role);
  }, [user?.role]);

  return {
    hasAccess,
    userRole: user?.role,
    hasRole,
    hasAnyRole,
    isAuthenticated,
    authLoading,
  };
}