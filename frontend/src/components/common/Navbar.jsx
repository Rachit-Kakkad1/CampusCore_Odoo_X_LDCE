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

  const navLinkClass = (path) =>
    `font-mono text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
      location.pathname === path
        ? 'text-foreground border-b border-primary font-semibold'
        : 'text-muted hover:text-foreground'
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border text-foreground">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Org Name */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-7 h-7 border border-border bg-background flex items-center justify-center font-mono text-xs font-bold text-primary group-hover:bg-hover transition-colors">
                O
              </div>
              <span className="font-serif tracking-tight text-base uppercase font-semibold text-foreground">
                Odoo × LDCE Org
              </span>
            </Link>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-2">
              <Link to="/" className={navLinkClass('/')}>
                Home
              </Link>
              <Link to="/events" className={navLinkClass('/events')}>
                Events
              </Link>
              <Link to="/store" className={navLinkClass('/store')}>
                Store
              </Link>
              <Link to="/announcements" className={navLinkClass('/announcements')}>
                Announcements
              </Link>
              {isAuthenticated && (
                <>
                  <Link to="/membership" className={navLinkClass('/membership')}>
                    Membership
                  </Link>
                  <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                    Workspace
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* User / Auth CTA */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/dashboard"
                  className="hidden sm:flex flex-col text-right group"
                >
                  <span className="font-serif text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                    {user?.name || 'Member'}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
                    {user?.role?.replace('_', ' ') || 'Guest'}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="font-mono text-[10px] uppercase tracking-[0.2em] px-3.5 py-1.5 border border-border bg-background hover:bg-hover text-muted hover:text-foreground transition-colors duration-700"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="font-mono text-[10px] uppercase tracking-[0.2em] px-3.5 py-1.5 text-muted hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="font-mono text-[10px] uppercase tracking-[0.25em] px-4 py-1.5 bg-primary text-white border border-primary hover:bg-primary/90 transition-all duration-700"
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
