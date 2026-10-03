// frontend/src/components/dashboard/member/MemberDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  MemberMembershipCard,
  MemberPassCard,
  MemberEventSection,
  MemberTicketSection,
  MemberOrderSection,
  MemberAnnouncementSection,
} from './index';
import { DashboardStat } from '../DashboardStat';
import { DashboardLoadingState } from '../DashboardLoadingState';
import { DashboardErrorState } from '../DashboardErrorState';
import { CreditCard, Ticket, ShoppingBag, Bell } from 'lucide-react';
import membershipService from '../../../services/membership.service';
import eventsService from '../../../services/events.service';
import merchandiseService from '../../../services/merchandise.service';
import announcementsService from '../../../services/announcements.service';
import authService from '../../../services/auth.service';

export const MemberDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Dynamic Data States
  const [membershipData, setMembershipData] = useState(null);
  const [passData, setPassData] = useState(null);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const user = authService.getStoredUser();

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Concurrent fetch using actual backend endpoints
      const [
        membershipRes,
        passRes,
        eventsRes,
        ticketsRes,
        ordersRes,
        announcementsRes,
      ] = await Promise.allSettled([
        membershipService.getMembership(),
        membershipService.getMemberPass(),
        eventsService.getEvents(),
        eventsService.getMyTickets(),
        merchandiseService.getMyOrders(),
        announcementsService.getAnnouncements(),
      ]);

      // Set Membership
      if (membershipRes.status === 'fulfilled' && membershipRes.value) {
        const m = membershipRes.value.data?.membership || membershipRes.value.membership || membershipRes.value;
        const computedStatus = membershipRes.value.data?.computed_status || membershipRes.value.computed_status;
        setMembershipData(m ? { ...m, computed_status: computedStatus || m.status } : null);
      }

      // Set Pass
      if (passRes.status === 'fulfilled' && passRes.value) {
        const p = passRes.value.data || passRes.value;
        setPassData(p);
      }

      // Set Events
      if (eventsRes.status === 'fulfilled' && eventsRes.value) {
        const evList = eventsRes.value.data || eventsRes.value || [];
        setEvents(Array.isArray(evList) ? evList : []);
      }

      // Set Tickets
      if (ticketsRes.status === 'fulfilled' && ticketsRes.value) {
        const tkList = ticketsRes.value.data || ticketsRes.value || [];
        setTickets(Array.isArray(tkList) ? tkList : []);
      }

      // Set Orders
      if (ordersRes.status === 'fulfilled' && ordersRes.value) {
        const ordList = ordersRes.value.data || ordersRes.value || [];
        setOrders(Array.isArray(ordList) ? ordList : []);
      }

      // Set Announcements
      if (announcementsRes.status === 'fulfilled' && announcementsRes.value) {
        const annList = announcementsRes.value.data || announcementsRes.value || [];
        setAnnouncements(Array.isArray(annList) ? annList : []);
      }
    } catch (err) {
      console.error('Failed to load member dashboard data:', err);
      setError(err.message || 'Failed to connect to backend service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Payment Handler
  const handlePayDues = async (membershipId, paymentMode = 'online') => {
    try {
      if (membershipId) {
        await membershipService.payMembership(membershipId, paymentMode);
      } else {
        await membershipService.payDues(paymentMode);
      }
      setNotification({
        type: 'success',
        message: 'Membership dues paid successfully! Your membership is now ACTIVE.',
      });
      await loadDashboardData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Payment processing failed. Please try again.',
      });
    }
  };

  // Renewal Handler
  const handleRenew = async (membershipId) => {
    try {
      if (membershipId) {
        await membershipService.renewMembership(membershipId);
      } else {
        await membershipService.createMembership();
      }
      setNotification({
        type: 'success',
        message: 'Renewal initiated. Please complete payment to activate your renewed cycle.',
      });
      await loadDashboardData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Renewal initiation failed. Please try again.',
      });
    }
  };

  if (loading && !membershipData) {
    return <DashboardLoadingState message="Loading member credentials & live organization data..." />;
  }

  if (error && !membershipData) {
    return (
      <DashboardErrorState
        title="Unable to Load Dashboard"
        message={error}
        onRetry={loadDashboardData}
      />
    );
  }

  const computedStatus = (
    membershipData?.computed_status ||
    membershipData?.status ||
    'PENDING'
  ).toUpperCase();
  const isActive = computedStatus === 'ACTIVE';

  return (
    <div className="space-y-8">
      {/* Toast / Action Banner */}
      {notification && (
        <div
          className={`p-4 border font-mono text-xs flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="font-bold underline uppercase ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Statistical Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStat
          label="Membership State"
          value={computedStatus}
          change={
            isActive
              ? `${membershipData?.days_remaining || 0} days remaining`
              : computedStatus === 'EXPIRED'
              ? 'Renewal required'
              : 'Dues pending'
          }
          icon={CreditCard}
        />
        <DashboardStat
          label="Event Tickets"
          value={String(tickets.length)}
          change={tickets.length > 0 ? 'Confirmed reservations' : 'No bookings yet'}
          icon={Ticket}
        />
        <DashboardStat
          label="Merch Orders"
          value={String(orders.length)}
          change={orders.length > 0 ? 'Store purchase history' : 'No orders placed'}
          icon={ShoppingBag}
        />
        <DashboardStat
          label="Announcements"
          value={String(announcements.length)}
          change="Campus bulletins"
          icon={Bell}
        />
      </div>

      {/* Primary Section: Membership Status & Digital Pass */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <MemberMembershipCard
            membership={membershipData}
            onPayDues={handlePayDues}
            onRenew={handleRenew}
          />
        </div>
        <div className="lg:col-span-5">
          <MemberPassCard
            passData={
              passData || {
                ...membershipData,
                member_name: user?.name,
                user_email: user?.email,
                role: user?.role,
              }
            }
          />
        </div>
      </div>

      {/* Upcoming Events Section with Member Pricing */}
      <MemberEventSection
        events={events}
        isActiveMember={isActive}
      />

      {/* Event Tickets & Merchandise Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <MemberTicketSection tickets={tickets} />
        <MemberOrderSection orders={orders} />
      </div>

      {/* Announcements Feed Section */}
      <MemberAnnouncementSection announcements={announcements} />
    </div>
  );
};

export default MemberDashboard;
