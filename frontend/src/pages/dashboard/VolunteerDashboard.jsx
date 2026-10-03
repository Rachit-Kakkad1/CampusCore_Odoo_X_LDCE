// frontend/src/pages/dashboard/VolunteerDashboard.jsx
import React from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardStat from '../../components/dashboard/DashboardStat';
import DashboardSection from '../../components/dashboard/DashboardSection';
import { CheckSquare, Calendar, QrCode, FileText } from 'lucide-react';

/**
 * VolunteerDashboard Page Skeleton
 * Execution-level workspace for assigned tasks, door check-in assistance, and expense submission.
 */
export const VolunteerDashboard = () => {
  return (
    <DashboardShell activeRole="volunteer">
      <DashboardHeader
        title="Volunteer Console"
        subtitle="View your assigned event tasks, assist in door check-in, and submit reimbursement receipts."
        badge="Execution Workspace"
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <DashboardStat label="Assigned Tasks" value="3" change="1 Completed, 1 In Progress, 1 Todo" icon={CheckSquare} />
        <DashboardStat label="Assigned Event" value="Bake Sale" change="Fundraiser campaign" icon={Calendar} />
        <DashboardStat label="Check-in Access" value="Enabled" change="QR scanner ready" icon={QrCode} />
        <DashboardStat label="Expense Claims" value="0" change="Submit receipt for reimbursement" icon={FileText} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DashboardSection
          title="Assigned Tasks & Progress"
          subtitle="Fundraiser and event preparation checklist"
        >
          <div className="p-6 border border-border bg-hover font-mono text-xs text-muted">
            Task checklist workflow ready.
          </div>
        </DashboardSection>

        <DashboardSection
          title="Submit Expense with Receipt"
          subtitle="Upload proof of purchase for treasurer review"
        >
          <div className="p-6 border border-border bg-hover font-mono text-xs text-muted">
            Expense submission form ready.
          </div>
        </DashboardSection>
      </div>
    </DashboardShell>
  );
};

export default VolunteerDashboard;
