// frontend/src/pages/dashboard/EventManagerDashboard.jsx
import React, { useState, useEffect } from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardStat from '../../components/dashboard/DashboardStat';
import DashboardSection from '../../components/dashboard/DashboardSection';
import DoorCheckInStation from '../../components/dashboard/checkin/DoorCheckInStation';
import eventsService from '../../services/events.service';
import { Calendar, QrCode, Users, CheckCircle2 } from 'lucide-react';

/**
 * EventManagerDashboard Page
 * Event-scoped operational workspace for assigned events and door check-in.
 */
export const EventManagerDashboard = () => {
  const [assignedEvent, setAssignedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEventData = async () => {
      try {
        const events = await eventsService.getEvents();
        if (Array.isArray(events) && events.length > 0) {
          setAssignedEvent(events[0]);
        }
      } catch (err) {
        console.error('Failed to load assigned event:', err);
      } finally {
        setLoading(false);
      }
    };
    loadEventData();
  }, []);

  const totalSeats = assignedEvent ? Number(assignedEvent.capacity || 100) : 100;
  const remainingSeats = assignedEvent ? Number(assignedEvent.seats_remaining || 0) : 98;
  const bookedSeats = Math.max(0, totalSeats - remainingSeats);

  return (
    <DashboardShell activeRole="event_manager">
      <DashboardHeader
        title="Event Operations Console"
        subtitle="Manage assigned events, allocate volunteers, track capacity, and operate door check-in station."
        badge="Event-Scoped Authority"
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <DashboardStat
          label="Assigned Event"
          value={assignedEvent?.title || 'Spring Gala'}
          change={assignedEvent?.starts_at ? new Date(assignedEvent.starts_at).toLocaleDateString() : 'Active Schedule'}
          icon={Calendar}
        />
        <DashboardStat
          label="Seats Remaining"
          value={`${remainingSeats} / ${totalSeats}`}
          change={`${bookedSeats} booked`}
          icon={Users}
        />
        <DashboardStat
          label="Check-In Station"
          value="Operational"
          change="Real-time HMAC & fallback code"
          icon={QrCode}
        />
        <DashboardStat
          label="Assigned Volunteers"
          value="4 Active"
          change="Station staff ready"
          icon={CheckCircle2}
        />
      </div>

      {/* Primary Section: Interactive Door Check-In Station */}
      <div className="space-y-8">
        <DoorCheckInStation defaultEventId={assignedEvent?.id} />

        {/* Secondary: Volunteer Assignments */}
        <DashboardSection
          title="Assigned Event Volunteers"
          subtitle="Volunteer roster assisting with door verification and attendee intake"
        >
          <div className="border border-border bg-white p-4 overflow-x-auto shadow-2xs font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3 text-slate-500 font-bold uppercase text-[10px]">
              <span>Volunteer Name</span>
              <span>Role / Station</span>
              <span>Contact</span>
              <span className="text-right">Shift Status</span>
            </div>
            <div className="space-y-2.5">
              {[
                { name: 'Vik Volunteer', station: 'Station Gate A (Fallback Search)', email: 'vik@odoo-ldce.org', status: 'On Shift' },
                { name: 'Alex Scanner', station: 'Station Gate B (QR Scans)', email: 'alex@example.com', status: 'On Shift' },
                { name: 'Sam Queue', station: 'Line Management & Verification', email: 'sam@example.com', status: 'Standby' },
              ].map((vol, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                  <span className="font-bold text-slate-900">{vol.name}</span>
                  <span className="text-slate-600">{vol.station}</span>
                  <span className="text-primary">{vol.email}</span>
                  <span className="text-right text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200">
                    {vol.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DashboardSection>
      </div>
    </DashboardShell>
  );
};

export default EventManagerDashboard;
