// frontend/src/components/dashboard/events/EventManagerTasks.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckSquare, Plus, Filter, Trash2, Clock, 
  Calendar, UserCheck, AlertCircle, RefreshCw, ChevronDown
} from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { ActionButton } from '../ActionButton';
import { DashboardEmptyState } from '../DashboardEmptyState';
import tasksService from '../../../services/tasks.service';
import eventsService from '../../../services/events.service';
import authService from '../../../services/auth.service';

export const EventManagerTasks = ({ events = [] }) => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_id: '',
    assigned_to: '',
    priority: 'MEDIUM',
    due_date: ''
  });

  // Load Tasks
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = {};
      if (selectedEventId !== 'ALL') {
        filters.event_id = selectedEventId;
      }
      if (statusFilter !== 'ALL') {
        filters.status = statusFilter;
      }
      const data = await tasksService.getAllTasks(filters);
      const list = Array.isArray(data) ? data : (data?.data || data?.tasks || []);
      setTasks(list);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError(err.message || 'Unable to retrieve event tasks.');
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, statusFilter]);

  const [eventVolunteers, setEventVolunteers] = useState([]);
  const [volunteersLoading, setVolunteersLoading] = useState(false);

  // When selected modal event changes, load approved volunteers for that event
  useEffect(() => {
    if (formData.event_id) {
      setVolunteersLoading(true);
      eventsService.getVolunteers(formData.event_id)
        .then((res) => {
          const list = res?.volunteers || res?.data || (Array.isArray(res) ? res : []);
          const approved = list.filter((v) => (v.status || '').toLowerCase() === 'approved');
          const available = approved.length > 0 ? approved : list;
          setEventVolunteers(available);
          if (available.length > 0) {
            setFormData((prev) => {
              const currentValid = available.some(v => String(v.user_id || v.id) === String(prev.assigned_to));
              return {
                ...prev,
                assigned_to: currentValid ? prev.assigned_to : String(available[0].user_id || available[0].id)
              };
            });
          } else {
            setFormData((prev) => ({ ...prev, assigned_to: '' }));
          }
        })
        .catch((err) => {
          console.error('Failed to fetch event volunteers:', err);
          setEventVolunteers([]);
        })
        .finally(() => {
          setVolunteersLoading(false);
        });
    } else {
      setEventVolunteers([]);
    }
  }, [formData.event_id]);


  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Open modal with preselected event if filtered
  const handleOpenAssignModal = () => {
    const initialEventId = selectedEventId !== 'ALL' ? selectedEventId : (events[0]?.id ? String(events[0].id) : '');
    setFormData({
      title: '',
      description: '',
      event_id: initialEventId,
      assigned_to: '',
      priority: 'MEDIUM',
      due_date: ''
    });
    setFormError(null);
    setShowAssignModal(true);
  };

  // Handle Form Submit
  const handleCreateTask = async (e) => {
    if (e) e.preventDefault();
    if (!formData.title || !formData.title.trim()) {
      setFormError('Task title is required.');
      return;
    }
    if (!formData.event_id) {
      setFormError('Please select an event for this task.');
      return;
    }
    if (!formData.assigned_to) {
      setFormError('Please select an approved volunteer for this event.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      let parsedDueDate = null;
      if (formData.due_date) {
        const d = new Date(formData.due_date);
        if (!isNaN(d.getTime())) {
          parsedDueDate = d.toISOString();
        }
      }

      await tasksService.createTask({
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        event_id: parseInt(formData.event_id, 10),
        assignee_id: parseInt(formData.assigned_to, 10),
        assigned_to: parseInt(formData.assigned_to, 10),
        priority: formData.priority || 'MEDIUM',
        due_date: parsedDueDate,
        status: 'PENDING'
      });

      setShowAssignModal(false);
      setActionSuccess('Task successfully assigned to volunteer!');
      setTimeout(() => setActionSuccess(null), 4000);
      loadTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
      setFormError(err.response?.data?.message || err.data?.message || err.message || 'Failed to assign task.');
    } finally {
      setSubmitting(false);
    }
  };


  // Status toggle handler
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksService.updateTaskStatus(taskId, newStatus);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error('Failed to update task status:', err);
      alert(err.response?.data?.message || 'Failed to update task status');
    }
  };

  // Delete task handler
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to remove this assigned task?')) return;
    try {
      await tasksService.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const getPriorityBadgeVariant = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
        return 'danger';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      case 'LOW':
      default:
        return 'neutral';
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'warning';
      case 'TODO':
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-border">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="font-mono text-xs font-semibold uppercase text-slate-700">Filter Event:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-3 py-1.5 border border-border text-xs font-mono bg-slate-50 text-slate-900 focus:outline-hidden focus:border-primary"
            >
              <option value="ALL">All Events ({events.length})</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase text-slate-700">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-border text-xs font-mono bg-slate-50 text-slate-900 focus:outline-hidden focus:border-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">To-Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <button
            onClick={loadTasks}
            className="p-1.5 border border-border hover:bg-slate-100 text-slate-600 transition-colors"
            title="Refresh Tasks"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <ActionButton
          variant="primary"
          onClick={handleOpenAssignModal}
          className="text-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Assign Task to Volunteer
        </ActionButton>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          {actionSuccess}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Task List Grid */}
      {loading ? (
        <div className="p-12 border border-border bg-white text-center font-mono text-xs text-slate-500">
          Loading assigned volunteer tasks...
        </div>
      ) : tasks.length === 0 ? (
        <DashboardEmptyState
          title="No Assigned Tasks Found"
          description="There are currently no tasks delegated for this selection. Click '+ Assign Task to Volunteer' above to allocate operational responsibilities."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map((task) => {
            const dueDate = task.due_date ? new Date(task.due_date) : null;
            const isOverdue = dueDate && dueDate < new Date() && task.status !== 'COMPLETED';

            return (
              <div 
                key={task.id} 
                className="bg-white border border-border p-5 flex flex-col justify-between hover:border-slate-400 transition-all duration-200"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-primary uppercase truncate max-w-[180px]">
                      {task.event_title || task.fundraiser_title || 'General Campus Event'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge variant={getPriorityBadgeVariant(task.priority)} size="sm">
                        {task.priority || 'MEDIUM'}
                      </StatusBadge>
                    </div>
                  </div>

                  <h4 className="font-serif font-bold text-slate-900 text-base leading-snug">
                    {task.title}
                  </h4>

                  {task.description && (
                    <p className="text-xs text-slate-600 font-sans line-clamp-3">
                      {task.description}
                    </p>
                  )}

                  {/* Assignee Box */}
                  <div className="p-2.5 bg-slate-50 border border-border/80 text-xs font-mono space-y-1">
                    <div className="text-slate-500 text-[10px] uppercase tracking-wider">Assigned Volunteer</div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-[10px]">
                        {(task.assignee_name || task.assignee_email || 'V').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800 truncate">
                        {task.assignee_name || task.assignee_email || (task.assignee_id ? `Volunteer #${task.assignee_id}` : 'Unassigned Volunteer')}
                      </span>
                    </div>
                  </div>


                  {/* Due Date */}
                  {dueDate && (
                    <div className={`flex items-center gap-1.5 text-xs font-mono ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>Due: {dueDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>

                {/* Footer Status Switcher and Delete */}
                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500 uppercase">Status:</span>
                    <select
                      value={task.status || 'TODO'}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      className="px-2 py-1 text-xs font-mono border border-border bg-white rounded-xs focus:outline-hidden focus:border-primary"
                    >
                      <option value="TODO">To-Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Task Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-border w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary" />
                <h3 className="font-serif font-bold text-lg text-slate-900">
                  Assign Task to Volunteer
                </h3>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs font-mono">
              {/* Event Select */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider">
                  Associated Event *
                </label>
                <select
                  value={formData.event_id}
                  onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                  className="w-full p-2.5 border border-border bg-slate-50 text-slate-900 focus:outline-hidden focus:border-primary"
                  required
                >
                  <option value="">-- Select Event --</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({new Date(ev.starts_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Title */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Gate 2 Entry Scanning & Wristband Distribution"
                  className="w-full p-2.5 border border-border bg-white text-slate-900 focus:outline-hidden focus:border-primary font-sans text-sm"
                  required
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider">
                  Detailed Instructions / Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide volunteer guidelines, stations, and timing instructions..."
                  rows={3}
                  className="w-full p-2.5 border border-border bg-white text-slate-900 focus:outline-hidden focus:border-primary font-sans text-xs"
                />
              </div>

              {/* Assignee Select */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider">
                  Assignee (Approved Event Volunteer) *
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  disabled={volunteersLoading || !formData.event_id}
                  className="w-full p-2.5 border border-border bg-slate-50 text-slate-900 focus:outline-hidden focus:border-primary disabled:opacity-60"
                  required
                >
                  <option value="">
                    {volunteersLoading
                      ? 'Loading approved volunteers...'
                      : formData.event_id
                      ? eventVolunteers.length > 0
                        ? '-- Select Approved Event Volunteer --'
                        : 'No approved volunteers found for this event'
                      : '-- Choose an event first --'}
                  </option>
                  {eventVolunteers.map((v) => (
                    <option key={v.user_id || v.id} value={v.user_id || v.id}>
                      {v.name || v.user_name || v.email} ({v.email || v.user_email || 'Volunteer'})
                    </option>
                  ))}
                </select>
              </div>


              {/* Priority & Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full p-2.5 border border-border bg-slate-50 text-slate-900 focus:outline-hidden focus:border-primary"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider">
                    Due Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full p-2 border border-border bg-slate-50 text-slate-900 focus:outline-hidden focus:border-primary"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-border text-slate-600 hover:bg-slate-100 transition-colors uppercase font-mono text-xs"
                >
                  Cancel
                </button>
                <ActionButton
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  isLoading={submitting}
                  className="text-xs"
                >
                  {submitting ? 'Assigning...' : 'Confirm Task Assignment'}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManagerTasks;
