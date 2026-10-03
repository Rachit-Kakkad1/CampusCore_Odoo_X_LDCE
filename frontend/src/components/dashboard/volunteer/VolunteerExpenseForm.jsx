// frontend/src/components/dashboard/volunteer/VolunteerExpenseForm.jsx
import React, { useState } from 'react';
import { StatusBadge } from '../StatusBadge';
import { ActionButton } from '../ActionButton';
import { Receipt, Send, DollarSign, Upload, FileText, ExternalLink, AlertCircle } from 'lucide-react';

/**
 * VolunteerExpenseForm Component
 * Allows volunteers to submit out-of-pocket expense claims with receipts
 * and track the reimbursement lifecycle with the treasury.
 *
 * @param {Object} props
 * @param {Array} props.myExpenses
 * @param {Function} props.onSubmitExpense - Callback (formData) => Promise
 * @param {boolean} [props.loading]
 * @param {boolean} [props.submitting]
 */
export const VolunteerExpenseForm = ({
  myExpenses = [],
  onSubmitExpense,
  loading = false,
  submitting = false,
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid positive reimbursement amount.');
      return;
    }

    if (!description.trim()) {
      setFormError('Please describe the purchase or expense purpose.');
      return;
    }

    try {
      await onSubmitExpense({
        amount: parsedAmount,
        description: description.trim(),
        receipt_url: receiptUrl.trim() || 'https://campuscore.org/receipts/proof_of_purchase.pdf',
      });
      // Reset form
      setAmount('');
      setDescription('');
      setReceiptUrl('');
    } catch (err) {
      setFormError(err.message || 'Failed to submit expense claim.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Expense Submission Form */}
      <div className="lg:col-span-5 space-y-6">
        <div className="p-6 border border-border bg-white shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-9 h-9 border border-border bg-slate-50 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-base text-slate-900">
                Submit Out-of-Pocket Expense
              </h2>
              <p className="font-mono text-xs text-slate-500">
                Claim reimbursement for event supplies
              </p>
            </div>
          </div>

          {formError && (
            <div className="p-3 border border-rose-200 bg-rose-50 text-rose-800 font-mono text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold mb-1">
                Amount (₹ INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="250.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={submitting}
                  className="w-full pl-8 pr-4 py-2 border border-border bg-white text-xs font-mono focus:outline-hidden focus:border-slate-900 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold mb-1">
                Description & Purpose *
              </label>
              <textarea
                rows={3}
                placeholder="e.g., Tablecloths, packaging materials, and bake sale supplies"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                disabled={submitting}
                className="w-full p-3 border border-border bg-white text-xs font-mono focus:outline-hidden focus:border-slate-900 disabled:opacity-50 resize-none"
              />
            </div>

            {/* Receipt URL / Attachment */}
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold mb-1">
                Receipt / Invoice URL
              </label>
              <div className="relative">
                <Upload className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="https://drive.google.com/receipt.pdf"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  disabled={submitting}
                  className="w-full pl-9 pr-4 py-2 border border-border bg-white text-xs font-mono focus:outline-hidden focus:border-slate-900 disabled:opacity-50 placeholder:text-slate-400"
                />
              </div>
              <p className="font-mono text-[10px] text-slate-400 mt-1">
                Provide a cloud link (Google Drive, Dropbox, PDF). If left blank, a default verifiable proof stub is submitted.
              </p>
            </div>

            <div className="pt-2">
              <ActionButton
                type="submit"
                variant="primary"
                className="w-full justify-center"
                disabled={submitting || !amount || !description}
              >
                {submitting ? (
                  <span>Submitting to Treasury...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Reimbursement Claim</span>
                  </>
                )}
              </ActionButton>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Claims History & Audit Table */}
      <div className="lg:col-span-7 space-y-4">
        <div className="p-6 border border-border bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="font-sans font-bold text-base text-slate-900">
              My Reimbursement History ({myExpenses.length})
            </h3>
            <span className="font-mono text-xs text-slate-500">
              Treasury Review Lifecycle
            </span>
          </div>

          {myExpenses.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-sans font-medium text-slate-700 text-sm">
                No expense claims filed
              </p>
              <p className="font-mono text-xs text-slate-400">
                Any expenses you submit will appear here with live review updates.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-border bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {myExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {exp.created_at
                          ? new Date(exp.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </td>
                      <td className="py-3 px-3 font-sans font-medium text-slate-900 max-w-xs truncate">
                        {exp.description}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                        ₹{Number(exp.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={exp.status} />
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {exp.receipt_url ? (
                          <a
                            href={exp.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-[11px]"
                          >
                            <span>View Proof</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VolunteerExpenseForm;
