'use client';

import { useRef, useCallback, useMemo } from 'react';

/**
 * Request deduplication utility
 */
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
    this.cache = new Map();
  }

  /**
   * Deduplicate requests by key
   */
  async dedupe(key, requestFn, cacheTimeout = 5 * 60 * 1000) {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      console.log(`📦 Cache hit for request: ${key}`);
      return cached.data;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      console.log(`⏳ Request already pending, waiting: ${key}`);
      return this.pendingRequests.get(key);
    }

    // Create new request
    console.log(`🌐 New request: ${key}`);
    const requestPromise = requestFn()
      .then(data => {
        // Cache the result
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
        });
        
        // Clean up pending request
        this.pendingRequests.delete(key);
        
        return data;
      })
      .catch(error => {
        // Clean up pending request on error
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  /**
   * Clear cache for specific key
   */
  clearCache(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheKeys: Array.from(this.cache.keys()),
    };
  }
}

// Global request deduplicator instance
const globalDeduplicator = new RequestDeduplicator();

/**
 * Hook for request deduplication
 */
export function useRequestDeduplication() {
  const deduplicator = useRef(globalDeduplicator);

  const dedupe = useCallback(async (key, requestFn, cacheTimeout) => {
    return deduplicator.current.dedupe(key, requestFn, cacheTimeout);
  }, []);

  const clearCache = useCallback((key) => {
    deduplicator.current.clearCache(key);
  }, []);

  const clearAllCache = useCallback(() => {
    deduplicator.current.clearAllCache();
  }, []);

  const getCacheStats = useCallback(() => {
    return deduplicator.current.getCacheStats();
  }, []);

  return {
    dedupe,
    clearCache,
    clearAllCache,
    getCacheStats,
  };
}

/**
 * Batch request utility
 */
class BatchRequestProcessor {
  constructor(batchSize = 10, delay = 100) {
    this.batchSize = batchSize;
    this.delay = delay;
    this.queue = [];
    this.processing = false;
    this.timeoutId = null;
  }

  /**
   * Add request to batch
   */
  async addRequest(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      
      if (!this.processing) {
        this.scheduleProcessing();
      }
    });
  }

  /**
   * Schedule batch processing
   */
  scheduleProcessing() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.processBatch();
    }, this.delay);
  }

  /**
   * Process batch of requests
   */
  async processBatch() {
    if (this.queue.length === 0) return;

    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);

    console.log(`🔄 Processing batch of ${batch.length} requests`);

    try {
      const results = await Promise.allSettled(
        batch.map(({ request }) => request())
      );

      // Resolve/reject individual promises
      results.forEach((result, index) => {
        const { resolve, reject } = batch[index];
        if (result.status === 'fulfilled') {
          resolve(result.value);
        } else {
          reject(result.reason);
        }
      });
    } catch (error) {
      // Reject all promises on batch error
      batch.forEach(({ reject }) => reject(error));
    } finally {
      this.processing = false;
      
      // Process next batch if queue is not empty
      if (this.queue.length > 0) {
        this.scheduleProcessing();
      }
    }
  }
}

/**
 * Hook for batch request processing
 */
export function useBatchRequests(batchSize = 10, delay = 100) {
  const processor = useRef(new BatchRequestProcessor(batchSize, delay));

  const addRequest = useCallback(async (request) => {
    return processor.current.addRequest(request);
  }, []);

  return { addRequest };
}

/**
 * Query optimization utilities
 */
export class QueryOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.subscriptions = new Map();
  }

  /**
   * Optimize query by caching and subscription
   */
  async optimizeQuery(key, queryFn, options = {}) {
    const {
      cacheTimeout = 5 * 60 * 1000, // 5 minutes
      refetchInterval = null,
      background = false,
    } = options;

    // Check cache
    const cached = this.queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      if (!background) {
        console.log(`📦 Query cache hit: ${key}`);
        return cached.data;
      }
    }

    // Execute query
    console.log(`🔍 Executing query: ${key}`);
    const data = await queryFn();

    // Cache result
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Set up background refetch if specified
    if (refetchInterval && !this.subscriptions.has(key)) {
      const intervalId = setInterval(async () => {
        try {
          await this.optimizeQuery(key, queryFn, { ...options, background: true });
        } catch (error) {
          console.error(`Background refetch failed for ${key}:`, error);
        }
      }, refetchInterval);

      this.subscriptions.set(key, intervalId);
    }

    return data;
  }

  /**
   * Invalidate query cache
   */
  invalidateQuery(key) {
    this.queryCache.delete(key);
    
    // Clear subscription
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      clearInterval(subscription);
      this.subscriptions.delete(key);
    }
  }

  /**
   * Prefetch query
   */
  async prefetchQuery(key, queryFn, options = {}) {
    return this.optimizeQuery(key, queryFn, { ...options, background: true });
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      cacheSize: this.queryCache.size,
      subscriptions: this.subscriptions.size,
      cacheKeys: Array.from(this.queryCache.keys()),
    };
  }
}

// Global query optimizer instance
const globalOptimizer = new QueryOptimizer();

/**
 * Hook for query optimization
 */
export function useQueryOptimization() {
  const optimizer = useRef(globalOptimizer);

  const optimizeQuery = useCallback(async (key, queryFn, options) => {
    return optimizer.current.optimizeQuery(key, queryFn, options);
  }, []);

  const invalidateQuery = useCallback((key) => {
    optimizer.current.invalidateQuery(key);
  }, []);

  const prefetchQuery = useCallback(async (key, queryFn, options) => {
    return optimizer.current.prefetchQuery(key, queryFn, options);
  }, []);

  const getCacheStats = useCallback(() => {
    return optimizer.current.getCacheStats();
  }, []);

  return {
    optimizeQuery,
    invalidateQuery,
    prefetchQuery,
    getCacheStats,
  };
}

/**
 * Hook for request prioritization
 */
export function useRequestPriority() {
  const priorities = useRef({
    high: [],
    medium: [],
    low: [],
  });

  const addRequest = useCallback(async (request, priority = 'medium') => {
    return new Promise((resolve, reject) => {
      const requestItem = { request, resolve, reject, timestamp: Date.now() };
      
      if (priorities.current[priority]) {
        priorities.current[priority].push(requestItem);
      } else {
        priorities.current.medium.push(requestItem);
      }
      
      // Process next request
      processNextRequest();
    });
  }, []);

  const processNextRequest = useCallback(() => {
    // Process high priority first
    for (const priority of ['high', 'medium', 'low']) {
      const queue = priorities.current[priority];
      if (queue.length > 0) {
        const { request, resolve, reject } = queue.shift();
        
        request()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            // Process next request
            setTimeout(processNextRequest, 0);
          });
        
        return;
      }
    }
  }, []);

  return { addRequest };
}

/**
 * Enhanced fetch with optimization
 */
export function createOptimizedFetch() {
  const deduplicator = new RequestDeduplicator();
  const optimizer = new QueryOptimizer();

  return async function optimizedFetch(url, options = {}) {
    const {
      dedupe = true,
      cache = true,
      cacheTimeout = 5 * 60 * 1000,
      ...fetchOptions
    } = options;

    const key = `${url}:${JSON.stringify(fetchOptions)}`;

    const fetchFn = async () => {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    };

    if (dedupe) {
      return deduplicator.dedupe(key, fetchFn, cacheTimeout);
    }

    if (cache) {
      return optimizer.optimizeQuery(key, fetchFn, { cacheTimeout });
    }

    return fetchFn();
  };
}