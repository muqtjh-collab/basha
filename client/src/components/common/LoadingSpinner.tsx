import React from 'react';

export interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  label = 'جاري تحميل البيانات...', 
  size = 'md',
  fullPage = false 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-16 w-16 border-4'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      <div className={`animate-spin rounded-full border-primary-dark/10 border-t-primary-accent ${sizeClasses[size]}`}></div>
      {label && <span className="text-sm font-semibold text-text-secondary">{label}</span>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-light/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8 w-full h-full">
      {spinner}
    </div>
  );
};
export default LoadingSpinner;
