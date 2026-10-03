// frontend/src/pages/dashboard/VolunteerDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardPageHeader from '../../components/dashboard/DashboardPageHeader';
import { DashboardLoadingState } from '../../components/dashboard/DashboardLoadingState';
import { DashboardErrorState } from '../../components/dashboard/DashboardErrorState';
import {
  VolunteerTaskList,
  VolunteerExpenseForm,
  VolunteerCheckIn,
} from '../../components/dashboard/volunteer';
import tasksService from '../../services/tasks.service';
import financeService from '../../services/finance.service';
import authService from '../../services/auth.service';
import {
  CheckSquare,
  QrCode,
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  HeartHandshake,
} from 'lucide-react';

export const VolunteerDashboard = () => {
  const user = authService.getStoredUser();
  const location = useLocation();
  const navigate = useNavigate();

  // Route-aware tab resolution: 'tasks' | 'checkin' | 'expenses'
  const getTabFromPath = (pathname) => {
    if (pathname.includes('/checkin')) return 'checkin';
    if (pathname.includes('/expenses')) return 'expenses';
    return 'tasks';
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));

  // Sync tab with URL changes
  useEffect(() => {
    const tabFromUrl = getTabFromPath(location.pathname);
    setActiveTab(tabFromUrl);
  }, [location.pathname]);

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
  const [loading, setLoading] = useState(true);
  const [submittingExpense, setSubmittingExpense] = useState(false);
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

      const [tasksRes, expensesRes] = await Promise.allSettled([
        tasksService.getAllTasks(),
        financeService.getExpenses(),
      ]);

      if (tasksRes.status === 'fulfilled' && tasksRes.value) {
        const tList = tasksRes.value?.data || tasksRes.value || [];
        setTasks(Array.isArray(tList) ? tList : []);
      }

      if (expensesRes.status === 'fulfilled' && expensesRes.value) {
        const eList = expensesRes.value?.data || expensesRes.value || [];
        const allExpenses = Array.isArray(eList) ? eList : [];
        // Filter to current user's submitted expenses
        const filtered = allExpenses.filter(
          (e) => !user?.id || e.submitted_by === user.id || e.user_id === user.id
        );
        setMyExpenses(filtered.length > 0 ? filtered : allExpenses);
      }
    } catch (err) {
      console.error('Failed to load volunteer data:', err);
      setError('Unable to connect to task and expense service.');
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

  const myTasksCount = tasks.filter((t) => !user?.id || t.assignee_id === user.id).length;
  const pendingTasksCount = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'completed').length;

  const tabs = [
    {
      id: 'tasks',
      label: `Assigned Tasks (${tasks.length})`,
      icon: CheckSquare,
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

      {/* Page Header */}
      <DashboardPageHeader
        title="Volunteer Console & Operations"
        subtitle={`Welcome, ${user?.name || 'Volunteer'}. Execute assigned event checklists, assist in ticket door check-in, and submit out-of-pocket receipts.`}
        badge="Execution Workspace"
      />

      {loading && tasks.length === 0 ? (
        <DashboardLoadingState message="Loading assigned operational tasks & check-in station..." />
      ) : error && tasks.length === 0 ? (
        <DashboardErrorState
          title="Volunteer Services Offline"
          description={error}
          onRetry={loadVolunteerData}
        />
      ) : (
        <div className="space-y-8">
          {/* Tab 1: Tasks List */}
          {activeTab === 'tasks' && (
            <VolunteerTaskList
              tasks={tasks}
              onStatusChange={handleStatusChange}
              loading={loading}
            />
          )}

          {/* Tab 2: Door Check-in Station */}
          {activeTab === 'checkin' && <VolunteerCheckIn />}

          {/* Tab 3: Out-of-Pocket Expense Submission */}
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
