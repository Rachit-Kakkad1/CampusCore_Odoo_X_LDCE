import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/common/Navbar';
import { FundraiserCard } from '../../components/fundraisers/FundraiserCard';
import { DonationCheckoutModal } from '../../components/fundraisers/DonationCheckoutModal';
import fundraiserService from '../../services/fundraiser.service';
import {
  Heart,
  Search,
  TrendingUp,
  Users,
  Target,
  Sparkles,
  ShieldCheck,
  Filter,
  CheckCircle2,
} from 'lucide-react';

export const PublicFundraisersPage = () => {
  const [fundraisers, setFundraisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Checkout Modal State
  const [selectedFundraiserForDonation, setSelectedFundraiserForDonation] = useState(null);

  const fetchFundraisers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fundraiserService.getPublicFundraisers({
        status: statusFilter === 'all' ? null : statusFilter,
        search: search.trim() || null,
      });
      setFundraisers(res.data || []);
    } catch (err) {
      console.error('Error fetching fundraisers:', err);
      setError('Unable to load campaigns at this time. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundraisers();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFundraisers();
  };

  const handleDonationSuccess = (donation) => {
    // Refresh campaigns list so the new donation amount immediately reflects in the cards
    fetchFundraisers();
  };

  // Compute overall totals from the real database results
  const totalRaisedSum = fundraisers.reduce(
    (acc, f) => acc + (parseFloat(f.total_raised) || 0),
    0
  );
  const totalDonorsSum = fundraisers.reduce(
    (acc, f) => acc + (parseInt(f.donor_count, 10) || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col font-sans text-[#1c1c1c]">
      <Navbar />

      {/* 1. HERO BANNER */}
      <section className="bg-slate-900 text-white border-b border-slate-800 py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-7xl mx-auto relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] uppercase tracking-widest font-bold">
            <Heart className="w-3.5 h-3.5 fill-emerald-400" />
            <span>Community Impact &amp; Giving</span>
          </div>

          <div className="max-w-3xl space-y-3">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              Support Our Student Causes.
            </h1>
            <p className="font-sans text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              Every contribution directly empowers academic innovation, community welfare, and student-led initiatives. 100% of donations are recorded transparently in our central financial ledger.
            </p>
          </div>

          {/* Aggregated Real Impact Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 max-w-2xl font-mono">
            <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-xs">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                Total Raised
              </span>
              <span className="text-2xl font-extrabold text-emerald-400">
                ₹{totalRaisedSum.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-xs">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                Supporter Contributions
              </span>
              <span className="text-2xl font-extrabold text-white">
                {totalDonorsSum}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-slate-800/80 border border-slate-700/80 p-4 rounded-xs">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                Active Initiatives
              </span>
              <span className="text-2xl font-extrabold text-primary-light text-indigo-300">
                {fundraisers.length}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <section className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-border py-4 px-6 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 font-mono text-xs">
            {[
              { id: 'all', label: 'All Causes' },
              { id: 'active', label: 'Active Campaigns' },
              { id: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search causes, robotics, charity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-20 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-primary focus:bg-white font-mono rounded-xs transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-mono font-bold uppercase rounded-xs transition-colors cursor-pointer"
            >
              Filter
            </button>
          </form>
        </div>
      </section>

      {/* 3. CAMPAIGNS GRID / CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 border border-border bg-white animate-pulse rounded-xs" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 bg-rose-50 border border-rose-200 text-rose-800 text-center rounded-xs max-w-lg mx-auto font-mono text-xs">
            {error}
          </div>
        ) : fundraisers.length === 0 ? (
          <div className="border border-border bg-white p-16 text-center space-y-4 max-w-xl mx-auto rounded-xs shadow-xs">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Heart className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-xl font-bold text-slate-900">
              No active fundraisers right now.
            </h3>
            <p className="font-sans text-xs text-slate-500 leading-relaxed">
              Check back soon for upcoming student drives and community initiatives.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {fundraisers.map((f) => (
              <FundraiserCard
                key={f.id}
                fundraiser={f}
                onDonateClick={(item) => setSelectedFundraiserForDonation(item)}
              />
            ))}
          </div>
        )}
      </main>

      {/* 4. DONATION CHECKOUT MODAL */}
      <DonationCheckoutModal
        fundraiser={selectedFundraiserForDonation}
        isOpen={Boolean(selectedFundraiserForDonation)}
        onClose={() => setSelectedFundraiserForDonation(null)}
        onDonationSuccess={handleDonationSuccess}
      />
    </div>
  );
};

export default PublicFundraisersPage;
