// frontend/src/components/dashboard/StatusBadge.jsx
import React from 'react';

/**
 * StatusBadge Component
 * Minimalist editorial-tech status pill for memberships, tickets, orders, tasks, and transactions.
 *
 * @param {Object} props
 * @param {string} props.status - 'active' | 'paid' | 'pending' | 'expired' | 'cancelled' | 'completed' | 'in_progress' | 'todo' | 'approved' | 'rejected' | 'reimbursed' | etc.
 * @param {string} [props.label] - Optional custom display label (defaults to uppercase status)
 * @param {string} [props.className]
 */
export const StatusBadge = ({ status = 'pending', label, className = '' }) => {
  const normalized = String(status).toLowerCase();

  // Clean indicator color mapping adhering to editorial-tech muted palette
  let dotColor = 'bg-muted';
  let badgeBorder = 'border-border';
  let textStyle = 'text-foreground';

  switch (normalized) {
    case 'active':
    case 'paid':
    case 'completed':
    case 'approved':
    case 'reimbursed':
    case 'in':
      dotColor = 'bg-primary';
      badgeBorder = 'border-primary/40';
      textStyle = 'text-primary';
      break;
    case 'pending':
    case 'in_progress':
    case 'todo':
      dotColor = 'bg-muted';
      badgeBorder = 'border-border';
      textStyle = 'text-foreground';
      break;
    case 'expired':
    case 'cancelled':
    case 'rejected':
    case 'out':
      dotColor = 'bg-foreground';
      badgeBorder = 'border-foreground/30';
      textStyle = 'text-muted';
      break;
    default:
      dotColor = 'bg-primary';
      badgeBorder = 'border-border';
      textStyle = 'text-foreground';
      break;
  }

  const displayLabel = label || normalized.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 border bg-background font-mono text-[9px] uppercase tracking-[0.2em] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${badgeBorder} ${textStyle} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{displayLabel}</span>
    </span>
  );
};

export default StatusBadge;
