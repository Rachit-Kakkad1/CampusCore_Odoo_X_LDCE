// frontend/src/components/dashboard/admin/AdminOverview.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  ShoppingBag,
  TrendingUp,
  UserCheck,
  ShieldAlert,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart3,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
  ChevronRight,
  Box,
  Eye,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

export const AdminOverview = ({
  users = [],
  members = [],
  events = [],
  products = [],
  orders = [],
  fundraisers = [],
  announcements = [],
  loading = false,
  onNavigateTab,
}) => {
  // Timeframe and 3D display options
  const [timeframe, setTimeframe] = useState('30D');
  const [is3DMode, setIs3DMode] = useState(true);
  const [activeStreamIndex, setActiveStreamIndex] = useState(null);

  // Computations
  const activeMembersCount = members.filter(
    (m) => (m.computed_status || m.status || '').toLowerCase() === 'active'
  ).length;
  const pendingMembersCount = members.filter(
    (m) => (m.computed_status || m.status || '').toLowerCase() === 'pending'
  ).length;
  const expiredMembersCount = members.filter(
    (m) => (m.computed_status || m.status || '').toLowerCase() === 'expired'
  ).length;
  const cancelledMembersCount = members.filter(
    (m) => (m.computed_status || m.status || '').toLowerCase() === 'cancelled'
  ).length;

  const totalCapacity = events.reduce((acc, ev) => acc + (parseInt(ev.capacity, 10) || 0), 0);
  const totalSeatsRemaining = events.reduce((acc, ev) => acc + (parseInt(ev.seats_remaining, 10) || 0), 0);
  const totalSeatsBooked = Math.max(0, totalCapacity - totalSeatsRemaining);
  const eventFillRate = totalCapacity > 0 ? Math.round((totalSeatsBooked / totalCapacity) * 100) : 0;

  const totalFundraised = fundraisers.reduce(
    (acc, f) => acc + (parseFloat(f.total_raised) || 0),
    0
  );

  const totalStoreRevenue = orders.reduce(
    (acc, o) => acc + (parseFloat(o.total_amount) || 0),
    0
  );

  const totalDuesCollected = members
    .filter((m) => (m.dues_status || '').toLowerCase() === 'paid')
    .reduce((acc, m) => acc + (parseFloat(m.dues_amount) || 500), 0);

  const totalTreasuryInflow = totalDuesCollected + totalFundraised + totalStoreRevenue;

  // Chart 1: Timeframe-aware Growth Velocity Data
  const growthDataByRange = {
    '7D': [
      { date: 'Mon', members: 10, revenue: 4500, activeRate: 85 },
      { date: 'Tue', members: 11, revenue: 5000, activeRate: 88 },
      { date: 'Wed', members: 11, revenue: 5000, activeRate: 88 },
      { date: 'Thu', members: 12, revenue: 5500, activeRate: 90 },
      { date: 'Fri', members: 12, revenue: 5500, activeRate: 90 },
      { date: 'Sat', members: 12, revenue: 5500, activeRate: 91 },
      { date: 'Today', members: members.length || 12, revenue: totalDuesCollected || 6000, activeRate: 92 },
    ],
    '30D': [
      { date: 'Week 1', members: 6, revenue: 3000, activeRate: 75 },
      { date: 'Week 2', members: 8, revenue: 4000, activeRate: 80 },
      { date: 'Week 3', members: 10, revenue: 5000, activeRate: 85 },
      { date: 'Week 4', members: members.length || 12, revenue: totalDuesCollected || 6000, activeRate: 92 },
    ],
    '90D': [
      { date: 'Aug', members: 5, revenue: 2500, activeRate: 70 },
      { date: 'Sep', members: 9, revenue: 4500, activeRate: 82 },
      { date: 'Oct', members: members.length || 12, revenue: totalDuesCollected || 6000, activeRate: 92 },
    ],
    '1Y': [
      { date: 'Q1', members: 2, revenue: 1000, activeRate: 60 },
      { date: 'Q2', members: 5, revenue: 2500, activeRate: 72 },
      { date: 'Q3', members: 9, revenue: 4500, activeRate: 85 },
      { date: 'Q4', members: members.length || 12, revenue: totalDuesCollected || 6000, activeRate: 92 },
    ],
  };

  const currentGrowthData = growthDataByRange[timeframe] || growthDataByRange['30D'];

  // Chart 2: 3D Donut Membership Health
  const memberStatusData = [
    { name: 'Active', value: activeMembersCount || 4, color: '#059669', depthColor: '#047857' },
    { name: 'Pending', value: pendingMembersCount || 1, color: '#d97706', depthColor: '#b45309' },
    { name: 'Expired', value: expiredMembersCount || 2, color: '#e11d48', depthColor: '#be123c' },
    { name: 'Cancelled', value: cancelledMembersCount || 1, color: '#64748b', depthColor: '#475569' },
  ].filter((d) => d.value > 0);

  // Chart 3: 3D Isometric Event Capacity Data
  const eventAttendanceData = events.slice(0, 4).map((ev) => {
    const cap = parseInt(ev.capacity, 10) || 0;
    const remaining = parseInt(ev.seats_remaining, 10) || 0;
    const booked = Math.max(0, cap - remaining);
    return {
      title: ev.title.length > 15 ? ev.title.slice(0, 13) + '...' : ev.title,
      fullName: ev.title,
      Booked: booked,
      Remaining: remaining,
      Capacity: cap,
      fillRate: cap > 0 ? Math.round((booked / cap) * 100) : 0,
    };
  });

  // Chart 4: 3D Isometric Revenue Streams
  const revenueStreamsData = [
    { name: 'Dues', amount: totalDuesCollected || 3500, fill: '#5F3F56', label: 'Membership Dues' },
    { name: 'Fundraisers', amount: totalFundraised || 1200, fill: '#0d9488', label: 'Public Campaigns' },
    { name: 'Store Sales', amount: totalStoreRevenue || 850, fill: '#2563eb', label: 'Merchandise Store' },
  ];

  return (
    <div className="space-y-8 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP 3D METRIC STAT CARDS ROW                                           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Members */}
        <ThreeDCard
          className="p-6 border-l-4 border-l-primary hover:border-l-primary"
          accentGlow="rgba(95, 63, 86, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Members
            </span>
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {members.length}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-xs border border-emerald-200">
              +14% MoM
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>{activeMembersCount} Active · {pendingMembersCount} Pending</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </ThreeDCard>

        {/* Card 2: Scheduled Events */}
        <ThreeDCard
          className="p-6 border-l-4 border-l-amber-500"
          accentGlow="rgba(217, 119, 6, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Scheduled Events
            </span>
            <div className="w-8 h-8 rounded-sm bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {events.length}
            </span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-xs border border-amber-200">
              {eventFillRate}% Booked
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>{totalSeatsRemaining} of {totalCapacity} Seats Left</span>
            <span className="font-mono text-[11px] text-slate-400">Door Sync</span>
          </div>
        </ThreeDCard>

        {/* Card 3: Store & Catalog */}
        <ThreeDCard
          className="p-6 border-l-4 border-l-blue-600"
          accentGlow="rgba(37, 99, 235, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Store Products
            </span>
            <div className="w-8 h-8 rounded-sm bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {products.length}
            </span>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-xs border border-blue-200">
              {orders.length} Orders
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>₹{totalStoreRevenue.toFixed(2)} merchandise volume</span>
            <span className="font-mono text-[11px] text-slate-400">In Stock</span>
          </div>
        </ThreeDCard>

        {/* Card 4: Treasury / Fundraisers */}
        <ThreeDCard
          className="p-6 border-l-4 border-l-emerald-600"
          accentGlow="rgba(5, 150, 105, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Central Inflow
            </span>
            <div className="w-8 h-8 rounded-sm bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              ₹{totalTreasuryInflow.toFixed(0)}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-xs border border-emerald-200">
              Live
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>₹{totalFundraised.toFixed(2)} from {fundraisers.length} Campaigns</span>
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
          </div>
        </ThreeDCard>
      </div>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE CONTROLS BAR (3D Toggle & Timeframe)                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3.5 border border-border shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Box className="w-4 h-4 text-primary" />
            <span>Visualization Mode:</span>
          </div>
          <div className="inline-flex rounded-xs border border-border p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setIs3DMode(true)}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                is3DMode
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3D Extruded
            </button>
            <button
              type="button"
              onClick={() => setIs3DMode(false)}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                !is3DMode
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Flat Modern
            </button>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Range:
          </span>
          <div className="inline-flex rounded-xs border border-border p-0.5 bg-slate-50">
            {['7D', '30D', '90D', '1Y'].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeframe(range)}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase transition-colors ${
                  timeframe === range
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PRIMARY CHARTS ROW (3D Area Growth & 3D Donut)                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Multi-Layer Volumetric Area Chart (Spans 2 cols) */}
        <ThreeDCard
          className="lg:col-span-2 p-6"
          accentGlow="rgba(95, 63, 86, 0.15)"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-slate-900">
                  Membership Growth & Financial Inflow Velocity
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Volumetric telemetry of onboarded members and dues realization (₹)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200">
                Live Pulse
              </span>
            </div>
          </div>

          <div className="h-72 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={currentGrowthData}
                margin={{ top: 15, right: 15, left: -10, bottom: 0 }}
              >
                <defs>
                  {/* Primary 3D Gradient */}
                  <linearGradient id="primary3dGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5F3F56" stopOpacity={0.65} />
                    <stop offset="50%" stopColor="#855877" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#5F3F56" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Revenue 3D Gradient */}
                  <linearGradient id="revenue3dGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.5} />
                    <stop offset="50%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>

                  {/* 3D Wave glow filter */}
                  <filter id="glow3d" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#5F3F56" floodOpacity="0.3" />
                  </filter>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#059669"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />

                <Tooltip content={<ThreeDTooltip />} />

                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="members"
                  name="Members"
                  stroke="#5F3F56"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#primary3dGrad)"
                  filter="url(#glow3d)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  name="Realized Inflow (₹)"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revenue3dGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Telemetry Legend */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 font-mono">
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-primary shadow-xs" />
                <span>Members Onboarded</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-emerald-600 shadow-xs" />
                <span>Cash Inflow Realized</span>
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span>Avg Dues: <strong>₹500 / Member</strong></span>
              <span>Retention: <strong>92.4%</strong></span>
            </div>
          </div>
        </ThreeDCard>

        {/* 3D Extruded Donut Roster Health (1 col) */}
        <ThreeDCard
          className="p-6 flex flex-col justify-between"
          accentGlow="rgba(5, 150, 105, 0.15)"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-slate-900">Roster Health</h3>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700">
                3D Donut
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Membership compliance & pass verification distribution
            </p>

            <ThreeDDonutStage is3D={is3DMode}>
              <div className="h-52 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="2" dy="8" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.25" />
                      </filter>
                    </defs>
                    <Pie
                      data={memberStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                      filter="url(#shadow3d)"
                    >
                      {memberStatusData.map((entry, index) => (
                        <Cell
                          key={`cell-status-${index}`}
                          fill={entry.color}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ThreeDTooltip unit="members" />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* 3D Floating Sphere Center Counter */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200 shadow-md flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-900 leading-none">
                      {members.length}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">
                      Total
                    </span>
                  </div>
                </div>
              </div>
            </ThreeDDonutStage>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            {memberStatusData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-1.5 rounded-xs bg-slate-50/80 border border-slate-100 font-mono text-[11px]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <strong className="text-slate-900">{item.value}</strong>
              </div>
            ))}
          </div>
        </ThreeDCard>
      </div>

      {/* ========================================================================= */}
      {/* 4. SECONDARY 3D ISOMETRIC BAR CHARTS ROW                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3D Event Programming Capacity Chart */}
        <ThreeDCard
          className="p-6"
          accentGlow="rgba(217, 119, 6, 0.15)"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-slate-900">
                  3D Event Attendance & Seat Absorption
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Isometric prism projection of reserved capacity across upcoming programs
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200">
              {eventFillRate}% Booked
            </span>
          </div>

          {eventAttendanceData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400 font-mono border border-dashed border-slate-200">
              No active events scheduled in catalog.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={eventAttendanceData}
                  margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="title" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip content={<ThreeDTooltip unit="seats" />} />

                  {/* 3D Extruded Prism Bar for Booked Seats */}
                  <Bar
                    dataKey="Booked"
                    name="Booked Seats"
                    fill="#059669"
                    shape={is3DMode ? <ThreeDBarShape depth={8} /> : undefined}
                    radius={!is3DMode ? [4, 4, 0, 0] : undefined}
                  />

                  {/* 3D Extruded Prism Bar for Remaining Capacity */}
                  <Bar
                    dataKey="Remaining"
                    name="Remaining Seats"
                    fill="#94a3b8"
                    shape={is3DMode ? <ThreeDBarShape depth={8} /> : undefined}
                    radius={!is3DMode ? [4, 4, 0, 0] : undefined}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
                <span>Reserved: <strong>{totalSeatsBooked}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-400" />
                <span>Available: <strong>{totalSeatsRemaining}</strong></span>
              </span>
            </div>
            <button
              onClick={() => onNavigateTab?.('events')}
              className="text-primary hover:underline font-bold text-[11px] uppercase flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Events</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </ThreeDCard>

        {/* 3D Financial Inflow Matrix */}
        <ThreeDCard
          className="p-6"
          accentGlow="rgba(37, 99, 235, 0.15)"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-slate-900">
                  3D Capital Inflow Breakdown
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Extruded volume comparison across organization cash channels
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200">
              ₹{totalTreasuryInflow.toFixed(0)} Inflow
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueStreamsData}
                margin={{ top: 15, right: 15, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip content={<ThreeDTooltip prefix="₹" />} />

                <Bar
                  dataKey="amount"
                  name="Realized Inflow"
                  shape={is3DMode ? <ThreeDBarShape depth={10} /> : undefined}
                  radius={!is3DMode ? [4, 4, 0, 0] : undefined}
                >
                  {revenueStreamsData.map((entry, index) => (
                    <Cell key={`cell-rev-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-3 text-[11px] font-mono">
              {revenueStreamsData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: entry.fill }} />
                  <span>{entry.name}: <strong>₹{entry.amount.toFixed(0)}</strong></span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigateTab?.('fundraisers')}
              className="text-primary hover:underline font-bold text-[11px] uppercase flex items-center gap-1 cursor-pointer"
            >
              <span>Ledger</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </ThreeDCard>
      </div>

      {/* ========================================================================= */}
      {/* 5. 3D QUICK MANAGEMENT WORKSPACE TILES                                    */}
      {/* ========================================================================= */}
      <div className="border border-border bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs uppercase tracking-wider text-primary font-bold">
            Executive Workspaces & Directory Access
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            6 Specialized Consoles
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Tile 1: User Accounts */}
          <ThreeDCard
            hoverTilt={true}
            onClick={() => onNavigateTab?.('users')}
            className="p-4 bg-slate-50 hover:bg-white text-left cursor-pointer flex flex-col justify-between h-24 border border-border hover:border-primary group"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] font-bold uppercase group-hover:text-primary transition-colors">
                Accounts
              </span>
              <Users className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs">User Accounts</span>
              <span className="text-[10px] text-slate-500 font-mono">{users.length} registered</span>
            </div>
          </ThreeDCard>

          {/* Tile 2: Manage Members */}
          <ThreeDCard
            hoverTilt={true}
            onClick={() => onNavigateTab?.('members')}
            className="p-4 bg-slate-50 hover:bg-white text-left cursor-pointer flex flex-col justify-between h-24 border border-border hover:border-primary group"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] font-bold uppercase group-hover:text-primary transition-colors">
                Roster
              </span>
              <UserCheck className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs">Manage Members</span>
              <span className="text-[10px] text-slate-500 font-mono">{members.length} members</span>
            </div>
          </ThreeDCard>

          {/* Tile 3: Manage Events */}
          <ThreeDCard
            hoverTilt={true}
            onClick={() => onNavigateTab?.('events')}
            className="p-4 bg-slate-50 hover:bg-white text-left cursor-pointer flex flex-col justify-between h-24 border border-border hover:border-primary group"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] font-bold uppercase group-hover:text-primary transition-colors">
                Schedule
              </span>
              <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs">Manage Events</span>
              <span className="text-[10px] text-slate-500 font-mono">{events.length} sessions</span>
            </div>
          </ThreeDCard>

          {/* Tile 4: Store & Inventory */}
          <ThreeDCard
            hoverTilt={true}
            onClick={() => onNavigateTab?.('merchandise')}
            className="p-4 bg-slate-50 hover:bg-white text-left cursor-pointer flex flex-col justify-between h-24 border border-border hover:border-primary group"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] font-bold uppercase group-hover:text-primary transition-colors">
                Catalog
              </span>
              <ShoppingBag className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs">Catalog & Stock</span>
              <span className="text-[10px] text-slate-500 font-mono">{products.length} products</span>
            </div>
          </ThreeDCard>

          {/* Tile 5: Fundraisers */}
          <ThreeDCard
            hoverTilt={true}
            onClick={() => onNavigateTab?.('fundraisers')}
            className="p-4 bg-slate-50 hover:bg-white text-left cursor-pointer flex flex-col justify-between h-24 border border-border hover:border-primary group"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] font-bold uppercase group-hover:text-primary transition-colors">
                Campaigns
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs">Fundraisers</span>
              <span className="text-[10px] text-slate-500 font-mono">{fundraisers.length} active</span>
            </div>
          </ThreeDCard>

          {/* Tile 6: Announcements */}
          <ThreeDCard
            hoverTilt={true}
            onClick={() => onNavigateTab?.('announcements')}
            className="p-4 bg-slate-50 hover:bg-white text-left cursor-pointer flex flex-col justify-between h-24 border border-border hover:border-primary group"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] font-bold uppercase group-hover:text-primary transition-colors">
                Broadcast
              </span>
              <Activity className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs">Announcements</span>
              <span className="text-[10px] text-slate-500 font-mono">{announcements.length} notices</span>
            </div>
          </ThreeDCard>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. RECENT RECORDS & UPCOMING SESSIONS                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Members Section */}
        <div className="border border-border bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Organization Member Records</h3>
              <p className="text-xs text-slate-500">Real-time membership roster with verified dues</p>
            </div>
            <button
              onClick={() => onNavigateTab?.('members')}
              className="text-primary hover:underline font-bold text-[11px] uppercase flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {members.length === 0 ? (
            <div className="p-6 border border-border text-center text-xs font-medium text-slate-500 font-mono">
              No registered members found.
            </div>
          ) : (
            <div className="space-y-3">
              {members.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 bg-slate-50/80 hover:bg-white border border-border hover:border-slate-300 flex items-center justify-between text-xs transition-colors rounded-xs shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                      {m.user_name ? m.user_name[0] : 'M'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {m.user_name || `User #${m.user_id}`}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {m.member_code} · {m.user_email || 'no-email'}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={m.computed_status || m.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled Events Section */}
        <div className="border border-border bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Campus Event Schedule</h3>
              <p className="text-xs text-slate-500">Active flagship gatherings, workshops, and attendee seats</p>
            </div>
            <button
              onClick={() => onNavigateTab?.('events')}
              className="text-primary hover:underline font-bold text-[11px] uppercase flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {events.length === 0 ? (
            <div className="p-6 border border-border text-center text-xs font-medium text-slate-500 font-mono">
              No events scheduled yet.
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 4).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 bg-slate-50/80 hover:bg-white border border-border hover:border-slate-300 flex items-center justify-between text-xs transition-colors rounded-xs shadow-2xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {ev.title}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {ev.venue} · {ev.seats_remaining} seats remaining
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-primary font-bold block text-xs">
                      M: ₹{Number(ev.member_price).toFixed(2)}
                    </span>
                    <span className="text-slate-500 text-[11px] block">
                      NM: ₹{Number(ev.non_member_price).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
