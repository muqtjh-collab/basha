import React from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = 'md' 
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-5xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-primary-dark/40 backdrop-blur-sm transition-opacity duration-300"
      ></div>

      {/* Modal Dialog Content */}
      <div className={`w-full ${sizeClasses[size]} bg-white rounded-lg shadow-xl border border-border overflow-hidden z-10 flex flex-col transform transition-all duration-300 scale-100`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-light">
          <h3 className="text-base font-bold text-text-primary">{title}</h3>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-primary-dark/5 transition-colors focus:outline-none"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 overflow-y-auto max-h-[70vh] custom-scrollbar text-right text-text-primary text-sm leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-bg-light">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
export default Modal;
