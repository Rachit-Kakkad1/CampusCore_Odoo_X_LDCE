// frontend/src/components/dashboard/treasurer/ExpenseApprovalList.jsx
import React, { useState } from 'react';
import { DashboardTable } from '../DashboardTable';
import { DashboardEmptyState } from '../DashboardEmptyState';
import { StatusBadge } from '../StatusBadge';
import { ActionButton } from '../ActionButton';
import { ExpenseDetails } from './ExpenseDetails';
import Pagination from '../../common/Pagination';
import { 
  FileText, 
  Plus, 
  Check, 
  X, 
  DollarSign, 
  Eye, 
  Filter,
  Receipt
} from 'lucide-react';

/**
 * ExpenseApprovalList Component
 * Displays submitted reimbursement claims with approval and disbursement workflows.
 *
 * @param {Object} props
 * @param {Array} props.expenses - Expenses from backend
 * @param {Function} props.onApprove - Approval callback
 * @param {Function} props.onReject - Rejection callback
 * @param {Function} props.onReimburse - Reimbursement callback
 * @param {Function} props.onSubmitExpense - Submit new expense claim callback
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.processing - Processing state
 */
export const ExpenseApprovalList = ({
  expenses = [],
  onApprove,
  onReject,
  onReimburse,
  onSubmitExpense,
  loading = false,
  processing = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // New Expense Form State
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newReceiptUrl, setNewReceiptUrl] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const filteredExpenses = expenses.filter((exp) => {
    if (selectedStatus === 'ALL') return true;
    return exp.status?.toLowerCase() === selectedStatus.toLowerCase();
  });

  const paginatedExpenses = filteredExpenses.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!newAmount || !newDescription) return;

    try {
      setFormSubmitting(true);
      await onSubmitExpense({
        amount: parseFloat(newAmount),
        description: newDescription,
        receipt_url: newReceiptUrl || null,
      });
      setShowNewExpenseModal(false);
      setNewAmount('');
      setNewDescription('');
      setNewReceiptUrl('');
    } finally {
      setFormSubmitting(false);
    }
  };

  const pendingCount = expenses.filter((e) => e.status === 'pending').length;
  const approvedCount = expenses.filter((e) => e.status === 'approved').length;

  return (
    <div className="space-y-4">
      {/* Top Header & New Expense Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-border">
        {/* Status Tab Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: `All (${expenses.length})` },
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'approved', label: `Approved (${approvedCount})` },
            { id: 'reimbursed', label: 'Reimbursed' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedStatus(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider border transition-colors ${
                selectedStatus === tab.id
                  ? 'border-primary bg-primary text-white font-bold'
                  : 'border-border bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Submit Claim Trigger */}
        <ActionButton
          variant="primary"
          onClick={() => setShowNewExpenseModal(true)}
          className="shrink-0"
        >
          <Plus className="w-3.5 h-3.5 mr-1 inline" />
          Submit Expense Claim
        </ActionButton>
      </div>

      {/* Main Expenses Table */}
      {filteredExpenses.length === 0 && !loading ? (
        <DashboardEmptyState
          title="No Expense Claims Found"
          description={
            selectedStatus !== 'ALL'
              ? `There are no expenses with status "${selectedStatus}".`
              : 'No expense reimbursement claims have been logged yet.'
          }
        />
      ) : (
        <div className="space-y-3">
          <DashboardTable
            headers={['Claim ID', 'Claimant', 'Description / Purpose', 'Amount', 'Status', 'Submitted', 'Actions']}
          >
            {paginatedExpenses.map((exp) => {
              const amountFormatted = Number(exp.amount || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              const subDate = exp.created_at
                ? new Date(exp.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '—';

              return (
                <tr
                  key={exp.id}
                  className="hover:bg-slate-50/80 transition-colors border-b border-border/60"
                >
                  {/* 1. Claim ID */}
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">
                    EXP-#{String(exp.id).padStart(4, '0')}
                  </td>

                  {/* 2. Claimant Details */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">
                        {exp.submitter_name}
                      </span>
                      <span className="font-mono text-[10px] text-muted">
                        {exp.submitter_email}
                      </span>
                    </div>
                  </td>

                  {/* 3. Description */}
                  <td className="px-4 py-3 text-xs text-slate-800 max-w-xs truncate">
                    {exp.description}
                  </td>

                  {/* 4. Amount */}
                  <td className="px-4 py-3 font-mono text-sm font-bold text-slate-900">
                    ₹{amountFormatted}
                  </td>

                  {/* 5. Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={exp.status?.toUpperCase()} />
                  </td>

                  {/* 6. Submitted Date */}
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                    {subDate}
                  </td>

                  {/* 7. Action Buttons */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {/* View Details */}
                      <button
                        onClick={() => setSelectedExpense(exp)}
                        title="View Details"
                        className="p-1.5 border border-border bg-slate-50 hover:bg-slate-100 text-slate-700 rounded"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Pending Quick Approve */}
                      {exp.status === 'pending' && (
                        <button
                          onClick={() => onApprove(exp.id)}
                          disabled={processing}
                          title="Approve Claim"
                          className="p-1.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Approved Quick Reimburse Trigger */}
                      {exp.status === 'approved' && (
                        <button
                          onClick={() => setSelectedExpense(exp)}
                          disabled={processing}
                          title="Issue Reimbursement"
                          className="px-2 py-1 font-mono text-[10px] uppercase font-bold bg-[#5F3F56] text-white hover:bg-[#4a2f42] rounded"
                        >
                          Reimburse
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </DashboardTable>

          {filteredExpenses.length > pageSize && (
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(filteredExpenses.length / pageSize)}
              totalItems={filteredExpenses.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          )}
        </div>
      )}

      {/* Selected Expense Details Modal */}
      {selectedExpense && (
        <ExpenseDetails
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          onApprove={async (id) => {
            await onApprove(id);
            setSelectedExpense(null);
          }}
          onReject={async (id) => {
            await onReject(id);
            setSelectedExpense(null);
          }}
          onReimburse={async (id, mode) => {
            await onReimburse(id, mode);
            setSelectedExpense(null);
          }}
          processing={processing}
        />
      )}

      {/* Submit New Expense Modal */}
      {showNewExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-border w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-xl font-bold text-slate-900">
                  Submit Expense Claim
                </h3>
              </div>
              <button
                onClick={() => setShowNewExpenseModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-bold mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 1500.00"
                  className="w-full p-2.5 bg-slate-50 border border-border font-mono text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-bold mb-1">
                  Description / Justification *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Refreshments for campus guest lecture assembly"
                  className="w-full p-2.5 bg-slate-50 border border-border font-sans text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-bold mb-1">
                  Receipt URL / Note (Optional)
                </label>
                <input
                  type="text"
                  value={newReceiptUrl}
                  onChange={(e) => setNewReceiptUrl(e.target.value)}
                  placeholder="https://drive.google.com/receipt.pdf or Receipt #8492"
                  className="w-full p-2.5 bg-slate-50 border border-border font-mono text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <ActionButton
                  variant="ghost"
                  onClick={() => setShowNewExpenseModal(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  variant="primary"
                  type="submit"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Submitting...' : 'Submit Claim'}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseApprovalList;
