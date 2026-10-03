// frontend/src/pages/dashboard/TreasurerDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardPageHeader from '../../components/dashboard/DashboardPageHeader';
import { DashboardLoadingState } from '../../components/dashboard/DashboardLoadingState';
import { DashboardErrorState } from '../../components/dashboard/DashboardErrorState';
import PageTabs from '../../components/dashboard/PageTabs';
import {
  FinanceTransactionTable,
  FinanceOwingList,
  ExpenseApprovalList,
  FundraiserIncomeSection,
} from '../../components/dashboard/treasurer';
import {
  ThreeDCard,
  ThreeDBarShape,
} from '../../components/dashboard/charts/ThreeDCharts';
import financeService from '../../services/finance.service';
import authService from '../../services/auth.service';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  AlertCircle,
  HeartHandshake,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Wallet,
  ArrowUpRight,
} from 'lucide-react';

const STREAM_COLORS = {
  membership: '#5F3F56',
  ticket: '#10b981',
  merchandise: '#3b82f6',
  fundraiser: '#f59e0b',
  default: '#8b5cf6',
};

const STREAM_NAMES = {
  membership: 'Membership Dues',
  ticket: 'Event Tickets',
  merchandise: 'Merchandise Sales',
  fundraiser: 'Donations & Drives',
};

