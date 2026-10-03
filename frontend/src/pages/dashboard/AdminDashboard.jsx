// frontend/src/pages/dashboard/AdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardPageHeader from '../../components/dashboard/DashboardPageHeader';
import { PageTabs } from '../../components/dashboard/PageTabs';
import { DashboardLoadingState } from '../../components/dashboard/DashboardLoadingState';
import { DashboardErrorState } from '../../components/dashboard/DashboardErrorState';
import {
  AdminOverview,
  AdminUserManagement,
  AdminMemberManagement,
  AdminEventManagement,
  AdminMerchandiseManagement,
  AdminFundraiserManagement,
  AdminAnnouncementManagement,
  AdminSecurityManagement,
} from '../../components/dashboard/admin';
import membershipService from '../../services/membership.service';
import eventsService from '../../services/events.service';
import merchandiseService from '../../services/merchandise.service';
import financeService from '../../services/finance.service';
import announcementsService from '../../services/announcements.service';
import authService from '../../services/auth.service';

export const AdminDashboard = () => {
  const user = authService.getStoredUser();
  const location = useLocation();
  const navigate = useNavigate();

  // Tab State synchronized with URL path
  const getTabFromLocation = useCallback((pathname) => {
    if (pathname.includes('/dashboard/admin/users')) return 'users';
    if (pathname.includes('/dashboard/admin/members')) return 'members';
    if (pathname.includes('/dashboard/admin/events')) return 'events';
    if (pathname.includes('/dashboard/admin/store') || pathname.includes('/dashboard/admin/merchandise')) return 'merchandise';
    if (pathname.includes('/dashboard/admin/fundraisers')) return 'fundraisers';
    if (pathname.includes('/dashboard/admin/announcements')) return 'announcements';
    if (pathname.includes('/dashboard/admin/security')) return 'security';
    return 'overview';
  }, []);

  const [activeTab, setActiveTab] = useState(() => getTabFromLocation(location.pathname));

  useEffect(() => {
    setActiveTab(getTabFromLocation(location.pathname));
  }, [location.pathname, getTabFromLocation]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'overview') {
      navigate('/dashboard/admin');
    } else if (tabId === 'merchandise') {
      navigate('/dashboard/admin/store');
    } else {
      navigate(`/dashboard/admin/${tabId}`);
    }
  };

  // Business Data States
  const [users, setUsers] = useState([]);
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
        usersRes,
        memRes,
        evRes,
        prodRes,
        ordRes,
        fundRes,
        annRes,
      ] = await Promise.allSettled([
        authService.getAllUsers().catch(() => ({ data: [] })),
        membershipService.getAllMemberships(),
        eventsService.getEvents(),
        merchandiseService.getProducts(),
        merchandiseService.getAllOrders().catch(() => ({ data: [] })),
        financeService.getFundraisers().catch(() => ({ data: [] })),
        announcementsService.getAnnouncements(),
      ]);

      if (usersRes.status === 'fulfilled') {
        const uList = usersRes.value?.data || usersRes.value || [];
        setUsers(Array.isArray(uList) ? uList : []);
      }

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

  // User Handlers
  const handleCreateUser = async (userData) => {
    try {
      await authService.createUser(userData);
      setNotification({
        type: 'success',
        message: `Account created for ${userData.name} with role ${userData.role.toUpperCase()}.`,
      });
      await loadAllData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to create user account',
      });
      throw err;
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await authService.updateUserRole(userId, newRole);
      setNotification({
        type: 'success',
        message: `User authority role updated to ${newRole.toUpperCase()}.`,
      });
      await loadAllData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update user role',
      });
      throw err;
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await authService.deleteUser(userId);
      setNotification({
        type: 'success',
        message: 'User account removed from database.',
      });
      await loadAllData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to delete user',
      });
      throw err;
    }
  };

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

  const handleCancelMember = async (membershipId, reason = 'Admin manual cancellation') => {
    try {
      await membershipService.cancelMembership(membershipId, reason);
      setNotification({
        type: 'success',
        message: 'Membership cancelled successfully. User account and tickets remain intact.',
      });
      await loadAllData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to cancel membership',
      });
      throw err;
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
    { id: 'users', label: `Users (${users.length})` },
    { id: 'members', label: `Members (${members.length})` },
    { id: 'events', label: `Events (${events.length})` },
    { id: 'merchandise', label: `Merchandise (${products.length})` },
    { id: 'fundraisers', label: `Fundraisers (${fundraisers.length})` },
    { id: 'announcements', label: `Announcements (${announcements.length})` },
    { id: 'security', label: 'Security & Audit' },
  ];

  return (
    <DashboardShell activeRole="admin">
      <DashboardPageHeader
        title="Organization Administration"
        subtitle={`Welcome, ${user?.name || 'Admin'}. Full authority over memberships, user accounts, event programming, store catalog, and announcements.`}
        badge="Executive Workspace"
      />

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 border font-mono text-xs mb-6 flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="font-bold underline ml-4 uppercase cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error state */}
      {error && !members.length && !users.length && (
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
          onChange={handleTabChange}
        />
      </div>

      {/* Dynamic Tab Views */}
      {activeTab === 'overview' && (
        <AdminOverview
          users={users}
          members={members}
          events={events}
          products={products}
          orders={orders}
          fundraisers={fundraisers}
          announcements={announcements}
          loading={loading}
          onNavigateTab={handleTabChange}
        />
      )}

      {activeTab === 'users' && (
        <AdminUserManagement
          users={users}
          loading={loading}
          currentUser={user}
          onCreateUser={handleCreateUser}
          onUpdateRole={handleUpdateRole}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {activeTab === 'members' && (
        <AdminMemberManagement
          members={members}
          loading={loading}
          onActivateDues={handleActivateDues}
          onRenewMember={handleRenewMember}
          onCancelMember={handleCancelMember}
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

      {activeTab === 'security' && (
        <AdminSecurityManagement />
      )}
    </DashboardShell>
  );
};

export default AdminDashboard;
