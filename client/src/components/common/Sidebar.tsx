import React from 'react';
import { NavLink } from 'react-router-dom';
import { ar } from '../../locale/ar';
import { hasPermission } from '../../utils/permissions';
import { useAuthStore } from '../../stores/authStore';

export interface SidebarProps {
  layoutMode: 'admin' | 'agent';
}

export const Sidebar: React.FC<SidebarProps> = ({ layoutMode }) => {
  const { user } = useAuthStore();
  const isAdmin = layoutMode === 'admin';

  // Defines all sidebar navigation items
  const menuItems = [
    {
      path: isAdmin ? '/admin' : '/agent',
      label: ar.nav.dashboard,
      icon: '📊',
      exact: true,
      visible: true
    },
    {
      path: isAdmin ? '/admin/vehicles' : '/agent/vehicles',
      label: ar.nav.vehicles,
      icon: '🚗',
      visible: hasPermission(user, 'vehicles', 'read')
    },
    {
      path: isAdmin ? '/admin/agents' : null,
      label: ar.nav.agents,
      icon: '👥',
      visible: isAdmin && hasPermission(user, 'agents', 'read')
    },
    {
      path: isAdmin ? '/admin/customers' : '/agent/customers',
      label: ar.nav.customers,
      icon: '🤝',
      visible: hasPermission(user, 'customers', 'read')
    },
    {
      path: isAdmin ? '/admin/branches' : null,
      label: ar.nav.branches,
      icon: '🏢',
      visible: isAdmin && hasPermission(user, 'branches', 'read')
    },
    {
      path: isAdmin ? '/admin/roles' : null,
      label: ar.nav.roles,
      icon: '🛡️',
      visible: isAdmin && hasPermission(user, 'roles', 'read')
    },
    {
      path: isAdmin ? '/admin/wallets' : '/agent/wallet',
      label: isAdmin ? ar.nav.wallets : ar.nav.wallet,
      icon: '💼',
      visible: hasPermission(user, 'wallets', 'read')
    },
    {
      path: isAdmin ? '/admin/receipts' : '/agent/receipts',
      label: ar.nav.receipts,
      icon: '🧾',
      visible: hasPermission(user, 'wallets', 'read') // Receipts are bound to wallet permission
    },
    {
      path: isAdmin ? '/admin/reports' : null,
      label: ar.nav.reports,
      icon: '📈',
      visible: isAdmin && hasPermission(user, 'reports', 'read')
    },
    {
      path: isAdmin ? '/admin/audit-log' : null,
      label: ar.nav.auditLog,
      icon: '📋',
      visible: isAdmin && hasPermission(user, 'audit_log', 'read')
    },
    {
      path: isAdmin ? '/admin/settings' : null,
      label: ar.nav.settings,
      icon: '⚙️',
      visible: isAdmin && hasPermission(user, 'settings', 'read')
    },
    {
      path: !isAdmin ? '/agent/profile' : null,
      label: ar.nav.profile,
      icon: '👤',
      visible: !isAdmin
    }
  ];

  return (
    <aside className="w-64 bg-primary-dark text-white flex flex-col h-screen shrink-0 sticky top-0 z-20 border-l border-primary-accent/10 shadow-lg select-none text-right dark-theme-component">
      {/* Brand Logo Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border bg-black/10">
        <div className="h-9 w-9 rounded-full bg-primary-accent text-primary-dark flex items-center justify-center font-bold text-lg border border-primary-accent/40 shadow-inner">
          الباشا
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white tracking-wide">{ar.common.appName}</span>
          <span className="text-[10px] text-primary-accent font-semibold">
            {user?.role.nameAr || 'مستخدم النظام'}
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-1 custom-scrollbar">
        {menuItems
          .filter(item => item.visible && item.path)
          .map((item, idx) => (
            <NavLink
              key={idx}
              to={item.path!}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-accent text-primary-dark shadow-md border-r-4 border-white'
                    : 'text-text-on-dark/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-border bg-black/5 text-center text-[10px] text-text-on-dark/40 flex flex-col gap-1" dir="ltr">
        <span>AL-BASHA ERP v1.0.0</span>
        <span>{user?.fullName || 'Active User'}</span>
      </div>
    </aside>
  );
};
export default Sidebar;
