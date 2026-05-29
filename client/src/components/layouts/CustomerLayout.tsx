import React from 'react';
import { Navigate, Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ar } from '../../locale/ar';

export const CustomerLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Ensure role is customer
  if (user.role.name !== 'customer') {
    if (user.role.level <= 3) {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/agent" replace />;
    }
  }

  // Determine header title based on route
  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path.includes('/customer/notifications')) return ar.nav.notifications;
    if (path.includes('/customer/profile')) return ar.nav.profile;
    if (path.includes('/customer/vehicles/')) return ar.common.details;
    return 'مركباتي';
  };

  return (
    <div className="min-h-screen w-full bg-bg-light flex flex-col max-w-md mx-auto border-x border-border shadow-md pb-20 relative" dir="rtl">
      {/* Mobile Top Header */}
      <header className="h-14 bg-primary-dark text-white sticky top-0 z-30 flex items-center justify-between px-4 border-b border-primary-accent/10 shadow-sm select-none">
        <h1 className="text-base font-bold tracking-wide">{getHeaderTitle()}</h1>
        <div className="h-7 w-7 rounded-full bg-primary-accent text-primary-dark flex items-center justify-center font-bold text-xs border border-primary-accent/40 shadow-inner">
          الباشا
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-y-auto">
        <Outlet />
      </main>

      {/* Mobile-first Bottom Navigation Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-border flex items-center justify-around z-30 max-w-md mx-auto shadow-lg select-none">
        {/* Vehicles Tab */}
        <NavLink
          to="/customer"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-bold transition-colors ${
              isActive ? 'text-primary-accent' : 'text-text-secondary'
            }`
          }
        >
          <span className="text-xl">🚗</span>
          <span>مركباتي</span>
        </NavLink>

        {/* Notifications Tab */}
        <NavLink
          to="/customer/notifications"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-bold transition-colors relative ${
              isActive ? 'text-primary-accent' : 'text-text-secondary'
            }`
          }
        >
          <span className="text-xl">🔔</span>
          <span>{ar.nav.notifications}</span>
          <span className="absolute top-0.5 right-2 h-2.5 w-2.5 bg-error rounded-full border border-white"></span>
        </NavLink>

        {/* Profile Tab */}
        <NavLink
          to="/customer/profile"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-bold transition-colors ${
              isActive ? 'text-primary-accent' : 'text-text-secondary'
            }`
          }
        >
          <span className="text-xl">👤</span>
          <span>{ar.nav.profile}</span>
        </NavLink>
      </nav>
    </div>
  );
};
export default CustomerLayout;
