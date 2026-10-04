// frontend/src/components/dashboard/admin/AdminSecurityManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  Activity,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Terminal
} from 'lucide-react';
import api from '../../../services/api';
import Pagination from '../../common/Pagination';

export const AdminSecurityManagement = () => {
  const [overview, setOverview] = useState({ activeSessions: 0, recentLogs: [] });
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [unlockUserId, setUnlockUserId] = useState('');

  const fetchSecurityOverview = useCallback(async () => {
    try {
      const res = await api.get('/admin/security/overview');
      if (res && res.success) {
        setOverview(res);
      }
    } catch (err) {
      console.error('Failed to fetch security overview:', err);
    }
  }, []);

  const fetchAuditLogs = useCallback(async (targetPage = 1, filter = '', targetLimit = limit) => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page: targetPage.toString(),
        limit: targetLimit.toString(),
      });
      if (filter) query.set('action', filter);

      const res = await api.get(`/admin/security/audit-logs?${query.toString()}`);
      if (res && res.success) {
        setLogs(res.logs || res.data || []);
        setTotalLogs(res.pagination?.totalItems || res.total || 0);
        setPage(res.pagination?.page || res.page || 1);
        setTotalPages(res.pagination?.totalPages || res.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setNotification({ type: 'error', message: err.message || 'Failed to load audit logs' });
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchSecurityOverview();
    fetchAuditLogs(1, actionFilter);
  }, [fetchSecurityOverview, fetchAuditLogs, actionFilter]);

  const handleUnlockUser = async (e) => {
    e.preventDefault();
    if (!unlockUserId) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/security/unlock-user/${unlockUserId}`);
      setNotification({
        type: 'success',
        message: res.message || `User ID #${unlockUserId} unlocked successfully.`
      });
      setUnlockUserId('');
      fetchSecurityOverview();
      fetchAuditLogs(page, actionFilter);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to unlock user account'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm(`Revoke session #${sessionId}? The user will be immediately logged out.`)) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/security/revoke-session/${sessionId}`);
      setNotification({
        type: 'success',
        message: res.message || `Session #${sessionId} revoked.`
      });
      fetchSecurityOverview();
      fetchAuditLogs(page, actionFilter);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to revoke session'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('LOCK') || action.includes('REVOKE') || action.includes('CANCEL') || action.includes('FAIL')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (action.includes('LOGIN') || action.includes('APPROVE') || action.includes('SUCCESS') || action.includes('UNLOCK')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('RESET') || action.includes('UPDATE') || action.includes('ROLE')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 border font-mono text-xs flex items-center justify-between ${
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

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Sessions</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md">
              <Laptop className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{overview.activeSessions}</div>
          <p className="text-xs text-slate-500 mt-1">Concurrently active login tokens</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Audit Records</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{totalLogs}</div>
          <p className="text-xs text-slate-500 mt-1">Append-only immutable security ledger</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Brute-Force Shield</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-md">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">5-Attempt Lockout</div>
          <p className="text-xs text-slate-500 mt-1">15-minute progressive lockout active</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Defense</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-700">Enforcing & Auditing</div>
          <p className="text-xs text-slate-500 mt-1">Headers, Idempotency & Rate limits</p>
        </div>
      </div>

      {/* Emergency Unlock Card */}
      <div className="bg-slate-900 text-white rounded-lg p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Administrative Account Unlock Tool</h3>
            </div>
            <p className="text-xs text-slate-400">
              Unlock accounts locked by repeated failed password attempts without requiring the user to wait out the 15-minute lockout window.
            </p>
          </div>
          <form onSubmit={handleUnlockUser} className="flex items-center gap-2">
            <input
              type="number"
              placeholder="User ID (e.g. 5)"
              value={unlockUserId}
              onChange={(e) => setUnlockUserId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white placeholder-slate-500 px-3 py-2 text-xs rounded focus:outline-none focus:border-indigo-500 w-40"
              required
            />
            <button
              type="submit"
              disabled={actionLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              Unlock Account
            </button>
          </form>
        </div>
      </div>

      {/* Audit Log Explorer */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              Centralized Audit Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Append-only security log tracking identity, authentication, permissions, and administrative state changes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by action..."
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-300 text-xs rounded focus:outline-none focus:border-indigo-500 w-48"
              />
            </div>

            <button
              onClick={() => {
                fetchSecurityOverview();
                fetchAuditLogs(page, actionFilter);
              }}
              className="p-1.5 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded text-xs flex items-center gap-1 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Origin / Client</th>
                <th className="py-3 px-4">Request ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400">
                    Loading security audit ledger...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400">
                    No audit records found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.actor_user_id ? (
                        <span className="text-slate-800 font-medium">User #{log.actor_user_id}</span>
                      ) : (
                        <span className="text-slate-400 italic">SYSTEM / ANONYMOUS</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                      {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Terminal className="w-3 h-3 text-slate-400" />
                        <span>{log.ip_address || '127.0.0.1'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-[10px] font-mono">
                      {log.request_id ? log.request_id.slice(0, 12) + '...' : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Standard Pagination Bar */}
        <Pagination
          page={page}
          pageSize={limit}
          totalItems={totalLogs}
          totalPages={totalPages}
          loading={loading}
          pageSizeOptions={[10, 15, 25, 50, 100]}
          onPageChange={(newPage) => fetchAuditLogs(newPage, actionFilter)}
          onPageSizeChange={(newLimit) => {
            setLimit(newLimit);
            fetchAuditLogs(1, actionFilter, newLimit);
          }}
          className="border-t border-slate-200 rounded-none border-x-0 border-b-0"
        />
      </div>
    </div>
  );
};

export default AdminSecurityManagement;
