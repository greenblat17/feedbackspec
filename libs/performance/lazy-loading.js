'use client';

import { useState, useEffect, useRef, lazy, Suspense } from 'react';

/**
 * Hook for intersection observer (lazy loading)
 */
export function useIntersectionObserver(options = {}) {
  const [inView, setInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);
  const elementRef = useRef(null);

  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
    root = null,
  } = options;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isInView = entry.isIntersecting;
        setInView(isInView);
        
        if (isInView && !hasBeenInView) {
          setHasBeenInView(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        }
      },
      {
        threshold,
        rootMargin,
        root,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, root, triggerOnce, hasBeenInView]);

  return {
    elementRef,
    inView,
    hasBeenInView,
  };
}

/**
 * Lazy load component wrapper
 */
export function LazyLoad({
  children,
  fallback = null,
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = true,
  className = '',
  ...props
}) {
  const { elementRef, hasBeenInView } = useIntersectionObserver({
    threshold,
    rootMargin,
    triggerOnce,
  });

  return (
    <div ref={elementRef} className={className} {...props}>
      {hasBeenInView ? children : fallback}
    </div>
  );
}

/**
 * Lazy load image component
 */
export function LazyImage({
  src,
  alt,
  placeholder = null,
  fallback = null,
  className = '',
  threshold = 0.1,
  rootMargin = '0px',
  onLoad,
  onError,
  ...props
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const { elementRef, hasBeenInView } = useIntersectionObserver({
    threshold,
    rootMargin,
    triggerOnce: true,
  });

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    onError?.();
  };

  return (
    <div ref={elementRef} className={className}>
      {hasBeenInView ? (
        <>
          {!loaded && !error && placeholder}
          {error && fallback}
          <img
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            style={{
              display: loaded ? 'block' : 'none',
            }}
            {...props}
          />
        </>
      ) : (
        placeholder
      )}
    </div>
  );
}

/**
 * Code splitting utilities
 */
export function createLazyComponent(importFn, fallback = null) {
  const LazyComponent = lazy(importFn);
  
  return function LazyComponentWrapper(props) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Route-based code splitting
 */
export function createLazyRoute(importFn, fallback = <div>Loading...</div>) {
  return createLazyComponent(importFn, fallback);
}

/**
 * Feature-based code splitting
 */
export function createLazyFeature(importFn, fallback = <div>Loading feature...</div>) {
  return createLazyComponent(importFn, fallback);
}

/**
 * Hook for dynamic imports
 */
export function useDynamicImport(importFn, dependencies = []) {
  const [component, setComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    importFn()
      .then((module) => {
        setComponent(module.default || module);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, dependencies);

  return { component, loading, error };
}

/**
 * Preload component
 */
export function preloadComponent(importFn) {
  return importFn();
}

/**
 * Preload multiple components
 */
export function preloadComponents(importFns) {
  return Promise.all(importFns.map(importFn => importFn()));
}

/**
 * Resource preloading utilities
 */
export function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function preloadImages(srcs) {
  return Promise.all(srcs.map(preloadImage));
}

/**
 * Hook for resource preloading
 */
export function usePreloadResources(resources = []) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (resources.length === 0) {
      setLoaded(true);
      return;
    }

    const loadResources = async () => {
      try {
        await Promise.all(resources.map(resource => {
          if (typeof resource === 'string') {
            return preloadImage(resource);
          } else if (typeof resource === 'function') {
            return resource();
          }
          return Promise.resolve();
        }));
        setLoaded(true);
      } catch (err) {
        setError(err);
      }
    };

    loadResources();
  }, [resources]);

  return { loaded, error };
}

/**
 * Bundle splitting utilities
 */
export function createAsyncChunk(chunkName, importFn) {
  return lazy(() => 
    importFn().then(module => ({
      default: module.default || module,
    }))
  );
}

/**
 * Progressive enhancement component
 */
export function ProgressiveEnhancement({
  children,
  fallback,
  enhanced,
  condition = () => true,
}) {
  const [canEnhance, setCanEnhance] = useState(false);

  useEffect(() => {
    const checkCondition = async () => {
      try {
        const result = await condition();
        setCanEnhance(result);
      } catch {
        setCanEnhance(false);
      }
    };

    checkCondition();
  }, [condition]);

  if (canEnhance && enhanced) {
    return enhanced;
  }

  return children || fallback;
}

/**
 * Module federation utilities
 */
export function createFederatedModule(remoteName, moduleName) {
  return lazy(() => {
    const script = document.createElement('script');
    script.src = `/${remoteName}/remoteEntry.js`;
    
    return new Promise((resolve, reject) => {
      script.onload = () => {
        // @ts-ignore
        window[remoteName].get(moduleName).then(resolve).catch(reject);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  });
}

/**
 * Performance-aware component loading
 */
export function createPerformanceAwareComponent(importFn, options = {}) {
  const {
    connectionThreshold = 'slow-2g',
    memoryThreshold = 4 * 1024 * 1024 * 1024, // 4GB
    fallbackComponent = null,
  } = options;

  return function PerformanceAwareWrapper(props) {
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
      const checkPerformance = () => {
        // Check network connection
        if ('connection' in navigator) {
          const connection = navigator.connection;
          const isSlowConnection = connection.effectiveType === connectionThreshold;
          if (isSlowConnection) {
            setShouldLoad(false);
            return;
          }
        }

        // Check memory
        if ('memory' in performance) {
          const memory = performance.memory;
          const isLowMemory = memory.totalJSHeapSize > memoryThreshold;
          if (isLowMemory) {
            setShouldLoad(false);
            return;
          }
        }

        setShouldLoad(true);
      };

      checkPerformance();
    }, []);

    if (!shouldLoad && fallbackComponent) {
      return fallbackComponent;
    }

    const LazyComponent = createLazyComponent(importFn);
    return <LazyComponent {...props} />;
  };
}