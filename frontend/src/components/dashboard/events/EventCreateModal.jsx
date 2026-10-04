// frontend/src/components/dashboard/events/EventCreateModal.jsx
import React, { useState, useEffect } from 'react';
import { ActionButton } from '../ActionButton';
import eventsService from '../../../services/events.service';
import authService from '../../../services/auth.service';
import { X, Calendar, MapPin, Users, Tag, AlertCircle, UserCheck } from 'lucide-react';

export const EventCreateModal = ({ isOpen, onClose, onCreated }) => {
  const currentUser = authService.getStoredUser();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('100');
  const [memberPrice, setMemberPrice] = useState('300');
  const [nonMemberPrice, setNonMemberPrice] = useState('500');
  const [volunteersEnabled, setVolunteersEnabled] = useState(false);
  const [volunteersRequired, setVolunteersRequired] = useState('5');
  const [eventManagerId, setEventManagerId] = useState('');

  const [availableUsers, setAvailableUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        try {
          const res = await authService.getAllUsers();
          const list = res?.users || res?.data || res || [];
          setAvailableUsers(Array.isArray(list) ? list : []);
          // Default to current user if they are an event manager
          if (currentUser?.id && (currentUser.role === 'event_manager' || currentUser.role === 'admin')) {
            setEventManagerId(String(currentUser.id));
          }
        } catch (err) {
          console.warn('Failed to load users in EventCreateModal:', err);
        }
      };
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !startsAt || !endsAt) {
      setError('Title, start date, and end date are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const res = await eventsService.createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        venue: venue.trim() || 'Campus Main Hall',
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        capacity: parseInt(capacity, 10) || 100,
        member_price: parseFloat(memberPrice) || 0,
        non_member_price: parseFloat(nonMemberPrice) || 0,
        volunteers_enabled: Boolean(volunteersEnabled),
        volunteers_required: volunteersEnabled ? parseInt(volunteersRequired, 10) : 0,
        event_manager_id: eventManagerId ? parseInt(eventManagerId, 10) : null,
      });

      onCreated?.(res?.event || res?.data || res);
      onClose();
    } catch (err) {
      console.error('Failed to create event:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl border border-border bg-white shadow-xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-slate-50">
          <div>
            <h2 className="font-serif font-bold text-xl text-slate-900">
              Create New Event
            </h2>
            <p className="font-mono text-xs text-slate-500 mt-0.5">
              Schedule community gathering with dual pricing & capacity limit
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 border border-red-300 bg-red-50 text-red-700 font-mono text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Tech Symposium 2026"
              className="w-full px-3 py-2 border border-border font-sans text-sm focus:outline-hidden focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of agenda, speakers, and instructions..."
              className="w-full px-3 py-2 border border-border font-sans text-sm focus:outline-hidden focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold mb-1">
              Venue / Location
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Main Auditorium, Building B"
                className="w-full pl-9 pr-3 py-2 border border-border font-sans text-sm focus:outline-hidden focus:border-slate-900"
              />
            </div>
          </div>

          {/* Event Manager Selector */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-primary" />
              <span>Assigned Event Manager</span>
            </label>
            <select
              value={eventManagerId}
              onChange={(e) => setEventManagerId(e.target.value)}
              className="w-full px-3 py-2 border border-border font-sans text-sm bg-white focus:outline-hidden focus:border-slate-900"
            >
              <option value="">-- Unassigned / General Admin --</option>
              {availableUsers
                .filter(u => u.role === 'event_manager' || u.role === 'admin')
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) — [{u.role.toUpperCase()}]
                  </option>
                ))}
              {availableUsers.filter(u => u.role !== 'event_manager' && u.role !== 'admin').length > 0 && (
                <optgroup label="Other Members">
                  {availableUsers
                    .filter(u => u.role !== 'event_manager' && u.role !== 'admin')
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold mb-1">
                Starts At *
              </label>
              <input
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-3 py-2 border border-border font-mono text-xs focus:outline-hidden focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold mb-1">
                Ends At *
              </label>
              <input
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full px-3 py-2 border border-border font-mono text-xs focus:outline-hidden focus:border-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-700 font-semibold mb-1">
                Max Capacity
              </label>
              <input
                type="number"
                min="1"
                required
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full px-3 py-2 border border-border font-mono text-xs focus:outline-hidden focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-primary font-bold mb-1">
                Member Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={memberPrice}
                onChange={(e) => setMemberPrice(e.target.value)}
                className="w-full px-3 py-2 border border-primary/40 bg-primary/5 font-mono text-xs font-bold text-primary focus:outline-hidden focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-700 font-semibold mb-1">
                Guest Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={nonMemberPrice}
                onChange={(e) => setNonMemberPrice(e.target.value)}
                className="w-full px-3 py-2 border border-border font-mono text-xs focus:outline-hidden focus:border-slate-900"
              />
            </div>
          </div>

          {/* Volunteer Settings */}
          <div className="pt-2 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>Require Volunteers for this Event</span>
              </label>
              <input
                type="checkbox"
                checked={volunteersEnabled}
                onChange={(e) => setVolunteersEnabled(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-border"
              />
            </div>
            {volunteersEnabled && (
              <div className="p-3 bg-purple-50 border border-purple-200">
                <label className="block font-mono text-[11px] uppercase text-purple-900 font-bold mb-1">
                  Number of Volunteers Needed
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={volunteersRequired}
                  onChange={(e) => setVolunteersRequired(e.target.value)}
                  className="w-full px-3 py-1.5 border border-purple-300 bg-white font-mono text-xs text-slate-900"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border mt-6">
            <ActionButton
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </ActionButton>
            <ActionButton
              type="submit"
              variant="primary"
              disabled={submitting}
            >
              {submitting ? 'Scheduling Event...' : 'Create Event'}
            </ActionButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventCreateModal;
