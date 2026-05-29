import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * RootLayout — the topmost layout component in the router tree.
 *
 * This component is rendered INSIDE RouterProvider, so all hooks that
 * require Router context (useNavigate, useLocation, etc.) work correctly here.
 *
 * It performs the one-time auto-login check (refresh token) on app load,
 * showing a full-page loading spinner while the session is being restored.
 * Once done, it renders the matched child route via <Outlet />.
 */
const RootLayout: React.FC = () => {
  const { useAutoLogin } = useAuth();
  const { isLoading } = useAutoLogin();

  if (isLoading) {
    return <LoadingSpinner fullPage={true} label="جاري تشغيل النظام والتحقق من الجلسة..." />;
  }

  return <Outlet />;
};

export default RootLayout;
