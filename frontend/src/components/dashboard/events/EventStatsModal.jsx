// frontend/src/components/dashboard/events/EventStatsModal.jsx
import React, { useState, useEffect } from 'react';
import { ActionButton } from '../ActionButton';
import { StatusBadge } from '../StatusBadge';
import api from '../../../services/api';
import { X, Users, QrCode, DollarSign, Calendar, MapPin, CheckCircle2 } from 'lucide-react';

export const EventStatsModal = ({ event, isOpen, onClose }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !event?.id) return;

    let mounted = true;
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/events/${event.id}/stats`);
        if (mounted) {
          setStats(res.data || res);
        }
      } catch (err) {
        console.error('Failed to load event stats:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStats();
    return () => {
      mounted = false;
    };
  }, [isOpen, event?.id]);

  if (!isOpen || !event) return null;

  const capacity = Number(event.capacity) || 100;
  const ticketsSold = stats?.total_tickets !== undefined ? Number(stats.total_tickets) : (capacity - (event.remaining_seats ?? capacity));
  const checkedIn = stats?.checked_in_count !== undefined ? Number(stats.checked_in_count) : 0;
  const revenue = stats?.total_revenue !== undefined ? parseFloat(stats.total_revenue) : 0;
  const attendanceRate = ticketsSold > 0 ? Math.round((checkedIn / ticketsSold) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl border border-border bg-white shadow-xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge variant="neutral" size="sm">
                Event Statistics
              </StatusBadge>
            </div>
            <h2 className="font-serif font-bold text-xl text-slate-900">
              {event.title}
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{event.venue || 'Campus Auditorium'}</span>
              <span>•</span>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{new Date(event.starts_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center font-mono text-xs text-slate-500">
              Loading live event metrics...
            </div>
          ) : (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 border border-border bg-slate-50">
                  <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] uppercase mb-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>Tickets Sold</span>
                  </div>
                  <div className="font-mono text-xl font-bold text-slate-900">
                    {ticketsSold} / {capacity}
                  </div>
                </div>

                <div className="p-4 border border-border bg-slate-50">
                  <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] uppercase mb-1">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Checked In</span>
                  </div>
                  <div className="font-mono text-xl font-bold text-emerald-700">
                    {checkedIn}
                  </div>
                </div>

                <div className="p-4 border border-border bg-slate-50">
                  <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] uppercase mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Turnout Rate</span>
                  </div>
                  <div className="font-mono text-xl font-bold text-slate-900">
                    {attendanceRate}%
                  </div>
                </div>

                <div className="p-4 border border-border bg-slate-50">
                  <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] uppercase mb-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Total Revenue</span>
                  </div>
                  <div className="font-mono text-xl font-bold text-primary">
                    ₹{revenue.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Attendance Progress Bar */}
              <div className="p-4 border border-border bg-white space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-600">Door Turnout ({checkedIn} of {ticketsSold} ticket holders)</span>
                  <span className="font-bold text-slate-900">{attendanceRate}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 overflow-hidden rounded-xs border border-border/60">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-500"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-slate-50 flex justify-end">
          <ActionButton variant="primary" onClick={onClose}>
            Close
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default EventStatsModal;
