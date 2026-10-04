// frontend/src/components/dashboard/admin/AdminFundraiserManagement.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import fundraiserService from '../../../services/fundraiser.service';
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
  CheckCircle2,
  Edit2,
  RefreshCw,
  RotateCcw,
  Users,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  Filter,
} from 'lucide-react';
import { ThreeDCard } from '../charts/ThreeDCharts';

export const AdminFundraiserManagement = ({
  fundraisers = [],
  loading = false,
  onFundraiserCreated,
}) => {
  // Tabs: 'campaigns' | 'financial_overview' | 'donations_ledger'
  const [activeTab, setActiveTab] = useState('campaigns');

  // Internal Campaigns State
  const [campaignList, setCampaignList] = useState(fundraisers);
  const [fetchingCampaigns, setFetchingCampaigns] = useState(false);

  // Global Financial Overview Stats (PostgreSQL backed)
  const [globalStats, setGlobalStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Donations Table State
  const [donations, setDonations] = useState([]);
  const [donationsTotal, setDonationsTotal] = useState(0);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationSearch, setDonationSearch] = useState('');
  const [donationStatusFilter, setDonationStatusFilter] = useState('');
  const [selectedFundraiserFilter, setSelectedFundraiserFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [refundTargetDonation, setRefundTargetDonation] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState(null);

  // Add/Edit Form State
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState('25000');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('active');
  const [endDate, setEndDate] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [campaignSearch, setCampaignSearch] = useState('');

  const [copiedRef, setCopiedRef] = useState(null);

  // Fetch Authoritative Admin Campaigns
  const refreshCampaigns = async () => {
    try {
      setFetchingCampaigns(true);
      const res = await fundraiserService.getAdminFundraisers();
      const list = res.data || [];
      setCampaignList(list);
    } catch (err) {
      console.error('Error fetching admin fundraisers:', err);
    } finally {
      setFetchingCampaigns(false);
    }
  };

  // Fetch PostgreSQL Global Stats
  const refreshGlobalStats = async () => {
    try {
      setStatsLoading(true);
      const res = await fundraiserService.getGlobalStats();
      setGlobalStats(res.data || null);
    } catch (err) {
      console.error('Error fetching global stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch Donations Ledger
  const refreshDonations = async () => {
    try {
      setDonationsLoading(true);
      const res = await fundraiserService.getAdminDonations({
        search: donationSearch.trim() || undefined,
        status: donationStatusFilter || undefined,
        fundraiserId: selectedFundraiserFilter || undefined,
        limit: 50,
      });
      setDonations(res.data || []);
      setDonationsTotal(res.total || 0);
    } catch (err) {
      console.error('Error fetching donations ledger:', err);
    } finally {
      setDonationsLoading(false);
    }
  };

  useEffect(() => {
    if (fundraisers && fundraisers.length > 0) {
      setCampaignList(fundraisers);
    } else {
      refreshCampaigns();
    }
    refreshGlobalStats();
  }, [fundraisers]);

  useEffect(() => {
    if (activeTab === 'donations_ledger') {
      refreshDonations();
    } else if (activeTab === 'financial_overview') {
      refreshGlobalStats();
    }
  }, [activeTab, donationStatusFilter, selectedFundraiserFilter]);

  // Compute live aggregates from campaignList
  const netRaisedTotal = campaignList.reduce(
    (acc, f) => acc + (parseFloat(f.total_raised) || 0),
    0
  );
  const grossRaisedTotal = globalStats
    ? parseFloat(globalStats.gross_donations) || 0
    : campaignList.reduce((acc, f) => acc + (parseFloat(f.gross_raised) || 0), 0);
  const refundsTotal = globalStats
    ? parseFloat(globalStats.total_refunds) || 0
    : campaignList.reduce((acc, f) => acc + (parseFloat(f.refunded_amount) || 0), 0);
  const totalDonors = globalStats
    ? parseInt(globalStats.successful_donations, 10) || 0
    : campaignList.reduce((acc, f) => acc + (parseInt(f.donor_count, 10) || 0), 0);

  const filteredCampaigns = campaignList.filter((f) => {
    const q = campaignSearch.toLowerCase();
    return (
      (f.title && f.title.toLowerCase().includes(q)) ||
      (f.description && f.description.toLowerCase().includes(q)) ||
      (f.public_id && f.public_id.toLowerCase().includes(q))
    );
  });

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCampaign(null);
    setTitle('');
    setShortDescription('');
    setDescription('');
    setGoalAmount('25000');
    setImageUrl('');
    setStatus('active');
    setEndDate('');
    setFormError(null);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (c) => {
    setEditingCampaign(c);
    setTitle(c.title || '');
    setShortDescription(c.short_description || '');
    setDescription(c.description || '');
    setGoalAmount(String(c.goal_amount || 25000));
    setImageUrl(c.image_url || '');
    setStatus(c.status || 'active');
    setEndDate(c.end_at ? c.end_at.split('T')[0] : '');
    setFormError(null);
    setShowAddModal(true);
  };

  // Submit Create or Edit
  const handleSubmitCampaign = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    if (!title.trim()) {
      setFormError('Please provide a campaign title.');
      setFormLoading(false);
      return;
    }

    const goal = parseFloat(goalAmount);
    if (isNaN(goal) || goal <= 0) {
      setFormError('Goal amount must be a positive number greater than 0.');
      setFormLoading(false);
      return;
    }

    try {
      if (editingCampaign) {
        // Update
        const res = await fundraiserService.updateFundraiser(editingCampaign.id, {
          title: title.trim(),
          short_description: shortDescription.trim() || null,
          description: description.trim() || null,
          goal_amount: goal,
          image_url: imageUrl.trim() || null,
          status,
          end_at: endDate ? new Date(endDate) : null,
        });
        setShowAddModal(false);
        refreshCampaigns();
      } else {
        // Create
        const res = await fundraiserService.createFundraiser({
          title: title.trim(),
          short_description: shortDescription.trim() || null,
          description: description.trim() || null,
          goal_amount: goal,
          image_url: imageUrl.trim() || null,
          status,
          end_at: endDate ? new Date(endDate) : null,
        });
        setShowAddModal(false);
        refreshCampaigns();
        onFundraiserCreated?.(res.data || res);
      }
    } catch (err) {
      console.error('Error saving fundraiser:', err);
      setFormError(err.response?.data?.error?.message || err.message || 'Failed to save fundraiser');
    } finally {
      setFormLoading(false);
    }
  };

  // Change Status Quick Action
  const handleQuickStatusChange = async (id, newStatus) => {
    try {
      await fundraiserService.setStatus(id, newStatus);
      refreshCampaigns();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update campaign status');
    }
  };

  // Process Refund
  const handleProcessRefund = async (e) => {
    e.preventDefault();
    if (!refundTargetDonation) return;

    setRefundLoading(true);
    setRefundError(null);

    try {
      await fundraiserService.refundDonation(refundTargetDonation.id, refundReason.trim());
      setRefundTargetDonation(null);
      setRefundReason('');
      refreshDonations();
      refreshGlobalStats();
      refreshCampaigns();
    } catch (err) {
      console.error('Refund failed:', err);
      setRefundError(err.response?.data?.error?.message || err.message || 'Refund failed');
    } finally {
      setRefundLoading(false);
    }
  };

  const copyText = (txt) => {
    navigator.clipboard.writeText(txt);
    setCopiedRef(txt);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  return (
    <div className="space-y-8 select-none font-sans">
      {/* 1. TOP AUTHORITATIVE METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <ThreeDCard className="p-6 border-l-4 border-l-emerald-600" accentGlow="rgba(5, 150, 105, 0.2)">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Net Capital Raised
            </span>
            <div className="w-8 h-8 rounded-sm bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
            ₹{netRaisedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5 mt-2 font-mono">
            <span>Gross: ₹{grossRaisedTotal.toFixed(2)}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          </div>
        </ThreeDCard>

        <ThreeDCard className="p-6 border-l-4 border-l-amber-600" accentGlow="rgba(217, 119, 6, 0.2)">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Total Refunds
            </span>
            <div className="w-8 h-8 rounded-sm bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
            ₹{refundsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5 mt-2 font-mono">
            <span>Deducted from net total</span>
            <span className="w-2 h-2 rounded-full bg-amber-600" />
          </div>
        </ThreeDCard>

        <ThreeDCard className="p-6 border-l-4 border-l-primary" accentGlow="rgba(95, 63, 86, 0.2)">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Successful Donors
            </span>
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
            {totalDonors}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5 mt-2 font-mono">
            <span>Verified Transactions</span>
            <span className="w-2 h-2 rounded-full bg-primary" />
          </div>
        </ThreeDCard>

        <ThreeDCard className="p-6 border-l-4 border-l-indigo-600" accentGlow="rgba(79, 70, 229, 0.2)">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Active Campaigns
            </span>
            <div className="w-8 h-8 rounded-sm bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
            {campaignList.filter((c) => c.status === 'active').length} / {campaignList.length}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5 mt-2 font-mono">
            <span>Charity &amp; Student drives</span>
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
          </div>
        </ThreeDCard>
      </div>

      {/* 2. ADMIN NAVIGATION TABS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border pb-2">
        <div className="flex items-center gap-2 font-mono text-xs">
          {[
            { id: 'campaigns', label: 'Campaigns Roster', icon: Layers },
            { id: 'financial_overview', label: 'Financial Overview & Audit', icon: DollarSign },
            { id: 'donations_ledger', label: 'Donation Transactions', icon: FileText },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === t.id
                    ? 'border-primary text-slate-900 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'campaigns' && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-xs hover:shadow-md cursor-pointer rounded-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Launch New Campaign</span>
          </button>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* TAB 1: CAMPAIGNS ROSTER                                           */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-4 bg-white p-4 border border-border rounded-xs shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search campaigns by title, keywords, ref..."
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-primary focus:bg-white font-mono rounded-xs transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={refreshCampaigns}
              className="p-2 border border-slate-200 hover:bg-slate-100 rounded-xs text-slate-600 transition-colors"
              title="Refresh Campaigns"
            >
              <RefreshCw className={`w-4 h-4 ${fetchingCampaigns ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Campaigns Grid */}
          {loading || fetchingCampaigns ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 border border-border bg-white animate-pulse rounded-xs" />
              ))}
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="p-12 border border-border bg-white text-center font-mono text-xs text-slate-500 rounded-xs">
              No campaigns found. Click "Launch New Campaign" to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCampaigns.map((f) => {
                const raised = parseFloat(f.total_raised) || 0;
                const goal = parseFloat(f.goal_amount) || 10000;
                const donors = parseInt(f.donor_count, 10) || 0;
                const progress = goal > 0 ? Math.round((raised / goal) * 100) : 0;

                return (
                  <ThreeDCard key={f.id} className="p-6 space-y-4" accentGlow="rgba(95, 63, 86, 0.12)">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                            {f.public_id || `FND-${f.id}`}
                          </span>
                          <span
                            className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs ${
                              f.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : f.status === 'completed'
                                ? 'bg-indigo-100 text-indigo-800'
                                : f.status === 'paused'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {f.status}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 tracking-tight line-clamp-1">
                          {f.title}
                        </h4>
                      </div>

                      <div className="text-right font-mono shrink-0">
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">
                          Net Raised
                        </span>
                        <span className="text-base font-extrabold text-emerald-700">
                          ₹{raised.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {f.short_description || f.description || 'Student community initiative.'}
                    </p>

                    {/* Financial Progress Bar */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 font-mono text-xs">
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>
                          Goal: <strong>₹{goal.toLocaleString('en-IN')}</strong> ({progress}%)
                        </span>
                        <span>
                          <strong>{donors}</strong> donors
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-500"
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                    </div>

                    {/* Admin Actions Toolbar */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        {f.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(f.id, 'paused')}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xs font-bold uppercase transition-colors"
                          >
                            Pause
                          </button>
                        ) : f.status === 'paused' ? (
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(f.id, 'active')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xs font-bold uppercase transition-colors"
                          >
                            Resume
                          </button>
                        ) : null}

                        {f.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(f.id, 'completed')}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xs font-bold uppercase transition-colors"
                          >
                            Complete
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(f)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xs font-bold uppercase transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </ThreeDCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 2: FINANCIAL OVERVIEW & AUDIT                                 */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'financial_overview' && (
        <div className="space-y-6">
          <div className="bg-white border border-border p-6 rounded-xs space-y-6 shadow-2xs font-mono">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-slate-900 font-sans">
                  PostgreSQL Authoritative Financial Statistics
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  100% computed from real financial transaction and refund records. Zero mock data.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshGlobalStats}
                className="p-2 border border-slate-200 hover:bg-slate-100 rounded-xs text-slate-600 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xs">
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Gross Donations</span>
                <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                  ₹{parseFloat(globalStats?.gross_donations || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xs">
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Total Refunds</span>
                <span className="text-xl font-extrabold text-amber-700 mt-1 block">
                  ₹{parseFloat(globalStats?.total_refunds || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xs">
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Net Capital Raised</span>
                <span className="text-xl font-extrabold text-emerald-700 mt-1 block">
                  ₹{parseFloat(globalStats?.net_raised || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xs">
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Average Donation</span>
                <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                  ₹{parseFloat(globalStats?.average_donation || 0).toFixed(2)}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xs">
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Successful Transactions</span>
                <span className="text-xl font-extrabold text-emerald-700 mt-1 block">
                  {globalStats?.successful_donations || 0}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xs">
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Failed Payments</span>
                <span className="text-xl font-extrabold text-rose-700 mt-1 block">
                  {globalStats?.failed_payments || 0}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xs">
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Anonymous Contributions</span>
                <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                  {globalStats?.anonymous_donations || 0}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xs">
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Active Campaigns Goal</span>
                <span className="text-xl font-extrabold text-indigo-700 mt-1 block">
                  ₹{parseFloat(globalStats?.active_campaigns_goal || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TAB 3: DONATIONS TRANSACTIONS LEDGER                              */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'donations_ledger' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white border border-border p-4 rounded-xs shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 font-mono text-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search donor name, email, DON-ref..."
                value={donationSearch}
                onChange={(e) => setDonationSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && refreshDonations()}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-primary focus:bg-white rounded-xs transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={donationStatusFilter}
                onChange={(e) => setDonationStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xs outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
                <option value="pending">Pending</option>
                <option value="payment_failed">Failed</option>
              </select>

              <button
                type="button"
                onClick={refreshDonations}
                className="p-2 border border-slate-200 hover:bg-slate-100 rounded-xs text-slate-600 transition-colors"
                title="Refresh Ledger"
              >
                <RefreshCw className={`w-4 h-4 ${donationsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-border rounded-xs overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-border bg-slate-50 flex items-center justify-between font-mono text-xs font-bold uppercase text-slate-700">
              <span>All Financial Donation Transactions ({donationsTotal})</span>
              <span className="text-[10px] text-slate-400">Strictly 1 Ledger Record per Successful Payment</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-500 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Donor Name &amp; Contact</th>
                    <th className="py-3 px-4">Campaign</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Donation Ref</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {donationsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-mono text-xs">
                        Loading transaction ledger records...
                      </td>
                    </tr>
                  ) : donations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-mono text-xs">
                        No donation records found.
                      </td>
                    </tr>
                  ) : (
                    donations.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {d.created_at ? new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 font-sans">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{d.donor_name}</span>
                            {d.anonymous && (
                              <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-xs">
                                Anonymous Publicly
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">{d.donor_email} • {d.donor_phone}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 line-clamp-1">
                          {d.fundraiser_title}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          ₹{parseFloat(d.amount).toFixed(2)}
                          {d.status === 'refunded' && (
                            <span className="block text-[10px] text-amber-700 font-normal">
                              -₹{parseFloat(d.refund_amount || d.amount).toFixed(2)} refunded
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider ${
                              d.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : d.status === 'refunded'
                                ? 'bg-amber-100 text-amber-800'
                                : d.status === 'payment_failed'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span>{d.public_id}</span>
                            <button
                              type="button"
                              onClick={() => copyText(d.public_id)}
                              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                              title="Copy Reference"
                            >
                              {copiedRef === d.public_id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {d.status === 'paid' && (
                            <button
                              type="button"
                              onClick={() => {
                                setRefundTargetDonation(d);
                                setRefundReason('');
                                setRefundError(null);
                              }}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xs text-[10px] font-bold uppercase transition-colors cursor-pointer"
                            >
                              Refund
                            </button>
                          )}
                          {d.status === 'refunded' && (
                            <span className="text-[10px] text-slate-400 italic">
                              Refunded on {d.refunded_at ? new Date(d.refunded_at).toLocaleDateString() : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 4. MODAL: CREATE / EDIT FUNDRAISER                                */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative bg-white border border-border shadow-2xl max-w-xl w-full rounded-sm overflow-hidden my-8"
            >
              <div className="p-6 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-xs border border-primary/20">
                      Campaign Governance
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                      {editingCampaign ? 'Edit Campaign Details' : 'Launch New Fundraiser'}
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

              <form onSubmit={handleSubmitCampaign} className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 font-mono text-xs flex items-center gap-2 rounded-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Fundraiser Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Annual Campus Robotics Workbench & Hardware Fund"
                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-medium rounded-xs outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Goal Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={goalAmount}
                      onChange={(e) => setGoalAmount(e.target.value)}
                      placeholder="e.g. 50000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-mono rounded-xs outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Status *
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-mono rounded-xs outline-none transition-all cursor-pointer"
                    >
                      <option value="active">Active (Publicly Accepting Donations)</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                      <option value="draft">Draft (Hidden from public)</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Short Catchline / Summary
                  </label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Brief 1-line cause summary displayed on cards..."
                    className="w-full px-3.5 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 rounded-xs outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Cover Image URL
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-mono rounded-xs outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Campaign Story &amp; Details
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain the beneficiaries, equipment specifications, volunteer tasks, and financial governance..."
                    className="w-full px-3.5 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 rounded-xs outline-none transition-all"
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
                    {formLoading ? 'Saving...' : editingCampaign ? 'Update Campaign' : 'Launch Campaign'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------------------- */}
      {/* 5. MODAL: ISSUE REFUND                                            */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence>
        {refundTargetDonation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative bg-white border border-border shadow-2xl max-w-md w-full rounded-sm overflow-hidden my-8"
            >
              <div className="p-6 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shadow-xs">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-amber-800">
                      Ledger Reversal
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Issue Donation Refund
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRefundTargetDonation(null)}
                  className="w-8 h-8 rounded-full hover:bg-amber-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProcessRefund} className="p-6 space-y-4 text-xs">
                {refundError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 font-mono text-xs flex items-center gap-2 rounded-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{refundError}</span>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xs font-mono space-y-2 text-slate-700 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 uppercase">Donation Reference:</span>
                    <span className="font-bold">{refundTargetDonation.public_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 uppercase">Donor Name:</span>
                    <span className="font-bold">{refundTargetDonation.donor_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 uppercase">Refund Amount:</span>
                    <span className="font-extrabold text-amber-800">
                      ₹{parseFloat(refundTargetDonation.amount).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Refund Reason / Audit Note *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Provide justification for financial audit (e.g. Donor duplicated contribution, disputed charge)..."
                    className="w-full px-3.5 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-amber-600 text-xs text-slate-900 rounded-xs outline-none transition-all"
                  />
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setRefundTargetDonation(null)}
                    disabled={refundLoading}
                    className="px-4 py-2 border border-border text-slate-700 hover:bg-slate-100 font-bold uppercase text-[11px] tracking-wider rounded-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={refundLoading || !refundReason.trim()}
                    className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold uppercase text-[11px] tracking-wider rounded-xs shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {refundLoading ? 'Processing Ledger Refund...' : 'Confirm Refund'}
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
