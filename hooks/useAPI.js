'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for making API calls with loading states and error handling
 */
export function useAPI(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const {
    method = 'GET',
    body,
    headers = {},
    autoFetch = true,
    cacheTime = 5 * 60 * 1000, // 5 minutes default cache
    retryCount = 3,
    retryDelay = 1000,
  } = options;

  const fetchData = useCallback(async (overrideOptions = {}) => {
    // Check cache if it's a GET request
    if (method === 'GET' && lastFetch && Date.now() - lastFetch < cacheTime) {
      console.log('📦 Using cached data for:', url);
      return data;
    }

    setLoading(true);
    setError(null);

    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...overrideOptions.headers,
      },
      ...overrideOptions,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(body);
    }

    let attempt = 0;
    while (attempt < retryCount) {
      try {
        console.log(`🌐 API Request (attempt ${attempt + 1}):`, method, url);
        
        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const result = await response.json();
        
        console.log('✅ API Response:', result);
        
        setData(result);
        setLastFetch(Date.now());
        setLoading(false);
        
        return result;
        
      } catch (err) {
        console.error(`❌ API Error (attempt ${attempt + 1}):`, err);
        
        if (attempt === retryCount - 1) {
          // Last attempt failed
          setError(err);
          setLoading(false);
          throw err;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        attempt++;
      }
    }
  }, [url, method, body, headers, cacheTime, retryCount, retryDelay, lastFetch, data]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && method === 'GET') {
      fetchData();
    }
  }, [autoFetch, method, fetchData]);

  const refetch = useCallback(() => {
    setLastFetch(null); // Clear cache
    return fetchData();
  }, [fetchData]);

  const mutate = useCallback((newData) => {
    setData(newData);
    setLastFetch(Date.now());
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    mutate,
    execute: fetchData,
  };
}

/**
 * Hook for GET requests
 */
export function useGet(url, options = {}) {
  return useAPI(url, { ...options, method: 'GET' });
}

/**
 * Hook for POST requests
 */
export function usePost(url, options = {}) {
  return useAPI(url, { ...options, method: 'POST', autoFetch: false });
}

/**
 * Hook for PUT requests
 */
export function usePut(url, options = {}) {
  return useAPI(url, { ...options, method: 'PUT', autoFetch: false });
}

/**
 * Hook for DELETE requests
 */
export function useDelete(url, options = {}) {
  return useAPI(url, { ...options, method: 'DELETE', autoFetch: false });
}

/**
 * Hook for handling async operations with loading states
 */
export function useAsyncOperation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (operation) => {
    setLoading(true);
    setError(null);

    try {
      const result = await operation();
      setLoading(false);
      return result;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    execute,
    reset,
  };
}