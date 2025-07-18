'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Virtual scrolling hook for large lists
 */
export function useVirtualScroll({
  items = [],
  itemHeight = 50,
  containerHeight = 400,
  overscan = 5,
  scrollElement = null,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = start + visibleCount;

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Calculate visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      ...item,
      index: visibleRange.start + index,
    }));
  }, [items, visibleRange]);

  // Calculate total height and offset
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  // Handle scroll events
  useEffect(() => {
    const element = scrollElement || scrollElementRef.current;
    if (!element) return;

    const handleScroll = () => {
      setScrollTop(element.scrollTop);
    };

    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, [scrollElement]);

  // Scroll to specific index
  const scrollToIndex = (index) => {
    const element = scrollElement || scrollElementRef.current;
    if (!element) return;

    const scrollTop = index * itemHeight;
    element.scrollTop = scrollTop;
  };

  // Scroll to specific item
  const scrollToItem = (item) => {
    const index = items.findIndex(i => i === item);
    if (index !== -1) {
      scrollToIndex(index);
    }
  };

  return {
    visibleItems,
    visibleRange,
    totalHeight,
    offsetY,
    scrollToIndex,
    scrollToItem,
    scrollElementRef,
  };
}

/**
 * Virtual scrolling component for lists
 */
export function VirtualList({
  items = [],
  itemHeight = 50,
  height = 400,
  renderItem,
  className = '',
  overscan = 5,
  onScroll,
  ...props
}) {
  const {
    visibleItems,
    totalHeight,
    offsetY,
    scrollElementRef,
  } = useVirtualScroll({
    items,
    itemHeight,
    containerHeight: height,
    overscan,
  });

  const handleScroll = (e) => {
    onScroll?.(e);
  };

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
      {...props}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item) => (
            <div
              key={item.index}
              style={{ height: itemHeight }}
              className="flex items-center"
            >
              {renderItem(item, item.index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Virtual grid hook for 2D layouts
 */
export function useVirtualGrid({
  items = [],
  itemWidth = 200,
  itemHeight = 150,
  containerWidth = 800,
  containerHeight = 600,
  gap = 10,
  overscan = 2,
  scrollElement = null,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollElementRef = useRef(null);

  // Calculate grid dimensions
  const columnsPerRow = Math.floor(containerWidth / (itemWidth + gap));
  const totalRows = Math.ceil(items.length / columnsPerRow);
  const totalHeight = totalRows * (itemHeight + gap);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startRow = Math.floor(scrollTop / (itemHeight + gap));
    const endRow = Math.ceil((scrollTop + containerHeight) / (itemHeight + gap));
    
    return {
      start: Math.max(0, startRow - overscan),
      end: Math.min(totalRows, endRow + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, gap, overscan, totalRows]);

  // Calculate visible items
  const visibleItems = useMemo(() => {
    const startIndex = visibleRange.start * columnsPerRow;
    const endIndex = visibleRange.end * columnsPerRow;
    
    return items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      index: startIndex + index,
      row: Math.floor((startIndex + index) / columnsPerRow),
      col: (startIndex + index) % columnsPerRow,
    }));
  }, [items, visibleRange, columnsPerRow]);

  // Handle scroll events
  useEffect(() => {
    const element = scrollElement || scrollElementRef.current;
    if (!element) return;

    const handleScroll = () => {
      setScrollTop(element.scrollTop);
      setScrollLeft(element.scrollLeft);
    };

    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, [scrollElement]);

  return {
    visibleItems,
    visibleRange,
    totalHeight,
    columnsPerRow,
    scrollElementRef,
  };
}

/**
 * Virtual grid component
 */
export function VirtualGrid({
  items = [],
  itemWidth = 200,
  itemHeight = 150,
  width = 800,
  height = 600,
  gap = 10,
  renderItem,
  className = '',
  overscan = 2,
  onScroll,
  ...props
}) {
  const {
    visibleItems,
    totalHeight,
    columnsPerRow,
    scrollElementRef,
  } = useVirtualGrid({
    items,
    itemWidth,
    itemHeight,
    containerWidth: width,
    containerHeight: height,
    gap,
    overscan,
  });

  const handleScroll = (e) => {
    onScroll?.(e);
  };

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ width, height }}
      onScroll={handleScroll}
      {...props}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item) => (
          <div
            key={item.index}
            style={{
              position: 'absolute',
              left: item.col * (itemWidth + gap),
              top: item.row * (itemHeight + gap),
              width: itemWidth,
              height: itemHeight,
            }}
          >
            {renderItem(item, item.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Infinite scroll hook
 */
export function useInfiniteScroll({
  hasMore = true,
  loadMore,
  threshold = 100,
  scrollElement = null,
}) {
  const [loading, setLoading] = useState(false);
  const scrollElementRef = useRef(null);

  useEffect(() => {
    const element = scrollElement || scrollElementRef.current;
    if (!element || !hasMore) return;

    const handleScroll = async () => {
      if (loading) return;

      const { scrollTop, scrollHeight, clientHeight } = element;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - threshold;

      if (isNearBottom) {
        setLoading(true);
        try {
          await loadMore();
        } finally {
          setLoading(false);
        }
      }
    };

    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadMore, threshold, loading, scrollElement]);

  return {
    loading,
    scrollElementRef,
  };
}

/**
 * Infinite scroll component
 */
export function InfiniteScroll({
  children,
  hasMore = true,
  loadMore,
  threshold = 100,
  loader = null,
  className = '',
  ...props
}) {
  const { loading, scrollElementRef } = useInfiniteScroll({
    hasMore,
    loadMore,
    threshold,
  });

  return (
    <div ref={scrollElementRef} className={className} {...props}>
      {children}
      {loading && (loader || <div className="text-center p-4">Loading...</div>)}
    </div>
  );
}