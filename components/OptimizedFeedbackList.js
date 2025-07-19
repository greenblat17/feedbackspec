'use client';

import { memo, useMemo, useCallback } from 'react';
import { 
  useFilteredData, 
  useSearchResults, 
  VirtualList, 
  useComponentPerformance,
  createShallowMemoComponent,
} from '../libs/performance.js';
import { FeedbackCard } from './ui/index.js';

/**
 * Optimized individual feedback item component
 */
const FeedbackItem = createShallowMemoComponent(({
  feedback,
  onEdit,
  onDelete,
  onGenerateSpec,
  style,
}) => {
  useComponentPerformance('FeedbackItem');

  // Memoize callbacks to prevent unnecessary re-renders
  const handleEdit = useCallback(() => onEdit(feedback), [feedback, onEdit]);
  const handleDelete = useCallback(() => onDelete(feedback), [feedback, onDelete]);
  const handleGenerateSpec = useCallback(() => onGenerateSpec(feedback), [feedback, onGenerateSpec]);

  return (
    <div style={style}>
      <FeedbackCard
        feedback={feedback}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onGenerateSpec={handleGenerateSpec}
        className="mb-4"
      />
    </div>
  );
});

/**
 * Optimized feedback list component with virtual scrolling
 */
const OptimizedFeedbackList = memo(({
  feedback = [],
  searchTerm = '',
  filters = {},
  onEdit,
  onDelete,
  onGenerateSpec,
  className = '',
  itemHeight = 200,
  height = 600,
  ...props
}) => {
  useComponentPerformance('OptimizedFeedbackList');

  // Memoize search fields to prevent unnecessary recalculations
  const searchFields = useMemo(() => ['title', 'content', 'tags'], []);

  // Memoize filter function to prevent unnecessary re-renders
  const filterFn = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) return null;
    
    return (item) => {
      // Category filter
      if (filters.category && filters.category !== 'all' && item.category !== filters.category) {
        return false;
      }

      // Priority filter
      if (filters.priority && filters.priority !== 'all' && item.priority !== filters.priority) {
        return false;
      }

      // Source filter
      if (filters.source && filters.source !== 'all' && item.source !== filters.source) {
        return false;
      }

      // Processed filter
      if (filters.processed && filters.processed !== 'all') {
        const isProcessed = item.processed === true;
        if (filters.processed === 'processed' && !isProcessed) return false;
        if (filters.processed === 'unprocessed' && isProcessed) return false;
      }

      return true;
    };
  }, [filters]);

  // Memoize sort function
  const sortFn = useMemo(() => {
    return (a, b) => {
      // Sort by priority first (urgent > high > medium > low)
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then sort by date (newest first)
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    };
  }, []);

  // Apply search with optimized hook
  const searchResults = useSearchResults(
    feedback,
    searchTerm,
    searchFields,
    [feedback, searchTerm, searchFields]
  );

  // Apply filters and sorting with optimized hook
  const filteredAndSortedFeedback = useFilteredData(
    searchResults,
    filterFn,
    sortFn,
    [searchResults, filterFn, sortFn]
  );

  // Memoize render function for virtual list
  const renderItem = useCallback(
    (item, index) => (
      <FeedbackItem
        key={item.id}
        feedback={item}
        onEdit={onEdit}
        onDelete={onDelete}
        onGenerateSpec={onGenerateSpec}
      />
    ),
    [onEdit, onDelete, onGenerateSpec]
  );

  // If there are fewer items, use regular rendering to avoid virtual scrolling overhead
  if (filteredAndSortedFeedback.length <= 10) {
    return (
      <div className={`space-y-4 ${className}`} {...props}>
        {filteredAndSortedFeedback.map((item, index) => renderItem(item, index))}
      </div>
    );
  }

  // Use virtual scrolling for large lists
  return (
    <div className={className} {...props}>
      <VirtualList
        items={filteredAndSortedFeedback}
        itemHeight={itemHeight}
        height={height}
        renderItem={renderItem}
        overscan={3}
        className="space-y-4"
      />
    </div>
  );
});

