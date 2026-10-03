// frontend/src/components/dashboard/admin/AdminFundraiserManagement.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import financeService from '../../../services/finance.service';
import {
  Plus,
  X,
  TrendingUp,
  CheckSquare,
  AlertCircle,
  DollarSign,
  Target,
  Sparkles,
  Heart,
  Calendar,
  Layers,
  Search,
  CheckCircle2
} from 'lucide-react';
import { ThreeDCard } from '../charts/ThreeDCharts';

export const AdminFundraiserManagement = ({
  fundraisers = [],
  loading = false,
  onFundraiserCreated,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState('25000');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [search, setSearch] = useState('');

  const totalRaised = fundraisers.reduce(
    (acc, f) => acc + (parseFloat(f.total_raised) || 0),
    0
  );
  const totalTasks = fundraisers.reduce(
    (acc, f) => acc + (parseInt(f.total_tasks, 10) || 0),
    0
  );
  const completedTasks = fundraisers.reduce(
    (acc, f) => acc + (parseInt(f.completed_tasks, 10) || 0),
    0
  );

  const filteredFundraisers = fundraisers.filter((f) => {
    const q = search.toLowerCase();
    return (
      (f.title && f.title.toLowerCase().includes(q)) ||
      (f.description && f.description.toLowerCase().includes(q))
    );
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    if (!title.trim()) {
      setFormError('Please provide a campaign title.');
      setFormLoading(false);
      return;
    }

    try {
      const res = await financeService.createFundraiser({
        title: title.trim(),
        description: description.trim(),
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
    <div className="space-y-8 select-none">
      {/* 1. TOP METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <ThreeDCard
          className="p-6 border-l-4 border-l-emerald-600"
          accentGlow="rgba(5, 150, 105, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Raised
            </span>
            <div className="w-8 h-8 rounded-sm bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            ₹{totalRaised.toFixed(2)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Community student capital</span>
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-primary"
          accentGlow="rgba(95, 63, 86, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Campaigns
            </span>
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            {fundraisers.length}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Charity & project initiatives</span>
            <span className="w-2 h-2 rounded-full bg-primary" />
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-indigo-600"
          accentGlow="rgba(79, 70, 229, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Task Milestones
            </span>
            <div className="w-8 h-8 rounded-sm bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            {completedTasks} / {totalTasks}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Operations & logistics fulfilled</span>
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
          </div>
        </ThreeDCard>
      </div>

      {/* 2. SEARCH & ACTION HEADER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 border border-border shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search campaigns by title, keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-primary focus:bg-white font-mono transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Launch New Fundraiser</span>
        </button>
      </div>

      {/* 3. FUNDRAISERS GRID */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-52 border border-border bg-white animate-pulse" />
          ))}
        </div>
      ) : filteredFundraisers.length === 0 ? (
        <div className="p-12 border border-border bg-white text-center font-mono text-xs text-slate-500">
          No fundraisers found. Click "Launch New Fundraiser" to initiate a campaign.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredFundraisers.map((f) => {
            const raised = parseFloat(f.total_raised) || 0;
            const tasksTotal = parseInt(f.total_tasks, 10) || 0;
            const tasksCompleted = parseInt(f.completed_tasks, 10) || 0;
            const progress = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

            return (
              <ThreeDCard
                key={f.id}
                className="p-6 space-y-4"
                accentGlow="rgba(95, 63, 86, 0.15)"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">
                      {f.title}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      Campaign #{f.id}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs uppercase text-slate-400 block font-bold">
                      Raised
                    </span>
                    <span className="text-base font-extrabold text-emerald-700">
                      ₹{raised.toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {f.description || 'Community student organization fundraiser initiative.'}
                </p>

                {/* Progress / Tasks Info */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 font-mono text-xs">
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>Volunteer Tasks:</span>
                    <span>
                      <strong>{tasksCompleted}</strong> / {tasksTotal} fulfilled ({progress}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                </div>
              </ThreeDCard>
            );
          })}
        </div>
      )}

      {/* 4. UPGRADED MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative bg-white border border-[#e2e8f0] shadow-2xl max-w-lg w-full rounded-sm overflow-hidden my-8"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

              <div className="p-6 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-xs border border-primary/20">
                      Campaign Operations
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                      Launch New Fundraiser
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 font-mono text-xs flex items-center gap-2 rounded-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Fundraiser Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Annual Campus Bake Sale & Robotics Drive"
                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-medium rounded-xs outline-none transition-all shadow-2xs placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Campaign Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain the project beneficiary, fundraising milestones, and volunteer team assignments..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-sans rounded-xs outline-none transition-all shadow-2xs placeholder:text-slate-400"
                  />
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={formLoading}
                    className="px-4 py-2 border border-border text-slate-700 hover:bg-slate-100 font-bold uppercase text-[11px] tracking-wider rounded-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-bold uppercase text-[11px] tracking-wider rounded-xs shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {formLoading ? 'Launching...' : 'Launch Campaign'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminFundraiserManagement;
