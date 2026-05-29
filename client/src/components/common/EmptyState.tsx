import React from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionButton?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  description, 
  icon,
  actionButton 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-dashed border-border py-12 max-w-lg mx-auto w-full gap-4">
      {icon ? (
        <div className="text-text-secondary/40">{icon}</div>
      ) : (
        <div className="text-5xl text-text-secondary/30">📥</div>
      )}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-bold text-text-primary">{title}</h3>
        {description && <p className="text-sm text-text-secondary">{description}</p>}
      </div>
      {actionButton && <div className="mt-2">{actionButton}</div>}
    </div>
  );
};
export default EmptyState;