OptimizedFeedbackList.displayName = 'OptimizedFeedbackList';

export default OptimizedFeedbackList;

/**
 * Optimized feedback grid component for card layouts
 */
export const OptimizedFeedbackGrid = memo(({
  feedback = [],
  searchTerm = '',
  filters = {},
  onEdit,
  onDelete,
  onGenerateSpec,
  className = '',
  itemWidth = 300,
  itemHeight = 200,
  width = 900,
  height = 600,
  gap = 16,
  ...props
}) => {
  useComponentPerformance('OptimizedFeedbackGrid');

  // Same filtering and search logic as list
  const searchFields = useMemo(() => ['title', 'content', 'tags'], []);
  
  const filterFn = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) return null;
    
    return (item) => {
      if (filters.category && filters.category !== 'all' && item.category !== filters.category) {
        return false;
      }
      if (filters.priority && filters.priority !== 'all' && item.priority !== filters.priority) {
        return false;
      }
      if (filters.source && filters.source !== 'all' && item.source !== filters.source) {
        return false;
      }
      if (filters.processed && filters.processed !== 'all') {
        const isProcessed = item.processed === true;
        if (filters.processed === 'processed' && !isProcessed) return false;
        if (filters.processed === 'unprocessed' && isProcessed) return false;
      }
      return true;
    };
  }, [filters]);

  const sortFn = useMemo(() => {
    return (a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    };
  }, []);

  const searchResults = useSearchResults(
    feedback,
    searchTerm,
    searchFields,
    [feedback, searchTerm, searchFields]
  );

  const filteredAndSortedFeedback = useFilteredData(
    searchResults,
    filterFn,
    sortFn,
    [searchResults, filterFn, sortFn]
  );

  const renderItem = useCallback(
    (item, index) => (
      <FeedbackCard
        key={item.id}
        feedback={item}
        onEdit={() => onEdit(item)}
        onDelete={() => onDelete(item)}
        onGenerateSpec={() => onGenerateSpec(item)}
      />
    ),
    [onEdit, onDelete, onGenerateSpec]
  );

  // For smaller lists, use regular grid
  if (filteredAndSortedFeedback.length <= 20) {
    return (
      <div 
        className={`grid gap-4 ${className}`} 
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${itemWidth}px, 1fr))`,
        }}
        {...props}
      >
        {filteredAndSortedFeedback.map((item, index) => renderItem(item, index))}
      </div>
    );
  }

  // Use virtual grid for large lists
  return (
    <div className={className} {...props}>
      <VirtualGrid
        items={filteredAndSortedFeedback}
        itemWidth={itemWidth}
        itemHeight={itemHeight}
        width={width}
        height={height}
        gap={gap}
        renderItem={renderItem}
        overscan={2}
      />
    </div>
  );
});

OptimizedFeedbackGrid.displayName = 'OptimizedFeedbackGrid';

/**
 * Performance statistics component
 */
export const FeedbackListStats = memo(({ feedback = [] }) => {
  useComponentPerformance('FeedbackListStats');

  const stats = useMemo(() => {
    const total = feedback.length;
    const processed = feedback.filter(f => f.processed).length;
    const unprocessed = total - processed;
    
    const byPriority = feedback.reduce((acc, f) => {
      acc[f.priority] = (acc[f.priority] || 0) + 1;
      return acc;
    }, {});
    
    const byCategory = feedback.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total,
      processed,
      unprocessed,
      byPriority,
      byCategory,
    };
  }, [feedback]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold mb-4">Feedback Statistics</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.processed}</div>
          <div className="text-sm text-gray-500">Processed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.unprocessed}</div>
          <div className="text-sm text-gray-500">Unprocessed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.byPriority.urgent || 0}</div>
          <div className="text-sm text-gray-500">Urgent</div>
        </div>
      </div>
    </div>
  );
});

FeedbackListStats.displayName = 'FeedbackListStats';