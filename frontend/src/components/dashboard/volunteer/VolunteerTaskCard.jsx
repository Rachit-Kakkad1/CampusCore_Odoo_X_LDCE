// frontend/src/components/dashboard/volunteer/VolunteerTaskCard.jsx
import React, { useState } from 'react';
import {
  Calendar,
  User,
  CheckSquare,
  Clock,
  CheckCircle2,
  Play,
  Check,
  AlertCircle
} from 'lucide-react';

/**
 * VolunteerTaskCard Component
 * Displays volunteer task card with priority, event association, due dates,
 * and direct action buttons ([START TASK], [MARK AS DONE], and completed timestamp).
 */
export const VolunteerTaskCard = ({ task, onStatusChange }) => {
  const [updating, setUpdating] = useState(false);

  const status = (task.status || 'PENDING').toUpperCase();
  const priority = (task.priority || 'MEDIUM').toUpperCase();
  const isCompleted = status === 'COMPLETED';
  const isInProgress = status === 'IN_PROGRESS';
  const isPending = status === 'PENDING' || status === 'TODO';

  const handleStartTask = async () => {
    if (updating || isInProgress || isCompleted) return;
    try {
      setUpdating(true);
      await onStatusChange?.(task.id, 'IN_PROGRESS');
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAsDone = async () => {
    if (updating || isCompleted) return;
    try {
      setUpdating(true);
      await onStatusChange?.(task.id, 'COMPLETED');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`p-5 border transition-all duration-200 ${
        isCompleted
          ? 'bg-slate-50/80 border-slate-200 text-slate-600'
          : 'bg-white border-border hover:border-slate-400 shadow-xs'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Task Title & Event Context */}
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CheckSquare className={`w-4 h-4 ${isCompleted ? 'text-emerald-600' : 'text-primary'}`} />
            <h3
              className={`font-sans font-bold text-base tracking-tight ${
                isCompleted ? 'line-through text-slate-500' : 'text-slate-900'
              }`}
            >
              {task.title}
            </h3>

            {/* Priority Badge */}
            <span
              className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-xs border ${
                priority === 'HIGH'
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : priority === 'MEDIUM'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {priority} Priority
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500">
            {task.event_title && (
              <span className="flex items-center gap-1 text-primary font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                <span>Event: {task.event_title}</span>
              </span>
            )}

            {task.assignee_name && (
              <span className="flex items-center gap-1 text-slate-600">
                <User className="w-3.5 h-3.5" />
                <span>Assigned to: {task.assignee_name}</span>
              </span>
            )}

            {task.due_date && (
              <span className="flex items-center gap-1 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Due: {formatDate(task.due_date)}</span>
              </span>
            )}
          </div>

          {task.description && (
            <p className="font-sans text-xs text-slate-600 max-w-2xl">
              {task.description}
            </p>
          )}
        </div>

        {/* Action Buttons & Status Feedback */}
        <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {isCompleted ? (
            <div className="p-2.5 border border-emerald-300 bg-emerald-50 text-emerald-900 rounded-xs font-mono text-xs">
              <div className="flex items-center gap-1.5 font-bold uppercase">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>✓ Completed</span>
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">
                {task.completed_at ? formatDate(task.completed_at) : 'Finished'}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {isPending && (
                <button
                  onClick={handleStartTask}
                  disabled={updating}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-border bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono uppercase font-bold tracking-wider transition-colors disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 text-primary" />
                  <span>{updating ? 'Starting...' : 'Start Task'}</span>
                </button>
              )}

              <button
                onClick={handleMarkAsDone}
                disabled={updating}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono uppercase font-bold tracking-wider transition-colors shadow-xs disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{updating ? 'Updating...' : 'Mark as Done'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VolunteerTaskCard;
