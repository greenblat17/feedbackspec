'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.isMonitoring = false;
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor Core Web Vitals
    this.monitorCoreWebVitals();
    
    // Monitor resource loading
    this.monitorResourceLoading();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
    
    // Monitor network information
    this.monitorNetworkInfo();
    
    console.log('📊 Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    console.log('📊 Performance monitoring stopped');
  }

  /**
   * Monitor Core Web Vitals
   */
  monitorCoreWebVitals() {
    // Cumulative Layout Shift (CLS)
    if ('LayoutShift' in window) {
      const observer = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        this.recordMetric('CLS', clsValue);
      });
      observer.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(observer);
    }

    // First Input Delay (FID)
    if ('PerformanceEventTiming' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.processingStart && entry.startTime) {
            const fid = entry.processingStart - entry.startTime;
            this.recordMetric('FID', fid);
          }
        }
      });
      observer.observe({ type: 'first-input', buffered: true });
      this.observers.push(observer);
    }

    // Largest Contentful Paint (LCP)
    if ('LargestContentfulPaint' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.recordMetric('LCP', lastEntry.startTime);
        }
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.push(observer);
    }

    // First Contentful Paint (FCP)
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('FCP', entry.startTime);
        }
      }
    });
    observer.observe({ type: 'paint', buffered: true });
    this.observers.push(observer);
  }

  /**
   * Monitor resource loading
   */
  monitorResourceLoading() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceType = entry.initiatorType;
        const loadTime = entry.responseEnd - entry.startTime;
        
        this.recordMetric(`resource-${resourceType}`, {
          name: entry.name,
          loadTime,
          size: entry.transferSize,
          type: resourceType,
        });
      }
    });
    observer.observe({ type: 'resource', buffered: true });
    this.observers.push(observer);
  }

  /**
   * Monitor memory usage
   */
  monitorMemoryUsage() {
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = performance.memory;
        this.recordMetric('memory', {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          timestamp: Date.now(),
        });
      };

      // Check memory every 30 seconds
      const interval = setInterval(checkMemory, 30000);
      checkMemory(); // Initial check

      // Store interval for cleanup
      this.observers.push({
        disconnect: () => clearInterval(interval),
      });
    }
  }

  /**
   * Monitor network information
   */
  monitorNetworkInfo() {
    if ('connection' in navigator) {
      const recordNetworkInfo = () => {
        const connection = navigator.connection;
        this.recordMetric('network', {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
          timestamp: Date.now(),
        });
      };

      recordNetworkInfo();
      connection.addEventListener('change', recordNetworkInfo);

      this.observers.push({
        disconnect: () => connection.removeEventListener('change', recordNetworkInfo),
      });
    }
  }

  /**
   * Record a metric
   */
  recordMetric(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name).push({
      value,
      timestamp: Date.now(),
    });

    // Trigger event for real-time monitoring
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('performance-metric', {
        detail: { name, value },
      }));
    }
  }

  /**
   * Get metric data
   */
  getMetric(name) {
    return this.metrics.get(name) || [];
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    const result = {};
    for (const [name, values] of this.metrics) {
      result[name] = values;
    }
    return result;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {};
    
    for (const [name, values] of this.metrics) {
      if (values.length === 0) continue;
      
      const numericValues = values
        .map(item => typeof item.value === 'number' ? item.value : 0)
        .filter(val => val > 0);
      
      if (numericValues.length > 0) {
        summary[name] = {
          count: numericValues.length,
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
          latest: values[values.length - 1]?.value,
        };
      }
    }
    
    return summary;
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.metrics.clear();
  }
}

// Global performance monitor instance
const globalMonitor = new PerformanceMonitor();

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitoring(autoStart = true) {
  const [metrics, setMetrics] = useState({});
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (autoStart) {
      globalMonitor.startMonitoring();
      setIsMonitoring(true);
    }

    // Listen for performance metrics
    const handleMetric = (event) => {
      setMetrics(prev => ({
        ...prev,
        [event.detail.name]: event.detail.value,
      }));
    };

    window.addEventListener('performance-metric', handleMetric);

    return () => {
      window.removeEventListener('performance-metric', handleMetric);
      if (autoStart) {
        globalMonitor.stopMonitoring();
      }
    };
  }, [autoStart]);

  const startMonitoring = () => {
    globalMonitor.startMonitoring();
    setIsMonitoring(true);
  };

  const stopMonitoring = () => {
    globalMonitor.stopMonitoring();
    setIsMonitoring(false);
  };

  const getMetric = (name) => globalMonitor.getMetric(name);
  const getAllMetrics = () => globalMonitor.getAllMetrics();
  const getPerformanceSummary = () => globalMonitor.getPerformanceSummary();
  const clearMetrics = () => globalMonitor.clearMetrics();

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getMetric,
    getAllMetrics,
    getPerformanceSummary,
    clearMetrics,
  };
}

