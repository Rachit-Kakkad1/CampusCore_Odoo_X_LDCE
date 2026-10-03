// frontend/src/components/dashboard/DashboardSidebar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  CreditCard, 
  ShoppingBag, 
  Megaphone, 
  Users, 
  DollarSign, 
  QrCode, 
  CheckSquare, 
  FileText,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import authService from '../../services/auth.service';

/**
 * DashboardSidebar Component
 * Strictly generates role-aware navigation and logout handling.
 * Does NOT display navigation items a role is unauthorized to access.
 *
 * @param {Object} props
 * @param {string} props.currentRole - 'admin' | 'treasurer' | 'event_manager' | 'volunteer' | 'member' | 'guest'
 */
export const DashboardSidebar = ({ currentRole }) => {
  const navigate = useNavigate();
  const user = authService.getStoredUser();
  const effectiveRole = currentRole || user?.role || 'guest';

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] border-l-2 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
      isActive
        ? 'border-primary text-foreground bg-hover font-semibold'
        : 'border-transparent text-muted hover:text-foreground hover:bg-hover'
    }`;

  return (
    <aside className="w-full md:w-64 border-r border-border bg-background flex flex-col justify-between shrink-0 select-none">
      <div className="p-6 space-y-8">
        {/* User Identity & Authority Box */}
        <div className="border border-border p-4 bg-background">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted">
              Authority Profile
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="font-serif text-base text-foreground font-semibold truncate">
            {user?.name || 'Guest Attendee'}
          </div>
          <div className="font-sans text-xs text-muted truncate mb-2">
            {user?.email || 'unauthenticated'}
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-border bg-hover">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary font-medium">
              {effectiveRole.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Dynamic Role-Aware Navigation Section */}
        <nav className="space-y-1">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted px-4 mb-2">
            Core Workspace
          </div>

          <NavLink to="/dashboard" end className={navItemClass}>
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Overview</span>
          </NavLink>

          {/* ========================================================= */}
          {/* 1. ADMIN EXCLUSIVE NAVIGATION                             */}
          {/* ========================================================= */}
          {effectiveRole === 'admin' && (
            <>
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted px-4 mt-6 mb-2">
                Organization
              </div>
              <NavLink to="/dashboard/admin/events" className={navItemClass}>
                <Calendar className="w-3.5 h-3.5" />
                <span>Events Admin</span>
              </NavLink>
              <NavLink to="/dashboard/admin/users" className={navItemClass}>
                <Users className="w-3.5 h-3.5" />
                <span>User Accounts</span>
              </NavLink>
              <NavLink to="/dashboard/admin/store" className={navItemClass}>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Catalog & Stock</span>
              </NavLink>
              <NavLink to="/membership" className={navItemClass}>
                <CreditCard className="w-3.5 h-3.5" />
                <span>Membership Roster</span>
              </NavLink>
              <NavLink to="/dashboard/finance" className={navItemClass}>
                <DollarSign className="w-3.5 h-3.5" />
                <span>Financial Ledger</span>
              </NavLink>
            </>
          )}

          {/* ========================================================= */}
          {/* 2. TREASURER EXCLUSIVE NAVIGATION                         */}
          {/* ========================================================= */}
          {effectiveRole === 'treasurer' && (
            <>
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted px-4 mt-6 mb-2">
                Treasury
              </div>
              <NavLink to="/dashboard/finance" className={navItemClass}>
                <DollarSign className="w-3.5 h-3.5" />
                <span>Central Ledger</span>
              </NavLink>
              <NavLink to="/dashboard/finance/expenses" className={navItemClass}>
                <FileText className="w-3.5 h-3.5" />
                <span>Expense Approvals</span>
              </NavLink>
            </>
          )}

          {/* ========================================================= */}
          {/* 3. EVENT MANAGER EXCLUSIVE NAVIGATION                     */}
          {/* ========================================================= */}
          {effectiveRole === 'event_manager' && (
            <>
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted px-4 mt-6 mb-2">
                Event Operations
              </div>
              <NavLink to="/dashboard/events" className={navItemClass}>
                <Calendar className="w-3.5 h-3.5" />
                <span>Assigned Events</span>
              </NavLink>
              <NavLink to="/dashboard/events/checkin" className={navItemClass}>
                <QrCode className="w-3.5 h-3.5" />
                <span>Door Check-in</span>
              </NavLink>
            </>
          )}

          {/* ========================================================= */}
          {/* 4. VOLUNTEER EXCLUSIVE NAVIGATION                         */}
          {/* ========================================================= */}
          {effectiveRole === 'volunteer' && (
            <>
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted px-4 mt-6 mb-2">
                Task Execution
              </div>
              <NavLink to="/dashboard/tasks" className={navItemClass}>
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Assigned Tasks</span>
              </NavLink>
              <NavLink to="/dashboard/events/checkin" className={navItemClass}>
                <QrCode className="w-3.5 h-3.5" />
                <span>Check-in Station</span>
              </NavLink>
            </>
          )}

          {/* ========================================================= */}
          {/* 5. MEMBER & GUEST NAVIGATION                             */}
          {/* ========================================================= */}
          {(effectiveRole === 'member' || effectiveRole === 'guest') && (
            <>
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted px-4 mt-6 mb-2">
                Member Services
              </div>
              <NavLink to="/membership/pass" className={navItemClass}>
                <QrCode className="w-3.5 h-3.5" />
                <span>Digital Pass</span>
              </NavLink>
              <NavLink to="/membership" className={navItemClass}>
                <CreditCard className="w-3.5 h-3.5" />
                <span>Membership Status</span>
              </NavLink>
              <NavLink to="/store" className={navItemClass}>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Merchandise Store</span>
              </NavLink>
            </>
          )}

          {/* Common communication link accessible to all authenticated users */}
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted px-4 mt-6 mb-2">
            Broadcasts
          </div>
          <NavLink to="/announcements" className={navItemClass}>
            <Megaphone className="w-3.5 h-3.5" />
            <span>Announcements</span>
          </NavLink>
        </nav>
      </div>

      {/* Logout Action Footer */}
      <div className="p-6 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] border border-border bg-background hover:bg-hover text-muted hover:text-foreground transition-colors duration-700"
        >
          <LogOut className="w-3 h-3" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
