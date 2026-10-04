// frontend/src/components/dashboard/member/MemberVolunteerSection.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckSquare, 
  Clock, 
  Calendar, 
  ArrowRight, 
  QrCode, 
  Receipt, 
  ShieldCheck, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

/**
 * MemberVolunteerSection Component
 * Displays assigned volunteer tasks and quick links to the Volunteer Desk for active members.
 *
 * @param {Object} props
 * @param {Array} props.tasks - List of assigned tasks
 * @param {Function} [props.onStatusChange] - Optional callback to update status
 */
export const MemberVolunteerSection = ({ tasks = [], onStatusChange }) => {
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(
    (t) => (t.status || '').toUpperCase() !== 'COMPLETED' && (t.status || '').toUpperCase() !== 'CANCELLED'
  );
  const completedTasks = tasks.filter(
    (t) => (t.status || '').toUpperCase() === 'COMPLETED'
  );

  const getPriorityBadge = (priority) => {
    const p = (priority || 'MEDIUM').toUpperCase();
    if (p === 'URGENT') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (p === 'HIGH') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (p === 'LOW') return 'bg-slate-100 text-slate-600 border-slate-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getStatusBadge = (status) => {
    const s = (status || 'TODO').toUpperCase();
    if (s === 'COMPLETED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'IN_PROGRESS') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="border border-border bg-white p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-primary/10 text-primary rounded-xs">
              <CheckSquare className="w-4 h-4" />
            </span>
            <h2 className="font-sans font-bold text-lg text-slate-900 tracking-tight">
              Volunteer Operations &amp; Assigned Duties
            </h2>
          </div>
          <p className="font-mono text-xs text-slate-500">
            {totalTasks > 0
              ? `You have ${pendingTasks.length} active volunteer ${pendingTasks.length === 1 ? 'task' : 'tasks'} assigned to you.`
              : 'You are eligible to participate as a volunteer in club events and fundraisers.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/tasks"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 font-mono text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white transition-colors"
          >
            <span>Open Volunteer Desk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Task Summary Metrics */}
      {totalTasks > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 border border-border bg-slate-50/60">
            <span className="font-mono text-[10px] uppercase text-slate-500 font-bold">Total Assigned</span>
            <div className="font-sans font-extrabold text-2xl text-slate-900 mt-1">{totalTasks}</div>
          </div>
          <div className="p-4 border border-amber-200 bg-amber-50/40">
            <span className="font-mono text-[10px] uppercase text-amber-700 font-bold">Action Required</span>
            <div className="font-sans font-extrabold text-2xl text-amber-900 mt-1">{pendingTasks.length}</div>
          </div>
          <div className="p-4 border border-emerald-200 bg-emerald-50/40">
            <span className="font-mono text-[10px] uppercase text-emerald-700 font-bold">Completed Duties</span>
            <div className="font-sans font-extrabold text-2xl text-emerald-900 mt-1">{completedTasks.length}</div>
          </div>
        </div>
      ) : null}

      {/* Tasks List / Empty State */}
      {totalTasks > 0 ? (
        <div className="space-y-3">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
            Assigned Task Queue
          </span>
          <div className="divide-y divide-border border border-border">
            {tasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 border text-[10px] font-mono font-bold uppercase rounded-xs ${getPriorityBadge(task.priority)}`}>
                      {task.priority || 'MEDIUM'}
                    </span>
                    <span className={`px-2 py-0.5 border text-[10px] font-mono font-bold uppercase rounded-xs ${getStatusBadge(task.status)}`}>
                      {(task.status || 'TODO').replace('_', ' ')}
                    </span>
                    <span className="font-sans font-bold text-sm text-slate-900">
                      {task.title}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-600 line-clamp-1">
                      {task.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-slate-400">
                    {task.event_title && (
                      <span className="flex items-center gap-1 text-slate-500 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>{task.event_title}</span>
                      </span>
                    )}
                    {task.fundraiser_title && (
                      <span className="flex items-center gap-1 text-slate-500 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>{task.fundraiser_title}</span>
                      </span>
                    )}
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/dashboard/tasks"
                    className="px-3 py-1.5 border border-border text-xs font-mono font-medium hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    Manage in Desk
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 border border-dashed border-border text-center space-y-3 bg-slate-50/40">
          <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-sans font-bold text-sm text-slate-900">
              No Assigned Tasks at the Moment
            </h3>
            <p className="font-mono text-xs text-slate-500 max-w-md mx-auto">
              You are on the volunteer roster. Check out upcoming event opportunities to sign up for event coordination, ticketing desk, or stage management duties.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/dashboard/tasks/opportunities"
              className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider bg-white border border-border hover:bg-slate-50 text-slate-800 transition-colors"
            >
              Browse Opportunities
            </Link>
            <Link
              to="/dashboard/tasks"
              className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white transition-colors"
            >
              Volunteer Station
            </Link>
          </div>
        </div>
      )}

      {/* Volunteer Quick Station Shortcuts */}
      <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border">
        <Link
          to="/dashboard/tasks"
          className="p-3 border border-border hover:border-slate-400 bg-white flex items-center gap-3 transition-colors group"
        >
          <CheckSquare className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
          <div>
            <div className="font-sans font-bold text-xs text-slate-900">Task Management</div>
            <div className="font-mono text-[10px] text-slate-400">View &amp; update duty progress</div>
          </div>
        </Link>

        <Link
          to="/dashboard/tasks/checkin"
          className="p-3 border border-border hover:border-slate-400 bg-white flex items-center gap-3 transition-colors group"
        >
          <QrCode className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          <div>
            <div className="font-sans font-bold text-xs text-slate-900">Door Check-In</div>
            <div className="font-mono text-[10px] text-slate-400">Scan attendee QR passes</div>
          </div>
        </Link>

        <Link
          to="/dashboard/tasks/expenses"
          className="p-3 border border-border hover:border-slate-400 bg-white flex items-center gap-3 transition-colors group"
        >
          <Receipt className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          <div>
            <div className="font-sans font-bold text-xs text-slate-900">Reimbursements</div>
            <div className="font-mono text-[10px] text-slate-400">File expense claims</div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default MemberVolunteerSection;
