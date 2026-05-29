import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ar } from '../../locale/ar';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import AuthLayout from '../../components/layouts/AuthLayout';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoggingIn, loginError, isAuthenticated, user } = useAuth();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ identifier?: string; password?: string }>({});

  // If already authenticated, redirect on load
  useEffect(() => {
    if (isAuthenticated && user) {
      const role = user.role.name;
      if (role === 'super_admin' || role === 'operations_manager' || role === 'branch_manager') {
        navigate('/admin', { replace: true });
      } else if (role === 'senior_agent' || role === 'junior_agent' || role === 'support_staff') {
        navigate('/agent', { replace: true });
      } else if (role === 'customer') {
        navigate('/customer', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    const errors: { identifier?: string; password?: string } = {};
    if (!identifier) {
      errors.identifier = ar.validation.required;
    } else if (identifier.length < 3) {
      errors.identifier = ar.auth.identifierLabel + ' ' + ar.validation.minChar;
    }

    if (!password) {
      errors.password = ar.validation.required;
    } else if (password.length < 6) {
      errors.password = ar.validation.vinFormat; // Using a general format message or hardcoding Arabic message
      errors.password = 'يجب أن تتكون كلمة المرور من 6 رموز على الأقل';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    login({ identifier, password });
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <h2 className="text-lg font-bold text-primary-dark text-center select-none">
          {ar.auth.loginTitle}
        </h2>
        
        {/* Error Callout */}
        {loginError && (
          <div className="bg-error/10 border border-error/20 p-3 rounded-md text-right text-xs font-semibold text-error flex flex-col gap-1">
            <span>⚠️ {loginError.messageAr || 'اسم المستخدم أو كلمة المرور غير صحيحة.'}</span>
          </div>
        )}

        {/* Username/Email Input */}
        <Input
          label={ar.auth.identifierLabel}
          id="identifier"
          placeholder={ar.auth.identifierPlaceholder}
          value={identifier}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIdentifier(e.target.value)}
          error={validationErrors.identifier}
          disabled={isLoggingIn}
          autoComplete="username"
        />

        {/* Password Input */}
        <Input
          label={ar.auth.passwordLabel}
          id="password"
          type="password"
          placeholder={ar.auth.passwordPlaceholder}
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          error={validationErrors.password}
          disabled={isLoggingIn}
          autoComplete="current-password"
        />

        {/* Submit button */}
        <Button
          type="submit"
          variant="secondary"
          isLoading={isLoggingIn}
          className="w-full mt-2 font-bold text-sm"
        >
          {ar.auth.submitBtn}
        </Button>
      </form>
    </AuthLayout>
  );
};
export default Login;
