// frontend/src/components/dashboard/events/EventListTable.jsx
import React from 'react';
import { StatusBadge } from '../StatusBadge';
import { ActionButton } from '../ActionButton';
import { DashboardEmptyState } from '../DashboardEmptyState';
import { Calendar, MapPin, Users, Tag, BarChart3, Clock, CheckCircle2 } from 'lucide-react';

export const EventListTable = ({
  events = [],
  onViewStats,
  onOpenCheckIn,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="p-8 border border-border bg-white text-center font-mono text-xs text-slate-500">
        Loading organization events...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <DashboardEmptyState
        title="No Events Found"
        description="No events are currently scheduled. Use the button above to create the first event."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((event) => {
          const startsAt = new Date(event.starts_at);
          const isUpcoming = startsAt > new Date();
          const capacity = Number(event.capacity) || 100;
          const remaining = event.remaining_seats !== undefined ? Number(event.remaining_seats) : capacity;
          const ticketsSold = capacity - remaining;
          const fillPercent = Math.min(100, Math.round((ticketsSold / capacity) * 100));

          return (
            <div
              key={event.id}
              className="p-6 border border-border bg-white shadow-xs hover:border-slate-400 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-slate-900 leading-tight">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-mono">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{event.venue || 'Campus Auditorium'}</span>
                    </div>
                  </div>
                  <StatusBadge
                    variant={isUpcoming ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {isUpcoming ? 'UPCOMING' : 'COMPLETED'}
                  </StatusBadge>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 font-sans">
                  {event.description || 'Official campus community gathering and program.'}
                </p>

                {/* Event Schedule Info */}
                <div className="p-3 border border-border/80 bg-slate-50/70 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{startsAt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="text-right text-slate-600">
                    {startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Pricing Badges */}
                <div className="flex items-center justify-between font-mono text-xs pt-1">
                  <div className="flex items-center gap-1.5 text-primary font-bold">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Member: ₹{parseFloat(event.member_price || 0).toFixed(2)}</span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Guest: ₹{parseFloat(event.non_member_price || 0).toFixed(2)}
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">Reserved Seats</span>
                    <span className="font-bold text-slate-900">
                      {ticketsSold} / {capacity} ({fillPercent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 overflow-hidden rounded-xs border border-border/50">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-5 mt-4 border-t border-border">
                <ActionButton
                  variant="outline"
                  size="sm"
                  onClick={() => onViewStats?.(event)}
                  className="flex-1 justify-center text-xs"
                >
                  <BarChart3 className="w-3.5 h-3.5 mr-1" />
                  Stats & Roster
                </ActionButton>
                <ActionButton
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenCheckIn?.(event)}
                  className="flex-1 justify-center text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Door Check-in
                </ActionButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventListTable;
