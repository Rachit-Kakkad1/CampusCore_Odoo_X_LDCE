// frontend/src/components/dashboard/treasurer/FinanceOwingList.jsx
import React from 'react';
import { DashboardTable } from '../DashboardTable';
import { DashboardEmptyState } from '../DashboardEmptyState';
import { StatusBadge } from '../StatusBadge';
import { AlertCircle, User, Mail, Calendar, CheckCircle2 } from 'lucide-react';

/**
 * FinanceOwingList Component
 * Displays members with outstanding membership dues.
 *
 * @param {Object} props
 * @param {Array} props.owingMembers - List of members with pending dues from backend
 * @param {boolean} props.loading - Loading state
 */
export const FinanceOwingList = ({ owingMembers = [], loading = false }) => {
  const totalOwing = owingMembers.reduce(
    (acc, m) => acc + Number(m.dues_amount || 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Overview Banner */}
      <div className="p-4 bg-amber-50/80 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-sans font-bold text-sm text-amber-950">
              Outstanding Dues Receivable
            </h4>
            <p className="font-sans text-xs text-amber-800">
              {owingMembers.length} member registration(s) pending annual dues payment.
            </p>
          </div>
        </div>

        <div className="font-mono text-right">
          <span className="text-[11px] uppercase tracking-wider text-amber-800 block">Total Unpaid</span>
          <span className="text-xl font-bold text-amber-950">
            ₹{totalOwing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Main Owing Members Table */}
      {owingMembers.length === 0 && !loading ? (
        <DashboardEmptyState
          title="No Outstanding Dues"
          description="All registered members have paid their annual organization membership dues in full."
        />
      ) : (
        <DashboardTable
          headers={['Member ID', 'Member Details', 'Role', 'Registered On', 'Amount Due', 'Dues Status']}
        >
          {owingMembers.map((member) => {
            const regDate = member.registration_date
              ? new Date(member.registration_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—';

            return (
              <tr key={member.membership_id} className="hover:bg-slate-50/80 transition-colors border-b border-border/60">
                {/* 1. Member Code */}
                <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">
                  {member.member_code || `MEM-${member.membership_id}`}
                </td>

                {/* 2. Member Name & Email */}
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">
                      {member.user_name}
                    </span>
                    <span className="font-mono text-[11px] text-muted flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />
                      {member.user_email}
                    </span>
                  </div>
                </td>

                {/* 3. Role */}
                <td className="px-4 py-3 font-mono text-[11px] uppercase text-slate-600">
                  {member.user_role || 'member'}
                </td>

                {/* 4. Registration Date */}
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  {regDate}
                </td>

                {/* 5. Amount Due */}
                <td className="px-4 py-3 font-mono text-sm font-bold text-rose-700">
                  ₹{Number(member.dues_amount || 500).toFixed(2)}
                </td>

                {/* 6. Dues Status */}
                <td className="px-4 py-3">
                  <StatusBadge status="PENDING" />
                </td>
              </tr>
            );
          })}
        </DashboardTable>
      )}
    </div>
  );
};

export default FinanceOwingList;
