'use client';

import { useState, useEffect } from 'react';

/**
 * Reusable loading spinner component
 */
export default function LoadingSpinner({ 
  size = 'md', 
  color = 'primary', 
  text = null, 
  className = '',
  delay = 0,
  ...props 
}) {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  if (!visible) return null;

  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    accent: 'text-accent',
    gray: 'text-gray-500',
    white: 'text-white',
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} {...props}>
      <div
        className={`animate-spin rounded-full border-2 border-transparent border-t-current ${sizeClasses[size]} ${colorClasses[color]}`}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className={`mt-2 ${textSizeClasses[size]} ${colorClasses[color]} text-center`}>
          {text}
        </p>
      )}
    </div>
  );
}

/**
 * Inline loading spinner for buttons
 */
export function InlineSpinner({ className = '', ...props }) {
  return (
    <LoadingSpinner 
      size="xs" 
      className={`inline-block ${className}`} 
      {...props} 
    />
  );
}

/**
 * Page-level loading spinner
 */
export function PageSpinner({ text = 'Loading...', ...props }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner 
        size="lg" 
        text={text} 
        {...props} 
      />
    </div>
  );
}

/**
 * Section-level loading spinner
 */
export function SectionSpinner({ text = 'Loading...', className = '', ...props }) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <LoadingSpinner 
        size="md" 
        text={text} 
        {...props} 
      />
    </div>
  );
}