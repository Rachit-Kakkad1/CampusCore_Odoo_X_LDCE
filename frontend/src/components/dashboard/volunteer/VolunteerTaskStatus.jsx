// frontend/src/components/dashboard/volunteer/VolunteerTaskStatus.jsx
import React from 'react';
import { CheckCircle2, Clock, CircleDot, Loader2 } from 'lucide-react';

/**
 * VolunteerTaskStatus Component
 * High-contrast status indicator & quick-action updater for task execution.
 *
 * @param {Object} props
 * @param {string} props.status - 'TODO' | 'IN_PROGRESS' | 'COMPLETED'
 * @param {Function} props.onStatusChange - Callback (newStatus) => void
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.loading]
 */
export const VolunteerTaskStatus = ({
  status = 'TODO',
  onStatusChange,
  disabled = false,
  loading = false,
}) => {
  const normStatus = (status || 'TODO').toUpperCase();

  const getStatusConfig = (st) => {
    switch (st) {
      case 'COMPLETED':
        return {
          label: 'Completed',
          badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
          icon: CheckCircle2,
          iconClass: 'text-emerald-700',
        };
      case 'IN_PROGRESS':
        return {
          label: 'In Progress',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
          icon: Clock,
          iconClass: 'text-amber-700',
        };
      case 'TODO':
      default:
        return {
          label: 'To Do',
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: CircleDot,
          iconClass: 'text-slate-500',
        };
    }
  };

  const current = getStatusConfig(normStatus);
  const Icon = current.icon;

  const statuses = [
    { value: 'TODO', label: 'To Do' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Current Visual Badge */}
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 border font-mono text-[11px] uppercase tracking-wider font-semibold rounded-xs ${current.badgeClass}`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
        ) : (
          <Icon className={`w-3.5 h-3.5 ${current.iconClass}`} />
        )}
        <span>{current.label}</span>
      </span>

      {/* Quick Action Status Select */}
      {onStatusChange && (
        <select
          value={normStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          disabled={disabled || loading}
          className="text-xs font-mono border border-border bg-white text-slate-800 px-2 py-1 focus:outline-hidden focus:border-slate-900 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          title="Update Task Status"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              Mark {s.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default VolunteerTaskStatus;
