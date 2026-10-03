// frontend/src/components/dashboard/admin/AdminOverview.jsx
import React from 'react';
import { DashboardStat } from '../DashboardStat';
import { DashboardSection } from '../DashboardSection';
import { StatusBadge } from '../StatusBadge';
import { ActionButton } from '../ActionButton';
import {
  Users,
  Calendar,
  ShoppingBag,
  TrendingUp,
  Megaphone,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const AdminOverview = ({
  members = [],
  events = [],
  products = [],
  orders = [],
  fundraisers = [],
  announcements = [],
  loading = false,
  onNavigateTab,
}) => {
  const activeMembersCount = members.filter(
    (m) => (m.computed_status || m.status || '').toLowerCase() === 'active'
  ).length;
  const pendingMembersCount = members.filter(
    (m) => (m.computed_status || m.status || '').toLowerCase() === 'pending'
  ).length;

  const totalCapacity = events.reduce((acc, ev) => acc + (parseInt(ev.capacity, 10) || 0), 0);
  const totalSeatsRemaining = events.reduce((acc, ev) => acc + (parseInt(ev.seats_remaining, 10) || 0), 0);

  const totalFundraised = fundraisers.reduce(
    (acc, f) => acc + (parseFloat(f.total_raised) || 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Top Statistical Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStat
          label="Total Members"
          value={String(members.length)}
          change={`${activeMembersCount} Active · ${pendingMembersCount} Pending`}
          icon={Users}
        />
        <DashboardStat
          label="Scheduled Events"
          value={String(events.length)}
          change={`${totalSeatsRemaining} / ${totalCapacity} Seats Left`}
          icon={Calendar}
        />
        <DashboardStat
          label="Store Products"
          value={String(products.length)}
          change={`${orders.length} total orders placed`}
          icon={ShoppingBag}
        />
        <DashboardStat
          label="Fundraisers Active"
          value={String(fundraisers.length)}
          change={`₹${totalFundraised.toFixed(2)} raised`}
          icon={TrendingUp}
        />
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="border border-[#e5e4de] bg-[#f7f6f2] p-5">
        <span className="font-mono text-xs uppercase tracking-wider text-[#5F3F56] font-semibold block mb-3">
          Quick Management Workspaces
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigateTab?.('members')}
            className="p-3 border border-[#e5e4de] bg-white text-left font-mono text-xs hover:border-[#5F3F56] transition-colors flex flex-col justify-between h-20"
          >
            <span className="text-[#1c1c1c]/50 text-[10px] uppercase">Directory</span>
            <span className="font-bold text-[#1c1c1c]">Manage Members</span>
          </button>
          <button
            onClick={() => onNavigateTab?.('events')}
            className="p-3 border border-[#e5e4de] bg-white text-left font-mono text-xs hover:border-[#5F3F56] transition-colors flex flex-col justify-between h-20"
          >
            <span className="text-[#1c1c1c]/50 text-[10px] uppercase">Schedule</span>
            <span className="font-bold text-[#1c1c1c]">Manage Events</span>
          </button>
          <button
            onClick={() => onNavigateTab?.('merchandise')}
            className="p-3 border border-[#e5e4de] bg-white text-left font-mono text-xs hover:border-[#5F3F56] transition-colors flex flex-col justify-between h-20"
          >
            <span className="text-[#1c1c1c]/50 text-[10px] uppercase">Store</span>
            <span className="font-bold text-[#1c1c1c]">Catalog & Stock</span>
          </button>
          <button
            onClick={() => onNavigateTab?.('fundraisers')}
            className="p-3 border border-[#e5e4de] bg-white text-left font-mono text-xs hover:border-[#5F3F56] transition-colors flex flex-col justify-between h-20"
          >
            <span className="text-[#1c1c1c]/50 text-[10px] uppercase">Projects</span>
            <span className="font-bold text-[#1c1c1c]">Fundraisers</span>
          </button>
          <button
            onClick={() => onNavigateTab?.('announcements')}
            className="p-3 border border-[#e5e4de] bg-white text-left font-mono text-xs hover:border-[#5F3F56] transition-colors flex flex-col justify-between h-20"
          >
            <span className="text-[#1c1c1c]/50 text-[10px] uppercase">Broadcast</span>
            <span className="font-bold text-[#1c1c1c]">Announcements</span>
          </button>
        </div>
      </div>

      {/* Split Grid: Recent Members & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Members Section */}
        <DashboardSection
          title="Organization Member Records"
          subtitle="Real-time membership roster with verified dues and computed status"
        >
          {members.length === 0 ? (
            <div className="p-6 border border-[#e5e4de] text-center font-mono text-xs text-[#1c1c1c]/60">
              No registered members found.
            </div>
          ) : (
            <div className="space-y-3">
              {members.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-[#f7f6f2] border border-[#e5e4de] flex items-center justify-between font-mono text-xs"
                >
                  <div>
                    <span className="font-bold text-[#1c1c1c] block">
                      {m.user_name || `User #${m.user_id}`}
                    </span>
                    <span className="text-[11px] text-[#1c1c1c]/60">
                      {m.member_code} · {m.user_email || 'no-email'}
                    </span>
                  </div>
                  <StatusBadge status={m.computed_status || m.status} />
                </div>
              ))}
            </div>
          )}
        </DashboardSection>

        {/* Scheduled Events Section */}
        <DashboardSection
          title="Campus Event Schedule"
          subtitle="Active flagship gatherings, workshops, and attendee seats"
        >
          {events.length === 0 ? (
            <div className="p-6 border border-[#e5e4de] text-center font-mono text-xs text-[#1c1c1c]/60">
              No events scheduled yet.
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 4).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 bg-[#f7f6f2] border border-[#e5e4de] flex items-center justify-between font-mono text-xs"
                >
                  <div>
                    <span className="font-bold text-[#1c1c1c] block">
                      {ev.title}
                    </span>
                    <span className="text-[11px] text-[#1c1c1c]/60">
                      {ev.venue} · {ev.seats_remaining} seats remaining
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#5F3F56] font-semibold block">
                      M: ₹{Number(ev.member_price).toFixed(2)}
                    </span>
                    <span className="text-[#1c1c1c]/50 text-[10px] block">
                      NM: ₹{Number(ev.non_member_price).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardSection>
      </div>
    </div>
  );
};

export default AdminOverview;
