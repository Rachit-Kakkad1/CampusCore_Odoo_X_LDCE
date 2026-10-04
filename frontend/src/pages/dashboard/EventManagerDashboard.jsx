// frontend/src/pages/dashboard/EventManagerDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardPageHeader from '../../components/dashboard/DashboardPageHeader';
import DashboardStat from '../../components/dashboard/DashboardStat';
import PageTabs from '../../components/dashboard/PageTabs';
import {
  EventListTable,
  EventCreateModal,
  EventDoorCheckIn,
  EventStatsModal,
  EventManagerVolunteers,
  EventManagerTasks,
} from '../../components/dashboard/events';
import eventsService from '../../services/events.service';
import { Calendar, QrCode, Users, Ticket, CheckSquare, UserPlus } from 'lucide-react';

export const EventManagerDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Route-aware active tab: 'events' | 'volunteers' | 'tasks' | 'checkin'
  const getInitialTab = () => {
    if (location.pathname.includes('/checkin')) return 'checkin';
    if (location.pathname.includes('/volunteers')) return 'volunteers';
    if (location.pathname.includes('/tasks')) return 'tasks';
    return 'events';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname]);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statsEvent, setStatsEvent] = useState(null);
  const [checkInEvent, setCheckInEvent] = useState(null);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await eventsService.getEvents();
      const list = res?.events || res?.data || res || [];
      setEvents(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError(err.message || 'Unable to load events list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'events') {
      navigate('/dashboard/events');
    } else {
      navigate(`/dashboard/events/${tabId}`);
    }
  };


  const handleOpenCheckIn = (event) => {
    setCheckInEvent(event);
    setActiveTab('checkin');
    navigate('/dashboard/events/checkin');
  };

  // Aggregated calculations
  const totalEvents = events.length;
  const totalCapacity = events.reduce((acc, ev) => acc + (Number(ev.capacity) || 0), 0);
  const totalRemaining = events.reduce((acc, ev) => acc + (Number(ev.remaining_seats ?? ev.capacity) || 0), 0);
  const totalReserved = Math.max(0, totalCapacity - totalRemaining);

  const tabs = [
    { id: 'events', label: `Assigned Events (${totalEvents})` },
    { id: 'volunteers', label: 'Volunteer Rosters' },
    { id: 'tasks', label: 'Task Delegation' },
    { id: 'checkin', label: 'Door Check-in Station' },
  ];

  return (
    <DashboardShell activeRole="event_manager">
      <DashboardPageHeader
        title="Event Operations Console"
        subtitle="Manage assigned events, direct volunteer rosters, delegate operational tasks, and operate door check-in."
        badge="Event-Scoped Operations"
        actionLabel="+ Create New Event"
        onAction={() => setShowCreateModal(true)}
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <DashboardStat
          label="Assigned Events"
          value={totalEvents}
          change={`${totalEvents} active program${totalEvents === 1 ? '' : 's'}`}
          icon={Calendar}
        />
        <DashboardStat
          label="Total Capacity"
          value={totalCapacity}
          change="Available across venues"
          icon={Users}
        />
        <DashboardStat
          label="Tickets Reserved"
          value={totalReserved}
          change={`${totalRemaining} seats remaining`}
          icon={Ticket}
        />
        <DashboardStat
          label="Door Check-In"
          value="Online"
          change="Scanner & HMAC validator ready"
          icon={QrCode}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8">
        <PageTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {/* Main Tab Views */}
      {activeTab === 'events' && (
        <EventListTable
          events={events}
          loading={loading}
          onViewStats={(ev) => setStatsEvent(ev)}
          onOpenCheckIn={handleOpenCheckIn}
        />
      )}

      {activeTab === 'volunteers' && (
        <EventManagerVolunteers
          events={events}
        />
      )}

      {activeTab === 'tasks' && (
        <EventManagerTasks
          events={events}
        />
      )}

      {activeTab === 'checkin' && (
        <EventDoorCheckIn
          events={events}
          initialEventId={checkInEvent?.id || null}
        />
      )}

      {/* Create Event Modal */}
      <EventCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => loadEvents()}
      />

      {/* Event Stats Inspection Modal */}
      {statsEvent && (
        <EventStatsModal
          event={statsEvent}
          isOpen={Boolean(statsEvent)}
          onClose={() => setStatsEvent(null)}
        />
      )}
    </DashboardShell>
  );
};

export default EventManagerDashboard;