/**
 * Hook for component performance tracking
 */
export function useComponentPerformance(componentName) {
  const renderStart = useRef(Date.now());
  const mountStart = useRef(Date.now());
  const renderCount = useRef(0);

  useEffect(() => {
    // Component mounted
    const mountTime = Date.now() - mountStart.current;
    globalMonitor.recordMetric(`component-mount-${componentName}`, mountTime);

    return () => {
      // Component unmounted
      globalMonitor.recordMetric(`component-unmount-${componentName}`, Date.now());
    };
  }, [componentName]);

  useEffect(() => {
    // Component rendered
    const renderTime = Date.now() - renderStart.current;
    renderCount.current++;
    
    globalMonitor.recordMetric(`component-render-${componentName}`, {
      renderTime,
      renderCount: renderCount.current,
    });
  });

  // Update render start time
  renderStart.current = Date.now();
}

/**
 * Hook for API performance tracking
 */
export function useAPIPerformance() {
  const trackRequest = (url, method = 'GET') => {
    const startTime = Date.now();
    
    return {
      finish: (success = true, status = 200) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        globalMonitor.recordMetric(`api-request`, {
          url,
          method,
          duration,
          success,
          status,
          timestamp: endTime,
        });
      },
    };
  };

  return { trackRequest };
}

/**
 * Performance analytics utilities
 */
export class PerformanceAnalytics {
  constructor() {
    this.events = [];
  }

  /**
   * Track custom event
   */
  trackEvent(name, properties = {}) {
    const event = {
      name,
      properties,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.events.push(event);
    
    // Send to analytics service
    this.sendToAnalytics(event);
  }

  /**
   * Track page view
   */
  trackPageView(path = window.location.pathname) {
    this.trackEvent('page_view', {
      path,
      referrer: document.referrer,
      loadTime: performance.now(),
    });
  }

  /**
   * Track user interaction
   */
  trackInteraction(element, action) {
    this.trackEvent('user_interaction', {
      element: element.tagName,
      elementId: element.id,
      elementClass: element.className,
      action,
    });
  }

  /**
   * Send events to analytics service
   */
  async sendToAnalytics(event) {
    try {
      // Replace with your analytics endpoint
      if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });
      }
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  /**
   * Get event history
   */
  getEvents() {
    return this.events;
  }
}

// Global analytics instance
const globalAnalytics = new PerformanceAnalytics();

/**
 * Hook for performance analytics
 */
export function usePerformanceAnalytics() {
  const trackEvent = (name, properties) => {
    globalAnalytics.trackEvent(name, properties);
  };

  const trackPageView = (path) => {
    globalAnalytics.trackPageView(path);
  };

  const trackInteraction = (element, action) => {
    globalAnalytics.trackInteraction(element, action);
  };

  return {
    trackEvent,
    trackPageView,
    trackInteraction,
  };
}

/**
 * Performance budget utilities
 */
export class PerformanceBudget {
  constructor(budgets = {}) {
    this.budgets = {
      FCP: 2000, // First Contentful Paint
      LCP: 2500, // Largest Contentful Paint
      FID: 100,  // First Input Delay
      CLS: 0.1,  // Cumulative Layout Shift
      ...budgets,
    };
  }

  /**
   * Check if metrics meet budget
   */
  checkBudget(metrics) {
    const violations = [];
    
    for (const [metric, budget] of Object.entries(this.budgets)) {
      const value = metrics[metric];
      if (value !== undefined && value > budget) {
        violations.push({
          metric,
          value,
          budget,
          violation: value - budget,
        });
      }
    }
    
    return {
      passed: violations.length === 0,
      violations,
    };
  }

  /**
   * Update budget
   */
  updateBudget(metric, value) {
    this.budgets[metric] = value;
  }
}

/**
 * Hook for performance budget monitoring
 */
export function usePerformanceBudget(budgets = {}) {
  const budget = useRef(new PerformanceBudget(budgets));
  const [violations, setViolations] = useState([]);

  useEffect(() => {
    const checkBudget = () => {
      const summary = globalMonitor.getPerformanceSummary();
      const latestMetrics = {};
      
      for (const [name, data] of Object.entries(summary)) {
        latestMetrics[name] = data.latest;
      }
      
      const result = budget.current.checkBudget(latestMetrics);
      setViolations(result.violations);
      
      if (!result.passed) {
        console.warn('Performance budget violations:', result.violations);
      }
    };

    const interval = setInterval(checkBudget, 10000); // Check every 10 seconds
    checkBudget(); // Initial check

    return () => clearInterval(interval);
  }, []);

  return {
    violations,
    updateBudget: (metric, value) => budget.current.updateBudget(metric, value),
  };
}