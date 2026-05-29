import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../common/Sidebar';
import { TopNav } from '../common/TopNav';
import { useAuthStore } from '../../stores/authStore';
import { ar } from '../../locale/ar';

export const AgentLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  // Guard checks
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  const role = user.role.name;
  const isAuthorized = role === 'senior_agent' || role === 'junior_agent' || role === 'support_staff';

  if (!isAuthorized) {
    // If corporate manager/admin, redirect to admin panel
    if (role === 'super_admin' || role === 'operations_manager' || role === 'branch_manager') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/customer" replace />;
    }
  }

  // Resolve Arabic section titles based on routing path
  const getSectionTitle = (): string => {
    const path = location.pathname;
    if (path.includes('/agent/vehicles')) return ar.nav.vehicles;
    if (path.includes('/agent/customers')) return ar.nav.customers;
    if (path.includes('/agent/wallet')) return ar.nav.wallet;
    if (path.includes('/agent/receipts')) return ar.nav.receipts;
    if (path.includes('/agent/profile')) return ar.nav.profile;
    return ar.nav.dashboard;
  };

  return (
    <div className="flex h-screen w-full bg-bg-light overflow-hidden" dir="rtl">
      {/* Sidebar - flows to right side in RTL */}
      <Sidebar layoutMode="agent" />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <TopNav title={getSectionTitle()} />
        
        {/* Child Pages Container */}
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
export default AgentLayout;
