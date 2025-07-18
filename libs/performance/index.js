/**
 * Centralized performance optimization utilities for feedbackspec
 * 
 * This module provides a unified interface for all performance optimization features
 * including memoization, virtual scrolling, request optimization, lazy loading, and monitoring.
 */

// Memoization utilities
export {
  createMemoComponent,
  createShallowMemoComponent,
  createDeepMemoComponent,
  useExpensiveCalculation,
  useFilteredData,
  useSearchResults,
  useGroupedData,
  useStableCallback,
  useStableProps,
  useDebounce,
  useThrottle,
  useStableObject,
  useStableArray,
  withPerformanceTracking,
} from './memoization';

// Virtual scrolling utilities
export {
  useVirtualScroll,
  VirtualList,
  useVirtualGrid,
  VirtualGrid,
  useInfiniteScroll,
  InfiniteScroll,
} from './virtual-scroll';

// Request optimization utilities
export {
  useRequestDeduplication,
  useBatchRequests,
  QueryOptimizer,
  useQueryOptimization,
  useRequestPriority,
  createOptimizedFetch,
} from './request-optimization';

// Lazy loading utilities
export {
  useIntersectionObserver,
  LazyLoad,
  LazyImage,
  createLazyComponent,
  createLazyRoute,
  createLazyFeature,
  useDynamicImport,
  preloadComponent,
  preloadComponents,
  preloadImage,
  preloadImages,
  usePreloadResources,
  createAsyncChunk,
  ProgressiveEnhancement,
  createFederatedModule,
  createPerformanceAwareComponent,
} from './lazy-loading';

// Performance monitoring utilities
export {
  PerformanceMonitor,
  usePerformanceMonitoring,
  useComponentPerformance,
  useAPIPerformance,
  PerformanceAnalytics,
  usePerformanceAnalytics,
  PerformanceBudget,
  usePerformanceBudget,
} from './monitoring';

// Re-export all utilities
export * from './memoization';
export * from './virtual-scroll';
export * from './request-optimization';
export * from './lazy-loading';
export * from './monitoring';