export const TreasurerDashboard = () => {
  const user = authService.getStoredUser();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL pathname
  const getTabFromPath = useCallback((pathname) => {
    if (pathname.includes('/expenses')) return 'expenses';
    if (pathname.includes('/owing')) return 'owing';
    if (pathname.includes('/fundraisers')) return 'fundraisers';
    return 'ledger';
  }, []);

  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname, getTabFromPath]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab === 'ledger') {
      navigate('/dashboard/finance');
    } else {
      navigate(`/dashboard/finance/${newTab}`);
    }
  };

  // Business Data States
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [owingMembers, setOwingMembers] = useState([]);
  const [fundraisers, setFundraisers] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadFinancialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        summaryRes,
        transactionsRes,
        expensesRes,
        owingRes,
        fundraisersRes,
      ] = await Promise.allSettled([
        financeService.getOverview(),
        financeService.getTransactions({ limit: 100 }),
        financeService.getExpenses(),
        financeService.getOwing(),
        financeService.getFundraisers(),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        const s = summaryRes.value.data || summaryRes.value;
        setSummary(s);
      }

      if (transactionsRes.status === 'fulfilled' && transactionsRes.value) {
        const t = transactionsRes.value.data || transactionsRes.value || [];
        setTransactions(Array.isArray(t) ? t : []);
      }

      if (expensesRes.status === 'fulfilled' && expensesRes.value) {
        const e = expensesRes.value.data || expensesRes.value || [];
        setExpenses(Array.isArray(e) ? e : []);
      }

      if (owingRes.status === 'fulfilled' && owingRes.value) {
        const o = owingRes.value.data || owingRes.value || [];
        setOwingMembers(Array.isArray(o) ? o : []);
      }

      if (fundraisersRes.status === 'fulfilled' && fundraisersRes.value) {
        const f = fundraisersRes.value.data || fundraisersRes.value || [];
        setFundraisers(Array.isArray(f) ? f : []);
      }
    } catch (err) {
      console.error('Error loading financial dashboard:', err);
      setError('Unable to load authoritative financial data from backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  // Handlers for expense claims
  const handleApproveExpense = async (id) => {
    try {
      setProcessing(true);
      await financeService.approveExpense(id, 'approved');
      showToast('Expense claim approved successfully.');
      await loadFinancialData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to approve expense.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectExpense = async (id) => {
    try {
      setProcessing(true);
      await financeService.rejectExpense(id);
      showToast('Expense claim rejected.', 'info');
      await loadFinancialData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to reject expense.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReimburseExpense = async (id, paymentMode) => {
    try {
      setProcessing(true);
      await financeService.reimburseExpense(id, paymentMode);
      showToast('Expense reimbursed and recorded in transaction ledger.');
      await loadFinancialData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to reimburse expense.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitExpense = async (data) => {
    try {
      setProcessing(true);
      await financeService.createExpense(data);
      showToast('New expense claim submitted successfully.');
      await loadFinancialData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to submit expense claim.', 'error');
      throw err;
    } finally {
      setProcessing(false);
    }
  };

  // Handlers for fundraisers
  const handleCreateFundraiser = async (data) => {
    try {
      setProcessing(true);
      await financeService.createFundraiser(data);
      showToast('Fundraiser campaign created successfully.');
      await loadFinancialData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to create fundraiser.', 'error');
      throw err;
    } finally {
      setProcessing(false);
    }
  };

  const handleAddFundraiserIncome = async (fundraiserId, data) => {
    try {
      setProcessing(true);
      await financeService.addFundraiserIncome(fundraiserId, data);
      showToast('Fundraiser income batch recorded in financial ledger.');
      await loadFinancialData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to record income.', 'error');
      throw err;
    } finally {
      setProcessing(false);
    }
  };

  // Chart Data: 3D Revenue Streams Bar Chart
  const streamChartData = useMemo(() => {
    if (!summary?.stream_breakdown) return [];
    return summary.stream_breakdown.map((item) => ({
      key: item.source_type,
      name: STREAM_NAMES[item.source_type] || item.source_type,
      total: parseFloat(item.total || 0),
      count: parseInt(item.count || 0, 10),
      fill: STREAM_COLORS[item.source_type] || STREAM_COLORS.default,
    }));
  }, [summary]);

  // Chart Data: Income vs Outflow Pie / Donut
  const cashflowDonutData = useMemo(() => {
    const income = parseFloat(summary?.total_income || 0);
    const expensesVal = parseFloat(summary?.total_expenses || 0);
    const pendingVal = parseFloat(summary?.pending_expenses?.total || summary?.pending_expenses_total || 0);

    const data = [
      { name: 'Realized Revenue', value: income, fill: '#10b981' },
      { name: 'Disbursed Expenses', value: expensesVal, fill: '#ef4444' },
    ];
    if (pendingVal > 0) {
      data.push({ name: 'Pending Claims', value: pendingVal, fill: '#f59e0b' });
    }
    return data;
  }, [summary]);

  const netBalance = parseFloat(summary?.balance || 0);
  const totalIncome = parseFloat(summary?.total_income || 0);
  const pendingClaimsTotal = parseFloat(summary?.pending_expenses?.total || summary?.pending_expenses_total || 0);
  const pendingDuesTotal = parseFloat(summary?.pending_dues?.total || summary?.unpaid_dues_total || 0);

  const tabs = [
    { id: 'ledger', label: `General Ledger (${transactions.length})`, icon: DollarSign },
    { id: 'expenses', label: `Expense Claims (${expenses.length})`, icon: Receipt },
    { id: 'owing', label: `Who Still Owes (${owingMembers.length})`, icon: AlertCircle },
    { id: 'fundraisers', label: `Fundraisers (${fundraisers.length})`, icon: HeartHandshake },
  ];

  return (
    <DashboardShell activeRole={user?.role || 'treasurer'}>
      <DashboardPageHeader
        title="Financial Management & Treasury"
        subtitle={`Welcome, ${user?.name || 'Treasurer'}. Authoritative financial transactions ledger, expense approvals, dues tracking, and campaign revenue.`}
        badge="Executive Finance Authority"
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`mb-6 p-4 border font-mono text-xs flex items-center justify-between transition-all ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : toast.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? (
              <XCircle className="w-4 h-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="font-bold underline uppercase ml-4 text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading && !summary ? (
        <DashboardLoadingState message="Connecting to authoritative financial ledger..." />
      ) : error && !summary ? (
        <DashboardErrorState
          title="Financial Ledger Unavailable"
          description={error}
          onRetry={loadFinancialData}
        />
      ) : (
        <div className="space-y-8">
          {/* ========================================================================= */}
          {/* 1. 3D TELEMETRY CARDS                                                     */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                  <span>{summary?.pending_expenses?.count || summary?.pending_expenses_count || 0} claims awaiting audit</span>
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
                  <span>{summary?.pending_dues?.count || summary?.unpaid_dues_count || 0} pending dues</span>
                </div>
              </div>
            </ThreeDCard>
          </div>

          {/* ========================================================================= */}
          {/* 2. HIGH-VISIBILITY 3D CHARTS SECTION                                      */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main 3D Revenue Streams Bar Chart */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm p-6 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2 mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-[#5F3F56] rounded-xs inline-block" />
                    Revenue Streams Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Realized inflow distribution across organization channels
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-mono text-[10px] rounded-xs font-semibold self-start sm:self-auto">
                  PostgreSQL Authoritative
                </span>
              </div>

              {streamChartData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 font-mono text-xs">
                  <DollarSign className="w-8 h-8 mb-2 opacity-50 text-slate-400" />
                  <span>No income records registered in current ledger</span>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={streamChartData}
                      margin={{ top: 20, right: 25, left: 10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₹${v}`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded shadow-lg border border-slate-700 text-xs font-mono">
                                <div className="font-bold text-amber-400 mb-1">{d.name}</div>
                                <div>Total: ₹{d.total.toLocaleString('en-IN')}</div>
                                <div className="text-slate-400 text-[10px] mt-0.5">{d.count} Transactions</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="total"
                        shape={<ThreeDBarShape depth={10} />}
                      >
                        {streamChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Income vs Outflow Donut */}
            <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 pb-4 border-b border-slate-100">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs inline-block" />
                  Cashflow Balance
                </h3>
                <div className="h-52 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cashflowDonutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                      >
                        {cashflowDonutData.map((entry, index) => (
                          <Cell key={`donut-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`}
                        contentStyle={{
                          background: '#0f172a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Realized Revenue
                  </span>
                  <span className="font-bold text-slate-900">₹{totalIncome.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Disbursed Expenses
                  </span>
                  <span className="font-bold text-slate-900">
                    ₹{parseFloat(summary?.total_expenses || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. OPERATIONAL WORKSPACE TABS                                             */}
          {/* ========================================================================= */}
          <div>
            <PageTabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={handleTabChange}
            />
          </div>

          {/* Tab 1: Central Financial Transaction Ledger */}
          {activeTab === 'ledger' && (
            <FinanceTransactionTable
              transactions={transactions}
              loading={loading}
            />
          )}

          {/* Tab 2: Expense Claims & Reimbursements */}
          {activeTab === 'expenses' && (
            <ExpenseApprovalList
              expenses={expenses}
              onApprove={handleApproveExpense}
              onReject={handleRejectExpense}
              onReimburse={handleReimburseExpense}
              onSubmitExpense={handleSubmitExpense}
              loading={loading}
              processing={processing}
            />
          )}

          {/* Tab 3: Who Still Owes (Pending Membership Dues) */}
          {activeTab === 'owing' && (
            <FinanceOwingList
              owingMembers={owingMembers}
              loading={loading}
            />
          )}

          {/* Tab 4: Fundraisers & Income Batches */}
          {activeTab === 'fundraisers' && (
            <FundraiserIncomeSection
              fundraisers={fundraisers}
              onCreateFundraiser={handleCreateFundraiser}
              onAddIncome={handleAddFundraiserIncome}
              loading={loading}
              processing={processing}
            />
          )}
        </div>
      )}
    </DashboardShell>
  );
};

export default TreasurerDashboard;
