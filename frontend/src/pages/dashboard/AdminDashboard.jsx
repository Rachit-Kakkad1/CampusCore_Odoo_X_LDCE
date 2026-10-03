// frontend/src/pages/dashboard/AdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardPageHeader from '../../components/dashboard/DashboardPageHeader';
import { PageTabs } from '../../components/dashboard/PageTabs';
import { DashboardLoadingState } from '../../components/dashboard/DashboardLoadingState';
import { DashboardErrorState } from '../../components/dashboard/DashboardErrorState';
import {
  AdminOverview,
  AdminMemberManagement,
  AdminEventManagement,
  AdminMerchandiseManagement,
  AdminFundraiserManagement,
  AdminAnnouncementManagement,
} from '../../components/dashboard/admin';
import membershipService from '../../services/membership.service';
import eventsService from '../../services/events.service';
import merchandiseService from '../../services/merchandise.service';
import financeService from '../../services/finance.service';
import announcementsService from '../../services/announcements.service';
import authService from '../../services/auth.service';

export const AdminDashboard = () => {
  const user = authService.getStoredUser();

  // Tab State: 'overview' | 'members' | 'events' | 'merchandise' | 'fundraisers' | 'announcements'
  const [activeTab, setActiveTab] = useState('overview');

  // Business Data States
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setAllOrders] = useState([]);
  const [fundraisers, setFundraisers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        memRes,
        evRes,
        prodRes,
        ordRes,
        fundRes,
        annRes,
      ] = await Promise.allSettled([
        membershipService.getAllMemberships(),
        eventsService.getEvents(),
        merchandiseService.getProducts(),
        merchandiseService.getAllOrders().catch(() => ({ data: [] })),
        financeService.getFundraisers().catch(() => ({ data: [] })),
        announcementsService.getAnnouncements(),
      ]);

      if (memRes.status === 'fulfilled') {
        const mList = memRes.value?.data || memRes.value || [];
        setMembers(Array.isArray(mList) ? mList : []);
      }

      if (evRes.status === 'fulfilled') {
        const eList = evRes.value?.data || evRes.value || [];
        setEvents(Array.isArray(eList) ? eList : []);
      }

      if (prodRes.status === 'fulfilled') {
        const pList = prodRes.value?.data || prodRes.value || [];
        setProducts(Array.isArray(pList) ? pList : []);
      }

      if (ordRes.status === 'fulfilled') {
        const oList = ordRes.value?.data || ordRes.value || [];
        setAllOrders(Array.isArray(oList) ? oList : []);
      }

      if (fundRes.status === 'fulfilled') {
        const fList = fundRes.value?.data || fundRes.value || [];
        setFundraisers(Array.isArray(fList) ? fList : []);
      }

      if (annRes.status === 'fulfilled') {
        const aList = annRes.value?.data || annRes.value || [];
        setAnnouncements(Array.isArray(aList) ? aList : []);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      setError(err.message || 'Unable to load administration data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Member Handlers
  const handleActivateDues = async (membershipId) => {
    try {
      await membershipService.payMembership(membershipId);
      setNotification({
        type: 'success',
        message: 'Membership dues marked paid. Member is now ACTIVE.',
      });
      await loadAllData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to activate dues',
      });
    }
  };

  const handleRenewMember = async (membershipId) => {
    try {
      await membershipService.renewMembership(membershipId);
      setNotification({
        type: 'success',
        message: 'Renewal term initiated.',
      });
      await loadAllData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to renew membership',
      });
    }
  };

  // Stock update handler
  const handleUpdateStock = async (productId, size, stock) => {
    try {
      await merchandiseService.updateStock(productId, size, stock);
      setNotification({
        type: 'success',
        message: `Updated Size ${size} stock to ${stock} units.`,
      });
      await loadAllData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update stock',
      });
    }
  };

  const handleCreatedSuccess = (msg) => {
    setNotification({ type: 'success', message: msg });
    loadAllData();
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: `Members (${members.length})` },
    { id: 'events', label: `Events (${events.length})` },
    { id: 'merchandise', label: `Merchandise (${products.length})` },
    { id: 'fundraisers', label: `Fundraisers (${fundraisers.length})` },
    { id: 'announcements', label: `Announcements (${announcements.length})` },
  ];

  return (
    <DashboardShell activeRole="admin">
      <DashboardPageHeader
        title="Organization Administration"
        subtitle={`Welcome, ${user?.name || 'Admin'}. Full authority over memberships, event programming, store catalog, and announcements.`}
        badge="Executive Workspace"
      />

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 border font-mono text-xs mb-6 flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="font-bold underline ml-4 uppercase"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error state */}
      {error && !members.length && (
        <DashboardErrorState
          title="Administrative Data Offline"
          message={error}
          onRetry={loadAllData}
        />
      )}

      {/* Top Workspace Navigation Tabs */}
      <div className="mb-8">
        <PageTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Dynamic Tab Views */}
      {activeTab === 'overview' && (
        <AdminOverview
          members={members}
          events={events}
          products={products}
          orders={orders}
          fundraisers={fundraisers}
          announcements={announcements}
          loading={loading}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'members' && (
        <AdminMemberManagement
          members={members}
          loading={loading}
          onActivateDues={handleActivateDues}
          onRenewMember={handleRenewMember}
        />
      )}

      {activeTab === 'events' && (
        <AdminEventManagement
          events={events}
          loading={loading}
          onEventCreated={() => handleCreatedSuccess('Event created and published successfully!')}
        />
      )}

      {activeTab === 'merchandise' && (
        <AdminMerchandiseManagement
          products={products}
          orders={orders}
          loading={loading}
          onUpdateStock={handleUpdateStock}
          onProductCreated={() => handleCreatedSuccess('Product created and stock initialized!')}
        />
      )}

      {activeTab === 'fundraisers' && (
        <AdminFundraiserManagement
          fundraisers={fundraisers}
          loading={loading}
          onFundraiserCreated={() => handleCreatedSuccess('Fundraiser launched successfully!')}
        />
      )}

      {activeTab === 'announcements' && (
        <AdminAnnouncementManagement
          announcements={announcements}
          loading={loading}
          onAnnouncementCreated={() => handleCreatedSuccess('Official announcement broadcasted!')}
        />
      )}
    </DashboardShell>
  );
};

export default AdminDashboard;
