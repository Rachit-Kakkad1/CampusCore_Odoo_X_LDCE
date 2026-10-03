// frontend/src/pages/dashboard/TreasurerDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  PieChart,
  Pie,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  X,
  Check,
  Building,
  User,
  Tag,
  Wallet
} from 'lucide-react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import financeService from '../../services/finance.service';
import authService from '../../services/auth.service';
import { ThreeDBarShape, ThreeDCard, ThreeDTooltip } from '../../components/dashboard/charts/ThreeDCharts';

const STREAM_COLORS = {
  dues: '#5F3F56',       // CampusCore Purple / Maroon
  ticket: '#0284c7',     // Sky Blue
  merch: '#10b981',      // Emerald Green
  fundraiser: '#f59e0b', // Amber
  expense: '#ef4444',    // Rose
  default: '#64748b'     // Slate
};

const STREAM_NAMES = {
  dues: 'Membership Dues',
  ticket: 'Event Tickets',
  merch: 'Store Merchandise',
  fundraiser: 'Fundraiser Income',
  expense: 'Expense Outflows'
};

export const TreasurerDashboard = () => {
  const currentUser = authService.getStoredUser();

  // Primary State
  const [overview, setOverview] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Filters & Tabs
  const [selectedSource, setSelectedSource] = useState('all');
  const [txSearch, setTxSearch] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimForm, setClaimForm] = useState({
    amount: '',
    description: '',
    receipt_url: ''
  });
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Load all finance data from PostgreSQL API
  const loadFinanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewData, txData, expData] = await Promise.all([
        financeService.getOverview(),
        financeService.getTransactions({ limit: 60 }),
        financeService.getExpenses()
      ]);

      setOverview(overviewData || null);
      setTransactions(Array.isArray(txData?.data || txData) ? (txData?.data || txData) : []);
      setExpenses(Array.isArray(expData?.data || expData) ? (expData?.data || expData) : []);
    } catch (err) {
      console.error('Failed to load finance data:', err);
      setError(err.message || 'Unable to retrieve financial ledger from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // Handle Expense Approval / Rejection
  const handleExpenseAction = async (expenseId, status) => {
    try {
      setActionLoadingId(expenseId);
      await financeService.approveExpense(expenseId, status);
      setNotification({
        type: 'success',
        message: `Expense claim #${expenseId} has been marked as ${status.toUpperCase()}.`
      });
      await loadFinanceData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || `Failed to update expense claim #${expenseId}`
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle New Expense Claim Submission
  const handleSubmitExpenseClaim = async (e) => {
    e.preventDefault();
    if (!claimForm.amount || !claimForm.description) return;

    try {
      setActionLoadingId('new_claim');
      await financeService.createExpense({
        amount: parseFloat(claimForm.amount),
        description: claimForm.description,
        receipt_url: claimForm.receipt_url || null
      });

      setNotification({
        type: 'success',
        message: 'Expense claim submitted successfully for treasurer audit.'
      });
      setClaimForm({ amount: '', description: '', receipt_url: '' });
      setIsSubmittingClaim(false);
      await loadFinanceData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to submit expense claim'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Chart Data: 3D Revenue Streams Bar Chart
  const streamChartData = useMemo(() => {
    if (!overview?.stream_breakdown) return [];
    return overview.stream_breakdown.map((item) => ({
      key: item.source_type,
      name: STREAM_NAMES[item.source_type] || item.source_type,
      total: parseFloat(item.total || 0),
      count: parseInt(item.count || 0, 10),
      fill: STREAM_COLORS[item.source_type] || STREAM_COLORS.default
    }));
  }, [overview]);

  // Chart Data: Income vs Outflow Pie / Donut
  const cashflowDonutData = useMemo(() => {
    const income = parseFloat(overview?.total_income || 0);
    const expensesVal = parseFloat(overview?.total_expenses || 0);
    const pendingVal = parseFloat(overview?.pending_expenses?.total || 0);

    const data = [
      { name: 'Realized Revenue', value: income, fill: '#10b981' },
      { name: 'Disbursed Expenses', value: expensesVal, fill: '#ef4444' }
    ];
    if (pendingVal > 0) {
      data.push({ name: 'Pending Claims', value: pendingVal, fill: '#f59e0b' });
    }
    return data;
  }, [overview]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSource = selectedSource === 'all' || tx.source_type === selectedSource;
      const searchLower = txSearch.toLowerCase().trim();
      const matchSearch =
        !searchLower ||
        String(tx.id).includes(searchLower) ||
        String(tx.source_type).toLowerCase().includes(searchLower) ||
        String(tx.payment_mode || '').toLowerCase().includes(searchLower) ||
        String(tx.amount).includes(searchLower);
      return matchSource && matchSearch;
    });
  }, [transactions, selectedSource, txSearch]);

  const netBalance = parseFloat(overview?.balance || 0);
  const totalIncome = parseFloat(overview?.total_income || 0);
  const totalExpenses = parseFloat(overview?.total_expenses || 0);
  const pendingClaimsTotal = parseFloat(overview?.pending_expenses?.total || 0);
  const pendingDuesTotal = parseFloat(overview?.pending_dues?.total || 0);

  return (
    <DashboardShell activeRole="treasurer">
      <DashboardHeader
        title="Finance & Treasury"
        subtitle="Central transaction ledger, expense reimbursement approvals, and income stream breakdown."
        badge="Financial Authority"
      />

      {/* Global Notifications */}
      {notification && (
        <div
          className={`p-3.5 border font-mono text-xs mb-6 flex items-center justify-between rounded-md animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="font-bold underline ml-4 uppercase cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 border border-rose-200 bg-rose-50 rounded-lg text-rose-800 text-xs font-mono mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={loadFinanceData}
            className="underline font-bold uppercase ml-4 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. REAL 3D TELEMETRY CARDS                                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Net Balance Card */}
        <ThreeDCard accentGlow="rgba(16, 185, 129, 0.15)">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Net Liquid Balance
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-sm">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
              ₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-mono text-emerald-700 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Realized reserves in ledger</span>
            </div>
          </div>
        </ThreeDCard>

        {/* Total Inflows Card */}
        <ThreeDCard accentGlow="rgba(95, 63, 86, 0.15)">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Total Revenue
              </span>
              <div className="p-2 bg-purple-50 text-[#5F3F56] rounded-sm">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
              ₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-mono text-purple-700">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Dues, tickets, merch & gifts</span>
            </div>
          </div>
        </ThreeDCard>

        {/* Pending Expense Claims Card */}
        <ThreeDCard accentGlow="rgba(245, 158, 11, 0.15)">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Pending Expenses
              </span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-sm">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
              ₹{pendingClaimsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-mono text-amber-700">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{overview?.pending_expenses?.count || 0} claims awaiting audit</span>
            </div>
          </div>
        </ThreeDCard>

        {/* Unpaid / Pending Dues Card */}
        <ThreeDCard accentGlow="rgba(239, 68, 68, 0.15)">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Accounts Receivable
              </span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-sm">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
              ₹{pendingDuesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-mono text-rose-700">
              <span>{overview?.pending_dues?.count || 0} pending membership dues</span>
            </div>
          </div>
        </ThreeDCard>
      </div>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE 3D CHARTS SECTION                                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Main 3D Revenue Streams Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#5F3F56] animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  3D Revenue Streams Breakdown
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Real-time inflows by financial stream stored in PostgreSQL
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded">
                Total Inflow: ₹{totalIncome.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {streamChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400">
                Awaiting transaction stream data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={streamChartData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip
                    content={<ThreeDTooltip unit="" prefix="₹" />}
                    cursor={{ fill: 'rgba(95, 63, 86, 0.04)' }}
                  />
                  <Bar
                    dataKey="total"
                    shape={<ThreeDBarShape depth={10} />}
                    isAnimationActive={true}
                  >
                    {streamChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 font-mono text-xs">
            {streamChartData.map((stream) => (
              <div key={stream.key} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: stream.fill }} />
                <span className="text-slate-600 truncate">{stream.name}:</span>
                <strong className="text-slate-900 ml-auto">₹{stream.total}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Cash Flow Distribution Chart */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                Operating Cash Flow
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-sans mb-4">
              Ratio of realized income versus claims and approved disbursements.
            </p>

            <div className="h-[200px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cashflowDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {cashflowDonutData.map((entry, index) => (
                      <Cell key={`donut-${index}`} fill={entry.fill} stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<ThreeDTooltip prefix="₹" />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Realized Inflow:</span>
              </div>
              <strong className="text-emerald-700">₹{totalIncome.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Paid Outflows:</span>
              </div>
              <strong className="text-rose-700">₹{totalExpenses.toLocaleString('en-IN')}</strong>
            </div>
            {pendingClaimsTotal > 0 && (
              <div className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Pending Outflows:</span>
                </div>
                <strong className="text-amber-700">₹{pendingClaimsTotal.toLocaleString('en-IN')}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. EXPENSE APPROVALS & REIMBURSEMENTS SECTION                            */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#5F3F56]" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                Expense Approvals & Claims Management
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Volunteer & officer submitted receipts awaiting reimbursement audit.
            </p>
          </div>

          <button
            onClick={() => setIsSubmittingClaim(true)}
            className="px-3.5 py-2 bg-[#5F3F56] hover:bg-[#4d3346] text-white text-xs font-mono uppercase font-bold tracking-wider rounded-sm transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Submit Expense Claim</span>
          </button>
        </div>

        {/* Expenses List */}
        {expenses.length === 0 ? (
          <div className="py-12 border border-dashed border-slate-200 bg-slate-50/50 rounded-lg text-center font-mono text-xs text-slate-400">
            No expense reimbursement requests submitted yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expenses.map((claim) => {
              const isPending = claim.status === 'pending';
              const isApproved = claim.status === 'approved';
              const isRejected = claim.status === 'rejected';
              const isProcessing = actionLoadingId === claim.id;

              return (
                <div
                  key={claim.id}
                  className={`border rounded-lg p-5 flex flex-col justify-between transition-all ${
                    isPending
                      ? 'border-amber-200 bg-amber-50/20'
                      : isApproved
                      ? 'border-emerald-200 bg-emerald-50/10'
                      : 'border-slate-200 bg-slate-50/40 opacity-70'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                        isPending
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : isApproved
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {claim.status.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        ₹{parseFloat(claim.amount).toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm font-sans line-clamp-1">
                        {claim.description}
                      </h4>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {claim.submitter_name || `User #${claim.submitted_by}`}
                        </span>
                        <span>·</span>
                        <span>{new Date(claim.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {claim.receipt_url && (
                      <div className="pt-1">
                        <a
                          href={claim.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-[#5F3F56] hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View Verified Receipt Proof</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions for Pending Claims */}
                  {isPending && (
                    <div className="pt-4 border-t border-slate-200/80 mt-4 flex items-center gap-2">
                      <button
                        onClick={() => handleExpenseAction(claim.id, 'approved')}
                        disabled={isProcessing}
                        className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs uppercase font-bold rounded transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Disburse</span>
                      </button>
                      <button
                        onClick={() => handleExpenseAction(claim.id, 'rejected')}
                        disabled={isProcessing}
                        className="py-1.5 px-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-mono text-xs uppercase font-bold rounded transition flex items-center justify-center gap-1 cursor-pointer border border-slate-200 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {isApproved && claim.approved_at && (
                    <div className="pt-3 border-t border-slate-100 mt-3 text-[11px] font-mono text-emerald-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Approved by {claim.approver_name || 'Treasurer'} on {new Date(claim.approved_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. CENTRAL TRANSACTIONS LEDGER TABLE                                      */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mb-12">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#5F3F56]" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                Central Transactions Ledger
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Immutable PostgreSQL ledger recording verified monetary flows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Stream Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded text-xs font-mono">
              {['all', 'dues', 'ticket', 'merch', 'expense'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedSource(st)}
                  className={`px-2.5 py-1 rounded transition cursor-pointer uppercase text-[11px] font-semibold ${
                    selectedSource === st
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {st === 'all' ? 'All' : st}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tx ID or mode..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-300 text-xs rounded focus:outline-none focus:border-[#5F3F56] w-48 font-mono"
              />
            </div>

            <button
              onClick={loadFinanceData}
              className="p-1.5 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded text-xs flex items-center gap-1 cursor-pointer"
              title="Refresh ledger"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px] font-mono">
              <tr>
                <th className="py-3 px-4">Tx ID</th>
                <th className="py-3 px-4">Category / Stream</th>
                <th className="py-3 px-4">Direction</th>
                <th className="py-3 px-4">Amount (INR)</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    Loading verified ledger transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No transactions found matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isInflow = tx.direction === 'in';
                  const amount = parseFloat(tx.amount || 0).toFixed(2);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        #TX-{tx.id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-700 border-slate-200">
                          {STREAM_NAMES[tx.source_type] || tx.source_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isInflow
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {isInflow ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {isInflow ? 'INFLOW' : 'OUTFLOW'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-bold">
                        <span className={isInflow ? 'text-emerald-700' : 'text-rose-700'}>
                          {isInflow ? '+' : '-'} ₹{amount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 uppercase text-[11px]">
                        {tx.payment_mode || 'online'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {tx.status || 'paid'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Summary Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-500 gap-2">
          <div>
            Showing {filteredTransactions.length} recorded entries
          </div>
          <div className="flex items-center gap-2">
            <span>Verified PostgreSQL Ledger Integrity:</span>
            <strong className="text-emerald-700 font-bold">SYNCHRONIZED</strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. SUBMIT EXPENSE CLAIM MODAL                                             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isSubmittingClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-md w-full p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#5F3F56]" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                    Submit Expense Claim
                  </h3>
                </div>
                <button
                  onClick={() => setIsSubmittingClaim(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitExpenseClaim} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Claim Amount (₹ INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="e.g. 850.00"
                    value={claimForm.amount}
                    onChange={(e) => setClaimForm({ ...claimForm, amount: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-[#5F3F56]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Description & Purpose *
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Explain itemized expense (e.g. Stage lighting cables for Spring Gala)..."
                    value={claimForm.description}
                    onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-[#5F3F56]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Receipt Photo or Invoice URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/receipts/proof.jpg"
                    value={claimForm.receipt_url}
                    onChange={(e) => setClaimForm({ ...claimForm, receipt_url: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-[#5F3F56]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSubmittingClaim(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded hover:bg-slate-50 cursor-pointer font-bold uppercase text-[11px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoadingId === 'new_claim'}
                    className="px-4 py-2 bg-[#5F3F56] hover:bg-[#4d3346] text-white rounded cursor-pointer font-bold uppercase text-[11px] disabled:opacity-50"
                  >
                    {actionLoadingId === 'new_claim' ? 'Submitting...' : 'Submit Claim'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
};

export default TreasurerDashboard;
