import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import RootLayout from './components/layouts/RootLayout';
import AdminLayout from './components/layouts/AdminLayout';
import AgentLayout from './components/layouts/AgentLayout';
import CustomerLayout from './components/layouts/CustomerLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AgentDashboard from './pages/agent/Dashboard';
import CustomerDashboard from './pages/customer/Dashboard';
import RolesList from './pages/admin/RolesList';
import AuditLog from './pages/admin/AuditLog';
import BranchesList from './pages/admin/BranchesList';
import CustomersList from './pages/admin/CustomersList';
import CustomersAgentList from './pages/agent/CustomersAgentList';
import AgentsList from './pages/admin/AgentsList';
import VehiclesList from './pages/admin/VehiclesList';
import VehiclesAgentList from './pages/agent/VehiclesAgentList';
import VehicleDetail from './pages/common/VehicleDetail';
import { VehicleDetail as CustomerVehicleDetail } from './pages/customer/VehicleDetail';
import WalletsList from './pages/admin/WalletsList';
import AgentWallet from './pages/agent/AgentWallet';

// Simple placeholder page component for modules to be built in Sprints 2-7
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="bg-white p-8 rounded-lg border border-border shadow-sm text-right flex flex-col gap-4">
    <h1 className="text-xl font-bold text-primary-dark">{title}</h1>
    <p className="text-sm text-text-secondary">هذه الصفحة قيد التطوير والبرمجة حالياً وسيتم توفيرها في المراحل القادمة.</p>
  </div>
);

export const router = createBrowserRouter([
  {
    // RootLayout is the topmost element — rendered INSIDE RouterProvider.
    // It performs the auto-login check before rendering any child route.
    element: <RootLayout />,
    children: [
      // Redirect root path to login
      {
        path: '/',
        element: <Navigate to="/auth/login" replace />,
      },
      // Authentication Routes
      {
        path: '/auth',
        children: [
          { path: 'login', element: <Login /> },
          { path: '*', element: <Navigate to="/auth/login" replace /> }
        ]
      },
      // Admin Panel Routes
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { path: '', element: <AdminDashboard /> },
          { path: 'vehicles', element: <VehiclesList /> },
          { path: 'vehicles/:id', element: <VehicleDetail /> },
          { path: 'agents', element: <AgentsList /> },
          { path: 'agents/:id', element: <PlaceholderPage title="تفاصيل الوكيل" /> },
          { path: 'customers', element: <CustomersList /> },
          { path: 'customers/:id', element: <PlaceholderPage title="تفاصيل العميل" /> },
          { path: 'branches', element: <BranchesList /> },
          { path: 'roles', element: <RolesList /> },
          { path: 'wallets', element: <WalletsList /> },
          { path: 'wallets/:id', element: <PlaceholderPage title="تفاصيل المحفظة والعمليات" /> },
          { path: 'receipts', element: <PlaceholderPage title="مراجعة الإيصالات المالية" /> },
          { path: 'receipts/:id', element: <PlaceholderPage title="تفاصيل الإيصال المالي" /> },
          { path: 'reports', element: <PlaceholderPage title="التقارير المالية واللوجستية" /> },
          { path: 'audit-log', element: <AuditLog /> },
          { path: 'settings', element: <PlaceholderPage title="إعدادات النظام" /> },
          { path: '*', element: <Navigate to="/admin" replace /> }
        ],
      },
      // Agent Dashboard Routes
      {
        path: '/agent',
        element: <AgentLayout />,
        children: [
          { path: '', element: <AgentDashboard /> },
          { path: 'vehicles', element: <VehiclesAgentList /> },
          { path: 'vehicles/:id', element: <VehicleDetail /> },
          { path: 'vehicles/add', element: <PlaceholderPage title="إضافة سيارة جديدة للمحفظة" /> },
          { path: 'customers', element: <CustomersAgentList /> },
          { path: 'customers/:id', element: <PlaceholderPage title="تفاصيل عميلي" /> },
          { path: 'wallet', element: <AgentWallet /> },
          { path: 'receipts', element: <PlaceholderPage title="إيصالاتي المرفوعة" /> },
          { path: 'profile', element: <PlaceholderPage title="الملف الشخصي للوكيل" /> },
          { path: '*', element: <Navigate to="/agent" replace /> }
        ],
      },
      // Customer PWA Routes
      {
        path: '/customer',
        element: <CustomerLayout />,
        children: [
          { path: '', element: <CustomerDashboard /> },
          { path: 'vehicles/:id', element: <CustomerVehicleDetail /> },
          { path: 'notifications', element: <PlaceholderPage title="إشعاراتي" /> },
          { path: 'profile', element: <PlaceholderPage title="حسابي الشخصي" /> },
          { path: '*', element: <Navigate to="/customer" replace /> }
        ],
      },
      // Fallback redirect for other paths
      {
        path: '*',
        element: <Navigate to="/auth/login" replace />,
      }
    ]
  }
]);
