import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ar } from '../../locale/ar';
import ConfirmDialog from './ConfirmDialog';

export interface TopNavProps {
  title: string;
}

export const TopNav: React.FC<TopNavProps> = ({ title }) => {
  const { user, logout, isLoggingOut } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Quick fallback name
  const displayLetter = user?.fullNameAr ? user.fullNameAr.charAt(0) : 'م';

  const triggerLogout = () => {
    logout();
  };

  return (
    <header className="h-16 border-b border-border bg-white sticky top-0 z-20 flex items-center justify-between px-6 shadow-sm select-none">
      {/* Title / Section Name */}
      <h2 className="text-base font-bold text-text-primary text-right flex-1 pr-2">
        {title}
      </h2>

      {/* User profile dropdown and notifications */}
      <div className="flex items-center gap-4">
        {/* Branch / Region badge */}
        {user?.branchId && (
          <span className="text-xs font-semibold text-primary-accent bg-primary-dark px-3 py-1 rounded border border-primary-accent/30 select-none">
            فرع بغداد
          </span>
        )}

        {/* Notifications Icon (Mock placeholder for polling counters) */}
        <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-bg-light relative border border-border text-lg focus:outline-none transition-colors">
          🔔
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-error"></span>
        </button>

        {/* Vertical Divider */}
        <div className="h-6 w-[1px] bg-border"></div>

        {/* User Account Controls */}
        <div className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-1.5 rounded-full hover:bg-bg-light border border-border focus:outline-none transition-colors"
          >
            {/* Avatar Circle */}
            <div className="h-8 w-8 rounded-full bg-primary-dark text-primary-accent border border-primary-accent/30 flex items-center justify-center font-bold text-sm shadow-sm select-none">
              {displayLetter}
            </div>
            
            {/* Display Name */}
            <div className="hidden md:flex flex-col text-right pl-2 leading-tight">
              <span className="text-xs font-bold text-text-primary">{user?.fullNameAr}</span>
              <span className="text-[10px] text-text-secondary">{user?.email || user?.username}</span>
            </div>
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <>
              {/* Overlay Backdrop to click-out */}
              <div 
                onClick={() => setShowUserMenu(false)}
                className="fixed inset-0 z-30"
              />
              
              <div className="absolute left-0 mt-2 w-48 bg-white border border-border rounded-md shadow-lg py-1 z-40 text-right animate-in fade-in-50 duration-200">
                <div className="px-4 py-2 border-b border-border text-xs text-text-secondary select-none">
                  حساب {user?.role.nameAr}
                </div>
                
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full text-right px-4 py-2 text-sm text-error font-medium hover:bg-error/5 flex items-center gap-2 focus:outline-none transition-colors"
                >
                  <span>🚪</span>
                  <span>{ar.nav.logout}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Logout Confirmation */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={triggerLogout}
        title={ar.nav.logout}
        message={ar.auth.logoutConfirm}
        confirmText="تسجيل الخروج"
        isDanger={true}
        isLoading={isLoggingOut}
      />
    </header>
  );
};
export default TopNav;
