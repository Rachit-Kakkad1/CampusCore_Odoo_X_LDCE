// frontend/src/components/dashboard/treasurer/ExpenseDetails.jsx
import React from 'react';
import { StatusBadge } from '../StatusBadge';
import { ExpenseReimbursementAction } from './ExpenseReimbursementAction';
import { 
  X, 
  Receipt, 
  User, 
  Calendar, 
  FileText, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

/**
 * ExpenseDetails Component
 * Modal or drawer viewing complete expense metadata, receipt, and lifecycle actions.
 *
 * @param {Object} props
 * @param {Object} props.expense - Expense object
 * @param {Function} props.onClose - Modal close handler
 * @param {Function} props.onApprove - Approval handler
 * @param {Function} props.onReject - Rejection handler
 * @param {Function} props.onReimburse - Reimbursement handler
 * @param {boolean} props.processing - Processing state
 */
export const ExpenseDetails = ({
  expense,
  onClose,
  onApprove,
  onReject,
  onReimburse,
  processing = false,
}) => {
  if (!expense) return null;

  const amountFormatted = Number(expense.amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const createdDate = expense.created_at
    ? new Date(expense.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const approvedDate = expense.approved_at
    ? new Date(expense.approved_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const reimbursedDate = expense.reimbursed_at
    ? new Date(expense.reimbursed_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-border w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted uppercase tracking-wider">
                Claim Ref: EXP-#{String(expense.id).padStart(4, '0')}
              </span>
              <StatusBadge status={expense.status?.toUpperCase()} />
            </div>
            <h3 className="font-serif text-2xl font-bold text-slate-900">
              Expense Reimbursement Claim
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount & Submitter Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-border">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted block">
              Claimed Amount
            </span>
            <span className="font-mono text-3xl font-bold text-slate-900 block mt-1">
              ₹{amountFormatted}
            </span>
          </div>

          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted block">
              Claimant Profile
            </span>
            <div className="mt-1">
              <div className="text-sm font-bold text-slate-900">
                {expense.submitter_name}
              </div>
              <div className="font-mono text-xs text-muted">
                {expense.submitter_email} · Role: {expense.submitter_role?.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-wider text-slate-700 font-bold block">
            Expense Justification / Purpose:
          </span>
          <p className="text-sm font-sans text-slate-800 bg-white p-4 border border-border leading-relaxed">
            {expense.description}
          </p>
        </div>

        {/* Receipt Verification */}
        <div className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-wider text-slate-700 font-bold block">
            Proof of Purchase / Receipt:
          </span>
          {expense.receipt_url ? (
            <div className="p-4 bg-slate-50 border border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                <span className="font-mono text-xs text-slate-800 truncate max-w-xs">
                  {expense.receipt_url}
                </span>
              </div>
              <a
                href={expense.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs uppercase text-primary hover:underline"
              >
                <span>View Attachment</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-border font-mono text-xs text-muted">
              No digital receipt attachment provided (Physical submission or cash disbursement on file).
            </div>
          )}
        </div>

        {/* Lifecycle Audit Trail */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-100/70 border border-border font-mono text-xs text-slate-700">
          <div>
            <span className="text-[10px] text-muted uppercase block">Submitted On</span>
            <span className="font-semibold">{createdDate}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted uppercase block">Approved By</span>
            <span className="font-semibold">
              {expense.approver_name || 'Pending Review'}
              {approvedDate && <span className="block text-[10px] text-muted">{approvedDate}</span>}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted uppercase block">Reimbursed By</span>
            <span className="font-semibold">
              {expense.reimburser_name || (expense.status === 'reimbursed' ? 'Treasury' : 'Not Reimbursed')}
              {reimbursedDate && <span className="block text-[10px] text-muted">{reimbursedDate}</span>}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <ExpenseReimbursementAction
            expense={expense}
            onApprove={onApprove}
            onReject={onReject}
            onReimburse={onReimburse}
            processing={processing}
          />

          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs uppercase tracking-wider px-4 py-2 border border-border bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetails;
