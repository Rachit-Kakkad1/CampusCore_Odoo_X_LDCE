// frontend/src/components/common/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import authService from '../../services/auth.service';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(authService.getStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());

  // Synchronize user state across route changes
  useEffect(() => {
    setUser(authService.getStoredUser());
    setIsAuthenticated(authService.isAuthenticated());
  }, [location]);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Org Name */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20 group-hover:bg-indigo-500 transition-colors">
                S
              </div>
              <span className="font-semibold tracking-tight text-lg text-slate-100 group-hover:text-white transition-colors">
                Skyline Org
              </span>
            </Link>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-4 text-sm font-medium">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  location.pathname === '/' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Home
              </Link>
              <Link
                to="/membership"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  location.pathname === '/membership' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Membership
              </Link>
              <Link
                to="/membership/pass"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  location.pathname === '/membership/pass' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Member Pass
              </Link>
            </div>
          </div>

          {/* User / Auth CTA */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-medium text-slate-200">{user?.name || 'Member'}</span>
                  <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">{user?.role || 'Guest'}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
