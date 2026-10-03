// frontend/src/pages/dashboard/MemberDashboard.jsx
import React from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardPageHeader from '../../components/dashboard/DashboardPageHeader';
import MemberDashboardComponent from '../../components/dashboard/member/MemberDashboard';
import authService from '../../services/auth.service';

/**
 * MemberDashboard Page
 * Primary participant dashboard for active, expired, or pending members.
 */
export const MemberDashboard = () => {
  const user = authService.getStoredUser();

  return (
    <DashboardShell activeRole={user?.role || 'member'}>
      <DashboardPageHeader
        title="Member Portal"
        subtitle={`Welcome, ${user?.name || 'Member'}. Access your digital credentials, active event tickets, order history, and club notices.`}
        badge="Participant Workspace"
      />

      {/* Dynamic Member Dashboard Assembly */}
      <MemberDashboardComponent />
    </DashboardShell>
  );
};

export default MemberDashboard;
