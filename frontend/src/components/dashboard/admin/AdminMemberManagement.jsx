// frontend/src/components/dashboard/admin/AdminMemberManagement.jsx
import React, { useState } from 'react';
import { StatusBadge } from '../StatusBadge';
import { ActionButton } from '../ActionButton';
import { Search, Filter, CheckCircle2, RefreshCw } from 'lucide-react';

export const AdminMemberManagement = ({
  members = [],
  loading = false,
  onActivateDues,
  onRenewMember,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#1c1c1c]/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/70 border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {['ALL', 'ACTIVE', 'PENDING', 'EXPIRED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider border transition-all ${
                statusFilter === st
                  ? 'bg-[#5F3F56] text-white border-[#5F3F56]'
                  : 'bg-white/60 text-[#1c1c1c]/70 border-[#e5e4de] hover:border-[#5F3F56]/40'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Members Table */}
      {loading ? (
        <div className="h-64 bg-white/50 border border-[#e5e4de] animate-pulse"></div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 border border-[#e5e4de] text-center font-mono text-xs text-[#1c1c1c]/60">
          No member records matched your criteria.
        </div>
      ) : (
        <div className="border border-[#e5e4de] bg-white/70 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e5e4de] bg-[#f7f6f2] text-[10px] uppercase tracking-wider text-[#1c1c1c]/60">
                <th className="p-3.5">Member Name</th>
                <th className="p-3.5">Member Code</th>
                <th className="p-3.5">Email / Role</th>
                <th className="p-3.5">Dues Amount</th>
                <th className="p-3.5">Expiry Date</th>
                <th className="p-3.5">Computed Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e4de]">
              {filteredMembers.map((m) => {
                const status = (m.computed_status || m.status || '').toUpperCase();
                const expiry = m.expiry_date
                  ? new Date(m.expiry_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—';

                return (
                  <tr key={m.id} className="hover:bg-[#f7f6f2]/60 transition-colors">
                    <td className="p-3.5 font-bold text-[#1c1c1c]">
                      {m.user_name || `User #${m.user_id}`}
                    </td>
                    <td className="p-3.5 text-[#5F3F56] font-semibold">
                      {m.member_code}
                    </td>
                    <td className="p-3.5 text-[#1c1c1c]/70">
                      {m.user_email || '—'}
                      <span className="block text-[10px] uppercase text-[#1c1c1c]/50">
                        {m.user_role || 'member'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      ₹{Number(m.dues_amount || 500).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-[#1c1c1c]/70">
                      {expiry}
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={status} />
                    </td>
                    <td className="p-3.5 text-right">
                      {status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => onActivateDues?.(m.id)}
                          className="px-2.5 py-1 text-[10px] uppercase font-mono bg-[#5F3F56] text-white hover:bg-[#5F3F56]/90 border border-[#5F3F56]"
                        >
                          Mark Paid
                        </button>
                      )}
                      {status === 'EXPIRED' && (
                        <button
                          type="button"
                          onClick={() => onRenewMember?.(m.id)}
                          className="px-2.5 py-1 text-[10px] uppercase font-mono bg-[#1c1c1c] text-white hover:bg-[#5F3F56] border border-[#1c1c1c]"
                        >
                          Renew Term
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminMemberManagement;
