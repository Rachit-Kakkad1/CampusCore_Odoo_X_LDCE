// frontend/src/pages/dashboard/VolunteerDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardStat from '../../components/dashboard/DashboardStat';
import DashboardSection from '../../components/dashboard/DashboardSection';
import DoorCheckInStation from '../../components/dashboard/checkin/DoorCheckInStation';
import eventsService from '../../services/events.service';
import {
  CheckSquare,
  Calendar,
  QrCode,
  MapPin,
  CheckCircle2,
  Clock,
  Users,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

/**
 * VolunteerDashboard Page
 * Execution-level workspace for assigned tasks, door check-in assistance, and event volunteer opportunities.
 */
export const VolunteerDashboard = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [oppsError, setOppsError] = useState(null);
  const [applyingId, setApplyingId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const [tasks, setTasks] = useState([
    { id: 1, title: 'Operate Door Check-In Gate A with fallback lookup', status: 'in_progress', priority: 'High' },
    { id: 2, title: 'Verify attendee badges and member pass validity', status: 'in_progress', priority: 'Medium' },
    { id: 3, title: 'Set up audio chime and reception terminal', status: 'completed', priority: 'Normal' },
  ]);

  const loadOpportunities = useCallback(async () => {
    try {
      setLoadingOpps(true);
      setOppsError(null);
      const res = await eventsService.getVolunteerOpportunities();
      const list = res?.events || res?.data || res || [];
      setOpportunities(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch volunteer opportunities:', err);
      setOppsError(err.message || 'Unable to load volunteer opportunities.');
    } finally {
      setLoadingOpps(false);
    }
  }, []);

  useEffect(() => {
    loadOpportunities();
  }, [loadOpportunities]);

  const handleApply = async (eventId) => {
    try {
      setApplyingId(eventId);
      setActionSuccess(null);
      setOppsError(null);
      const res = await eventsService.applyVolunteer(eventId);
      setActionSuccess(res?.message || 'Application submitted successfully!');
      await loadOpportunities();
    } catch (err) {
      console.error('Failed to apply as volunteer:', err);
      setOppsError(err.response?.data?.message || err.message || 'Failed to submit application.');
    } finally {
      setApplyingId(null);
    }
  };

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === 'completed' ? 'in_progress' : 'completed' }
          : t
      )
    );
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const myApplicationsCount = opportunities.filter((o) => o.has_applied).length;

  return (
    <DashboardShell activeRole="volunteer">
      <DashboardHeader
        title="Volunteer Console & Door Station"
        subtitle="Verify attendee entry with manual fallback codes or QR scans, discover volunteer opportunities, and manage shift tasks."
        badge="Execution Workspace"
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <DashboardStat
          label="My Applications"
          value={`${myApplicationsCount} Events`}
          change="Volunteering Active"
          icon={Users}
        />
        <DashboardStat
          label="Assigned Tasks"
          value={`${completedCount} / ${tasks.length}`}
          change="Shift checklist"
          icon={CheckSquare}
        />
        <DashboardStat
          label="Check-In Mode"
          value="Dual Verification"
          change="QR Scan & Fallback Code"
          icon={QrCode}
        />
        <DashboardStat
          label="Shift Status"
          value="On Duty"
          change="Real-time admissions"
          icon={CheckCircle2}
        />
      </div>

      {actionSuccess && (
        <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {oppsError && (
        <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-lg flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{oppsError}</span>
          </div>
          <button
            type="button"
            onClick={() => setOppsError(null)}
            className="text-rose-600 hover:text-rose-900 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. EVENT VOLUNTEER OPPORTUNITIES SECTION                                   */}
      {/* ========================================================================= */}
      <div className="mb-10">
        <DashboardSection
          title="Volunteer Event Opportunities"
          subtitle="Events requesting volunteer assistance. Apply to join organizing teams."
        >
          {loadingOpps ? (
            <div className="h-40 bg-white border border-border flex items-center justify-center">
              <span className="text-xs font-mono text-slate-400">Loading volunteer opportunities...</span>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="p-8 border border-border bg-white text-center text-xs text-slate-500 font-mono">
              There are currently no events actively requesting volunteers.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {opportunities.map((evt) => {
                const required = parseInt(evt.volunteers_required || 0, 10);
                const applied = parseInt(evt.volunteers_applied || 0, 10);
                const remaining = evt.volunteers_remaining !== undefined
                  ? parseInt(evt.volunteers_remaining, 10)
                  : Math.max(0, required - applied);
                const isCancelled = evt.status === 'cancelled';
                const hasStarted = evt.starts_at && new Date(evt.starts_at) <= new Date();
                const isFull = remaining <= 0;
                const isApplying = applyingId === evt.id;
                const hasApplied = evt.has_applied || !!evt.my_application;

                const dateStr = evt.starts_at
                  ? new Date(evt.starts_at).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'TBA';

                return (
                  <div
                    key={evt.id}
                    className={`border rounded-lg p-5 flex flex-col justify-between shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden ${
                      isCancelled ? 'bg-slate-50/80 border-rose-200 opacity-80' : 'bg-white border-border'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        {isCancelled ? (
                          <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-xs bg-rose-50 text-rose-700 border border-rose-200">
                            Cancelled
                          </span>
                        ) : hasStarted ? (
                          <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-xs bg-slate-100 text-slate-600 border border-slate-200">
                            Event Concluded / Live
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-xs bg-purple-50 text-purple-700 border border-purple-200">
                            Volunteer Needed
                          </span>
                        )}
                        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs ${
                          isCancelled
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : hasStarted
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : isFull
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isCancelled
                            ? 'Cancelled'
                            : hasStarted
                            ? 'Applications Closed'
                            : isFull
                            ? 'Application Full'
                            : `${remaining} Remaining`}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 text-sm font-sans line-clamp-1">
                          {evt.title}
                        </h4>
                        <div className="mt-1 space-y-1 text-xs text-slate-500 font-mono">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{dateStr}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{evt.venue || 'Main Campus'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quota Telemetry */}
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1.5 text-xs font-mono">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Volunteers Required:</span>
                          <strong className="text-slate-900">{required}</strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Applications:</span>
                          <strong className="text-purple-700">{applied}</strong>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200/80 pt-1 text-slate-700">
                          <span>Remaining Slots:</span>
                          <strong className={!isCancelled && !hasStarted && remaining > 0 ? 'text-emerald-700 font-bold' : 'text-slate-500 font-bold'}>
                            {remaining}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 mt-2">
                      {hasApplied ? (
                        <div className="w-full py-2 px-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Applied ({evt.my_application?.status || 'Pending'})</span>
                        </div>
                      ) : isCancelled ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2 px-3 bg-rose-50 text-rose-500 border border-rose-200 text-xs font-bold uppercase tracking-wider rounded-lg cursor-not-allowed text-center"
                        >
                          Event Cancelled
                        </button>
                      ) : hasStarted ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2 px-3 bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold uppercase tracking-wider rounded-lg cursor-not-allowed text-center"
                        >
                          Applications Closed
                        </button>
                      ) : isFull ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2 px-3 bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold uppercase tracking-wider rounded-lg cursor-not-allowed text-center"
                        >
                          Application Full
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isApplying}
                          onClick={() => handleApply(evt.id)}
                          className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-xs hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isApplying ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Apply to Volunteer</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardSection>
      </div>

      {/* Main Feature: Door Check-In Station */}
      <div className="space-y-8">
        <DoorCheckInStation />

        {/* Assigned Shift Tasks */}
        <DashboardSection
          title="Assigned Shift Tasks & Protocol"
          subtitle="Click to toggle completion status"
        >
          <div className="border border-border bg-white p-4 space-y-2.5 shadow-2xs font-mono text-xs rounded-lg">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`p-3 border rounded-md flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  task.status === 'completed'
                    ? 'bg-slate-50 border-slate-200 text-slate-500 line-through'
                    : 'bg-white border-slate-200 text-slate-900 hover:border-primary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    readOnly
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="font-medium">{task.title}</span>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-xs ${
                    task.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {task.status === 'completed' ? 'Completed' : 'In Progress'}
                </span>
              </div>
            ))}
          </div>
        </DashboardSection>
      </div>
    </DashboardShell>
  );
};

export default VolunteerDashboard;
