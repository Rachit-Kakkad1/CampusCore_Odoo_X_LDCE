// frontend/src/components/dashboard/treasurer/FundraiserIncomeSection.jsx
import React, { useState } from 'react';
import { DashboardTable } from '../DashboardTable';
import { DashboardEmptyState } from '../DashboardEmptyState';
import { ActionButton } from '../ActionButton';
import { 
  HeartHandshake, 
  Plus, 
  DollarSign, 
  CheckSquare, 
  X,
  TrendingUp,
  Receipt
} from 'lucide-react';

/**
 * FundraiserIncomeSection Component
 * Manages community fundraiser campaigns and logs income batches into the ledger.
 *
 * @param {Object} props
 * @param {Array} props.fundraisers - List of fundraisers from backend
 * @param {Function} props.onCreateFundraiser - Callback to create campaign
 * @param {Function} props.onAddIncome - Callback to log income batch into ledger
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.processing - Processing state
 */
export const FundraiserIncomeSection = ({
  fundraisers = [],
  onCreateFundraiser,
  onAddIncome,
  loading = false,
  processing = false,
}) => {
  const [showNewFundraiserModal, setShowNewFundraiserModal] = useState(false);
  const [selectedFundraiserForIncome, setSelectedFundraiserForIncome] = useState(null);

  // New Fundraiser Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submittingCampaign, setSubmittingCampaign] = useState(false);

  // Income Batch Form State
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeNote, setIncomeNote] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [submittingIncome, setSubmittingIncome] = useState(false);

  const handleCreateFundraiser = async (e) => {
    e.preventDefault();
    if (!title) return;

    try {
      setSubmittingCampaign(true);
      await onCreateFundraiser({ title, description });
      setShowNewFundraiserModal(false);
      setTitle('');
      setDescription('');
    } finally {
      setSubmittingCampaign(false);
    }
  };

  const handleRecordIncome = async (e) => {
    e.preventDefault();
    if (!incomeAmount || !selectedFundraiserForIncome) return;

    try {
      setSubmittingIncome(true);
      await onAddIncome(selectedFundraiserForIncome.id, {
        amount: parseFloat(incomeAmount),
        note: incomeNote || 'Fundraiser revenue batch',
        payment_mode: paymentMode,
      });
      setSelectedFundraiserForIncome(null);
      setIncomeAmount('');
      setIncomeNote('');
      setPaymentMode('cash');
    } finally {
      setSubmittingIncome(false);
    }
  };

  const totalRaisedAll = fundraisers.reduce(
    (acc, f) => acc + Number(f.total_raised || 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Top Controls & Aggregate Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-sans font-bold text-sm text-slate-900">
              Community Campaigns & Income Tracking
            </h4>
            <span className="font-mono text-xs text-muted">
              Total Raised Across Campaigns: <strong className="text-emerald-700">₹{totalRaisedAll.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </span>
          </div>
        </div>

        <ActionButton
          variant="primary"
          onClick={() => setShowNewFundraiserModal(true)}
          className="shrink-0"
        >
          <Plus className="w-3.5 h-3.5 mr-1 inline" />
          Create New Fundraiser
        </ActionButton>
      </div>

      {/* Fundraiser Cards Grid */}
      {fundraisers.length === 0 && !loading ? (
        <DashboardEmptyState
          title="No Active Fundraisers"
          description="There are no active community fundraising campaigns logged in the system."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fundraisers.map((f) => {
            const raisedFormatted = Number(f.total_raised || 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

            return (
              <div
                key={f.id}
                className="bg-white border border-border p-6 flex flex-col justify-between space-y-4 shadow-xs hover:border-slate-400 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                      Campaign ID: FND-#{String(f.id).padStart(3, '0')}
                    </span>
                    <span className="px-2 py-0.5 font-mono text-[10px] uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Active Campaign
                    </span>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-slate-900">
                    {f.title}
                  </h3>

                  <p className="font-sans text-xs text-slate-600 leading-relaxed">
                    {f.description || 'General community fundraising initiative.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border bg-slate-50 p-3">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted block">
                      Total Revenue Raised
                    </span>
                    <span className="font-mono text-xl font-bold text-emerald-800 block mt-0.5">
                      ₹{raisedFormatted}
                    </span>
                  </div>

                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted block">
                      Volunteer Tasks
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800 block mt-1.5 flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5 text-primary" />
                      {f.completed_tasks || 0} / {f.total_tasks || 0} Completed
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <ActionButton
                    variant="primary"
                    onClick={() => setSelectedFundraiserForIncome(f)}
                    className="w-full text-center justify-center bg-emerald-800 hover:bg-emerald-900 border-emerald-800"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1 inline" />
                    Record Income Batch
                  </ActionButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Income Batch Modal */}
      {selectedFundraiserForIncome && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-border w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-700" />
                <h3 className="font-serif text-xl font-bold text-slate-900">
                  Log Fundraiser Revenue
                </h3>
              </div>
              <button
                onClick={() => setSelectedFundraiserForIncome(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-sans text-slate-600">
              Recording income for campaign: <strong>{selectedFundraiserForIncome.title}</strong>
            </p>

            <form onSubmit={handleRecordIncome} className="space-y-4">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-bold mb-1">
                  Income Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  placeholder="e.g. 500.00"
                  className="w-full p-2.5 bg-slate-50 border border-border font-mono text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-bold mb-1">
                  Source Note / Batch Description
                </label>
                <input
                  type="text"
                  value={incomeNote}
                  onChange={(e) => setIncomeNote(e.target.value)}
                  placeholder="e.g. Morning stall bake sales, donor contribution"
                  className="w-full p-2.5 bg-slate-50 border border-border font-sans text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-bold mb-1">
                  Payment Collection Mode:
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-border font-mono text-xs focus:outline-none focus:border-primary"
                >
                  <option value="cash">Cash Collection</option>
                  <option value="upi">UPI / QR Payment</option>
                  <option value="online">Online / Direct Bank</option>
                  <option value="card">POS / Card</option>
                </select>
              </div>

              <p className="font-mono text-[11px] text-muted">
                ℹ️ This action records the revenue batch and immediately creates a verified incoming transaction in the financial ledger.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <ActionButton
                  variant="ghost"
                  onClick={() => setSelectedFundraiserForIncome(null)}
                  disabled={submittingIncome}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  variant="primary"
                  type="submit"
                  disabled={submittingIncome}
                  className="bg-emerald-800 hover:bg-emerald-900 border-emerald-800"
                >
                  {submittingIncome ? 'Recording...' : 'Record & Post to Ledger'}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Fundraiser Modal */}
      {showNewFundraiserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-border w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-xl font-bold text-slate-900">
                  New Fundraising Campaign
                </h3>
              </div>
              <button
                onClick={() => setShowNewFundraiserModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFundraiser} className="space-y-4">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-bold mb-1">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Annual Campus Bake Sale 2026"
                  className="w-full p-2.5 bg-slate-50 border border-border font-sans text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-bold mb-1">
                  Description / Purpose
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Campaign objectives and student community involvement..."
                  className="w-full p-2.5 bg-slate-50 border border-border font-sans text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <ActionButton
                  variant="ghost"
                  onClick={() => setShowNewFundraiserModal(false)}
                  disabled={submittingCampaign}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  variant="primary"
                  type="submit"
                  disabled={submittingCampaign}
                >
                  {submittingCampaign ? 'Creating...' : 'Create Campaign'}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundraiserIncomeSection;
