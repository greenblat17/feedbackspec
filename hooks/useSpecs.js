'use client';

import { useState, useCallback } from 'react';
import { useGet, usePost, useAsyncOperation } from './useAPI';

/**
 * Custom hook for specification generation operations
 */
export function useSpecs() {
  // Get generated specs
  const {
    data: specsData,
    loading: loadingSpecs,
    error: specsError,
    refetch: refetchSpecs,
    mutate: mutateSpecs,
  } = useGet('/api/generate-spec');

  // Generate cluster spec
  const {
    execute: generateClusterSpec,
    loading: generatingClusterSpec,
    error: clusterSpecError,
  } = usePost('/api/generate-spec');

  // Generate individual spec
  const {
    execute: generateIndividualSpec,
    loading: generatingIndividualSpec,
    error: individualSpecError,
  } = usePost('/api/generate-individual-spec');

  // Async operation for any spec-related tasks
  const {
    execute: executeSpecOperation,
    loading: executingOperation,
    error: operationError,
  } = useAsyncOperation();

  // Helper to generate spec from cluster with optimistic updates
  const generateSpecFromCluster = useCallback(async (cluster) => {
    const tempSpec = {
      id: `temp-${Date.now()}`,
      title: `Spec for ${cluster.theme}`,
      content: '⏳ Generating specification...',
      cluster: cluster,
      createdAt: new Date().toISOString(),
      generating: true,
    };

    try {
      // Optimistically add to UI
      if (specsData?.data) {
        mutateSpecs({
          ...specsData,
          data: [tempSpec, ...specsData.data],
        });
      }

      // Make API call
      const result = await generateClusterSpec({
        body: {
          clusterId: cluster.clusterId,
          theme: cluster.theme,
          feedbackList: cluster.feedbackList || [],
        },
      });

      // Update with real data
      if (result.success && specsData?.data) {
        const realSpec = {
          id: result.cluster?.id || tempSpec.id,
          title: `Spec for ${result.cluster?.theme}`,
          content: result.spec,
          cluster: result.cluster,
          createdAt: new Date().toISOString(),
          generating: false,
        };

        mutateSpecs({
          ...specsData,
          data: [realSpec, ...specsData.data.filter(s => s.id !== tempSpec.id)],
        });
      }

      return result;
    } catch (error) {
      // Update with error state
      if (specsData?.data) {
        const errorSpec = {
          ...tempSpec,
          content: '❌ Failed to generate specification',
          generating: false,
          error: true,
        };

        mutateSpecs({
          ...specsData,
          data: [errorSpec, ...specsData.data.filter(s => s.id !== tempSpec.id)],
        });
      }
      throw error;
    }
  }, [generateClusterSpec, mutateSpecs, specsData]);

  // Helper to generate spec from individual feedback
  const generateSpecFromFeedback = useCallback(async (feedback) => {
    const tempSpec = {
      id: `temp-${Date.now()}`,
      title: `Spec for ${feedback.title}`,
      content: '⏳ Generating specification...',
      feedback: feedback,
      createdAt: new Date().toISOString(),
      generating: true,
    };

    try {
      // Optimistically add to UI
      if (specsData?.data) {
        mutateSpecs({
          ...specsData,
          data: [tempSpec, ...specsData.data],
        });
      }

      // Make API call
      const result = await generateIndividualSpec({
        body: {
          feedbackId: feedback.id,
        },
      });

      // Update with real data
      if (result.success && specsData?.data) {
        const realSpec = {
          id: result.feedback?.id || tempSpec.id,
          title: `Spec for ${result.feedback?.title}`,
          content: result.spec,
          feedback: result.feedback,
          createdAt: new Date().toISOString(),
          generating: false,
        };

        mutateSpecs({
          ...specsData,
          data: [realSpec, ...specsData.data.filter(s => s.id !== tempSpec.id)],
        });
      }

      return result;
    } catch (error) {
      // Update with error state
      if (specsData?.data) {
        const errorSpec = {
          ...tempSpec,
          content: '❌ Failed to generate specification',
          generating: false,
          error: true,
        };

        mutateSpecs({
          ...specsData,
          data: [errorSpec, ...specsData.data.filter(s => s.id !== tempSpec.id)],
        });
      }
      throw error;
    }
  }, [generateIndividualSpec, mutateSpecs, specsData]);

  // Helper to retry failed spec generation
  const retrySpecGeneration = useCallback(async (spec) => {
    if (spec.cluster) {
      return generateSpecFromCluster(spec.cluster);
    } else if (spec.feedback) {
      return generateSpecFromFeedback(spec.feedback);
    }
    throw new Error('Cannot retry spec generation: missing cluster or feedback data');
  }, [generateSpecFromCluster, generateSpecFromFeedback]);

  return {
    // Data
    specs: specsData?.data || [],
    
    // Loading states
    loading: loadingSpecs || generatingClusterSpec || generatingIndividualSpec || executingOperation,
    loadingSpecs,
    generatingClusterSpec,
    generatingIndividualSpec,
    executingOperation,

    // Errors
    error: specsError || clusterSpecError || individualSpecError || operationError,
    specsError,
    clusterSpecError,
    individualSpecError,
    operationError,

    // Actions
    refetchSpecs,
    generateSpecFromCluster,
    generateSpecFromFeedback,
    retrySpecGeneration,
    executeSpecOperation,

    // Raw actions (without optimistic updates)
    generateClusterSpecRaw: generateClusterSpec,
    generateIndividualSpecRaw: generateIndividualSpec,
  };
}

/**
 * Hook for spec filtering and searching
 */
export function useSpecFilters(specs = []) {
  const [filters, setFilters] = useState({
    search: '',
    type: 'all', // 'all', 'cluster', 'individual'
    status: 'all', // 'all', 'generating', 'completed', 'error'
  });

  const filteredSpecs = specs.filter(spec => {
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = 
        spec.title?.toLowerCase().includes(searchTerm) ||
        spec.content?.toLowerCase().includes(searchTerm) ||
        spec.cluster?.theme?.toLowerCase().includes(searchTerm) ||
        spec.feedback?.title?.toLowerCase().includes(searchTerm);
      
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filters.type !== 'all') {
      if (filters.type === 'cluster' && !spec.cluster) return false;
      if (filters.type === 'individual' && !spec.feedback) return false;
    }

    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'generating' && !spec.generating) return false;
      if (filters.status === 'completed' && (spec.generating || spec.error)) return false;
      if (filters.status === 'error' && !spec.error) return false;
    }

    return true;
  });

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      type: 'all',
      status: 'all',
    });
  }, []);

  return {
    filters,
    filteredSpecs,
    updateFilter,
    resetFilters,
    setFilters,
  };
}