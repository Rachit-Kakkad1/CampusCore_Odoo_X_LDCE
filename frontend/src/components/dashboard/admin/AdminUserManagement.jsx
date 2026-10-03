// frontend/src/components/dashboard/admin/AdminUserManagement.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ShieldCheck,
  CreditCard,
  UserPlus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  Mail,
  User,
  Calendar,
  Layers,
  ArrowUpRight,
  Copy,
  Check,
  Box,
  Sparkles,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ThreeDBarShape,
  ThreeDCard,
  ThreeDTooltip,
  ThreeDDonutStage,
} from '../charts/ThreeDCharts';
import { StatusBadge } from '../StatusBadge';

const ROLE_COLORS = {
  admin: '#5F3F56',
  treasurer: '#2563eb',
  event_manager: '#d97706',
  volunteer: '#0d9488',
  member: '#475569',
};

const ROLE_LABELS = {
  admin: 'Administrator',
  treasurer: 'Treasurer',
  event_manager: 'Event Manager',
  volunteer: 'Volunteer',
  member: 'Standard Member',
};

export const AdminUserManagement = ({
  users = [],
  loading = false,
  currentUser = null,
  onCreateUser,
  onUpdateRole,
  onDeleteUser,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [membershipFilter, setMembershipFilter] = useState('ALL');
  const [is3DMode, setIs3DMode] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // Form states for new user
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newRole, setNewRole] = useState('member');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form states for role edit
  const [selectedRole, setSelectedRole] = useState('member');

  // Computed metrics
  const totalUsers = users.length;
  const staffCount = users.filter((u) => ['admin', 'treasurer', 'event_manager', 'volunteer'].includes(u.role)).length;
  const activeMembersCount = users.filter((u) => u.membership_status === 'ACTIVE').length;
  const pendingCount = users.filter((u) => u.membership_status === 'PENDING').length;
  const activeRate = totalUsers > 0 ? Math.round((activeMembersCount / totalUsers) * 100) : 0;

  // Chart data: Role Breakdown
  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const roleChartData = [
    { role: 'Admin', count: roleCounts['admin'] || 0, fill: ROLE_COLORS.admin, fullName: 'Administrator' },
    { role: 'Treasurer', count: roleCounts['treasurer'] || 0, fill: ROLE_COLORS.treasurer, fullName: 'Treasurer' },
    { role: 'Event Mgr', count: roleCounts['event_manager'] || 0, fill: ROLE_COLORS.event_manager, fullName: 'Event Manager' },
    { role: 'Volunteer', count: roleCounts['volunteer'] || 0, fill: ROLE_COLORS.volunteer, fullName: 'Volunteer' },
    { role: 'Member', count: roleCounts['member'] || 0, fill: ROLE_COLORS.member, fullName: 'Standard Member' },
  ].filter((d) => d.count > 0);

  // Chart data: Membership Distribution
  const membershipCounts = users.reduce((acc, u) => {
    const st = u.membership_status || 'NO_MEMBERSHIP';
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  const membershipPieData = [
    { name: 'Active', value: membershipCounts['ACTIVE'] || 0, color: '#059669' },
    { name: 'Pending', value: membershipCounts['PENDING'] || 0, color: '#d97706' },
    { name: 'Expired', value: membershipCounts['EXPIRED'] || 0, color: '#e11d48' },
    { name: 'Cancelled', value: membershipCounts['CANCELLED'] || 0, color: '#94a3b8' },
    { name: 'No Pass', value: membershipCounts['NO_MEMBERSHIP'] || 0, color: '#64748b' },
  ].filter((d) => d.value > 0);

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role.toUpperCase() === roleFilter;
    const matchesMembership =
      membershipFilter === 'ALL' || (u.membership_status || 'NO_MEMBERSHIP') === membershipFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.member_code && u.member_code.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q));

    return matchesRole && matchesMembership && matchesSearch;
  });

  const handleCopyText = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenCreateModal = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('password123');
    setNewRole('member');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      setFormError('Please fill out all required fields.');
      return;
    }
    try {
      setFormSubmitting(true);
      await onCreateUser?.({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });
      setIsCreateModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to create user account');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenEditRole = (user) => {
    setEditingUser(user);
    setSelectedRole(user.role);
  };

  const handleUpdateRoleSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setFormSubmitting(true);
      await onUpdateRole?.(editingUser.id, selectedRole);
      setEditingUser(null);
    } catch (err) {
      alert(err.message || 'Failed to update role');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    try {
      setFormSubmitting(true);
      await onDeleteUser?.(deletingUser.id);
      setDeletingUser(null);
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP 3D METRIC SUMMARY CARDS                                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <ThreeDCard
          className="p-6 border-l-4 border-l-primary"
          accentGlow="rgba(95, 63, 86, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Accounts
            </span>
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalUsers}
            </span>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-xs border border-slate-200">
              100% Synced
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Platform User Directory</span>
            <span className="w-2 h-2 rounded-full bg-primary" />
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-indigo-600"
          accentGlow="rgba(79, 70, 229, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Staff & Executives
            </span>
            <div className="w-8 h-8 rounded-sm bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {staffCount}
            </span>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-xs border border-indigo-200">
              Privileged
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Admin, Treasurer, Ops & Task Force</span>
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-emerald-600"
          accentGlow="rgba(5, 150, 105, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Members
            </span>
            <div className="w-8 h-8 rounded-sm bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeMembersCount}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-xs border border-emerald-200">
              {activeRate}% Verified
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Verified dues & active QR passes</span>
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-amber-500"
          accentGlow="rgba(217, 119, 6, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pending Validation
            </span>
            <div className="w-8 h-8 rounded-sm bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
              <CreditCard className="w-4 h-4" />
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
            <span>Dues awaiting payment clearance</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
        </ThreeDCard>
      </div>

      {/* ========================================================================= */}
      {/* 2. 3D VISUAL ANALYTICS & CHARTS ROW                                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3D Prism Bar Chart: Role Distribution */}
        <ThreeDCard
          className="p-6"
          accentGlow="rgba(95, 63, 86, 0.15)"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-slate-900">
                  3D User Role Distribution
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Isometric prism clearance mapping across administrative tiers
              </p>
            </div>
            <div className="inline-flex rounded-xs border border-border p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setIs3DMode(!is3DMode)}
                className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:text-primary transition-colors flex items-center gap-1"
              >
                <Box className="w-3 h-3" />
                <span>{is3DMode ? '3D Prism' : 'Flat'}</span>
              </button>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={roleChartData}
                margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="role" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip content={<ThreeDTooltip unit="accounts" />} />

                {/* 3D Isometric Extruded Prism Bar */}
                <Bar
                  dataKey="count"
                  name="Accounts"
                  shape={is3DMode ? <ThreeDBarShape depth={10} /> : undefined}
                  radius={!is3DMode ? [4, 4, 0, 0] : undefined}
                >
                  {roleChartData.map((entry, index) => (
                    <Cell key={`cell-role-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 font-mono">
            {roleChartData.map((d) => (
              <div key={d.role} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: d.fill }} />
                <span>{d.role}: <strong>{d.count}</strong></span>
              </div>
            ))}
          </div>
        </ThreeDCard>

        {/* 3D Donut Chart: Pass Lifecycle */}
        <ThreeDCard
          className="p-6 flex flex-col justify-between"
          accentGlow="rgba(5, 150, 105, 0.15)"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-slate-900">
                  3D Membership Pass Lifecycle
                </h3>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200">
                {activeRate}% Active Pass
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Current dues realization & validity telemetry
            </p>

            <ThreeDDonutStage is3D={is3DMode}>
              <div className="h-52 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <filter id="userPieShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="2" dy="8" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.2" />
                      </filter>
                    </defs>
                    <Pie
                      data={membershipPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                      filter="url(#userPieShadow)"
                    >
                      {membershipPieData.map((entry, index) => (
                        <Cell
                          key={`cell-user-pie-${index}`}
                          fill={entry.color}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ThreeDTooltip unit="users" />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* 3D Floating Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200 shadow-md flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-900 leading-none">
                      {totalUsers}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">
                      Users
                    </span>
                  </div>
                </div>
              </div>
            </ThreeDDonutStage>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600 font-mono">
            {membershipPieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span>{d.name}: <strong>{d.value}</strong></span>
              </div>
            ))}
          </div>
        </ThreeDCard>
      </div>

      {/* ========================================================================= */}
      {/* 3. SEARCH, ROLE FILTERS & PROVISIONING ACTION BAR                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 border border-border shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, member code, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-primary focus:bg-white font-mono transition-colors"
          />
        </div>

        {/* Role Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Filter:
          </span>
          {['ALL', 'ADMIN', 'TREASURER', 'EVENT_MANAGER', 'VOLUNTEER', 'MEMBER'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                roleFilter === r
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Provision New User Button */}
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New Account</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. RICH USERS DIRECTORY TABLE                                             */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="h-64 bg-white border border-border animate-pulse flex items-center justify-center">
          <div className="text-xs text-slate-400 font-mono">Loading user accounts...</div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 border border-border bg-white text-center text-xs text-slate-500 font-mono">
          No user accounts matched your search or filter parameters.
        </div>
      ) : (
        <div className="border border-border bg-white overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50/80 text-[10px] uppercase font-bold tracking-wider text-slate-600">
                <th className="p-3.5">User Identity</th>
                <th className="p-3.5">Authority Role</th>
                <th className="p-3.5">Pass Status</th>
                <th className="p-3.5">Member Code</th>
                <th className="p-3.5">Platform Activity</th>
                <th className="p-3.5">Registered Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((u) => {
                const isCurrent = currentUser?.id === u.id;
                const initials = u.name
                  ? u.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'U';

                const regDate = u.created_at
                  ? new Date(u.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* User Identity */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs"
                          style={{
                            background: `linear-gradient(135deg, ${ROLE_COLORS[u.role] || '#475569'}, ${ROLE_COLORS[u.role] || '#475569'}dd)`,
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{u.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] uppercase font-bold tracking-wider bg-primary/10 text-primary px-1.5 py-0.2 rounded-xs border border-primary/20">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                            <span>{u.email}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(u.email, `email-${u.id}`)}
                              className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              title="Copy Email"
                            >
                              {copiedId === `email-${u.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Authority Role */}
                    <td className="p-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-xs border shadow-2xs"
                        style={{
                          backgroundColor: `${ROLE_COLORS[u.role]}12`,
                          borderColor: `${ROLE_COLORS[u.role]}35`,
                          color: ROLE_COLORS[u.role],
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: ROLE_COLORS[u.role] }}
                        />
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>

                    {/* Membership Status */}
                    <td className="p-3.5">
                      {u.membership_status === 'NO_MEMBERSHIP' ? (
                        <span className="text-[11px] text-slate-400 font-mono font-medium">None</span>
                      ) : (
                        <StatusBadge status={u.membership_status} />
                      )}
                    </td>

                    {/* Member Code */}
                    <td className="p-3.5 font-mono text-[11px] text-primary font-bold">
                      {u.member_code ? (
                        <div className="flex items-center gap-1.5">
                          <span>{u.member_code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(u.member_code, `code-${u.id}`)}
                            className="text-slate-400 hover:text-primary cursor-pointer"
                            title="Copy Member Code"
                          >
                            {copiedId === `code-${u.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Platform Engagement */}
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-xs border border-slate-200">
                        {u.ticket_count || 0} Tickets
                      </span>
                      <span className="mx-1 text-slate-300">·</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded-xs border border-slate-200">
                        {u.order_count || 0} Orders
                      </span>
                    </td>

                    {/* Registered Date */}
                    <td className="p-3.5 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                      {regDate}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          title="View Profile Details"
                          onClick={() => setViewingUser(u)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-border transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          title="Change Authority Role"
                          onClick={() => handleOpenEditRole(u)}
                          className="p-1.5 text-primary hover:text-primary-hover hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {!isCurrent && (
                          <button
                            type="button"
                            title="Delete User"
                            onClick={() => setDeletingUser(u)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Create New User Account                                          */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-border shadow-2xl max-w-md w-full p-6 space-y-5 rounded-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-slate-900 text-sm">Provision New User Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-border font-mono text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="alex@odoo-ldce.org"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-border font-mono text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Initial Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-border font-mono text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                  Default: password123
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Authority Role *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-border font-mono text-xs bg-white focus:outline-none focus:border-primary"
                >
                  <option value="member">member — Standard Member</option>
                  <option value="volunteer">volunteer — Volunteer & Operations</option>
                  <option value="event_manager">event_manager — Event Manager</option>
                  <option value="treasurer">treasurer — Financial Officer / Treasury</option>
                  <option value="admin">admin — Executive Administrator</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-border text-slate-700 hover:bg-slate-100 font-bold uppercase text-[11px] tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold uppercase text-[11px] tracking-wider shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Change User Authority Role                                       */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-border shadow-2xl max-w-md w-full p-6 space-y-5 rounded-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-slate-900 text-sm">Update Authority Role</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs bg-slate-50 p-3 border border-slate-200 space-y-1 font-mono">
              <div>
                <span className="text-slate-500">Target User:</span>{' '}
                <strong className="text-slate-900">{editingUser.name}</strong>
              </div>
              <div>
                <span className="text-slate-500">Email:</span> {editingUser.email}
              </div>
              <div>
                <span className="text-slate-500">Current Role:</span>{' '}
                <span className="uppercase font-bold text-primary">{editingUser.role}</span>
              </div>
            </div>

            <form onSubmit={handleUpdateRoleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Assign New Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-border font-mono text-xs bg-white focus:outline-none focus:border-primary"
                >
                  <option value="member">member — Standard Member</option>
                  <option value="volunteer">volunteer — Volunteer & Check-in Operator</option>
                  <option value="event_manager">event_manager — Event Manager</option>
                  <option value="treasurer">treasurer — Financial Officer / Treasurer</option>
                  <option value="admin">admin — Executive Administrator</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-border text-slate-700 hover:bg-slate-100 font-bold uppercase text-[11px] tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold uppercase text-[11px] tracking-wider shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? 'Updating...' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: View Full Profile Details                                        */}
      {/* ========================================================================= */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-border shadow-2xl max-w-lg w-full p-6 space-y-5 rounded-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-slate-900 text-sm">Account Specification</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Account ID</span>
                  <span className="font-bold text-slate-900">#{viewingUser.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Full Name</span>
                  <span className="font-bold text-slate-900">{viewingUser.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Email Address</span>
                  <span className="text-slate-900 break-all">{viewingUser.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">System Authority</span>
                  <span className="font-bold uppercase text-primary">{viewingUser.role}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Registered Date</span>
                  <span className="text-slate-800">
                    {viewingUser.created_at ? new Date(viewingUser.created_at).toLocaleString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Membership Code</span>
                  <span className="text-primary font-bold">{viewingUser.member_code || 'None'}</span>
                </div>
              </div>

              <div className="border border-border p-4 bg-white space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                  Membership State
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Computed Pass Status:</span>
                  <StatusBadge status={viewingUser.membership_status || 'NO_MEMBERSHIP'} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Dues Amount:</span>
                  <span className="font-bold text-slate-900">₹{Number(viewingUser.dues_amount || 500).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Expiry Date:</span>
                  <span className="text-slate-900">
                    {viewingUser.expiry_date
                      ? new Date(viewingUser.expiry_date).toLocaleDateString()
                      : 'None / Pending'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 border border-border bg-slate-50">
                  <span className="text-[10px] uppercase text-slate-500 block">Event Tickets</span>
                  <span className="text-lg font-bold text-slate-900">{viewingUser.ticket_count || 0}</span>
                </div>
                <div className="p-3 border border-border bg-slate-50">
                  <span className="text-[10px] uppercase text-slate-500 block">Merchandise Orders</span>
                  <span className="text-lg font-bold text-slate-900">{viewingUser.order_count || 0}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold uppercase text-[11px] tracking-wider cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Delete User Confirmation                                         */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-rose-300 shadow-2xl max-w-md w-full p-6 space-y-4 rounded-sm">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-sm">Confirm Account Deletion</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete user{' '}
              <strong className="text-slate-900">{deletingUser.name}</strong> ({deletingUser.email})?
              All associated membership records and permissions will be removed.
            </p>
            <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 border border-border text-slate-700 hover:bg-slate-100 font-bold uppercase text-[11px] tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={formSubmitting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase text-[11px] tracking-wider shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {formSubmitting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
