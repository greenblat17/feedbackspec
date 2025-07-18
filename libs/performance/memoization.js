import { memo, useMemo, useCallback, useRef } from 'react';

/**
 * Enhanced React.memo with custom comparison function
 */
export function createMemoComponent(Component, compareProps) {
  return memo(Component, compareProps);
}

/**
 * Memoize component with shallow comparison
 */
export function createShallowMemoComponent(Component) {
  return memo(Component, (prevProps, nextProps) => {
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);
    
    if (prevKeys.length !== nextKeys.length) {
      return false;
    }
    
    for (let key of prevKeys) {
      if (prevProps[key] !== nextProps[key]) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Memoize component with deep comparison for specific props
 */
export function createDeepMemoComponent(Component, deepCompareProps = []) {
  return memo(Component, (prevProps, nextProps) => {
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);
    
    if (prevKeys.length !== nextKeys.length) {
      return false;
    }
    
    for (let key of prevKeys) {
      if (deepCompareProps.includes(key)) {
        if (JSON.stringify(prevProps[key]) !== JSON.stringify(nextProps[key])) {
          return false;
        }
      } else {
        if (prevProps[key] !== nextProps[key]) {
          return false;
        }
      }
    }
    
    return true;
  });
}

/**
 * Hook for memoizing expensive calculations
 */
export function useExpensiveCalculation(calculateFn, dependencies) {
  return useMemo(() => {
    const start = performance.now();
    console.log('🔄 Starting expensive calculation...');
    
    const result = calculateFn();
    
    const end = performance.now();
    console.log(`✅ Expensive calculation completed in ${Math.round(end - start)}ms`);
    
    return result;
  }, dependencies);
}

/**
 * Hook for memoizing filtered/sorted data
 */
export function useFilteredData(data, filterFn, sortFn, dependencies = []) {
  return useMemo(() => {
    if (!Array.isArray(data)) return [];
    
    const start = performance.now();
    
    let result = data;
    
    // Apply filter
    if (filterFn) {
      result = result.filter(filterFn);
    }
    
    // Apply sort
    if (sortFn) {
      result = [...result].sort(sortFn);
    }
    
    const end = performance.now();
    console.log(`🔍 Filtered/sorted ${data.length} items to ${result.length} in ${Math.round(end - start)}ms`);
    
    return result;
  }, [data, filterFn, sortFn, ...dependencies]);
}

/**
 * Hook for memoizing search results
 */
export function useSearchResults(data, searchTerm, searchFields, dependencies = []) {
  return useMemo(() => {
    if (!Array.isArray(data) || !searchTerm?.trim()) return data;
    
    const start = performance.now();
    const term = searchTerm.toLowerCase();
    
    const results = data.filter(item => {
      return searchFields.some(field => {
        const value = field.split('.').reduce((obj, key) => obj?.[key], item);
        return value?.toString().toLowerCase().includes(term);
      });
    });
    
    const end = performance.now();
    console.log(`🔍 Search "${searchTerm}" in ${data.length} items found ${results.length} results in ${Math.round(end - start)}ms`);
    
    return results;
  }, [data, searchTerm, searchFields, ...dependencies]);
}

/**
 * Hook for memoizing grouped data
 */
export function useGroupedData(data, groupByFn, dependencies = []) {
  return useMemo(() => {
    if (!Array.isArray(data)) return {};
    
    const start = performance.now();
    
    const grouped = data.reduce((acc, item) => {
      const key = groupByFn(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
    
    const end = performance.now();
    console.log(`📊 Grouped ${data.length} items into ${Object.keys(grouped).length} groups in ${Math.round(end - start)}ms`);
    
    return grouped;
  }, [data, groupByFn, ...dependencies]);
}

/**
 * Hook for stable callback references
 */
export function useStableCallback(callback, dependencies) {
  return useCallback(callback, dependencies);
}

/**
 * Hook for memoizing component props
 */
export function useStableProps(props) {
  return useMemo(() => props, [JSON.stringify(props)]);
}

/**
 * Hook for debounced values
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * Hook for throttled values
 */
export function useThrottle(value, delay) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastExecuted = useRef(Date.now());
  
  useEffect(() => {
    if (Date.now() - lastExecuted.current >= delay) {
      setThrottledValue(value);
      lastExecuted.current = Date.now();
    } else {
      const handler = setTimeout(() => {
        setThrottledValue(value);
        lastExecuted.current = Date.now();
      }, delay - (Date.now() - lastExecuted.current));
      
      return () => {
        clearTimeout(handler);
      };
    }
  }, [value, delay]);
  
  return throttledValue;
}

/**
 * Hook for memoizing expensive object creation
 */
export function useStableObject(createObjectFn, dependencies) {
  return useMemo(createObjectFn, dependencies);
}

/**
 * Hook for memoizing arrays
 */
export function useStableArray(array) {
  return useMemo(() => array, [JSON.stringify(array)]);
}

/**
 * Performance measurement decorator
 */
export function withPerformanceTracking(Component, componentName) {
  return memo(function TrackedComponent(props) {
    const renderStart = useRef(performance.now());
    
    useEffect(() => {
      const renderTime = performance.now() - renderStart.current;
      console.log(`⚡ ${componentName} render time: ${Math.round(renderTime)}ms`);
    });
    
    renderStart.current = performance.now();
    return <Component {...props} />;
  });
}