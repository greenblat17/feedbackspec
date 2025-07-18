'use client';

import { forwardRef } from 'react';

/**
 * Reusable card component
 */
const Card = forwardRef(({ 
  className = '', 
  children, 
  variant = 'default',
  padding = 'default',
  hoverable = false,
  ...props 
}, ref) => {
  const variantClasses = {
    default: 'bg-white border border-gray-200',
    outlined: 'bg-white border border-gray-300',
    elevated: 'bg-white shadow-md border border-gray-100',
    ghost: 'bg-transparent border-none',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    default: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };

  const hoverClasses = hoverable ? 'hover:shadow-lg transition-shadow cursor-pointer' : '';

  return (
    <div
      ref={ref}
      className={`rounded-lg ${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;

/**
 * Card header component
 */
export function CardHeader({ 
  title, 
  subtitle, 
  action, 
  className = '', 
  titleClassName = '',
  subtitleClassName = '',
  ...props 
}) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`} {...props}>
      <div className="flex-1">
        {title && (
          <h3 className={`text-lg font-semibold text-gray-900 ${titleClassName}`}>
            {title}
          </h3>
        )}
        {subtitle && (
          <p className={`text-sm text-gray-500 mt-1 ${subtitleClassName}`}>
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0 ml-4">
          {action}
        </div>
      )}
    </div>
  );
}

/**
 * Card body component
 */
export function CardBody({ className = '', children, ...props }) {
  return (
    <div className={`flex-1 ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Card footer component
 */
export function CardFooter({ 
  className = '', 
  children, 
  align = 'right',
  ...props 
}) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={`flex items-center mt-4 pt-4 border-t border-gray-200 ${alignClasses[align]} ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Feedback card component
 */
export function FeedbackCard({ 
  feedback, 
  onEdit, 
  onDelete, 
  onGenerateSpec,
  className = '',
  ...props 
}) {
  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  const categoryColors = {
    bug: 'bg-red-100 text-red-800',
    feature: 'bg-blue-100 text-blue-800',
    improvement: 'bg-purple-100 text-purple-800',
    complaint: 'bg-orange-100 text-orange-800',
    praise: 'bg-green-100 text-green-800',
    question: 'bg-gray-100 text-gray-800',
    suggestion: 'bg-indigo-100 text-indigo-800',
    other: 'bg-gray-100 text-gray-800',
  };

  return (
    <Card className={`${className}`} hoverable {...props}>
      <CardHeader
        title={feedback.title}
        subtitle={
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>From {feedback.source}</span>
            <span>•</span>
            <span>{new Date(feedback.submittedAt).toLocaleDateString()}</span>
          </div>
        }
        action={
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[feedback.priority] || priorityColors.medium}`}>
              {feedback.priority}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[feedback.category] || categoryColors.other}`}>
              {feedback.category}
            </span>
          </div>
        }
      />
      
      <CardBody>
        <p className="text-gray-700 mb-3">{feedback.content}</p>
        
        {feedback.tags && feedback.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {feedback.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {feedback.aiAnalysis && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
            <h4 className="text-sm font-medium text-blue-900 mb-1">AI Analysis</h4>
            <p className="text-sm text-blue-700">{feedback.aiAnalysis.summary}</p>
            {feedback.aiAnalysis.suggestedActions && feedback.aiAnalysis.suggestedActions.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-blue-600">Suggested Actions:</p>
                <ul className="text-xs text-blue-600 ml-4 list-disc">
                  {feedback.aiAnalysis.suggestedActions.slice(0, 2).map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardBody>

      <CardFooter>
        <div className="flex space-x-2">
          {onGenerateSpec && (
            <button
              onClick={() => onGenerateSpec(feedback)}
              className="text-sm bg-primary text-white px-3 py-1 rounded-md hover:bg-primary-dark transition-colors"
            >
              Generate Spec
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(feedback)}
              className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200 transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(feedback)}
              className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

/**
 * Spec card component
 */
export function SpecCard({ 
  spec, 
  onView, 
  onEdit, 
  onDelete,
  className = '',
  ...props 
}) {
  const isGenerating = spec.generating;
  const hasError = spec.error;

  return (
    <Card className={`${className} ${isGenerating ? 'opacity-75' : ''}`} hoverable={!isGenerating} {...props}>
      <CardHeader
        title={spec.title}
        subtitle={
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Generated {new Date(spec.createdAt).toLocaleDateString()}</span>
            {spec.cluster && (
              <>
                <span>•</span>
                <span>Cluster: {spec.cluster.theme}</span>
              </>
            )}
            {spec.feedback && (
              <>
                <span>•</span>
                <span>Individual Feedback</span>
              </>
            )}
          </div>
        }
        action={
          isGenerating ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-primary" />
              <span className="text-sm text-gray-500">Generating...</span>
            </div>
          ) : hasError ? (
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
              Error
            </span>
          ) : (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              Ready
            </span>
          )
        }
      />
      
      <CardBody>
        <div className="text-gray-700 text-sm">
          {isGenerating ? (
            <p>⏳ Generating specification...</p>
          ) : hasError ? (
            <p className="text-red-600">❌ Failed to generate specification</p>
          ) : (
            <p>{spec.content.slice(0, 200)}...</p>
          )}
        </div>
      </CardBody>

      <CardFooter>
        <div className="flex space-x-2">
          {!isGenerating && !hasError && onView && (
            <button
              onClick={() => onView(spec)}
              className="text-sm bg-primary text-white px-3 py-1 rounded-md hover:bg-primary-dark transition-colors"
            >
              View Spec
            </button>
          )}
          {!isGenerating && onEdit && (
            <button
              onClick={() => onEdit(spec)}
              className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200 transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(spec)}
              className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}