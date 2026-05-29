import React from 'react';

export interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-bg-light relative overflow-hidden p-4">
      {/* Decorative premium gradient background drops */}
      <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-primary-accent/5 filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-primary-dark/5 filter blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-border p-8 flex flex-col gap-6 z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="h-12 w-12 rounded-full bg-primary-dark text-primary-accent flex items-center justify-center text-2xl font-bold border border-primary-accent/30 shadow-md select-none">
            الباشا
          </div>
          <h1 className="text-xl font-bold text-primary-dark mt-1">الباشا لاستيراد السيارات</h1>
          <p className="text-xs text-text-secondary">نظام إدارة العمليات اللوجستية والمالية المتكامل</p>
        </div>

        {/* Form content */}
        {children}
      </div>

      {/* Footer */}
      <span className="text-xs text-text-secondary mt-8 z-10 select-none" dir="ltr">
        &copy; {new Date().getFullYear()} AL-BASHA ERP. All rights reserved.
      </span>
    </div>
  );
};
export default AuthLayout;
