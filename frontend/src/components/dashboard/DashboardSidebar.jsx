// frontend/src/components/dashboard/DashboardSidebar.jsx
import React, { useState } from 'react';
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
  Ticket,
  LogOut,
  ShieldCheck,
  Lock,
  Heart
} from 'lucide-react';
import authService from '../../services/auth.service';
import AnnouncementsModal from './AnnouncementsModal';

/**
 * DashboardSidebar Component
 * Professional role-aware navigation and logout handling with high contrast.
 *
 * @param {Object} props
 * @param {string} props.currentRole - 'admin' | 'treasurer' | 'event_manager' | 'volunteer' | 'member' | 'guest'
 */
export const DashboardSidebar = ({ currentRole }) => {
  const navigate = useNavigate();
  const user = authService.getStoredUser();
  const effectiveRole = currentRole || user?.role || 'guest';
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 text-sm font-medium border-l-2 transition-colors duration-200 ${
      isActive
        ? 'border-primary text-slate-900 bg-slate-100 font-semibold'
        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
    }`;

  return (
    <aside className="w-full md:w-64 border-r border-border bg-white flex flex-col justify-between shrink-0 select-none">
      <div className="p-6 space-y-6">
        {/* User Identity & Authority Box */}
        <div className="border border-border p-4 bg-slate-50/80 rounded-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Authority Profile
            </span>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {user?.name || 'Guest Attendee'}
          </div>
          <div className="text-xs text-slate-500 truncate mb-3">
            {user?.email || 'unauthenticated'}
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-border bg-white shadow-xs rounded-xs">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs uppercase tracking-wider text-primary font-bold">
              {effectiveRole.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Dynamic Role-Aware Navigation Section */}
        <nav className="space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-4 mb-2">
            Core Workspace
          </div>

          <NavLink to="/dashboard" end className={navItemClass}>
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview</span>
          </NavLink>

          {/* ========================================================= */}
          {/* 1. ADMIN EXCLUSIVE NAVIGATION                             */}
          {/* ========================================================= */}
          {effectiveRole === 'admin' && (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-4 mt-6 mb-2">
                Organization
              </div>
              <NavLink to="/dashboard/admin/users" className={navItemClass}>
                <Users className="w-4 h-4" />
                <span>User Accounts</span>
              </NavLink>
              <NavLink to="/dashboard/admin/members" className={navItemClass}>
                <CreditCard className="w-4 h-4" />
                <span>Membership Roster</span>
              </NavLink>
              <NavLink to="/dashboard/admin/tickets" className={navItemClass}>
                <Ticket className="w-4 h-4" />
                <span>Ticket Ledger</span>
              </NavLink>
              <NavLink to="/dashboard/admin/tasks" className={navItemClass}>
                <CheckSquare className="w-4 h-4" />
                <span>Volunteer Tasks</span>
              </NavLink>
              <NavLink to="/dashboard/admin/events" className={navItemClass}>
                <Calendar className="w-4 h-4" />
                <span>Events Admin</span>
              </NavLink>

              <NavLink to="/dashboard/admin/store" className={navItemClass}>
                <ShoppingBag className="w-4 h-4" />
                <span>Catalog & Stock</span>
              </NavLink>
              <NavLink to="/dashboard/admin/fundraisers" className={navItemClass}>
                <FileText className="w-4 h-4" />
                <span>Fundraisers</span>
              </NavLink>
              <NavLink to="/dashboard/finance" className={navItemClass}>
                <DollarSign className="w-4 h-4" />
                <span>Financial Ledger</span>
              </NavLink>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-4 mt-6 mb-2">
                System
              </div>
              <NavLink to="/dashboard/admin/security" className={navItemClass}>
                <Lock className="w-4 h-4" />
                <span>Security &amp; Audit</span>
              </NavLink>
            </>
          )}

          {/* ========================================================= */}
          {/* 2. TREASURER EXCLUSIVE NAVIGATION                         */}
          {/* ========================================================= */}
          {effectiveRole === 'treasurer' && (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-4 mt-6 mb-2">
                Treasury
              </div>
              <NavLink to="/dashboard/finance" end className={navItemClass}>
                <DollarSign className="w-4 h-4" />
                <span>Central Ledger</span>
              </NavLink>
              <NavLink to="/dashboard/finance/expenses" className={navItemClass}>
                <FileText className="w-4 h-4" />
                <span>Expense Approvals</span>
              </NavLink>
              <NavLink to="/dashboard/finance/owing" className={navItemClass}>
                <CreditCard className="w-4 h-4" />
                <span>Who Still Owes</span>
              </NavLink>
              <NavLink to="/dashboard/finance/fundraisers" className={navItemClass}>
                <ShoppingBag className="w-4 h-4" />
                <span>Fundraiser Income</span>
              </NavLink>
            </>
          )}

          {/* ========================================================= */}
          {/* 3. EVENT MANAGER EXCLUSIVE NAVIGATION                     */}
          {/* ========================================================= */}
          {effectiveRole === 'event_manager' && (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-4 mt-6 mb-2">
                Event Operations
              </div>
              <NavLink to="/dashboard/events" end className={navItemClass}>
                <Calendar className="w-4 h-4" />
                <span>Assigned Events</span>
              </NavLink>
              <NavLink to="/dashboard/events/tasks" className={navItemClass}>
                <CheckSquare className="w-4 h-4" />
                <span>Volunteer Tasks</span>
              </NavLink>
              <NavLink to="/dashboard/events/volunteers" className={navItemClass}>
                <Users className="w-4 h-4" />
                <span>Volunteer Rosters</span>
              </NavLink>
              <NavLink to="/dashboard/events/checkin" className={navItemClass}>
                <QrCode className="w-4 h-4" />
                <span>Door Check-in</span>
              </NavLink>
            </>
          )}


          {/* ========================================================= */}
          {/* 4. VOLUNTEER EXCLUSIVE NAVIGATION                         */}
          {/* ========================================================= */}
          {effectiveRole === 'volunteer' && (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-4 mt-6 mb-2">
                Task Execution
              </div>
              <NavLink to="/dashboard/tasks" end className={navItemClass}>
                <CheckSquare className="w-4 h-4" />
                <span>Assigned Tasks</span>
              </NavLink>
              <NavLink to="/dashboard/tasks/checkin" className={navItemClass}>
                <QrCode className="w-4 h-4" />
                <span>Check-in Station</span>
              </NavLink>
              <NavLink to="/dashboard/tasks/expenses" className={navItemClass}>
                <FileText className="w-4 h-4" />
                <span>Reimbursements</span>
              </NavLink>
            </>
          )}

          {/* ========================================================= */}
          {/* 5. MEMBER & GUEST NAVIGATION                             */}
          {/* ========================================================= */}
          {(effectiveRole === 'member' || effectiveRole === 'guest') && (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-4 mt-6 mb-2">
                Member Services
              </div>
              <NavLink to="/dashboard/member" end className={navItemClass}>
                <CreditCard className="w-4 h-4" />
                <span>Member Portal</span>
              </NavLink>
              <NavLink to="/dashboard/member/events" className={navItemClass}>
                <Calendar className="w-4 h-4" />
                <span>Events & Tickets</span>
              </NavLink>
              <NavLink to="/dashboard/member/store" className={navItemClass}>
                <ShoppingBag className="w-4 h-4" />
                <span>Merchandise Store</span>
              </NavLink>
              <NavLink to="/dashboard/member/tickets" className={navItemClass}>
                <Ticket className="w-4 h-4" />
                <span>My Tickets</span>
              </NavLink>
              <NavLink to="/dashboard/member/donations" className={navItemClass}>
                <Heart className="w-4 h-4" />
                <span>My Donations</span>
              </NavLink>

              {user?.is_volunteer_assigned && (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-4 mt-6 mb-2">
                    Volunteer Station
                  </div>
                  <NavLink to="/dashboard/tasks" end className={navItemClass}>
                    <CheckSquare className="w-4 h-4" />
                    <span>Volunteer Duties</span>
                  </NavLink>
                  <NavLink to="/dashboard/tasks/checkin" className={navItemClass}>
                    <QrCode className="w-4 h-4" />
                    <span>Check-in Station</span>
                  </NavLink>
                  <NavLink to="/dashboard/tasks/expenses" className={navItemClass}>
                    <FileText className="w-4 h-4" />
                    <span>Reimbursements</span>
                  </NavLink>
                </>
              )}
            </>
          )}

          {/* Account Settings */}
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-4 mt-6 mb-2">
            Account & Security
          </div>
          <NavLink to="/dashboard/profile" className={navItemClass}>
            <ShieldCheck className="w-4 h-4" />
            <span>My Profile</span>
          </NavLink>

          {/* Common communication link */}
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-4 mt-6 mb-2">
            Broadcasts
          </div>
          {effectiveRole === 'admin' ? (
            <NavLink to="/dashboard/admin/announcements" className={navItemClass}>
              <Megaphone className="w-4 h-4" />
              <span>Announcements</span>
            </NavLink>
          ) : (
            <button
              onClick={() => setIsAnnouncementsOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium border-l-2 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors text-left"
            >
              <Megaphone className="w-4 h-4 text-slate-500" />
              <span>Announcements</span>
            </button>
          )}
        </nav>

      </div>

      {/* Announcements Broadcast Modal */}
      <AnnouncementsModal
        isOpen={isAnnouncementsOpen}
        onClose={() => setIsAnnouncementsOpen(false)}
      />

      {/* Logout Action Footer */}
      <div className="p-6 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border border-border bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
