import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, type = 'text', id, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 text-right">
        {label && (
          <label htmlFor={id} className="text-sm font-semibold text-text-primary">
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          ref={ref}
          className={`w-full px-4 py-2 border rounded-md bg-white text-text-primary text-right focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all duration-200 ${
            error ? 'border-error ring-1 ring-error' : 'border-border hover:border-text-secondary/30'
          } ${className}`}
          {...props}
        />
        {error && (
          <span className="text-xs font-medium text-error mt-0.5">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span className="text-xs text-text-secondary mt-0.5">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
