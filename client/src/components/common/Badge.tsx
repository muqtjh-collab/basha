import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'gray';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'gray', className = '' }) => {
  const variants = {
    primary: 'bg-primary-dark/10 text-primary-dark border border-primary-dark/20',
    secondary: 'bg-primary-accent/10 text-primary-dark border border-primary-accent/30',
    success: 'bg-success/10 text-success border border-success/20',
    warning: 'bg-warning/10 text-warning border border-warning/20',
    danger: 'bg-error/10 text-error border border-error/20',
    info: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
    gray: 'bg-gray-100 text-gray-600 border border-gray-200'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
export default Badge;
