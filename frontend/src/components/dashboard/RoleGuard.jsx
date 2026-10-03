// frontend/src/components/dashboard/RoleGuard.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../../services/auth.service';

/**
 * RoleGuard Component
 * Enforces role-based route access on the client-side while the backend enforces API authorization.
 *
 * @param {Object} props
 * @param {string[]} props.allowedRoles - Array of roles permitted (e.g. ['admin', 'treasurer'])
 * @param {React.ReactNode} props.children
 */
export const RoleGuard = ({ allowedRoles = [], children }) => {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(authService.getStoredUser());
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function syncAuth() {
      if (authService.isAuthenticated()) {
        try {
          const freshUser = await authService.getMe();
          if (isMounted && freshUser) {
            setCurrentUser(freshUser);
          }
        } catch (err) {
          if (err.status === 401) {
            authService.logout();
            if (isMounted) {
              setCurrentUser(null);
            }
          } else if (isMounted) {
            setCurrentUser(authService.getStoredUser());
          }
        }
      }
      if (isMounted) {
        setIsVerifying(false);
      }
    }

    syncAuth();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (!authService.isAuthenticated() || (!isVerifying && !currentUser)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex items-center gap-3 border border-border p-6 bg-background">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-foreground">
            Verifying Authority...
          </span>
        </div>
      </div>
    );
  }

  const role = currentUser?.role || 'member';

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RoleGuard;
