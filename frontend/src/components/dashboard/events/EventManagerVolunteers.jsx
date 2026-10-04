// frontend/src/components/dashboard/events/EventManagerVolunteers.jsx
import React, { useState, useEffect } from 'react';
import eventsService from '../../../services/events.service';
import authService from '../../../services/auth.service';
import { StatusBadge } from '../StatusBadge';
import { ActionButton } from '../ActionButton';
import {
  Users,
  UserPlus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Clock
} from 'lucide-react';

export const EventManagerVolunteers = ({ events = [], onRefreshEvents }) => {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');
  const [volunteers, setVolunteers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addingVolunteer, setAddingVolunteer] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Sync selected event if list changes
  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  // Load all users for direct volunteer assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await authService.getAllUsers();
        const list = res?.users || res?.data || res || [];
        setAvailableUsers(Array.isArray(list) ? list : []);
      } catch (err) {
        console.warn('Failed to load users for volunteer assignment:', err);
      }
    };
    fetchUsers();
  }, []);

  const loadVolunteers = async (eventId) => {
    if (!eventId) return;
    try {
      setLoading(true);
      const res = await eventsService.getEventVolunteers(eventId);
      const list = res?.volunteers || res?.data || res || [];
      setVolunteers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load event volunteers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadVolunteers(selectedEventId);
    }
  }, [selectedEventId]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAddVolunteer = async (e) => {
    e.preventDefault();
    if (!selectedEventId || !addUserId) return;
    try {
      setAddingVolunteer(true);
      await eventsService.addVolunteer(selectedEventId, parseInt(addUserId, 10));
      showToast('Volunteer added & approved successfully!');
      setAddUserId('');
      await loadVolunteers(selectedEventId);
      onRefreshEvents?.();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to add volunteer');
    } finally {
      setAddingVolunteer(false);
    }
  };

  const handleUpdateStatus = async (appId, status) => {
    if (!selectedEventId) return;
    try {
      setActionLoadingId(appId);
      await eventsService.updateVolunteerStatus(selectedEventId, appId, status);
      showToast(`Volunteer status updated to ${status}`);
      await loadVolunteers(selectedEventId);
      onRefreshEvents?.();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveVolunteer = async (appId) => {
    if (!selectedEventId) return;
    if (!window.confirm('Are you sure you want to remove this volunteer from the event roster?')) return;
    try {
      setActionLoadingId(appId);
      await eventsService.removeVolunteer(selectedEventId, appId);
      showToast('Volunteer removed from event.');
      await loadVolunteers(selectedEventId);
      onRefreshEvents?.();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to remove volunteer');
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeEvent = events.find((e) => String(e.id) === String(selectedEventId)) || events[0];
  const requiredCount = activeEvent?.volunteers_required || 0;
  const activeCount = volunteers.filter((v) => v.status === 'pending' || v.status === 'approved').length;
  const approvedCount = volunteers.filter((v) => v.status === 'approved').length;
  const remainingSlots = Math.max(0, requiredCount - activeCount);

  // Eligible users to add: not already in active roster
  const assignableUsers = availableUsers.filter(
    (u) => !volunteers.some((v) => v.user_id === u.id && (v.status === 'approved' || v.status === 'pending'))
  );

  return (
    <div className="space-y-6">
      {/* Event Selector & Overview Card */}
      <div className="p-6 border border-border bg-white shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-border">
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-lg text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-700" />
              <span>Volunteer Roster Management</span>
            </h3>
            <p className="text-xs text-slate-500 font-sans">
              Review volunteer applications, directly assign team members, and manage operational slots.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <label className="font-mono text-xs text-slate-600 font-bold whitespace-nowrap">
              Select Event:
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-3 py-2 border border-border font-sans text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-900 rounded-xs min-w-[220px]"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} {ev.volunteers_enabled ? `(${ev.volunteers_required} required)` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => loadVolunteers(selectedEventId)}
              className="p-2 border border-border hover:bg-slate-100 text-slate-600 rounded-xs transition-colors cursor-pointer"
              title="Refresh Roster"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Event Volunteer Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xs">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Required Slots</span>
            <span className="text-xl font-bold font-mono text-slate-900">{requiredCount}</span>
          </div>
          <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xs">
            <span className="text-[10px] uppercase font-mono tracking-wider text-purple-900 block">Active Volunteers</span>
            <span className="text-xl font-bold font-mono text-purple-700">{approvedCount}</span>
          </div>
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xs">
            <span className="text-[10px] uppercase font-mono tracking-wider text-amber-900 block">Pending Review</span>
            <span className="text-xl font-bold font-mono text-amber-700">
              {volunteers.filter((v) => v.status === 'pending').length}
            </span>
          </div>
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xs">
            <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-900 block">Slots Remaining</span>
            <span className="text-xl font-bold font-mono text-emerald-700">{remainingSlots}</span>
          </div>
        </div>

        {/* Direct Add Volunteer Action Bar */}
        <div className="mt-6 p-4 bg-purple-50/60 border border-purple-200 rounded-xs">
          <form onSubmit={handleAddVolunteer} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900 mb-1 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-purple-700" />
                <span>Directly Add / Assign Volunteer to Event</span>
              </label>
              <select
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-purple-200 text-xs text-slate-900 focus:outline-none focus:border-purple-600 rounded-xs"
              >
                <option value="">-- Choose User / Member to Add as Volunteer --</option>
                {assignableUsers
                  .filter((u) => u.role === 'volunteer')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) — [VOLUNTEER]
                    </option>
                  ))}
                <optgroup label="All Other Members">
                  {assignableUsers
                    .filter((u) => u.role !== 'volunteer')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) — [{u.role.toUpperCase()}]
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
            <div className="self-end sm:self-auto sm:mt-5">
              <ActionButton
                type="submit"
                variant="primary"
                disabled={!addUserId || addingVolunteer}
                className="w-full sm:w-auto text-xs py-2 bg-purple-700 hover:bg-purple-800"
              >
                {addingVolunteer ? 'Assigning...' : '+ Add Volunteer'}
              </ActionButton>
            </div>
          </form>

          {toastMessage && (
            <div className="mt-3 text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{toastMessage.msg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Volunteers Roster Table */}
      <div className="border border-border bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-slate-50 flex items-center justify-between">
          <span className="font-mono text-xs uppercase font-bold text-slate-700">
            Roster ({volunteers.length} volunteer records)
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Event ID: EVT-00{selectedEventId}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400">
            Loading volunteer roster...
          </div>
        ) : volunteers.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-slate-500 bg-white">
            No volunteers enrolled for this event yet. Use the assignment bar above to add volunteers directly.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-slate-50/50 text-[10px] uppercase font-bold tracking-wider text-slate-600">
                  <th className="p-3.5">Volunteer Name & Email</th>
                  <th className="p-3.5">System Role</th>
                  <th className="p-3.5">Enrolled / Applied</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {volunteers.map((vol) => (
                  <tr key={vol.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs border border-purple-200 shrink-0">
                          {vol.user_name ? vol.user_name.charAt(0).toUpperCase() : 'V'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">
                            {vol.user_name || 'Volunteer User'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {vol.user_email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600 uppercase">
                      {vol.user_role || 'volunteer'}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">
                      {vol.applied_at ? new Date(vol.applied_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="p-3.5">
                      {vol.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Approved
                        </span>
                      )}
                      {vol.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          Pending Review
                        </span>
                      )}
                      {vol.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                          Rejected
                        </span>
                      )}
                      {vol.status === 'removed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                          Removed
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {vol.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              disabled={actionLoadingId === vol.id}
                              onClick={() => handleUpdateStatus(vol.id, 'approved')}
                              className="px-2.5 py-1 text-[10px] font-bold uppercase bg-emerald-600 hover:bg-emerald-700 text-white rounded-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === vol.id}
                              onClick={() => handleUpdateStatus(vol.id, 'rejected')}
                              className="px-2.5 py-1 text-[10px] font-bold uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(vol.status === 'approved' || vol.status === 'pending') && (
                          <button
                            type="button"
                            disabled={actionLoadingId === vol.id}
                            onClick={() => handleRemoveVolunteer(vol.id)}
                            className="px-2.5 py-1 text-[10px] font-bold uppercase text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventManagerVolunteers;
