import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';
import authService from '../../services/auth.service';
import logoEmblem from '../../assests/CampusCore Academic Emblem.png';
import { LogOut, ExternalLink, Calendar, ShoppingBag } from 'lucide-react';

/**
 * DashboardShell Component
 * Master container for authenticated role dashboards with a focused workspace header and sidebar.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Main dashboard content
 * @param {string} [props.activeRole] - Optional role override for previewing
 */
export const DashboardShell = ({ children, activeRole }) => {
  const navigate = useNavigate();
  const user = authService.getStoredUser();
  const currentRole = activeRole || user?.role || 'member';

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const roleTitle = currentRole.replace('_', ' ').toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-white">
      {/* Focused Workspace Top Bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        {/* Left: Brand & Workspace Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src={logoEmblem}
              alt="CampusCore"
              className="w-7 h-7 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
            />
            <span className="font-sans font-bold text-base tracking-tight text-foreground">
              CampusCore
            </span>
          </Link>
          <span className="text-muted/60 text-xs">/</span>
          <span className="font-sans text-xs font-semibold uppercase tracking-wider text-primary">
            {roleTitle} Workspace
          </span>
        </div>

        {/* Right: Quick Links, Status, and User Sign Out */}
        <div className="flex items-center gap-5">
          <div className="hidden lg:flex items-center gap-4 text-xs font-medium text-muted">
            <Link
              to="/events"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-slate-100"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Public Events</span>
            </Link>
            <Link
              to="/store"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-slate-100"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Store</span>
            </Link>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="font-sans text-xs font-bold text-foreground">
                {user?.name || 'Authorized Member'}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
                {user?.email || 'verified'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border border-border bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-grow flex flex-col md:flex-row relative z-10">
        {/* Left Role-Specific Sidebar */}
        <DashboardSidebar currentRole={currentRole} />

        {/* Main Content View */}
        <main className="flex-grow p-6 sm:p-10 lg:p-12 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
