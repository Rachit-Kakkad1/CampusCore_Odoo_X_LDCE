// frontend/src/pages/dashboard/EventManagerDashboard.jsx
import React from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardStat from '../../components/dashboard/DashboardStat';
import DashboardSection from '../../components/dashboard/DashboardSection';
import { Calendar, QrCode, Users, CheckCircle2 } from 'lucide-react';

/**
 * EventManagerDashboard Page Skeleton
 * Event-scoped operational workspace for assigned events and door check-in.
 */
export const EventManagerDashboard = () => {
  return (
    <DashboardShell activeRole="event_manager">
      <DashboardHeader
        title="Event Operations"
        subtitle="Manage assigned events, allocate volunteers, track capacity, and operate door check-in."
        badge="Event-Scoped Authority"
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <DashboardStat label="Assigned Event" value="Spring Gala" change="Starts Nov 15, 2026" icon={Calendar} />
        <DashboardStat label="Seats Remaining" value="98 / 100" change="Capacity status" icon={Users} />
        <DashboardStat label="Checked In" value="0" change="Live attendance" icon={QrCode} />
        <DashboardStat label="Assigned Volunteers" value="2" change="Ready for operational tasks" icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DashboardSection
          title="Door Check-in Station"
          subtitle="Signed QR scanner and manual ticket code validation"
        >
          <div className="p-6 border border-border bg-hover font-mono text-xs text-muted">
            Check-in station scanner integration ready.
          </div>
        </DashboardSection>

        <DashboardSection
          title="Assigned Volunteers"
          subtitle="Volunteers assigned to this specific event"
        >
          <div className="p-6 border border-border bg-hover font-mono text-xs text-muted">
            Volunteer assignment manager ready.
          </div>
        </DashboardSection>
      </div>
    </DashboardShell>
  );
};

export default EventManagerDashboard;
