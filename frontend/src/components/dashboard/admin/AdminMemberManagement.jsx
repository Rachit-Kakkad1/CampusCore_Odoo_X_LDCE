import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../StatusBadge';
import { ThreeDCard } from '../charts/ThreeDCharts';
import Pagination from '../../common/Pagination';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  CreditCard,
  Calendar,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export const AdminMemberManagement = ({
  members = [],
  loading = false,
  onActivateDues,
  onRenewMember,
  onCancelMember,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const [cancelModal, setCancelModal] = useState({
    open: false,
    member: null,
    loading: false,
    reason: 'Admin manual cancellation',
  });

  const handleConfirmCancel = async () => {
    if (!cancelModal.member || !onCancelMember) return;
    try {
      setCancelModal((prev) => ({ ...prev, loading: true }));
      await onCancelMember(cancelModal.member.id, cancelModal.reason);
      setCancelModal({ open: false, member: null, loading: false, reason: 'Admin manual cancellation' });
    } catch (err) {
      setCancelModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Computed metrics
  const totalMembers = members.length;
  const activeCount = members.filter(
    (m) => (m.computed_status || m.status || '').toUpperCase() === 'ACTIVE'
  ).length;
  const pendingCount = members.filter(
    (m) => (m.computed_status || m.status || '').toUpperCase() === 'PENDING'
  ).length;
  const expiredCount = members.filter(
    (m) => (m.computed_status || m.status || '').toUpperCase() === 'EXPIRED'
  ).length;

  const filteredMembers = members.filter((m) => {
    const status = (m.computed_status || m.status || '').toUpperCase();
    const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      (m.user_name && m.user_name.toLowerCase().includes(q)) ||
      (m.user_email && m.user_email.toLowerCase().includes(q)) ||
      (m.member_code && m.member_code.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  const paginatedMembers = filteredMembers.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* 1. TOP 3D TELEMETRY CARDS                                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <ThreeDCard
          className="p-6 border-l-4 border-l-primary"
          accentGlow="rgba(95, 63, 86, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Roster
            </span>
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalMembers}
            </span>
            <span className="text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-xs">
              Registered
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>All recorded profiles</span>
            <span className="font-mono text-[11px] text-slate-400">Roster</span>
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-emerald-600"
          accentGlow="rgba(5, 150, 105, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Good Standing
            </span>
            <div className="w-8 h-8 rounded-sm bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeCount}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-xs border border-emerald-200">
              {totalMembers > 0 ? Math.round((activeCount / totalMembers) * 100) : 0}% Active
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Fully paid & eligible</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-amber-600"
          accentGlow="rgba(217, 119, 6, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Dues Pending
            </span>
            <div className="w-8 h-8 rounded-sm bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {pendingCount}
            </span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-xs border border-amber-200">
              Action Req.
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Awaiting subscription dues</span>
            <span className="font-mono text-[11px] text-slate-400">Payment</span>
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-rose-600"
          accentGlow="rgba(225, 29, 72, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Expired Terms
            </span>
            <div className="w-8 h-8 rounded-sm bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {expiredCount}
            </span>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-xs border border-rose-200">
              Renewable
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Lapsed membership pass</span>
            <span className="w-2 h-2 rounded-full bg-rose-600" />
          </div>
        </ThreeDCard>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEARCH & FILTER CONTROLS                                               */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 border border-border shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or member code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-primary focus:bg-white font-mono transition-colors"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Status:
          </span>
          {[
            { id: 'ALL', label: 'All Roster', count: totalMembers },
            { id: 'ACTIVE', label: 'Active', count: activeCount },
            { id: 'PENDING', label: 'Pending', count: pendingCount },
            { id: 'EXPIRED', label: 'Expired', count: expiredCount },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider border rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                statusFilter === item.id
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{item.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                statusFilter === item.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MEMBERS DIRECTORY TABLE                                                */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="h-64 bg-white border border-border animate-pulse flex items-center justify-center">
          <div className="text-xs text-slate-400 font-mono">Loading membership records...</div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 border border-border bg-white text-center font-mono text-xs text-slate-500">
          No member records matched your criteria.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-border bg-white overflow-x-auto shadow-2xs">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50/80 text-[10px] uppercase font-bold tracking-wider text-slate-600">
                <th className="p-3.5">Member Identity</th>
                <th className="p-3.5">Membership Code</th>
                <th className="p-3.5">Contact & Role</th>
                <th className="p-3.5">Annual Dues</th>
                <th className="p-3.5">Expiry Date</th>
                <th className="p-3.5">Current Status</th>
                <th className="p-3.5 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedMembers.map((m) => {
                const status = (m.computed_status || m.status || '').toUpperCase();
                const expiry = m.expiry_date
                  ? new Date(m.expiry_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—';

                const name = m.user_name || `User #${m.user_id}`;
                const initials = name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Member Identity with Avatar */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-primary-hover flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-xs">
                          {initials}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block font-sans text-xs">
                            {name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: #{m.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Member Code */}
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-xs text-primary font-bold font-mono text-[11px]">
                        {m.member_code}
                      </span>
                    </td>

                    {/* Contact & Role */}
                    <td className="p-3.5 text-slate-700">
                      <div>{m.user_email || '—'}</div>
                      <span className="inline-block mt-0.5 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-xs">
                        {m.user_role || 'member'}
                      </span>
                    </td>

                    {/* Annual Dues */}
                    <td className="p-3.5 font-bold text-slate-900">
                      ₹{Number(m.dues_amount || 500).toFixed(2)}
                    </td>

                    {/* Expiry Date */}
                    <td className="p-3.5 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{expiry}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5">
                      <StatusBadge status={status} />
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onActivateDues?.(m.id)}
                              className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-xs border border-emerald-700 transition-colors shadow-2xs cursor-pointer"
                            >
                              Mark Paid
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCancelModal({
                                  open: true,
                                  member: m,
                                  loading: false,
                                  reason: 'Admin manual cancellation',
                                })
                              }
                              className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xs transition-colors cursor-pointer"
                              title="Cancel membership"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {status === 'EXPIRED' && (
                          <button
                            type="button"
                            onClick={() => onRenewMember?.(m.id)}
                            className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-white rounded-xs border border-primary transition-colors shadow-2xs cursor-pointer"
                          >
                            Renew Term
                          </button>
                        )}
                        {status === 'ACTIVE' && (
                          <>
                            <span className="text-[11px] font-mono text-emerald-600 font-bold flex items-center gap-1 mr-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCancelModal({
                                  open: true,
                                  member: m,
                                  loading: false,
                                  reason: 'Admin manual cancellation',
                                })
                              }
                              className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xs transition-colors cursor-pointer"
                              title="Cancel membership for this user"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {status === 'CANCELLED' && (
                          <span className="text-[11px] font-mono text-rose-500 font-semibold uppercase tracking-wider">
                            Cancelled
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredMembers.length > pageSize && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(filteredMembers.length / pageSize)}
            totalItems={filteredMembers.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CANCEL MEMBERSHIP CONFIRMATION MODAL                                    */}
      {/* ========================================================================= */}
      {cancelModal.open && cancelModal.member && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all scale-100 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-sans">
                  Cancel Membership?
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {cancelModal.member.member_code} &bull; ID #{cancelModal.member.id}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <p className="font-semibold text-slate-900">
                Cancel membership for {cancelModal.member.user_name || 'this member'}?
              </p>
              <p>
                <strong>Important:</strong> This will not delete the user account, historical tickets, or transaction ledger entries. The membership status will become <strong>CANCELLED</strong> and member-exclusive pricing will no longer apply.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Cancellation Reason (Optional)
              </label>
              <input
                type="text"
                value={cancelModal.reason}
                onChange={(e) => setCancelModal((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Reason for cancellation..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={cancelModal.loading}
                onClick={() => setCancelModal({ open: false, member: null, loading: false, reason: 'Admin manual cancellation' })}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Keep Membership
              </button>
              <button
                type="button"
                disabled={cancelModal.loading}
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {cancelModal.loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMemberManagement;
