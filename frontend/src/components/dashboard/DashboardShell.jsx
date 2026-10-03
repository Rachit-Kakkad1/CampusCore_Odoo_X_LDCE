// frontend/src/components/dashboard/DashboardShell.jsx
import React from 'react';
import DashboardSidebar from './DashboardSidebar';
import authService from '../../services/auth.service';

/**
 * DashboardShell Component
 * Master container for all role dashboards adhering to the 1px-border grid design system.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Main dashboard content
 * @param {string} [props.activeRole] - Optional role override for previewing
 */
export const DashboardShell = ({ children, activeRole }) => {
  const user = authService.getStoredUser();
  const currentRole = activeRole || user?.role || 'member';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-white">
      {/* Top Banner Bar */}
      <header className="border-b border-border bg-background px-6 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="font-serif text-lg tracking-tight uppercase font-semibold">
            Odoo × LDCE
          </div>
          <span className="text-muted font-mono text-xs">/</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
            Management Portal
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted hidden sm:block">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
