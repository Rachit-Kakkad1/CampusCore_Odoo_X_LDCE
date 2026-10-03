// frontend/src/components/dashboard/treasurer/ExpenseReimbursementAction.jsx
import React, { useState } from 'react';
import { ActionButton } from '../ActionButton';
import { Check, X, DollarSign, AlertTriangle, ShieldCheck } from 'lucide-react';

/**
 * ExpenseReimbursementAction Component
 * Handles approval, rejection, and reimbursement workflows with explicit confirmation.
 *
 * @param {Object} props
 * @param {Object} props.expense - Target expense item
 * @param {Function} props.onApprove - Callback for approval
 * @param {Function} props.onReject - Callback for rejection
 * @param {Function} props.onReimburse - Callback for reimbursement
 * @param {boolean} props.processing - Processing state
 */
export const ExpenseReimbursementAction = ({
  expense,
  onApprove,
  onReject,
  onReimburse,
  processing = false,
}) => {
  const [showConfirmReimburse, setShowConfirmReimburse] = useState(false);
  const [paymentMode, setPaymentMode] = useState('online');

  if (!expense) return null;

  const isPending = expense.status === 'pending';
  const isApproved = expense.status === 'approved';
  const isReimbursed = expense.status === 'reimbursed';
  const isRejected = expense.status === 'rejected';

  const amountFormatted = Number(expense.amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleConfirmReimburse = async () => {
    await onReimburse(expense.id, paymentMode);
    setShowConfirmReimburse(false);
  };

  return (
    <div className="space-y-4">
      {/* Primary Action Button Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {isPending && (
          <>
            <ActionButton
              variant="primary"
              onClick={() => onApprove(expense.id)}
              disabled={processing}
              className="bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700"
            >
              <Check className="w-3.5 h-3.5 mr-1 inline" />
              Approve Claim
            </ActionButton>

            <ActionButton
              variant="ghost"
              onClick={() => onReject(expense.id)}
              disabled={processing}
              className="text-rose-700 border-rose-300 hover:bg-rose-50"
            >
              <X className="w-3.5 h-3.5 mr-1 inline" />
              Reject
            </ActionButton>
          </>
        )}

        {isApproved && (
          <>
            <ActionButton
              variant="primary"
              onClick={() => setShowConfirmReimburse(true)}
              disabled={processing}
              className="bg-[#5F3F56] hover:bg-[#4a2f42] text-white"
            >
              <DollarSign className="w-3.5 h-3.5 mr-1 inline" />
              Issue Reimbursement (₹{amountFormatted})
            </ActionButton>

            <ActionButton
              variant="ghost"
              onClick={() => onReject(expense.id)}
              disabled={processing}
              className="text-rose-700 border-rose-300 hover:bg-rose-50 text-xs"
            >
              <X className="w-3.5 h-3.5 mr-1 inline" />
              Revoke & Reject
            </ActionButton>
          </>
        )}

        {isReimbursed && (
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Reimbursed & Dispatched to Central Ledger</span>
          </div>
        )}

        {isRejected && (
          <div className="flex items-center gap-2 text-xs font-mono text-rose-800 bg-rose-50 border border-rose-200 px-3 py-2">
            <X className="w-4 h-4 text-rose-600" />
            <span>Claim Rejected by Treasury</span>
          </div>
        )}
      </div>

      {/* Reimbursement Confirmation Modal */}
      {showConfirmReimburse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-border w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-[#5F3F56]">
              <AlertTriangle className="w-5 h-5 text-[#5F3F56]" />
              <h3 className="font-serif text-xl font-bold text-slate-900">
                Confirm Expense Reimbursement
              </h3>
            </div>

            <p className="text-sm font-sans text-slate-600 leading-relaxed">
              You are authorizing the reimbursement of <strong>₹{amountFormatted}</strong> to{' '}
              <strong>{expense.submitter_name || 'the claimant'}</strong> for:{' '}
              <em className="text-slate-800">"{expense.description}"</em>.
            </p>

            <div className="p-3 bg-slate-50 border border-border space-y-2">
              <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-700 font-bold">
                Select Disbursal Payment Mode:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['online', 'upi', 'cash'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`px-3 py-2 text-xs font-mono uppercase font-bold border transition-colors ${
                      paymentMode === mode
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <p className="font-mono text-[11px] text-muted">
              ℹ️ Executing this action will mark the expense as <strong>REIMBURSED</strong> and immediately log an immutable outgoing transaction in the central ledger.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <ActionButton
                variant="ghost"
                onClick={() => setShowConfirmReimburse(false)}
                disabled={processing}
              >
                Cancel
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={handleConfirmReimburse}
                disabled={processing}
              >
                {processing ? 'Processing...' : `Confirm & Disburse ₹${amountFormatted}`}
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseReimbursementAction;
