import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from '../router';
import { AuthService } from '../services/authService';
import { useAuthStore } from '../stores/authStore';
import type { LoginInput, ChangePasswordInput } from '../../../server/src/validators/auth.validators';

export const useAuth = () => {
  // Use router.navigate() instead of useNavigate() so that useAuth can be called
  // in AppContent (outside RouterProvider) for the auto-login check without crashing.
  const navigate = router.navigate.bind(router);
  const { setAuth, clearAuth, user, isAuthenticated } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginInput) => AuthService.login(credentials),
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user);
      
      // Redirect based on user role
      const role = data.user.role.name;
      if (role === 'super_admin' || role === 'operations_manager' || role === 'branch_manager') {
        navigate('/admin');
      } else if (role === 'senior_agent' || role === 'junior_agent' || role === 'support_staff') {
        navigate('/agent');
      } else if (role === 'customer') {
        navigate('/customer');
      } else {
        navigate('/');
      }
    }
  });

  const logoutMutation = useMutation({
    mutationFn: () => AuthService.logout(),
    onSuccess: () => {
      clearAuth();
      navigate('/auth/login');
    },
    onError: () => {
      // In case of error (e.g. invalid network state), force clear locally anyway
      clearAuth();
      navigate('/auth/login');
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: (passwords: ChangePasswordInput) => AuthService.changePassword(passwords),
    onSuccess: () => {
      clearAuth();
      navigate('/auth/login');
    }
  });

  // Query to perform initial auto-login by calling refresh on app load
  const useAutoLogin = () => {
    return useQuery({
      queryKey: ['autoLogin'],
      queryFn: async () => {
        try {
          const data = await AuthService.refresh();
          setAuth(data.accessToken, data.user);
          return data.user;
        } catch (error) {
          clearAuth();
          throw error;
        }
      },
      retry: false,
      enabled: !isAuthenticated, // Only attempt if not already logged in
    });
  };

  return {
    user,
    isAuthenticated,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error as any,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    changePassword: changePasswordMutation.mutate,
    isChangingPassword: changePasswordMutation.isPending,
    changePasswordError: changePasswordMutation.error as any,
    useAutoLogin
  };
};
export default useAuth;
