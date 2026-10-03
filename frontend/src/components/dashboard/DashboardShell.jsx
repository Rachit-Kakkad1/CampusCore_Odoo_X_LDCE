import React from 'react';
import Navbar from '../common/Navbar';
import DashboardSidebar from './DashboardSidebar';
import authService from '../../services/auth.service';

/**
 * DashboardShell Component
 * Master container for all role dashboards adhering to the unified Navbar and 1px-border grid design system.
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
      {/* Unified Global Navbar */}
      <Navbar />

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
