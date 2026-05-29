import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../common/Sidebar';
import { TopNav } from '../common/TopNav';
import { useAuthStore } from '../../stores/authStore';
import { ar } from '../../locale/ar';

export const AdminLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  // Route security gate: check if logged in and admin layer role
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  const role = user.role.name;
  const isAuthorized = role === 'super_admin' || role === 'operations_manager' || role === 'branch_manager';

  if (!isAuthorized) {
    // If agent, redirect to agent panel. If customer, redirect to customer panel.
    if (role === 'senior_agent' || role === 'junior_agent' || role === 'support_staff') {
      return <Navigate to="/agent" replace />;
    } else {
      return <Navigate to="/customer" replace />;
    }
  }

  // Resolve Arabic section titles based on routing path
  const getSectionTitle = (): string => {
    const path = location.pathname;
    if (path.includes('/admin/vehicles')) return ar.nav.vehicles;
    if (path.includes('/admin/agents')) return ar.nav.agents;
    if (path.includes('/admin/customers')) return ar.nav.customers;
    if (path.includes('/admin/branches')) return ar.nav.branches;
    if (path.includes('/admin/roles')) return ar.nav.roles;
    if (path.includes('/admin/wallets')) return ar.nav.wallets;
    if (path.includes('/admin/receipts')) return ar.nav.receipts;
    if (path.includes('/admin/reports')) return ar.nav.reports;
    if (path.includes('/admin/audit-log')) return ar.nav.auditLog;
    if (path.includes('/admin/settings')) return ar.nav.settings;
    return ar.nav.dashboard;
  };

  return (
    <div className="flex h-screen w-full bg-bg-light overflow-hidden" dir="rtl">
      {/* Sidebar - flows to right side in RTL */}
      <Sidebar layoutMode="admin" />
      
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
export default AdminLayout;
