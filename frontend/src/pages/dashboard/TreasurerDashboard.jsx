import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardPageHeader from '../../components/dashboard/DashboardPageHeader';
import { DashboardLoadingState } from '../../components/dashboard/DashboardLoadingState';
import { DashboardErrorState } from '../../components/dashboard/DashboardErrorState';
import {
  FinanceSummary,
  FinanceTransactionTable,
  FinanceOwingList,
  ExpenseApprovalList,
  FundraiserIncomeSection,
} from '../../components/dashboard/treasurer';
import financeService from '../../services/finance.service';
import authService from '../../services/auth.service';
import { 
  DollarSign, 
  Receipt, 
  AlertCircle, 
  HeartHandshake,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';

export const TreasurerDashboard = () => {
  const user = authService.getStoredUser();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from current URL pathname
  const getTabFromPath = (pathname) => {
    if (pathname.includes('/expenses')) return 'expenses';
    if (pathname.includes('/owing')) return 'owing';
    if (pathname.includes('/fundraisers')) return 'fundraisers';
    return 'ledger';
  };

  // Navigation Tabs: 'ledger' | 'expenses' | 'owing' | 'fundraisers'
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));

  // Sync activeTab whenever the route changes (e.g. sidebar navigation)
  useEffect(() => {
    const tabFromUrl = getTabFromPath(location.pathname);
    setActiveTab(tabFromUrl);
  }, [location.pathname]);

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
        financeService.getTransactions(),
        financeService.getExpenses(),
        financeService.getOwing(),
        financeService.getFundraisers(),
      ]);

      // 1. Summary
      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        const s = summaryRes.value.data || summaryRes.value;
        setSummary(s);
      }

      // 2. Transactions
      if (transactionsRes.status === 'fulfilled' && transactionsRes.value) {
        const t = transactionsRes.value.data || transactionsRes.value || [];
        setTransactions(Array.isArray(t) ? t : []);
      }

      // 3. Expenses
      if (expensesRes.status === 'fulfilled' && expensesRes.value) {
        const e = expensesRes.value.data || expensesRes.value || [];
        setExpenses(Array.isArray(e) ? e : []);
      }

      // 4. Owing Members
      if (owingRes.status === 'fulfilled' && owingRes.value) {
        const o = owingRes.value.data || owingRes.value || [];
        setOwingMembers(Array.isArray(o) ? o : []);
      }

      // 5. Fundraisers
      if (fundraisersRes.status === 'fulfilled' && fundraisersRes.value) {
        const f = fundraisersRes.value.data || fundraisersRes.value || [];
        setFundraisers(Array.isArray(f) ? f : []);
      }
    } catch (err) {
      console.error('Error loading financial dashboard:', err);
      setError('Unable to load authoritative financial data from the backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  // Action: Approve Expense
  const handleApproveExpense = async (id) => {
    try {
      setProcessing(true);
      await financeService.approveExpense(id);
      showToast('Expense claim approved successfully.');
      await loadFinancialData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to approve expense.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Action: Reject Expense
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

  // Action: Reimburse Expense
  const handleReimburseExpense = async (id, paymentMode) => {
    try {
      setProcessing(true);
      await financeService.reimburseExpense(id, paymentMode);
      showToast('Expense reimbursed! Outgoing entry logged in transaction ledger.');
      await loadFinancialData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to reimburse expense.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Action: Submit New Expense Claim
  const handleSubmitExpense = async (data) => {
    try {
      setProcessing(true);
      await financeService.createExpense(data);
      showToast('Expense claim submitted for review.');
      await loadFinancialData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to submit expense.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Action: Create Fundraiser Campaign
  const handleCreateFundraiser = async (data) => {
    try {
      setProcessing(true);
      await financeService.createFundraiser(data);
      showToast('Fundraising campaign created successfully.');
      await loadFinancialData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to create fundraiser.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Action: Record Fundraiser Income Batch
  const handleAddFundraiserIncome = async (id, data) => {
    try {
      setProcessing(true);
      await financeService.addFundraiserIncome(id, data);
      showToast('Fundraiser revenue recorded and posted directly to transaction ledger.');
      await loadFinancialData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to record fundraiser revenue.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const pendingExpensesCount = expenses.filter((e) => e.status === 'pending').length;

  const tabs = [
    {
      id: 'ledger',
      label: `Transaction Ledger (${transactions.length})`,
      icon: DollarSign,
    },
    {
      id: 'expenses',
      label: `Expense Claims ${pendingExpensesCount > 0 ? `(${pendingExpensesCount} Pending)` : `(${expenses.length})`}`,
      icon: Receipt,
    },
    {
      id: 'owing',
      label: `Who Still Owes (${owingMembers.length})`,
      icon: AlertCircle,
    },
    {
      id: 'fundraisers',
      label: `Fundraisers (${fundraisers.length})`,
      icon: HeartHandshake,
    },
  ];

  return (
    <DashboardShell activeRole={user?.role || 'treasurer'}>
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

      {/* Page Header */}
      <DashboardPageHeader
        title="Financial Management & Treasury"
        subtitle={`Welcome, ${user?.name || 'Treasurer'}. Authoritative financial transactions ledger, expense approvals, dues tracking, and campaign revenue.`}
        badge="Executive Finance Authority"
      />

      {loading ? (
        <DashboardLoadingState message="Connecting to authoritative financial ledger..." />
      ) : error ? (
        <DashboardErrorState
          title="Financial Ledger Unavailable"
          description={error}
          onRetry={loadFinancialData}
        />
      ) : (
        <div className="space-y-8">
          {/* Authoritative Financial Overview Summary */}
          <FinanceSummary summary={summary} />

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
