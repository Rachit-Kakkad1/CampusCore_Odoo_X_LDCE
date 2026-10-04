// frontend/src/components/dashboard/admin/AdminEventManagement.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import eventsService from '../../../services/events.service';
import authService from '../../../services/auth.service';
import Pagination from '../../common/Pagination';
import {
  Plus,
  X,
  Calendar,
  MapPin,
  AlertCircle,
  Users,
  Tag,
  Clock,
  Sparkles,
  Ticket,
  DollarSign,
  TrendingUp,
  Search,
  CheckCircle2,
  QrCode,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  UserCheck,
  UserPlus
} from 'lucide-react';
import { ThreeDCard } from '../charts/ThreeDCharts';
import { StatusBadge } from '../StatusBadge';

export const AdminEventManagement = ({
  events = [],
  loading = false,
  onEventCreated,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('100');
  const [memberPrice, setMemberPrice] = useState('300.00');
  const [nonMemberPrice, setNonMemberPrice] = useState('500.00');
  const [category, setCategory] = useState('Technical');
  const [volunteersEnabled, setVolunteersEnabled] = useState(false);
  const [volunteersRequired, setVolunteersRequired] = useState('5');
  const [eventManagerId, setEventManagerId] = useState('');

  const [availableUsers, setAvailableUsers] = useState([]);
  const [addVolunteerUserId, setAddVolunteerUserId] = useState('');
  const [addingVolunteer, setAddingVolunteer] = useState(false);
  const [addVolunteerSuccess, setAddVolunteerSuccess] = useState('');

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await authService.getAllUsers();
        const list = res?.users || res?.data || res || [];
        setAvailableUsers(Array.isArray(list) ? list : []);
      } catch (err) {
        console.warn('Failed to load users for manager/volunteer selection:', err);
      }
    };
    fetchUsers();
  }, []);

  // Volunteer Roster Modal State
  const [volunteerModal, setVolunteerModal] = useState({
    open: false,
    event: null,
    volunteers: [],
    loading: false,
    error: null,
    actionLoadingId: null,
  });

  // Volunteer Removal Confirmation State
  const [removeConfirm, setRemoveConfirm] = useState({
    open: false,
    application: null,
    loading: false,
  });

  const handleOpenVolunteerModal = async (event) => {
    setVolunteerModal({
      open: true,
      event,
      volunteers: [],
      loading: true,
      error: null,
      actionLoadingId: null,
    });
    try {
      const res = await eventsService.getEventVolunteers(event.id);
      const list = res?.volunteers || res?.data || res || [];
      setVolunteerModal((prev) => ({
        ...prev,
        volunteers: Array.isArray(list) ? list : [],
        loading: false,
      }));
    } catch (err) {
      setVolunteerModal((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to load volunteer roster',
      }));
    }
  };

  const handleUpdateVolunteerStatus = async (appId, status) => {
    if (!volunteerModal.event) return;
    try {
      setVolunteerModal((prev) => ({ ...prev, actionLoadingId: appId }));
      await eventsService.updateVolunteerStatus(volunteerModal.event.id, appId, status);
      const res = await eventsService.getEventVolunteers(volunteerModal.event.id);
      const list = res?.volunteers || res?.data || res || [];
      setVolunteerModal((prev) => ({
        ...prev,
        volunteers: Array.isArray(list) ? list : [],
        actionLoadingId: null,
      }));
      onEventCreated?.();
    } catch (err) {
      setVolunteerModal((prev) => ({
        ...prev,
        actionLoadingId: null,
        error: err.message || 'Failed to update volunteer status',
      }));
    }
  };

  const handleConfirmRemoveVolunteer = async () => {
    if (!removeConfirm.application || !volunteerModal.event) return;
    try {
      setRemoveConfirm((prev) => ({ ...prev, loading: true }));
      await eventsService.removeVolunteer(volunteerModal.event.id, removeConfirm.application.id);
      const res = await eventsService.getEventVolunteers(volunteerModal.event.id);
      const list = res?.volunteers || res?.data || res || [];
      setVolunteerModal((prev) => ({
        ...prev,
        volunteers: Array.isArray(list) ? list : [],
      }));
      setRemoveConfirm({ open: false, application: null, loading: false });
      onEventCreated?.();
    } catch (err) {
      setRemoveConfirm((prev) => ({ ...prev, loading: false }));
      alert(err.message || 'Failed to remove volunteer');
    }
  };

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // Computed metrics
  const totalEvents = events.length;
  const totalCapacity = events.reduce((acc, ev) => acc + (parseInt(ev.capacity, 10) || 0), 0);
  const totalSeatsRemaining = events.reduce((acc, ev) => acc + (parseInt(ev.seats_remaining, 10) || 0), 0);
  const totalSeatsBooked = Math.max(0, totalCapacity - totalSeatsRemaining);
  const overallFillRate = totalCapacity > 0 ? Math.round((totalSeatsBooked / totalCapacity) * 100) : 0;
  const projectedGross = events.reduce(
    (acc, ev) => acc + (parseInt(ev.capacity, 10) || 0) * (parseFloat(ev.member_price) || 0),
    0
  );

  // Filtered Events
  const filteredEvents = events.filter((ev) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (ev.title && ev.title.toLowerCase().includes(q)) ||
      (ev.venue && ev.venue.toLowerCase().includes(q));

    const remaining = parseInt(ev.seats_remaining, 10) || 0;
    const isSoldOut = remaining <= 0;
    const isAlmostFull = remaining > 0 && remaining <= 10;
    const isAvailable = remaining > 10;

    let matchesStatus = true;
    if (statusFilter === 'AVAILABLE') matchesStatus = isAvailable;
    if (statusFilter === 'ALMOST_FULL') matchesStatus = isAlmostFull;
    if (statusFilter === 'SOLD_OUT') matchesStatus = isSoldOut;

    return matchesSearch && matchesStatus;
  });

  const paginatedEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize);

  const handleOpenModal = () => {
    setTitle('');
    setDescription('');
    setVenue('');
    setStartsAt('');
    setEndsAt('');
    setCapacity('100');
    setMemberPrice('300.00');
    setNonMemberPrice('500.00');
    setCategory('Technical');
    setVolunteersEnabled(false);
    setVolunteersRequired('5');
    setEventManagerId('');
    setFormError(null);
    setShowAddModal(true);
  };

  const handleAddVolunteerDirectly = async (e) => {
    e?.preventDefault();
    if (!addVolunteerUserId || !volunteerModal.event) return;
    try {
      setAddingVolunteer(true);
      setAddVolunteerSuccess('');
      await eventsService.addVolunteer(volunteerModal.event.id, parseInt(addVolunteerUserId, 10));
      setAddVolunteerSuccess('Volunteer assigned and approved successfully!');
      setAddVolunteerUserId('');
      const res = await eventsService.getEventVolunteers(volunteerModal.event.id);
      const list = res?.volunteers || res?.data || res || [];
      setVolunteerModal((prev) => ({
        ...prev,
        volunteers: Array.isArray(list) ? list : [],
      }));
      onEventCreated?.();
      setTimeout(() => setAddVolunteerSuccess(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to add volunteer');
    } finally {
      setAddingVolunteer(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    if (!title.trim() || !venue.trim() || !startsAt) {
      setFormError('Please fill out the Title, Venue, and Scheduled Date.');
      setFormLoading(false);
      return;
    }

    if (volunteersEnabled) {
      const vReq = parseInt(volunteersRequired, 10);
      if (isNaN(vReq) || vReq < 1) {
        setFormError('Number of volunteers required must be an integer of at least 1.');
        setFormLoading(false);
        return;
      }
    }

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        venue: venue.trim(),
        starts_at: new Date(startsAt).toISOString(),
        capacity: parseInt(capacity, 10),
        seats_remaining: parseInt(capacity, 10),
        member_price: parseFloat(memberPrice),
        non_member_price: parseFloat(nonMemberPrice),
        volunteers_enabled: Boolean(volunteersEnabled),
        volunteers_required: volunteersEnabled ? parseInt(volunteersRequired, 10) : 0,
        event_manager_id: eventManagerId ? parseInt(eventManagerId, 10) : null,
      };

      if (endsAt) {
        payload.ends_at = new Date(endsAt).toISOString();
      }

      const res = await eventsService.createEvent(payload);

      setShowAddModal(false);
      onEventCreated?.(res?.data || res);
    } catch (err) {
      console.error('Error creating event:', err);
      setFormError(err.response?.data?.error?.message || err.message || 'Failed to create event');
    } finally {
      setFormLoading(false);
    }
  };

  // Preview calculations
  const parsedCap = parseInt(capacity, 10) || 0;
  const parsedMemPrice = parseFloat(memberPrice) || 0;
  const parsedNonMemPrice = parseFloat(nonMemberPrice) || 0;
  const previewGross = parsedCap * parsedMemPrice;
  const discountPercent =
    parsedNonMemPrice > 0 && parsedMemPrice < parsedNonMemPrice
      ? Math.round(((parsedNonMemPrice - parsedMemPrice) / parsedNonMemPrice) * 100)
      : 0;

  const formattedPreviewDate = startsAt
    ? new Date(startsAt).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Date & Time not configured yet';

  return (
    <div className="space-y-8 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP 3D EXECUTIVE METRIC CARDS                                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <ThreeDCard
          className="p-6 border-l-4 border-l-primary"
          accentGlow="rgba(95, 63, 86, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Programs
            </span>
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalEvents}
            </span>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-xs border border-slate-200">
              Active Catalog
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Scheduled campus sessions</span>
            <span className="w-2 h-2 rounded-full bg-primary" />
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-amber-500"
          accentGlow="rgba(217, 119, 6, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Seating Capacity
            </span>
            <div className="w-8 h-8 rounded-sm bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalCapacity}
            </span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-xs border border-amber-200">
              Total Seats
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>{totalSeatsRemaining} seats available</span>
            <span className="font-mono text-[11px] text-slate-400">Live Quota</span>
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-emerald-600"
          accentGlow="rgba(5, 150, 105, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Reserved Seats
            </span>
            <div className="w-8 h-8 rounded-sm bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalSeatsBooked}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-xs border border-emerald-200">
              {overallFillRate}% Filled
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Attendee confirmations</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-indigo-600"
          accentGlow="rgba(79, 70, 229, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Projected Gross
            </span>
            <div className="w-8 h-8 rounded-sm bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              ₹{projectedGross.toLocaleString()}
            </span>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-xs border border-indigo-200">
              Potential
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Ticket realization volume</span>
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
          </div>
        </ThreeDCard>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEARCH & ACTION HEADER                                                 */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 border border-border shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, venue, keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-primary focus:bg-white font-mono transition-colors"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Status:
          </span>
          {[
            { id: 'ALL', label: 'All Sessions' },
            { id: 'AVAILABLE', label: 'Available' },
            { id: 'ALMOST_FULL', label: 'Almost Full' },
            { id: 'SOLD_OUT', label: 'Sold Out' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id)}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                statusFilter === item.id
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Create Event Button */}
        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Event</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. EVENTS DIRECTORY TABLE                                                 */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="h-64 bg-white border border-border animate-pulse flex items-center justify-center">
          <div className="text-xs text-slate-400 font-mono">Loading event catalog...</div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 border border-border bg-white text-center text-xs text-slate-500 font-mono">
          No scheduled events matched your criteria. Click "Schedule New Event" to create one.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-border bg-white overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50/80 text-[10px] uppercase font-bold tracking-wider text-slate-600">
                <th className="p-3.5">Event Title & Venue</th>
                <th className="p-3.5">Event Manager</th>
                <th className="p-3.5">Scheduled Timeline</th>
                <th className="p-3.5">Capacity & Absorption</th>
                <th className="p-3.5">Seats Status</th>
                <th className="p-3.5">Member Price</th>
                <th className="p-3.5">Non-Member</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedEvents.map((ev) => {
                const dateStr = ev.starts_at
                  ? new Date(ev.starts_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'TBA';

                const cap = parseInt(ev.capacity, 10) || 0;
                const remaining = parseInt(ev.seats_remaining, 10) || 0;
                const booked = Math.max(0, cap - remaining);
                const pct = cap > 0 ? Math.round((booked / cap) * 100) : 0;

                return (
                  <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Event Title & Venue */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-sm bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">
                            {ev.title}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{ev.venue}</span>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Assigned Event Manager */}
                    <td className="p-3.5">
                      {ev.event_manager_name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-100 border border-purple-200 text-purple-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {ev.event_manager_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block text-xs leading-tight">
                              {ev.event_manager_name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {ev.event_manager_email || 'Assigned Manager'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Timeline */}
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">
                      <span className="block font-semibold text-slate-900">{dateStr}</span>
                      <span className="text-[10px] text-slate-400">Door sync active</span>
                    </td>

                    {/* Capacity & Progress */}
                    <td className="p-3.5">
                      <div className="space-y-1.5 min-w-[130px]">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-600">
                            <strong>{booked}</strong> / {cap} seats
                          </span>
                          <span className="font-bold text-emerald-700">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="h-full bg-emerald-600 transition-all duration-500"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Seats Status */}
                    <td className="p-3.5">
                      {remaining <= 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
                          Sold Out
                        </span>
                      ) : remaining <= 10 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                          {remaining} left
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {remaining} Available
                        </span>
                      )}
                    </td>

                    {/* Member Price */}
                    <td className="p-3.5 font-mono text-primary font-bold text-xs">
                      ₹{Number(ev.member_price).toFixed(2)}
                    </td>

                    {/* Non-Member Price */}
                    <td className="p-3.5 font-mono text-slate-600 text-xs">
                      ₹{Number(ev.non_member_price).toFixed(2)}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {ev.volunteers_enabled && (
                          <button
                            type="button"
                            onClick={() => handleOpenVolunteerModal(ev)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xs transition-colors cursor-pointer"
                            title="Manage volunteer applications"
                          >
                            <Users className="w-3.5 h-3.5 text-purple-600" />
                            <span>
                              Volunteers ({ev.volunteers_applied || 0}/{ev.volunteers_required})
                            </span>
                          </button>
                        )}
                        <a
                          href={`/events/${ev.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xs transition-colors"
                        >
                          <span>Public Page</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredEvents.length > pageSize && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(filteredEvents.length / pageSize)}
            totalItems={filteredEvents.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. REDESIGNED STATE-OF-THE-ART "SCHEDULE NEW EVENT" MODAL                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative bg-white border border-[#e2e8f0] shadow-[0_25px_60px_-15px_rgba(95,63,86,0.35),0_0_0_1px_rgba(255,255,255,0.8)] max-w-4xl w-full rounded-sm overflow-hidden my-8"
            >
              {/* 3D Specular Top Rim */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-xs border border-primary/20">
                        Event Operations
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Campus Programming Console
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                      Schedule New Event
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form & Live Preview Grid */}
              <form onSubmit={handleCreate}>
                <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 max-h-[75vh] overflow-y-auto">
                  {/* Left Column: Input Fields (Spans 7 cols) */}
                  <div className="lg:col-span-7 space-y-5 text-xs">
                    {formError && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 font-mono text-xs flex items-center gap-2 rounded-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{formError}</span>
                      </div>
                    )}

                    {/* Section 1: Event Essentials */}
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          <span>Event Essentials</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">Step 1 of 3</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                          Event Title *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Annual Tech Symposium 2026"
                            className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-medium rounded-xs outline-none transition-all shadow-2xs placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* Category Pills */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Event Category
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {['Technical', 'Workshop', 'Hackathon', 'Cultural', 'Networking'].map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setCategory(cat)}
                              className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border rounded-xs transition-colors cursor-pointer ${
                                category === cat
                                  ? 'bg-primary text-white border-primary shadow-xs'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                          Event Description
                        </label>
                        <textarea
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Outline agenda, keynote speakers, eligibility, and program highlights..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-sans rounded-xs outline-none transition-all shadow-2xs placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Section 2: Logistics & Schedule */}
                    <div className="space-y-3.5 pt-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          <span>Venue & Timing</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">Step 2 of 3</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                            Venue / Location *
                          </label>
                          <div className="relative">
                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              required
                              value={venue}
                              onChange={(e) => setVenue(e.target.value)}
                              placeholder="e.g. Main Auditorium"
                              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-medium rounded-xs outline-none transition-all shadow-2xs placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                            Starts At *
                          </label>
                          <div className="relative">
                            <input
                              type="datetime-local"
                              required
                              value={startsAt}
                              onChange={(e) => setStartsAt(e.target.value)}
                              className="w-full px-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-mono rounded-xs outline-none transition-all shadow-2xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                            Ends At (Optional)
                          </label>
                          <div className="relative">
                            <input
                              type="datetime-local"
                              value={endsAt}
                              onChange={(e) => setEndsAt(e.target.value)}
                              className="w-full px-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-mono rounded-xs outline-none transition-all shadow-2xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Ticketing & Pricing */}
                    <div className="space-y-3.5 pt-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5 text-primary" />
                          <span>Capacity & Pricing Economics</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">Step 3 of 4</span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                            Total Capacity *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              required
                              value={capacity}
                              onChange={(e) => setCapacity(e.target.value)}
                              className="w-full px-2 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary font-mono text-xs text-center text-slate-900 font-bold rounded-xs outline-none transition-all shadow-2xs"
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5 block text-center">
                            Attendee Seats
                          </span>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5">
                            Member Price (₹) *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={memberPrice}
                              onChange={(e) => setMemberPrice(e.target.value)}
                              className="w-full px-2 py-2.5 bg-primary/5 border border-primary/30 focus:border-primary font-mono text-xs text-center text-primary font-bold rounded-xs outline-none transition-all shadow-2xs"
                            />
                          </div>
                          <span className="text-[9px] text-primary font-mono mt-0.5 block text-center">
                            Active Pass Rate
                          </span>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                            Non-Member (₹) *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={nonMemberPrice}
                              onChange={(e) => setNonMemberPrice(e.target.value)}
                              className="w-full px-2 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary font-mono text-xs text-center text-slate-900 font-bold rounded-xs outline-none transition-all shadow-2xs"
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5 block text-center">
                            Public Pass Rate
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Volunteer Requirements */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-primary" />
                            <span>Do you need volunteers?</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Enable volunteer opportunity for this event
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-xs border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setVolunteersEnabled(false)}
                            className={`px-3 py-1 text-[11px] font-bold uppercase rounded-xs transition-colors cursor-pointer ${
                              !volunteersEnabled
                                ? 'bg-slate-800 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            NO
                          </button>
                          <button
                            type="button"
                            onClick={() => setVolunteersEnabled(true)}
                            className={`px-3 py-1 text-[11px] font-bold uppercase rounded-xs transition-colors cursor-pointer ${
                              volunteersEnabled
                                ? 'bg-primary text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            YES
                          </button>
                        </div>
                      </div>

                      {volunteersEnabled && (
                        <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-xs space-y-2 animate-in fade-in duration-150">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900">
                            Number of volunteers required *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            required={volunteersEnabled}
                            value={volunteersRequired}
                            onChange={(e) => setVolunteersRequired(e.target.value)}
                            placeholder="e.g. 5"
                            className="w-full px-3 py-2 bg-white border border-purple-200 focus:border-primary text-xs font-mono font-bold text-slate-900 rounded-xs outline-none shadow-2xs"
                          />
                          <p className="text-[10px] text-purple-700 font-mono">
                            Required: {volunteersRequired} &bull; Eligible volunteers will be able to apply from their dashboard.
                          </p>
                        </div>
                      )}

                      {/* Section 5: Event Manager Assignment */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-primary" />
                          <span>Assigned Event Manager</span>
                        </label>
                        <select
                          value={eventManagerId}
                          onChange={(e) => setEventManagerId(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-medium rounded-xs outline-none transition-all shadow-2xs"
                        >
                          <option value="">-- Unassigned / General Admin Management --</option>
                          {availableUsers
                            .filter((u) => u.role === 'event_manager' || u.role === 'admin')
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.email}) — [{u.role.toUpperCase()}]
                              </option>
                            ))}
                          {availableUsers.filter((u) => u.role !== 'event_manager' && u.role !== 'admin').length > 0 && (
                            <optgroup label="Other Members">
                              {availableUsers
                                .filter((u) => u.role !== 'event_manager' && u.role !== 'admin')
                                .map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} ({u.email})
                                  </option>
                                ))}
                            </optgroup>
                          )}
                        </select>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Assigned event manager can coordinate volunteer rosters, allocate operational tasks, and execute door scanning.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live 3D Event Pass & Projection Preview (Spans 5 cols) */}
                  <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5 text-primary" />
                          <span>Live Pass Preview</span>
                        </span>
                        <span className="text-[10px] font-mono uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-xs">
                          Real-time
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-4">
                        Preview of the verified digital pass generated for attendees upon booking.
                      </p>

                      {/* 3D Ticket Pass Mockup Card */}
                      <div
                        className="relative rounded-sm bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-5 shadow-xl border border-slate-700 overflow-hidden"
                        style={{
                          boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.4), 0 0 15px rgba(95, 63, 86, 0.25)',
                        }}
                      >
                        {/* Top Accent Light Bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-400 to-primary" />

                        {/* Pass Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-3">
                          <div>
                            <span className="text-[9px] uppercase font-mono tracking-widest text-primary-hover font-extrabold text-[#C4A6B8] block">
                              CampusCore Event Ticket
                            </span>
                            <span className="text-xs font-bold text-white tracking-wide">
                              {category} Series
                            </span>
                          </div>
                          <span className="text-[9px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xs uppercase">
                            VIP Pass
                          </span>
                        </div>

                        {/* Title & Venue */}
                        <div className="space-y-1.5 mb-4">
                          <h4 className="text-base font-extrabold text-white tracking-tight line-clamp-2">
                            {title || 'Annual Tech Symposium 2026'}
                          </h4>
                          <p className="text-[11px] text-slate-300 font-mono flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{venue || 'Main Campus Auditorium'}</span>
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{formattedPreviewDate}</span>
                          </p>
                        </div>

                        {/* Middle Perforated Divider */}
                        <div className="relative py-2 my-2 border-t border-dashed border-slate-700/80">
                          <div className="absolute -left-7 -top-2.5 w-5 h-5 rounded-full bg-white" />
                          <div className="absolute -right-7 -top-2.5 w-5 h-5 rounded-full bg-white" />
                        </div>

                        {/* Bottom Pass Details with QR simulation */}
                        <div className="flex items-center justify-between gap-3 pt-1">
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase text-slate-400 font-mono block">
                              Dual Pricing Structure
                            </span>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-emerald-400 font-bold text-xs">
                                M: ₹{parsedMemPrice.toFixed(0)}
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                NM: ₹{parsedNonMemPrice.toFixed(0)}
                              </span>
                            </div>
                            {discountPercent > 0 && (
                              <span className="text-[9px] font-bold text-amber-300 font-mono block">
                                {discountPercent}% Member Savings
                              </span>
                            )}
                          </div>

                          {/* QR Code box */}
                          <div className="w-14 h-14 bg-white p-1 rounded-xs flex flex-col items-center justify-center shrink-0 shadow-xs">
                            <QrCode className="w-12 h-12 text-slate-900" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Financial Projection Box */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xs space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Seating Quota:</span>
                        <strong className="text-slate-900">{parsedCap} Seats</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Projected Gross:</span>
                        <strong className="text-emerald-700">₹{previewGross.toLocaleString()}</strong>
                      </div>
                      <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                        Door scan & QR validation automatically configured on publish.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="p-4 sm:p-6 bg-slate-50/90 border-t border-border flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={formLoading}
                    className="px-5 py-2.5 border border-border bg-white hover:bg-slate-100 text-slate-700 font-bold uppercase text-[11px] tracking-wider rounded-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold uppercase text-[11px] tracking-wider rounded-xs transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {formLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Publishing Event...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Publish & Activate Event</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. VOLUNTEER ROSTER MODAL                                                  */}
      {/* ========================================================================= */}
      {volunteerModal.open && volunteerModal.event && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-sans">
                    Volunteer Roster: {volunteerModal.event.title}
                  </h3>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs font-mono text-slate-600">
                  <span>Required: <strong className="text-slate-900">{volunteerModal.event.volunteers_required}</strong></span>
                  <span>&bull;</span>
                  <span>Active Applications: <strong className="text-purple-700">{volunteerModal.volunteers.filter(v => v.status === 'pending' || v.status === 'approved').length}</strong></span>
                  <span>&bull;</span>
                  <span>Remaining Slots: <strong className="text-emerald-700">{Math.max(0, volunteerModal.event.volunteers_required - volunteerModal.volunteers.filter(v => v.status === 'pending' || v.status === 'approved').length)}</strong></span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVolunteerModal({ open: false, event: null, volunteers: [], loading: false, error: null, actionLoadingId: null })}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Direct Volunteer Add Section (Admin/Manager) */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-lg">
                <form onSubmit={handleAddVolunteerDirectly} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1 flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5 text-purple-700" />
                      <span>Directly Add / Assign Volunteer</span>
                    </label>
                    <select
                      value={addVolunteerUserId}
                      onChange={(e) => setAddVolunteerUserId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-purple-200 text-xs text-slate-900 rounded-xs focus:outline-none focus:border-purple-600"
                    >
                      <option value="">-- Select Member / Volunteer to Assign --</option>
                      {availableUsers
                        .filter(u => !volunteerModal.volunteers.some(v => v.user_id === u.id && (v.status === 'approved' || v.status === 'pending')))
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email}) — [{u.role.toUpperCase()}]
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="self-end sm:self-auto sm:mt-4">
                    <button
                      type="submit"
                      disabled={!addVolunteerUserId || addingVolunteer}
                      className="w-full sm:w-auto px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {addingVolunteer ? 'Assigning...' : '+ Add Volunteer'}
                    </button>
                  </div>
                </form>
                {addVolunteerSuccess && (
                  <div className="mt-2 text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{addVolunteerSuccess}</span>
                  </div>
                )}
              </div>

              {volunteerModal.loading ? (
                <div className="p-12 text-center text-xs text-slate-400 font-mono">
                  Loading volunteer roster...
                </div>
              ) : volunteerModal.volunteers.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 font-mono bg-slate-50 border border-slate-200 rounded-lg">
                  No volunteer applications received for this event yet. Use the tool above to directly add volunteers.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase font-bold tracking-wider text-slate-600 border-b border-slate-200">
                        <th className="p-3">Volunteer</th>
                        <th className="p-3">Applied Date</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {volunteerModal.volunteers.map((app) => {
                        const appliedDate = app.applied_at
                          ? new Date(app.applied_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—';

                        return (
                          <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3">
                              <span className="font-bold text-slate-900 block text-xs">
                                {app.user_name || 'Volunteer User'}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {app.user_email}
                              </span>
                            </td>
                            <td className="p-3 text-[11px] font-mono text-slate-600">
                              {appliedDate}
                            </td>
                            <td className="p-3">
                              {app.status === 'approved' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Approved
                                </span>
                              )}
                              {app.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                  Pending Review
                                </span>
                              )}
                              {app.status === 'rejected' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                  Rejected
                                </span>
                              )}
                              {app.status === 'removed' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                                  Removed
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {app.status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={volunteerModal.actionLoadingId === app.id}
                                      onClick={() => handleUpdateVolunteerStatus(app.id, 'approved')}
                                      className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-xs transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      disabled={volunteerModal.actionLoadingId === app.id}
                                      onClick={() => handleUpdateVolunteerStatus(app.id, 'rejected')}
                                      className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xs transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {(app.status === 'pending' || app.status === 'approved') && (
                                  <button
                                    type="button"
                                    onClick={() => setRemoveConfirm({ open: true, application: app, loading: false })}
                                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xs transition-colors cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setVolunteerModal({ open: false, event: null, volunteers: [], loading: false, error: null, actionLoadingId: null })}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. VOLUNTEER REMOVAL CONFIRMATION MODAL                                    */}
      {/* ========================================================================= */}
      {removeConfirm.open && removeConfirm.application && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-sans">
                  Remove Volunteer?
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {removeConfirm.application.user_name} &bull; {volunteerModal.event?.title}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-lg border border-slate-200 leading-relaxed">
              <p className="font-semibold text-slate-900">
                Remove {removeConfirm.application.user_name} from {volunteerModal.event?.title} volunteer list?
              </p>
              <p>
                The volunteer will be marked as <strong>REMOVED</strong> and will no longer occupy an active slot. This will immediately free up 1 volunteer slot for other eligible volunteers to apply.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={removeConfirm.loading}
                onClick={() => setRemoveConfirm({ open: false, application: null, loading: false })}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removeConfirm.loading}
                onClick={handleConfirmRemoveVolunteer}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {removeConfirm.loading ? 'Removing...' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEventManagement;
