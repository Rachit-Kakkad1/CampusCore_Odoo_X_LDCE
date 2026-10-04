import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/common/Navbar';
import { FundraiserCard } from '../../components/fundraisers/FundraiserCard';
import { DonationCheckoutModal } from '../../components/fundraisers/DonationCheckoutModal';
import fundraiserService from '../../services/fundraiser.service';
import Pagination from '../../components/common/Pagination';
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [paginationInfo, setPaginationInfo] = useState(null);

  // Checkout Modal State
  const [selectedFundraiserForDonation, setSelectedFundraiserForDonation] = useState(null);

  const fetchFundraisers = async (targetPage = page, targetPageSize = pageSize) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fundraiserService.getPublicFundraisers({
        status: statusFilter === 'all' ? null : statusFilter,
        search: search.trim() || null,
        page: targetPage,
        pageSize: targetPageSize,
      });
      const list = Array.isArray(res) ? res : (res?.data || []);
      setFundraisers(list);
      if (res?.pagination) {
        setPaginationInfo(res.pagination);
      } else {
        setPaginationInfo({
          page: targetPage,
          pageSize: targetPageSize,
          totalItems: list.length,
          totalPages: Math.ceil(list.length / targetPageSize) || 1,
        });
      }
    } catch (err) {
      console.error('Error fetching fundraisers:', err);
      setError('Unable to load campaigns at this time. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchFundraisers(1, pageSize);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchFundraisers(1, pageSize);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchFundraisers(newPage, pageSize);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(1);
    fetchFundraisers(1, newPageSize);
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

      {/* 1. LIGHT EDITORIAL HERO BANNER */}
      <section className="bg-[#F7F6F2] border-b border-[#e5e4de] py-14 px-6 relative">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 border border-[#e5e4de] bg-white/70 rounded-xs">
            <span className="w-2 h-2 rounded-full bg-[#5F3F56] animate-pulse"></span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#5F3F56] font-bold">
              CampusCore Student Giving · Public Causes
            </span>
          </div>

          <div className="max-w-3xl space-y-3">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#1c1c1c] leading-[1.1]">
              Support Our Student Causes.
            </h1>
            <p className="font-sans text-base sm:text-lg text-[#1c1c1c]/75 leading-relaxed max-w-2xl">
              Every contribution directly empowers academic innovation, community welfare, and student-led initiatives. 100% of donations are recorded transparently in our central financial ledger.
            </p>
          </div>

          {/* Aggregated Real Database Impact Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 max-w-2xl font-mono">
            <div className="bg-white border border-[#e5e4de] p-4 rounded-xs shadow-2xs">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-bold">
                Total Raised
              </span>
              <span className="text-2xl font-extrabold text-emerald-700">
                ₹{totalRaisedSum.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-white border border-[#e5e4de] p-4 rounded-xs shadow-2xs">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-bold">
                Supporter Contributions
              </span>
              <span className="text-2xl font-extrabold text-[#1c1c1c]">
                {totalDonorsSum}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-white border border-[#e5e4de] p-4 rounded-xs shadow-2xs">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-bold">
                Active Initiatives
              </span>
              <span className="text-2xl font-extrabold text-[#5F3F56]">
                {fundraisers.length}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <section className="sticky top-16 z-30 bg-[#F7F6F2]/95 backdrop-blur-md border-b border-[#e5e4de] py-4 px-6 shadow-2xs">
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
                className={`px-3.5 py-1.5 rounded-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
                  statusFilter === tab.id
                    ? 'bg-[#5F3F56] text-white border-[#5F3F56] shadow-xs'
                    : 'bg-white/80 text-[#1c1c1c]/70 border-[#e5e4de] hover:bg-white hover:text-[#1c1c1c]'
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
              className="w-full pl-9 pr-20 py-2 bg-white border border-[#e5e4de] text-xs text-[#1c1c1c] focus:outline-none focus:border-[#5F3F56] font-mono rounded-xs transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#5F3F56] hover:bg-[#4a2f42] text-white text-[10px] font-mono font-bold uppercase rounded-xs transition-colors cursor-pointer"
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
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {fundraisers.map((f) => (
                <FundraiserCard
                  key={f.id}
                  fundraiser={f}
                  onDonateClick={(item) => setSelectedFundraiserForDonation(item)}
                />
              ))}
            </div>

            {paginationInfo && paginationInfo.totalItems > pageSize && (
              <div className="pt-2">
                <Pagination
                  page={page}
                  currentPage={page}
                  totalPages={paginationInfo.totalPages}
                  totalItems={paginationInfo.totalItems}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  pageSizeOptions={[3, 6, 12, 24]}
                />
              </div>
            )}
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
