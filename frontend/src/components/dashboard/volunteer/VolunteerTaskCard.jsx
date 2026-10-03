// frontend/src/components/dashboard/volunteer/VolunteerTaskCard.jsx
import React, { useState } from 'react';
import VolunteerTaskStatus from './VolunteerTaskStatus';
import { Calendar, User, CheckSquare, HeartHandshake } from 'lucide-react';

/**
 * VolunteerTaskCard Component
 * Displays task details, campaign connection, and enables in-place status updates.
 *
 * @param {Object} props
 * @param {Object} props.task
 * @param {Function} props.onStatusChange - Callback (taskId, newStatus) => Promise
 */
export const VolunteerTaskCard = ({ task, onStatusChange }) => {
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === task.status) return;
    try {
      setUpdating(true);
      await onStatusChange?.(task.id, newStatus);
    } finally {
      setUpdating(false);
    }
  };

  const isCompleted = task.status === 'COMPLETED' || task.status === 'completed';

  return (
    <div
      className={`p-5 border transition-all duration-200 ${
        isCompleted
          ? 'bg-slate-50/70 border-slate-200 text-slate-600'
          : 'bg-white border-border hover:border-slate-400 shadow-xs'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Task Title & Campaign Context */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <CheckSquare className={`w-4 h-4 ${isCompleted ? 'text-emerald-600' : 'text-primary'}`} />
            <h3
              className={`font-sans font-bold text-base tracking-tight ${
                isCompleted ? 'line-through text-slate-500' : 'text-slate-900'
              }`}
            >
              {task.title}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500">
            {task.fundraiser_title && (
              <span className="flex items-center gap-1 text-primary font-medium">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Campaign: {task.fundraiser_title}</span>
              </span>
            )}

            {task.assignee_name && (
              <span className="flex items-center gap-1 text-slate-600">
                <User className="w-3.5 h-3.5" />
                <span>Assigned: {task.assignee_name}</span>
              </span>
            )}

            <span className="flex items-center gap-1 text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {task.created_at
                  ? new Date(task.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Active'}
              </span>
            </span>
          </div>

          {task.fundraiser_description && (
            <p className="font-sans text-xs text-slate-500 max-w-xl line-clamp-1">
              {task.fundraiser_description}
            </p>
          )}
        </div>

        {/* Status Control */}
        <div className="shrink-0">
          <VolunteerTaskStatus
            status={task.status}
            onStatusChange={handleStatusUpdate}
            loading={updating}
          />
        </div>
      </div>
    </div>
  );
};

export default VolunteerTaskCard;
