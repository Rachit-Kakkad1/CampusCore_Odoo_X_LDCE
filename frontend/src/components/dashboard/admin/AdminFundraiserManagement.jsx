// frontend/src/components/dashboard/admin/AdminFundraiserManagement.jsx
import React, { useState } from 'react';
import { ActionButton } from '../ActionButton';
import financeService from '../../../services/finance.service';
import { Plus, X, TrendingUp, CheckSquare, AlertCircle } from 'lucide-react';

export const AdminFundraiserManagement = ({
  fundraisers = [],
  loading = false,
  onFundraiserCreated,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const res = await financeService.createFundraiser({
        title,
        description,
      });

      setShowAddModal(false);
      setTitle('');
      setDescription('');
      onFundraiserCreated?.(res?.data || res);
    } catch (err) {
      console.error('Error creating fundraiser:', err);
      setFormError(err.response?.data?.error?.message || err.message || 'Failed to create fundraiser');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-2xl text-[#1c1c1c]">Organization Fundraisers</h3>
          <span className="font-mono text-xs text-[#1c1c1c]/60">
            {fundraisers.length} community campaigns
          </span>
        </div>
        <ActionButton
          variant="primary"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Create Fundraiser</span>
        </ActionButton>
      </div>

      {/* Fundraiser Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 border border-[#e5e4de] bg-white/50 animate-pulse"></div>
          ))}
        </div>
      ) : fundraisers.length === 0 ? (
        <div className="p-12 border border-[#e5e4de] text-center font-mono text-xs text-[#1c1c1c]/60">
          No fundraisers created yet. Click "+ Create Fundraiser" to launch a campaign.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fundraisers.map((f) => {
            const raised = parseFloat(f.total_raised) || 0;
            const tasksTotal = parseInt(f.total_tasks, 10) || 0;
            const tasksCompleted = parseInt(f.completed_tasks, 10) || 0;
            const progress = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

            return (
              <div
                key={f.id}
                className="border border-[#e5e4de] bg-[#f7f6f2] p-6 space-y-4 hover:border-[#5F3F56]/40 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-[#e5e4de] pb-3">
                  <h4 className="font-serif text-2xl text-[#1c1c1c]">
                    {f.title}
                  </h4>
                  <div className="font-mono text-sm font-bold text-[#5F3F56]">
                    Raised: ₹{raised.toFixed(2)}
                  </div>
                </div>

                <p className="font-sans text-xs text-[#1c1c1c]/70 line-clamp-2 leading-relaxed">
                  {f.description || 'Community student fundraiser initiative.'}
                </p>

                {/* Progress / Tasks Info */}
                <div className="space-y-1.5 pt-2 border-t border-[#e5e4de] font-mono text-xs">
                  <div className="flex justify-between text-[#1c1c1c]/70">
                    <span>Task Progress:</span>
                    <span>{tasksCompleted} / {tasksTotal} completed ({progress}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#e5e4de] overflow-hidden">
                    <div
                      className="h-full bg-[#5F3F56] transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Fundraiser Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#1c1c1c]/70 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreate}
            className="border border-[#e5e4de] bg-[#f7f6f2] p-6 sm:p-8 w-full max-w-lg space-y-6 my-8"
          >
            <div className="flex items-center justify-between border-b border-[#e5e4de] pb-3">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-[#5F3F56] font-semibold block mb-1">
                  Campaign Operations
                </span>
                <h3 className="font-serif text-2xl text-[#1c1c1c]">Launch New Fundraiser</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#1c1c1c]/50 hover:text-[#1c1c1c]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 font-mono text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70 mb-1">
                  Fundraiser Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Annual Campus Bake Sale"
                  className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70 mb-1">
                  Campaign Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Goals, beneficiary project, volunteer task coordination..."
                  className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#e5e4de] flex justify-end gap-3">
              <ActionButton
                variant="secondary"
                onClick={() => setShowAddModal(false)}
                disabled={formLoading}
              >
                Cancel
              </ActionButton>
              <ActionButton
                type="submit"
                variant="primary"
                disabled={formLoading}
              >
                {formLoading ? 'Launching...' : 'Launch Fundraiser'}
              </ActionButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminFundraiserManagement;
