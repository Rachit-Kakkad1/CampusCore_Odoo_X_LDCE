// frontend/src/components/dashboard/admin/AdminEventManagement.jsx
import React, { useState } from 'react';
import { ActionButton } from '../ActionButton';
import eventsService from '../../../services/events.service';
import { Plus, X, Calendar, MapPin, AlertCircle } from 'lucide-react';

export const AdminEventManagement = ({
  events = [],
  loading = false,
  onEventCreated,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [capacity, setCapacity] = useState('100');
  const [memberPrice, setMemberPrice] = useState('300.00');
  const [nonMemberPrice, setNonMemberPrice] = useState('500.00');

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const res = await eventsService.createEvent({
        title,
        description,
        venue,
        starts_at: new Date(startsAt).toISOString(),
        capacity: parseInt(capacity, 10),
        seats_remaining: parseInt(capacity, 10),
        member_price: parseFloat(memberPrice),
        non_member_price: parseFloat(nonMemberPrice),
      });

      setShowAddModal(false);
      setTitle('');
      setDescription('');
      setVenue('');
      setStartsAt('');
      onEventCreated?.(res?.data || res);
    } catch (err) {
      console.error('Error creating event:', err);
      setFormError(err.response?.data?.error?.message || err.message || 'Failed to create event');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-2xl text-[#1c1c1c]">Organization Event Schedule</h3>
          <span className="font-mono text-xs text-[#1c1c1c]/60">
            {events.length} active events in database
          </span>
        </div>
        <ActionButton
          variant="primary"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Create New Event</span>
        </ActionButton>
      </div>

      {/* Events Table */}
      {loading ? (
        <div className="h-64 bg-white/50 border border-[#e5e4de] animate-pulse"></div>
      ) : events.length === 0 ? (
        <div className="p-12 border border-[#e5e4de] text-center font-mono text-xs text-[#1c1c1c]/60">
          No events created yet. Click "+ Create New Event" to publish one.
        </div>
      ) : (
        <div className="border border-[#e5e4de] bg-white/70 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e5e4de] bg-[#f7f6f2] text-[10px] uppercase tracking-wider text-[#1c1c1c]/60">
                <th className="p-3.5">Event Title</th>
                <th className="p-3.5">Venue</th>
                <th className="p-3.5">Scheduled Time</th>
                <th className="p-3.5">Capacity</th>
                <th className="p-3.5">Seats Left</th>
                <th className="p-3.5">Member Price</th>
                <th className="p-3.5">Non-Member</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e4de]">
              {events.map((ev) => {
                const dateStr = ev.starts_at
                  ? new Date(ev.starts_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'TBA';

                return (
                  <tr key={ev.id} className="hover:bg-[#f7f6f2]/60">
                    <td className="p-3.5 font-bold text-[#1c1c1c]">
                      {ev.title}
                    </td>
                    <td className="p-3.5 text-[#1c1c1c]/80">{ev.venue}</td>
                    <td className="p-3.5 text-[#1c1c1c]/70">{dateStr}</td>
                    <td className="p-3.5">{ev.capacity}</td>
                    <td className="p-3.5">
                      <span className={`font-semibold ${
                        ev.seats_remaining <= 0 ? 'text-red-700' : 'text-[#5F3F56]'
                      }`}>
                        {ev.seats_remaining}
                      </span>
                    </td>
                    <td className="p-3.5 text-[#5F3F56] font-semibold">
                      ₹{Number(ev.member_price).toFixed(2)}
                    </td>
                    <td className="p-3.5 font-medium text-[#1c1c1c]">
                      ₹{Number(ev.non_member_price).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#1c1c1c]/70 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreate}
            className="border border-[#e5e4de] bg-[#f7f6f2] p-6 sm:p-8 w-full max-w-lg space-y-6 my-8"
          >
            <div className="flex items-center justify-between border-b border-[#e5e4de] pb-3">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-[#5F3F56] font-semibold block mb-1">
                  Event Operations
                </span>
                <h3 className="font-serif text-2xl text-[#1c1c1c]">Schedule New Event</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#1c1c1c]/50 hover:text-[#1c1c1c]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 font-mono text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Annual Tech Symposium"
                  className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keynote speakers, workshop topics, schedule..."
                  className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70 mb-1">
                    Venue *
                  </label>
                  <input
                    type="text"
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Main Auditorium"
                    className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70 mb-1">
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70 mb-1">
                    Capacity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full p-2 bg-white border border-[#e5e4de] font-mono text-xs text-center"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70 mb-1">
                    Member (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={memberPrice}
                    onChange={(e) => setMemberPrice(e.target.value)}
                    className="w-full p-2 bg-white border border-[#e5e4de] font-mono text-xs text-center"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70 mb-1">
                    Non-Member
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={nonMemberPrice}
                    onChange={(e) => setNonMemberPrice(e.target.value)}
                    className="w-full p-2 bg-white border border-[#e5e4de] font-mono text-xs text-center"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#e5e4de] flex justify-end gap-3">
              <ActionButton
                variant="secondary"
                onClick={() => setShowAddModal(false)}
                disabled={formLoading}
              >
                Cancel
              </ActionButton>
              <ActionButton
                type="submit"
                variant="primary"
                disabled={formLoading}
              >
                {formLoading ? 'Publishing...' : 'Publish Event'}
              </ActionButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminEventManagement;
