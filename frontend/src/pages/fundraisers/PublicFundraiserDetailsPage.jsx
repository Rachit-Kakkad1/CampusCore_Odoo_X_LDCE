import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { DonationCheckoutModal } from '../../components/fundraisers/DonationCheckoutModal';
import fundraiserService from '../../services/fundraiser.service';
import {
  Heart,
  Calendar,
  Users,
  Target,
  ArrowLeft,
  Share2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  DollarSign,
  Sparkles,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';

export const PublicFundraiserDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [fundraiser, setFundraiser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Donation Modal
  const [showDonationModal, setShowDonationModal] = useState(false);

  const fetchFundraiser = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fundraiserService.getFundraiser(id);
      setFundraiser(res.data || res);
    } catch (err) {
      console.error('Error fetching fundraiser details:', err);
      setError('Campaign not found or currently unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchFundraiser();
    }
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDonationSuccess = (newDonation) => {
    fetchFundraiser();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex flex-col font-sans">
        <Navbar />
        <div className="max-w-5xl mx-auto px-6 py-16 w-full space-y-6 animate-pulse">
          <div className="h-8 bg-slate-200 rounded-xs w-48" />
          <div className="h-96 bg-white border border-border rounded-xs" />
        </div>
      </div>
    );
  }

  if (error || !fundraiser) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex flex-col font-sans">
        <Navbar />
        <div className="max-w-md mx-auto px-6 py-24 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">Campaign Not Found</h2>
          <p className="font-sans text-xs text-slate-500">{error || 'This fundraiser does not exist.'}</p>
          <Link
            to="/fundraisers"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Back to All Causes
          </Link>
        </div>
      </div>
    );
  }

  const goal = parseFloat(fundraiser.goal_amount) || 10000;
  const raised = parseFloat(fundraiser.total_raised) || 0;
  const donorCount = parseInt(fundraiser.donor_count, 10) || 0;
  const rawPercentage = goal > 0 ? (raised / goal) * 100 : 0;
  const percentage = Math.round(rawPercentage);
  const isGoalReached = raised >= goal;

  const defaultImage = '/college_fundraiser_event.jpg';

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col font-sans text-[#1c1c1c]">
      <Navbar />

      {/* Breadcrumb & Navigation */}
      <div className="bg-white border-b border-border py-3 px-6 select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between font-mono text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Link to="/fundraisers" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> All Fundraisers
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold truncate max-w-xs">{fundraiser.title}</span>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Main Campaign Container */}
      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: HERO, STORY & RECENT DONATIONS */}
          <div className="lg:col-span-8 space-y-8">
            {/* Campaign Hero Card */}
            <div className="bg-white border border-border rounded-xs overflow-hidden shadow-xs">
              <div className="relative h-72 sm:h-96 w-full bg-slate-100">
                <img
                  src={fundraiser.image_url || defaultImage}
                  alt={fundraiser.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-xs bg-slate-900/80 text-white backdrop-blur-md">
                    Ref: {fundraiser.public_id || `FND-${fundraiser.id}`}
                  </span>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-xs bg-emerald-600/90 text-white backdrop-blur-md">
                    {fundraiser.status}
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-4">
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                  {fundraiser.title}
                </h1>

                <p className="font-sans text-base text-slate-600 leading-relaxed">
                  {fundraiser.short_description}
                </p>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6 font-mono text-xs text-slate-500">
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Organizer</span>
                    <span className="text-slate-900 font-bold">{fundraiser.organizer_name || 'Campus Student Council'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Initiative Start</span>
                    <span className="text-slate-900">
                      {fundraiser.start_at ? new Date(fundraiser.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing'}
                    </span>
                  </div>
                  {fundraiser.end_at && (
                    <div>
                      <span className="text-slate-400 block uppercase font-bold text-[10px]">Deadline</span>
                      <span className="text-slate-900 font-bold">
                        {new Date(fundraiser.end_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Campaign Full Story */}
            <div className="bg-white border border-border p-6 sm:p-8 rounded-xs shadow-xs space-y-4">
              <h2 className="font-serif text-2xl font-bold text-slate-900 border-b border-slate-100 pb-3">
                About the Initiative
              </h2>
              <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed space-y-4 whitespace-pre-line font-sans">
                {fundraiser.description ||
                  'This campaign directly supports student development, supplies, equipment, and outreach. All proceeds are audited in our public financial register.'}
              </div>
            </div>

            {/* Recent Supporters Ticker */}
            <div className="bg-white border border-border p-6 sm:p-8 rounded-xs shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-emerald-600 fill-emerald-600/20" />
                  <h3 className="font-serif text-xl font-bold text-slate-900">
                    Recent Supporters ({donorCount})
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400 font-semibold uppercase">
                  Verified Inflows
                </span>
              </div>

              {(!fundraiser.recent_donations || fundraiser.recent_donations.length === 0) ? (
                <div className="text-center py-8 text-slate-400 font-mono text-xs">
                  Be the first to support this campaign!
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {fundraiser.recent_donations.map((d) => (
                    <div key={d.id} className="py-3.5 flex items-start justify-between gap-4 font-mono text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{d.donor_name}</span>
                          {d.anonymous && (
                            <span className="text-[10px] text-slate-400 font-normal border border-slate-200 px-1.5 py-0.2 rounded-xs">
                              Anonymous
                            </span>
                          )}
                        </div>
                        {d.message && (
                          <p className="font-sans text-xs text-slate-600 italic">
                            "{d.message}"
                          </p>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {d.paid_at ? new Date(d.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-emerald-700 text-sm">
                          ₹{parseFloat(d.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: FINANCIAL PROGRESS & QUICK DONATE CTA */}
          <div className="lg:col-span-4 sticky top-32 space-y-6">
            <div className="bg-white border border-border p-6 rounded-xs shadow-md space-y-6">
              {/* Financial Aggregate Numbers */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                  Authoritative Net Raised
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tight font-mono">
                    ₹{raised.toLocaleString('en-IN')}
                  </span>
                  <span className="text-sm font-mono text-slate-500">
                    of ₹{goal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 font-mono text-xs">
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-700 ease-out ${
                      isGoalReached ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(100, rawPercentage)}%` }}
                  />
                </div>
                <div className="flex justify-between text-slate-500 text-[11px] pt-1">
                  <span>
                    <strong>{percentage}%</strong> of goal reached
                  </span>
                  <span>
                    <strong>{donorCount}</strong> {donorCount === 1 ? 'supporter' : 'supporters'}
                  </span>
                </div>
              </div>

              {/* Big Donate Button */}
              <button
                type="button"
                onClick={() => setShowDonationModal(true)}
                disabled={fundraiser.status === 'completed' || fundraiser.status === 'paused'}
                className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xs shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Heart className="w-4 h-4 fill-white/20" />
                <span>Make a Donation Now</span>
              </button>

              <div className="space-y-3 pt-4 border-t border-slate-100 font-mono text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>100% Secure Transaction Processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Instant Tax Receipt &amp; Email Dispatch</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Donation Checkout Modal */}
      <DonationCheckoutModal
        fundraiser={fundraiser}
        isOpen={showDonationModal}
        onClose={() => setShowDonationModal(false)}
        onDonationSuccess={handleDonationSuccess}
      />
    </div>
  );
};

export default PublicFundraiserDetailsPage;
