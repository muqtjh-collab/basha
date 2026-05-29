import React from 'react';

export interface CardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  trend?: {
    value: string | number;
    isPositive: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ 
  title, 
  value, 
  icon, 
  description, 
  trend,
  onClick,
  className = '' 
}) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-lg border border-border shadow-sm flex flex-col gap-2 select-none transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] hover:border-primary-accent/40' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-secondary">{title}</span>
        {icon && (
          <div className="p-2 rounded-md bg-bg-light text-primary-dark">
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-1 mt-1">
        <span className="text-2xl font-bold text-text-primary tracking-tight">{value}</span>
        
        {(trend || description) && (
          <div className="flex items-center gap-2 text-xs">
            {trend && (
              <span className={`font-semibold ${trend.isPositive ? 'text-success' : 'text-error'}`}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
            {description && <span className="text-text-secondary">{description}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
export default Card;
