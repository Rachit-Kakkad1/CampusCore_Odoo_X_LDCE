// frontend/src/components/dashboard/member/MemberEventSection.jsx
import React, { useState } from 'react';
import { DashboardSection } from '../DashboardSection';
import { DashboardEmptyState } from '../DashboardEmptyState';
import { ActionButton } from '../ActionButton';
import Pagination from '../../common/Pagination';

export const MemberEventSection = ({
  events = [],
  isActiveMember = false,
  loading = false,
  onRegisterEvent,
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);
  if (loading) {
    return (
      <DashboardSection
        title="Upcoming Organization Events"
        subtitle="Exclusive member-tiered campus gatherings, galas & workshops"
      >
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 bg-[#f7f6f2] border border-[#e5e4de] animate-pulse"></div>
          ))}
        </div>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      title="Upcoming Organization Events"
      subtitle="Exclusive member-tiered campus gatherings, galas & workshops"
    >
      {events.length === 0 ? (
        <DashboardEmptyState
          title="No Upcoming Events"
          description="There are currently no scheduled events. Please check back later for announcements."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.slice((page - 1) * pageSize, page * pageSize).map((event) => {
            const memberPrice = Number(event.member_price || 0).toFixed(2);
            const nonMemberPrice = Number(event.non_member_price || 0).toFixed(2);
            const savings = (Number(event.non_member_price || 0) - Number(event.member_price || 0)).toFixed(2);
            const eventDate = event.starts_at
              ? new Date(event.starts_at).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'TBA';

            const isPast = Boolean(event.starts_at && new Date(event.starts_at) < new Date());
            const seatsRemaining = Number(event.seats_remaining || 0);
            const isSoldOut = !isPast && seatsRemaining <= 0;

            return (
              <div
                key={event.id}
                className={`bg-[#f7f6f2] border border-[#e5e4de] p-5 flex flex-col justify-between transition-colors ${
                  isPast ? 'opacity-85' : 'hover:border-[#5F3F56]/40'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`font-mono text-[11px] uppercase tracking-wider font-semibold ${
                      isPast ? 'text-gray-600' : 'text-[#5F3F56]'
                    }`}>
                      {isPast ? 'Session Concluded' : isSoldOut ? 'Sold Out' : `${seatsRemaining} seats remaining / ${event.capacity} total`}
                    </span>
                  </div>

                  <h3 className="font-serif text-xl text-[#1c1c1c] tracking-tight mb-2">
                    {event.title}
                  </h3>

                  <p className="font-sans text-xs text-[#1c1c1c]/70 line-clamp-2 mb-4 leading-relaxed">
                    {event.description || 'Join fellow students for this official organization event.'}
                  </p>

                  <div className="space-y-1.5 py-3 border-y border-[#e5e4de] font-mono text-xs text-[#1c1c1c]/80 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[#1c1c1c]/50">Venue:</span>
                      <span className="font-medium text-[#1c1c1c]">{event.venue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#1c1c1c]/50">Date:</span>
                      <span className="font-medium text-[#1c1c1c]">{eventDate}</span>
                    </div>
                  </div>
                </div>

                {/* Pricing & CTA */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    {isActiveMember ? (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-lg font-bold text-[#5F3F56]">
                            ₹{memberPrice}
                          </span>
                          <span className="font-mono text-xs line-through text-[#1c1c1c]/40">
                            ₹{nonMemberPrice}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] uppercase text-[#5F3F56] font-semibold">
                          Member Price (Saved ₹{savings})
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-lg font-bold text-[#1c1c1c]">
                            ₹{nonMemberPrice}
                          </span>
                          <span className="font-mono text-xs text-[#5F3F56]">
                            (Member: ₹{memberPrice})
                          </span>
                        </div>
                        <span className="font-mono text-[10px] uppercase text-[#1c1c1c]/50">
                          Standard Non-Member Rate
                        </span>
                      </div>
                    )}
                  </div>

                  <ActionButton
                    variant={isPast ? 'secondary' : isActiveMember ? 'primary' : 'secondary'}
                    size="sm"
                    disabled={isPast || isSoldOut}
                    onClick={() => !isPast && onRegisterEvent?.(event)}
                  >
                    {isPast ? 'Event Concluded' : isSoldOut ? 'Sold Out' : 'View Details'}
                  </ActionButton>
                </div>
              </div>
            );
          })}
          </div>

          {events.length > pageSize && (
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(events.length / pageSize)}
              totalItems={events.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              pageSizeOptions={[4, 8, 16]}
            />
          )}
        </div>
      )}
    </DashboardSection>
  );
};

export default MemberEventSection;
