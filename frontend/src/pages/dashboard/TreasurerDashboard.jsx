// frontend/src/pages/dashboard/TreasurerDashboard.jsx
import React from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardStat from '../../components/dashboard/DashboardStat';
import DashboardSection from '../../components/dashboard/DashboardSection';
import { DollarSign, FileText, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * TreasurerDashboard Page Skeleton
 * Organization-wide financial management, expense reimbursement, and ledger oversight.
 */
export const TreasurerDashboard = () => {
  return (
    <DashboardShell activeRole="treasurer">
      <DashboardHeader
        title="Finance & Treasury"
        subtitle="Central transaction ledger, expense reimbursement approvals, and income stream breakdown."
        badge="Financial Authority"
      />

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <DashboardStat label="Net Balance" value="₹1,000.00" change="Income minus reimbursements" icon={DollarSign} />
        <DashboardStat label="Total Income" value="₹1,000.00" change="Dues, tickets, merch, fundraisers" icon={CheckCircle} />
        <DashboardStat label="Pending Expenses" value="₹0.00" change="0 submissions awaiting review" icon={FileText} />
        <DashboardStat label="Who Still Owes" value="₹500.00" change="1 pending membership dues" icon={AlertCircle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DashboardSection
          title="Central Transactions Ledger"
          subtitle="Immutable ledger of all verified monetary flows"
        >
          <div className="p-6 border border-border bg-hover font-mono text-xs text-muted">
            Transactions ledger integration ready.
          </div>
        </DashboardSection>

        <DashboardSection
          title="Expense Approvals & Claims"
          subtitle="Volunteer & officer submitted receipts awaiting reimbursement"
        >
          <div className="p-6 border border-border bg-hover font-mono text-xs text-muted">
            Expense management workflow ready.
          </div>
        </DashboardSection>
      </div>
    </DashboardShell>
  );
};

export default TreasurerDashboard;
