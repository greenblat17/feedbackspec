'use client';

import { useState, useCallback } from 'react';
import { useGet, usePost, usePut, useDelete } from './useAPI';

/**
 * Custom hook for feedback operations
 */
export function useFeedback() {
  // Get all feedback
  const {
    data: feedbackData,
    loading: loadingFeedback,
    error: feedbackError,
    refetch: refetchFeedback,
    mutate: mutateFeedback,
  } = useGet('/api/feedback');

  // Create feedback
  const {
    execute: createFeedback,
    loading: creatingFeedback,
    error: createError,
  } = usePost('/api/feedback');

  // Update feedback
  const {
    execute: updateFeedback,
    loading: updatingFeedback,
    error: updateError,
  } = usePut('/api/feedback');

  // Delete feedback
  const {
    execute: deleteFeedback,
    loading: deletingFeedback,
    error: deleteError,
  } = useDelete('/api/feedback');

  // Helper to add feedback optimistically
  const addFeedbackOptimistic = useCallback(async (feedbackData) => {
    const tempId = `temp-${Date.now()}`;
    const tempFeedback = {
      id: tempId,
      ...feedbackData,
      submittedAt: new Date().toISOString(),
      processed: false,
    };

    try {
      // Optimistically add to UI
      if (feedbackData?.data) {
        mutateFeedback({
          ...feedbackData,
          data: [tempFeedback, ...feedbackData.data],
        });
      }

      // Make API call
      const result = await createFeedback({ body: feedbackData });

      // Update with real data
      if (result.success && feedbackData?.data) {
        mutateFeedback({
          ...feedbackData,
          data: [result.data, ...feedbackData.data.filter(f => f.id !== tempId)],
        });
      }

      return result;
    } catch (error) {
      // Rollback on error
      if (feedbackData?.data) {
        mutateFeedback({
          ...feedbackData,
          data: feedbackData.data.filter(f => f.id !== tempId),
        });
      }
      throw error;
    }
  }, [createFeedback, mutateFeedback, feedbackData]);

  // Helper to update feedback optimistically
  const updateFeedbackOptimistic = useCallback(async (feedbackId, updates) => {
    const originalData = feedbackData;

    try {
      // Optimistically update UI
      if (feedbackData?.data) {
        const updatedData = feedbackData.data.map(feedback =>
          feedback.id === feedbackId ? { ...feedback, ...updates } : feedback
        );
        mutateFeedback({
          ...feedbackData,
          data: updatedData,
        });
      }

      // Make API call
      const result = await updateFeedback({ body: { id: feedbackId, ...updates } });

      // Update with real data
      if (result.success && feedbackData?.data) {
        const updatedData = feedbackData.data.map(feedback =>
          feedback.id === feedbackId ? result.data : feedback
        );
        mutateFeedback({
          ...feedbackData,
          data: updatedData,
        });
      }

      return result;
    } catch (error) {
      // Rollback on error
      if (originalData) {
        mutateFeedback(originalData);
      }
      throw error;
    }
  }, [updateFeedback, mutateFeedback, feedbackData]);

  // Helper to delete feedback optimistically
  const deleteFeedbackOptimistic = useCallback(async (feedbackId) => {
    const originalData = feedbackData;

    try {
      // Optimistically remove from UI
      if (feedbackData?.data) {
        const filteredData = feedbackData.data.filter(feedback => feedback.id !== feedbackId);
        mutateFeedback({
          ...feedbackData,
          data: filteredData,
        });
      }

      // Make API call
      const result = await deleteFeedback({ headers: { 'Content-Type': 'application/json' } }, `?id=${feedbackId}`);

      return result;
    } catch (error) {
      // Rollback on error
      if (originalData) {
        mutateFeedback(originalData);
      }
      throw error;
    }
  }, [deleteFeedback, mutateFeedback, feedbackData]);

  return {
    // Data
    feedback: feedbackData?.data || [],
    feedbackGroups: feedbackData?.feedbackGroups || null,
    aiStats: feedbackData?.aiStats || null,
    
    // Loading states
    loading: loadingFeedback || creatingFeedback || updatingFeedback || deletingFeedback,
    loadingFeedback,
    creatingFeedback,
    updatingFeedback,
    deletingFeedback,

    // Errors
    error: feedbackError || createError || updateError || deleteError,
    feedbackError,
    createError,
    updateError,
    deleteError,

    // Actions
    refetchFeedback,
    addFeedback: addFeedbackOptimistic,
    updateFeedback: updateFeedbackOptimistic,
    deleteFeedback: deleteFeedbackOptimistic,

    // Raw actions (without optimistic updates)
    createFeedbackRaw: createFeedback,
    updateFeedbackRaw: updateFeedback,
    deleteFeedbackRaw: deleteFeedback,
  };
}

/**
 * Hook for feedback filtering and searching
 */
export function useFeedbackFilters(feedback = []) {
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    priority: 'all',
    source: 'all',
    processed: 'all',
  });

  const filteredFeedback = feedback.filter(item => {
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = 
        item.title?.toLowerCase().includes(searchTerm) ||
        item.content?.toLowerCase().includes(searchTerm) ||
        item.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
      
      if (!matchesSearch) return false;
    }

    // Category filter
    if (filters.category !== 'all' && item.category !== filters.category) {
      return false;
    }

    // Priority filter
    if (filters.priority !== 'all' && item.priority !== filters.priority) {
      return false;
    }

    // Source filter
    if (filters.source !== 'all' && item.source !== filters.source) {
      return false;
    }

    // Processed filter
    if (filters.processed !== 'all') {
      const isProcessed = item.processed === true;
      if (filters.processed === 'processed' && !isProcessed) return false;
      if (filters.processed === 'unprocessed' && isProcessed) return false;
    }

    return true;
  });

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      category: 'all',
      priority: 'all',
      source: 'all',
      processed: 'all',
    });
  }, []);

  return {
    filters,
    filteredFeedback,
    updateFilter,
    resetFilters,
    setFilters,
  };
}