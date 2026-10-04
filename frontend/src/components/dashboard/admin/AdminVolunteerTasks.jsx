// frontend/src/components/dashboard/admin/AdminVolunteerTasks.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Search,
  Filter,
  Plus,
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Edit3
} from 'lucide-react';
import tasksService from '../../../services/tasks.service';
import eventsService from '../../../services/events.service';
import authService from '../../../services/auth.service';
import Pagination from '../../common/Pagination';
import { DashboardLoadingState } from '../DashboardLoadingState';

export const AdminVolunteerTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [eventIdFilter, setEventIdFilter] = useState('');

  // Dropdown lists
  const [eventsList, setEventsList] = useState([]);
  const [volunteersList, setVolunteersList] = useState([]);

  // Create Task Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    event_id: '',
    assignee_id: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    due_date: '',
  });

  // Load events
  useEffect(() => {
    eventsService.getEvents()
      .then((data) => {
        const evs = Array.isArray(data) ? data : data?.events || [];
        setEventsList(evs);
      })
      .catch(() => {});
  }, []);

  // When event is selected in Create Modal, load volunteers for that event and system volunteers
  useEffect(() => {
    if (createFormData.event_id) {
      Promise.all([
        eventsService.getVolunteers(createFormData.event_id).catch(() => ({ volunteers: [] })),
        authService.getAllUsers().catch(() => ({ users: [] }))
      ]).then(([eventVolRes, allUsersRes]) => {
        const evList = eventVolRes?.volunteers || eventVolRes?.data || (Array.isArray(eventVolRes) ? eventVolRes : []);
        const rawUsers = Array.isArray(allUsersRes) ? allUsersRes : (allUsersRes?.users || allUsersRes?.data || []);
        const sysVolunteers = rawUsers.filter(u => u.role === 'volunteer' || u.role === 'member');
        
        // Merge list without duplicates
        const map = new Map();
        evList.forEach(v => {
          const uid = v.user_id || v.id;
          if (uid) map.set(String(uid), { id: uid, user_id: uid, name: v.name || v.user_name || 'Volunteer', email: v.email || v.user_email || '', isEventVol: true, status: v.status });
        });
        sysVolunteers.forEach(u => {
          const uid = u.id;
          if (uid && !map.has(String(uid))) {
            map.set(String(uid), { id: uid, user_id: uid, name: u.name || 'Volunteer', email: u.email || '', isEventVol: false, status: 'available' });
          }
        });
        
        setVolunteersList(Array.from(map.values()));
      });
    } else {
      authService.getAllUsers()
        .then((res) => {
          const rawUsers = Array.isArray(res) ? res : (res?.users || res?.data || []);
          const vols = rawUsers.filter(u => u.role === 'volunteer' || u.role === 'member').map(u => ({
            id: u.id,
            user_id: u.id,
            name: u.name,
            email: u.email,
          }));
          setVolunteersList(vols);
        })
        .catch(() => setVolunteersList([]));
    }
  }, [createFormData.event_id]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: pagination.page,
        pageSize: pagination.pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      if (eventIdFilter) params.event_id = eventIdFilter;

      const res = await tasksService.getAllTasks(params);
      let items = [];
      if (Array.isArray(res)) {
        items = res;
      } else if (Array.isArray(res?.tasks)) {
        items = res.tasks;
      } else if (Array.isArray(res?.items)) {
        items = res.items;
      } else if (Array.isArray(res?.data)) {
        items = res.data;
      } else if (Array.isArray(res?.data?.tasks)) {
        items = res.data.tasks;
      }

      setTasks(items);

      const total = res?.pagination?.totalItems ?? res?.pagination?.total ?? res?.totalItems ?? res?.total ?? items.length;
      const totalPages = res?.pagination?.totalPages ?? res?.totalPages ?? Math.max(1, Math.ceil(total / (pagination.pageSize || 10)));
      const page = res?.pagination?.page ?? res?.page ?? pagination.page;
      const pageSize = res?.pagination?.pageSize ?? res?.pageSize ?? pagination.pageSize;

      setPagination((prev) => ({
        ...prev,
        page,
        pageSize,
        total,
        totalPages,
      }));
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch tasks.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, search, statusFilter, priorityFilter, eventIdFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!createFormData.title.trim() || !createFormData.event_id || !createFormData.assignee_id) {
      setNotification({ type: 'error', message: 'Event, volunteer assignee, and task title are required.' });
      return;
    }

    try {
      setCreateLoading(true);

      let parsedDueDate = null;
      if (createFormData.due_date) {
        const d = new Date(createFormData.due_date);
        if (!isNaN(d.getTime())) {
          parsedDueDate = d.toISOString();
        }
      }

      // If volunteer is not yet an approved event volunteer, add them to event first
      const selectedVol = volunteersList.find(v => String(v.user_id || v.id) === String(createFormData.assignee_id));
      if (selectedVol && (!selectedVol.isEventVol || selectedVol.status !== 'approved')) {
        try {
          await eventsService.addVolunteer(Number(createFormData.event_id), Number(createFormData.assignee_id));
        } catch {
          // Ignore if already present
        }
      }

      await tasksService.createTask({
        event_id: Number(createFormData.event_id),
        assignee_id: Number(createFormData.assignee_id),
        title: createFormData.title.trim(),
        description: createFormData.description.trim(),
        priority: createFormData.priority,
        due_date: parsedDueDate,
      });

      setNotification({ type: 'success', message: 'Volunteer task created and assigned successfully!' });
      setIsCreateModalOpen(false);
      setCreateFormData({
        event_id: '',
        assignee_id: '',
        title: '',
        description: '',
        priority: 'MEDIUM',
        due_date: '',
      });
      fetchTasks();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || err.data?.message || err.response?.data?.error || err.message || 'Failed to create task.',
      });
    } finally {
      setCreateLoading(false);
    }
  };


  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksService.updateTaskStatus(taskId, newStatus);
      setNotification({ type: 'success', message: `Task status updated to ${newStatus}.` });
      fetchTasks();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to update task status.',
      });
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await tasksService.deleteTask(taskId);
      setNotification({ type: 'success', message: 'Task deleted successfully.' });
      fetchTasks();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to delete task.',
      });
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 border border-border bg-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckSquare className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-sans font-bold text-slate-900 tracking-tight">
                Volunteer Task Management
              </h2>
            </div>
            <p className="text-xs font-mono text-slate-500">
              Assign and supervise operational volunteer tasks across scheduled events.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchTasks()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border bg-slate-50 hover:bg-slate-100 text-xs font-mono uppercase tracking-wider text-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-mono uppercase font-bold tracking-wider transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search task, volunteer, event..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-border bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-900 transition-colors"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 text-xs font-mono border border-border bg-white focus:outline-hidden focus:border-slate-900"
            >
              <option value="ALL">Status: All</option>
              <option value="PENDING">Pending / To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 text-xs font-mono border border-border bg-white focus:outline-hidden focus:border-slate-900"
            >
              <option value="ALL">Priority: All</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>

          <div>
            <select
              value={eventIdFilter}
              onChange={(e) => {
                setEventIdFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 text-xs font-mono border border-border bg-white focus:outline-hidden focus:border-slate-900 truncate"
            >
              <option value="">Event: All Events</option>
              {eventsList.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3.5 border font-mono text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="font-bold underline ml-4 uppercase cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tasks Table */}
      <div className="border border-border bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <DashboardLoadingState title="Loading Tasks..." />
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CheckSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-sans font-bold text-slate-800 text-base">No Tasks Found</h3>
            <p className="font-mono text-xs text-slate-500 max-w-md mx-auto">
              No tasks match your current criteria. Create tasks and assign them to approved event volunteers.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-border bg-slate-50/80 text-slate-600 font-semibold tracking-wider uppercase">
                  <th className="p-3">Task / Description</th>
                  <th className="p-3">Event</th>
                  <th className="p-3">Volunteer Assignee</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Due / Completed</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((t) => {
                  const status = (t.status || 'PENDING').toUpperCase();
                  const priority = (t.priority || 'MEDIUM').toUpperCase();
                  const isCompleted = status === 'COMPLETED';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Title & Description */}
                      <td className="p-3">
                        <div className="font-sans font-bold text-slate-900 text-xs">
                          {t.title}
                        </div>
                        {t.description && (
                          <div className="text-slate-500 text-[11px] line-clamp-1 max-w-[250px] mt-0.5">
                            {t.description}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          ID: #{t.id} • Created by {t.creator_name || 'Admin'}
                        </span>
                      </td>

                      {/* Event */}
                      <td className="p-3">
                        <div className="font-sans font-medium text-slate-900 text-xs">
                          {t.event_title || `Event #${t.event_id}`}
                        </div>
                        {t.event_date && (
                          <span className="text-slate-400 text-[10px] block mt-0.5">
                            {new Date(t.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </td>

                      {/* Assignee */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="font-semibold text-slate-900">{t.assignee_name || 'Unassigned'}</span>
                        </div>
                        {t.assignee_email && (
                          <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[150px]">
                            {t.assignee_email}
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 font-bold text-[10px] uppercase rounded-xs border ${
                            priority === 'HIGH'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : priority === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 font-bold text-[10px] uppercase rounded-xs border ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : status === 'CANCELLED'
                              ? 'bg-slate-100 text-slate-500 border-slate-300 line-through'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3" />}
                          <span>{status.replace('_', ' ')}</span>
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="p-3 text-[11px] text-slate-500">
                        {isCompleted ? (
                          <div>
                            <span className="text-emerald-700 font-semibold block">Done: {formatDate(t.completed_at)}</span>
                            {t.completed_by_name && (
                              <span className="text-[10px] text-slate-400">By {t.completed_by_name}</span>
                            )}
                          </div>
                        ) : t.due_date ? (
                          <div>
                            <span className="text-slate-700 font-medium">Due: {formatDate(t.due_date)}</span>
                          </div>
                        ) : (
                          'No due date'
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {status !== 'COMPLETED' && (
                            <select
                              value={status}
                              onChange={(e) => handleStatusChange(t.id, e.target.value)}
                              className="px-2 py-1 text-[11px] font-mono border border-border bg-white"
                            >
                              <option value="PENDING">Pending</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          )}
                          <button
                            onClick={() => handleDeleteTask(t.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border bg-slate-50 flex items-center justify-between">
            <div className="text-xs font-mono text-slate-500">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
              {pagination.total} tasks
            </div>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
            />
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg border border-border bg-white shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-sans font-bold text-lg text-slate-900">
                  Assign Volunteer Task
                </h3>
                <p className="text-xs font-mono text-slate-500">
                  Select an event and assign tasks to registered event volunteers.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 font-mono text-xs">
              {/* Event Select */}
              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                  Target Event *
                </label>
                <select
                  required
                  value={createFormData.event_id}
                  onChange={(e) => setCreateFormData({ ...createFormData, event_id: e.target.value, assignee_id: '' })}
                  className="w-full px-3 py-2 border border-border bg-white focus:outline-hidden focus:border-slate-900"
                >
                  <option value="">Select Event</option>
                  {eventsList.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Volunteer Select */}
              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                  Assigned Volunteer *
                </label>
                <select
                  required
                  disabled={!createFormData.event_id}
                  value={createFormData.assignee_id}
                  onChange={(e) => setCreateFormData({ ...createFormData, assignee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border bg-white focus:outline-hidden focus:border-slate-900 disabled:bg-slate-100"
                >
                  <option value="">
                    {createFormData.event_id
                      ? volunteersList.length > 0
                        ? 'Select Volunteer Assignee'
                        : 'No volunteers found'
                      : 'Choose an event first'}
                  </option>
                  {volunteersList.map((vol) => {
                    const uid = vol.user_id || vol.id;
                    return (
                      <option key={uid} value={uid}>
                        {vol.name || 'Volunteer'} ({vol.email || 'No email'}) {vol.isEventVol ? (vol.status === 'approved' ? '✓ Approved' : `(${vol.status || 'applied'})`) : '(Available)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Registration Desk Lead"
                  value={createFormData.title}
                  onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-border bg-white focus:outline-hidden focus:border-slate-900 font-sans"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                  Task Instructions / Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Handle registration scanner and badge distribution from 9 AM to 12 PM."
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border bg-white focus:outline-hidden focus:border-slate-900 font-sans"
                />
              </div>

              {/* Priority and Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={createFormData.priority}
                    onChange={(e) => setCreateFormData({ ...createFormData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-border bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                    Due Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={createFormData.due_date}
                    onChange={(e) => setCreateFormData({ ...createFormData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-border bg-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-border bg-slate-100 hover:bg-slate-200 uppercase font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white uppercase font-bold tracking-wider"
                >
                  {createLoading ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVolunteerTasks;
