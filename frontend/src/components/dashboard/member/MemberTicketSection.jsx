// frontend/src/components/dashboard/member/MemberTicketSection.jsx
import React from 'react';
import { DashboardSection } from '../DashboardSection';
import { DashboardEmptyState } from '../DashboardEmptyState';
import { StatusBadge } from '../StatusBadge';

export const MemberTicketSection = ({ tickets = [], loading = false }) => {
  if (loading) {
    return (
      <DashboardSection
        title="My Event Tickets"
        subtitle="Active reservations and passes for scheduled organization gatherings"
      >
        <div className="h-32 bg-[#f7f6f2] border border-[#e5e4de] animate-pulse"></div>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      title="My Event Tickets"
      subtitle="Active reservations and passes for scheduled organization gatherings"
    >
      {tickets.length === 0 ? (
        <DashboardEmptyState
          title="No Tickets Found"
          description="You have not booked any event tickets yet. Explore upcoming organization events above to reserve your seat."
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const price = Number(t.price || 0).toFixed(2);
            const eventDate = t.event_starts_at
              ? new Date(t.event_starts_at).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'TBA';

            return (
              <div
                key={t.id}
                className="bg-[#f7f6f2] border border-[#e5e4de] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#5F3F56] tracking-wider">
                      {t.ticket_code}
                    </span>
                    <StatusBadge status={t.payment_status || 'paid'} />
                    {t.checked_in_at && (
                      <span className="font-mono text-[10px] uppercase bg-green-100 text-green-800 px-2 py-0.5 border border-green-200">
                        Checked In
                      </span>
                    )}
                  </div>

                  <h4 className="font-serif text-lg text-[#1c1c1c] tracking-tight">
                    {t.event_title || 'Campus Event'}
                  </h4>

                  <div className="font-mono text-xs text-[#1c1c1c]/60 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Venue: {t.event_venue || 'Main Campus'}</span>
                    <span>Date: {eventDate}</span>
                  </div>
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[#e5e4de]">
                  <span className="font-mono text-[10px] uppercase text-[#1c1c1c]/50 block">
                    Tier: {t.price_type || 'standard'}
                  </span>
                  <span className="font-mono text-base font-bold text-[#1c1c1c] block">
                    ₹{price}
                  </span>
                  <span className="font-mono text-[10px] text-green-700 block">
                    Digital Pass Ready
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardSection>
  );
};

export default MemberTicketSection;
