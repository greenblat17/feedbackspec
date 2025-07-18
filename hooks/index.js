/**
 * Centralized hooks for feedbackspec application
 * 
 * This module provides a unified interface for all custom hooks
 * including API operations, authentication, and data management.
 */

// Core API hooks
export {
  useAPI,
  useGet,
  usePost,
  usePut,
  useDelete,
  useAsyncOperation,
} from './useAPI';

// Authentication hooks
export {
  useAuth,
  useProtectedRoute,
  useRoleAccess,
} from './useAuth';

// Feedback-specific hooks
export {
  useFeedback,
  useFeedbackFilters,
} from './useFeedback';

// Specification hooks
export {
  useSpecs,
  useSpecFilters,
} from './useSpecs';

// Re-export for easy importing
export * from './useAPI';
export * from './useAuth';
export * from './useFeedback';
export * from './useSpecs';