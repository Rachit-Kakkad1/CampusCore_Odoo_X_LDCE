// frontend/src/components/dashboard/treasurer/FinanceSummary.jsx
import React from 'react';
import { DashboardStat } from '../DashboardStat';
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  AlertCircle,
  Receipt
} from 'lucide-react';

/**
 * FinanceSummary Component
 * Displays authoritative financial overview directly from backend ledger.
 *
 * @param {Object} props
 * @param {Object} props.summary - Backend overview data
 * @param {number|string} props.summary.balance - Net balance
 * @param {number|string} props.summary.total_income - Total verified revenue
 * @param {number|string} props.summary.total_expenses - Total verified reimbursements
 * @param {number|string} props.summary.total_transactions - Count of ledger entries
 * @param {number} props.summary.pending_expenses_count - Count of pending expense claims
 * @param {number|string} props.summary.unpaid_dues_total - Amount of outstanding dues
 * @param {number} props.summary.unpaid_dues_count - Count of members with pending dues
 */
export const FinanceSummary = ({ summary }) => {
  const balance = Number(summary?.balance || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const income = Number(summary?.total_income || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const expenses = Number(summary?.total_expenses || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const unpaidDues = Number(summary?.unpaid_dues_total || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const pendingExpensesCount = Number(summary?.pending_expenses_count || 0);
  const unpaidCount = Number(summary?.unpaid_dues_count || 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Net Operating Balance */}
      <DashboardStat
        label="Net Ledger Balance"
        value={`₹${balance}`}
        change="Authoritative net funds (In - Out)"
        icon={DollarSign}
      />

      {/* 2. Total Inflow / Income */}
      <DashboardStat
        label="Total Revenue Received"
        value={`₹${income}`}
        change="Dues, tickets, merch & fundraisers"
        icon={ArrowUpRight}
      />

      {/* 3. Total Outflow / Expenses */}
      <DashboardStat
        label="Total Reimbursed"
        value={`₹${expenses}`}
        change={
          pendingExpensesCount > 0
            ? `${pendingExpensesCount} claim(s) pending review`
            : 'All claims processed'
        }
        icon={ArrowDownRight}
      />

      {/* 4. Outstanding Dues Receivable */}
      <DashboardStat
        label="Outstanding Dues"
        value={`₹${unpaidDues}`}
        change={
          unpaidCount > 0
            ? `${unpaidCount} member(s) owe dues`
            : 'Zero outstanding dues'
        }
        icon={AlertCircle}
      />
    </div>
  );
};

export default FinanceSummary;
