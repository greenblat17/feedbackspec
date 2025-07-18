'use client';

/**
 * Reusable empty state component
 */
export default function EmptyState({
  icon = null,
  title = 'No data found',
  description = 'There are no items to display.',
  action = null,
  className = '',
  ...props
}) {
  return (
    <div className={`text-center py-12 ${className}`} {...props}>
      {icon && (
        <div className="flex justify-center mb-4">
          {typeof icon === 'string' ? (
            <div className="text-6xl">{icon}</div>
          ) : (
            icon
          )}
        </div>
      )}
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        {description}
      </p>
      
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}

/**
 * Empty state for feedback list
 */
export function EmptyFeedback({ onAddFeedback }) {
  return (
    <EmptyState
      icon="💬"
      title="No feedback yet"
      description="Start collecting feedback from your users to see insights and generate specifications."
      action={
        onAddFeedback && (
          <button
            onClick={onAddFeedback}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Feedback
          </button>
        )
      }
    />
  );
}

/**
 * Empty state for specifications
 */
export function EmptySpecs({ onGenerateSpec }) {
  return (
    <EmptyState
      icon="📋"
      title="No specifications generated"
      description="Generate detailed specifications from your feedback to help guide development."
      action={
        onGenerateSpec && (
          <button
            onClick={onGenerateSpec}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate Spec
          </button>
        )
      }
    />
  );
}

/**
 * Empty state for search results
 */
export function EmptySearchResults({ searchTerm, onClearSearch }) {
  return (
    <EmptyState
      icon="🔍"
      title="No results found"
      description={`No items match "${searchTerm}". Try adjusting your search terms.`}
      action={
        onClearSearch && (
          <button
            onClick={onClearSearch}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Clear Search
          </button>
        )
      }
    />
  );
}

/**
 * Empty state for filtered results
 */
export function EmptyFilteredResults({ onClearFilters }) {
  return (
    <EmptyState
      icon="🔍"
      title="No items match your filters"
      description="Try adjusting your filters to see more results."
      action={
        onClearFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        )
      }
    />
  );
}

/**
 * Empty state for clusters
 */
export function EmptyClusters() {
  return (
    <EmptyState
      icon="🔗"
      title="No clusters found"
      description="Feedback clusters will appear here once you have enough feedback to group together."
    />
  );
}

/**
 * Generic loading empty state
 */
export function LoadingEmptyState({ message = 'Loading...' }) {
  return (
    <EmptyState
      icon={
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-primary" />
      }
      title={message}
      description="Please wait while we load your data."
    />
  );
}