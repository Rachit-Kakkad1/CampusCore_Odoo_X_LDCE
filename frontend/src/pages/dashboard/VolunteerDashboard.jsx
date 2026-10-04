// frontend/src/pages/dashboard/VolunteerDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardPageHeader from '../../components/dashboard/DashboardPageHeader';
import DashboardStat from '../../components/dashboard/DashboardStat';
import { DashboardLoadingState } from '../../components/dashboard/DashboardLoadingState';
import { DashboardErrorState } from '../../components/dashboard/DashboardErrorState';
import PageTabs from '../../components/dashboard/PageTabs';
import {
  VolunteerTaskList,
  VolunteerExpenseForm,
  VolunteerCheckIn,
} from '../../components/dashboard/volunteer';
import tasksService from '../../services/tasks.service';
import financeService from '../../services/finance.service';
import eventsService from '../../services/events.service';
import authService from '../../services/auth.service';
import {
  CheckSquare,
  QrCode,
  Receipt,
  CheckCircle2,
  XCircle,
  Users,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const VolunteerDashboard = () => {
  const user = authService.getStoredUser();
  const location = useLocation();
  const navigate = useNavigate();

  // Route-aware tab resolution: 'tasks' | 'opportunities' | 'checkin' | 'expenses'
  const getTabFromPath = useCallback((pathname) => {
    if (pathname.includes('/opportunities')) return 'opportunities';
    if (pathname.includes('/checkin')) return 'checkin';
    if (pathname.includes('/expenses')) return 'expenses';
    return 'tasks';
  }, []);

  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));

  // Sync tab with URL changes
  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname, getTabFromPath]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab === 'tasks') {
      navigate('/dashboard/tasks');
    } else {
      navigate(`/dashboard/tasks/${newTab}`);
    }
  };

  // Business Data States
  const [tasks, setTasks] = useState([]);
  const [myExpenses, setMyExpenses] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadVolunteerData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [tasksRes, expensesRes, oppsRes] = await Promise.allSettled([
        tasksService.getAllTasks(),
        financeService.getExpenses(),
        eventsService.getVolunteerOpportunities(),
      ]);

      if (tasksRes.status === 'fulfilled' && tasksRes.value) {
        const tList = tasksRes.value?.tasks || tasksRes.value?.data || tasksRes.value || [];
        setTasks(Array.isArray(tList) ? tList : []);
      }

      if (expensesRes.status === 'fulfilled' && expensesRes.value) {
        const eList = expensesRes.value?.data || expensesRes.value || [];
        const allExpenses = Array.isArray(eList) ? eList : [];
        const filtered = allExpenses.filter(
          (e) => !user?.id || e.submitted_by === user.id || e.user_id === user.id
        );
        setMyExpenses(filtered.length > 0 ? filtered : allExpenses);
      }

      if (oppsRes.status === 'fulfilled' && oppsRes.value) {
        const oList = oppsRes.value?.events || oppsRes.value?.data || oppsRes.value || [];
        setOpportunities(Array.isArray(oList) ? oList : []);
      }
    } catch (err) {
      console.error('Failed to load volunteer data:', err);
      setError('Unable to connect to volunteer operational services.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadVolunteerData();
  }, [loadVolunteerData]);

  // Action: Update Task Status
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksService.updateTaskStatus(taskId, newStatus);
      showToast(`Task status updated to ${newStatus.replace('_', ' ')}.`);
      await loadVolunteerData();
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Failed to update task status.', 'error');
    }
  };

  // Action: Submit Out-of-Pocket Expense
  const handleSubmitExpense = async (formData) => {
    try {
      setSubmittingExpense(true);
      await financeService.createExpense(formData);
      showToast('Expense claim submitted for treasury review.');
      await loadVolunteerData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to submit expense.', 'error');
      throw err;
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Action: Apply as Volunteer
  const handleApply = async (eventId) => {
    try {
      setApplyingId(eventId);
      const res = await eventsService.applyVolunteer(eventId);
      showToast(res?.message || 'Volunteer application submitted successfully!');
      await loadVolunteerData();
    } catch (err) {
      console.error('Failed to apply as volunteer:', err);
      showToast(err.response?.data?.message || err.message || 'Failed to submit application.', 'error');
    } finally {
      setApplyingId(null);
    }
  };

  const pendingTasksCount = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.status !== 'completed'
  ).length;
  const completedTasksCount = tasks.length - pendingTasksCount;

  const tabs = [
    {
      id: 'tasks',
      label: `Assigned Tasks (${tasks.length})`,
      icon: CheckSquare,
    },
    {
      id: 'opportunities',
      label: `Event Opportunities (${opportunities.length})`,
      icon: Users,
    },
    {
      id: 'checkin',
      label: 'Door Check-in Station',
      icon: QrCode,
    },
    {
      id: 'expenses',
      label: `Expense Reimbursements (${myExpenses.length})`,
      icon: Receipt,
    },
  ];

  return (
    <DashboardShell activeRole="volunteer">
      <DashboardPageHeader
        title="Volunteer Console & Operations"
        subtitle={`Welcome, ${user?.name || 'Volunteer'}. Manage assigned shift tasks, discover volunteering opportunities, operate door check-in, and submit out-of-pocket expenses.`}
        badge="Execution Workspace"
      />

      {/* Return to Member Portal Banner for Members */}
      {user?.role === 'member' && (
        <div className="mb-6 p-4 border border-blue-200 bg-blue-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-blue-900">
            <span className="font-bold">Member Volunteer Station:</span>
            <span>You are accessing the volunteer operations desk for your assigned shift duties.</span>
          </div>
          <Link
            to="/dashboard/member"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-900 text-white font-bold hover:bg-blue-800 transition-colors uppercase text-[10px] shrink-0"
          >
            <span>Back to Member Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`mb-6 p-4 border font-mono text-xs flex items-center justify-between transition-all ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? (
              <XCircle className="w-4 h-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="font-bold underline uppercase ml-4 text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DashboardStat
          label="Shift Checklist"
          value={`${completedTasksCount} / ${tasks.length}`}
          change={`${pendingTasksCount} tasks remaining`}
          icon={CheckSquare}
        />
        <DashboardStat
          label="Event Opportunities"
          value={opportunities.length}
          change="Available to join"
          icon={Users}
        />
        <DashboardStat
          label="Check-In Mode"
          value="Dual Verification"
          change="QR Scan & Fallback Code"
          icon={QrCode}
        />
        <DashboardStat
          label="My Expense Claims"
          value={myExpenses.length}
          change="Out-of-pocket tracking"
          icon={Receipt}
        />
      </div>

      {/* Workspace Tabs */}
      <div className="mb-8">
        <PageTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {loading && !tasks.length && !opportunities.length ? (
        <DashboardLoadingState message="Connecting to volunteer services..." />
      ) : error && !tasks.length ? (
        <DashboardErrorState
          title="Volunteer Services Offline"
          description={error}
          onRetry={loadVolunteerData}
        />
      ) : (
        <div>
          {/* Tab 1: Assigned Tasks */}
          {activeTab === 'tasks' && (
            <VolunteerTaskList
              tasks={tasks}
              onStatusChange={handleStatusChange}
              loading={loading}
            />
          )}

          {/* Tab 2: Event Volunteer Opportunities */}
          {activeTab === 'opportunities' && (
            <div className="space-y-6">
              <div className="border border-border bg-white p-6 rounded-sm shadow-2xs">
                <div className="mb-6">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Volunteer Event Opportunities
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Apply to join organizing teams and door check-in stations for upcoming campus events.
                  </p>
                </div>

                {opportunities.length === 0 ? (
                  <div className="p-8 border border-border bg-slate-50 text-center text-xs text-slate-500 font-mono">
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
                          className={`border rounded-sm p-5 flex flex-col justify-between shadow-2xs transition-shadow relative overflow-hidden ${
                            isCancelled
                              ? 'bg-slate-50/80 border-rose-200 opacity-80'
                              : 'bg-white border-border hover:shadow-md'
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
                                  Event Live / Started
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-xs bg-purple-50 text-purple-700 border border-purple-200">
                                  Volunteer Needed
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs ${
                                  isCancelled
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : hasStarted
                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                    : isFull
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {isCancelled
                                  ? 'Cancelled'
                                  : hasStarted
                                  ? 'Applications Closed'
                                  : isFull
                                  ? 'Slots Full'
                                  : `${remaining} Slots Left`}
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
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-sm space-y-1.5 text-xs font-mono">
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
                                <strong
                                  className={
                                    !isCancelled && !hasStarted && remaining > 0
                                      ? 'text-emerald-700 font-bold'
                                      : 'text-slate-500 font-bold'
                                  }
                                >
                                  {remaining}
                                </strong>
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="pt-4 mt-2">
                            {hasApplied ? (
                              <div className="w-full py-2 px-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Applied ({evt.my_application?.status || 'Pending'})</span>
                              </div>
                            ) : isCancelled ? (
                              <button
                                type="button"
                                disabled
                                className="w-full py-2 px-3 bg-rose-50 text-rose-500 border border-rose-200 text-xs font-bold uppercase tracking-wider rounded-sm cursor-not-allowed text-center"
                              >
                                Event Cancelled
                              </button>
                            ) : hasStarted ? (
                              <button
                                type="button"
                                disabled
                                className="w-full py-2 px-3 bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold uppercase tracking-wider rounded-sm cursor-not-allowed text-center"
                              >
                                Applications Closed (Started)
                              </button>
                            ) : isFull ? (
                              <button
                                type="button"
                                disabled
                                className="w-full py-2 px-3 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold uppercase tracking-wider rounded-sm cursor-not-allowed text-center"
                              >
                                Quota Filled
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleApply(evt.id)}
                                disabled={isApplying}
                                className="w-full py-2 px-3 bg-[#5F3F56] hover:bg-[#4a3143] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                              >
                                {isApplying ? 'Applying...' : 'Apply as Volunteer'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Door Check-in Station */}
          {activeTab === 'checkin' && <VolunteerCheckIn />}

          {/* Tab 4: Expense Reimbursements */}
          {activeTab === 'expenses' && (
            <VolunteerExpenseForm
              myExpenses={myExpenses}
              onSubmitExpense={handleSubmitExpense}
              loading={loading}
              submitting={submittingExpense}
            />
          )}
        </div>
      )}
    </DashboardShell>
  );
};

export default VolunteerDashboard;
