// frontend/src/components/dashboard/StatusBadge.jsx
import React from 'react';

/**
 * StatusBadge Component
 * Clean professional status pill with high contrast for memberships, tickets, orders, tasks, and transactions.
 *
 * @param {Object} props
 * @param {string} props.status - 'active' | 'paid' | 'pending' | 'expired' | 'cancelled' | 'completed' | 'in_progress' | 'todo' | 'approved' | 'rejected' | 'reimbursed' | etc.
 * @param {string} [props.label] - Optional custom display label
 * @param {string} [props.className]
 */
export const StatusBadge = ({ status = 'pending', label, className = '' }) => {
  const normalized = String(status).toLowerCase();

  let dotColor = 'bg-slate-500';
  let badgeClasses = 'border-slate-300 bg-slate-100 text-slate-800';

  switch (normalized) {
    case 'active':
    case 'paid':
    case 'completed':
    case 'approved':
    case 'reimbursed':
    case 'in':
      dotColor = 'bg-emerald-600';
      badgeClasses = 'border-emerald-200 bg-emerald-50 text-emerald-900 font-semibold';
      break;
    case 'pending':
    case 'in_progress':
    case 'todo':
      dotColor = 'bg-amber-500';
      badgeClasses = 'border-amber-200 bg-amber-50 text-amber-900 font-semibold';
      break;
    case 'expired':
    case 'cancelled':
    case 'rejected':
    case 'out':
      dotColor = 'bg-rose-600';
      badgeClasses = 'border-rose-200 bg-rose-50 text-rose-900 font-semibold';
      break;
    default:
      dotColor = 'bg-slate-600';
      badgeClasses = 'border-slate-300 bg-slate-100 text-slate-900 font-semibold';
      break;
  }

  const displayLabel = label || normalized.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-xs uppercase tracking-wider rounded-sm ${badgeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{displayLabel}</span>
    </span>
  );
};

export default StatusBadge;
