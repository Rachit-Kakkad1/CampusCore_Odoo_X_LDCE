import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Users, Target, Calendar, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

export const FundraiserCard = ({ fundraiser, onDonateClick }) => {
  if (!fundraiser) return null;

  const goal = parseFloat(fundraiser.goal_amount) || 10000;
  const raised = parseFloat(fundraiser.total_raised) || 0;
  const donorCount = parseInt(fundraiser.donor_count, 10) || 0;
  const rawPercentage = goal > 0 ? (raised / goal) * 100 : 0;
  const percentage = Math.round(rawPercentage);
  const isGoalReached = raised >= goal;

  // Deadline calculation
  let deadlineText = null;
  let isExpired = false;
  if (fundraiser.end_at) {
    const end = new Date(fundraiser.end_at);
    const now = new Date();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      deadlineText = `${diffDays} days left`;
    } else if (diffDays === 0) {
      deadlineText = 'Ends today';
    } else {
      deadlineText = 'Campaign ended';
      isExpired = true;
    }
  }

  const defaultImage =
    'https://images.unsplash.com/photo-1532629345422-7515f3d16bb7?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="bg-white border border-border shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group overflow-hidden rounded-xs">
      {/* 1. IMAGE & BADGE OVERLAY */}
      <div className="relative h-48 sm:h-52 bg-slate-100 overflow-hidden">
        <img
          src={fundraiser.image_url || defaultImage}
          alt={fundraiser.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

        {/* Status & Deadline Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <span
            className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-xs backdrop-blur-md shadow-xs ${
              fundraiser.status === 'completed' || isGoalReached
                ? 'bg-emerald-600/90 text-white'
                : fundraiser.status === 'paused'
                ? 'bg-amber-600/90 text-white'
                : 'bg-primary/90 text-white'
            }`}
          >
            {isGoalReached ? 'Goal Reached' : fundraiser.status === 'active' ? 'Active Cause' : fundraiser.status}
          </span>

          {deadlineText && (
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs bg-slate-900/80 text-slate-200 backdrop-blur-md">
              {deadlineText}
            </span>
          )}
        </div>

        {/* Raised overlay preview on mobile / hover */}
        <div className="absolute bottom-3 left-3 right-3 flex items-baseline justify-between text-white font-mono">
          <span className="text-xs uppercase tracking-wider text-slate-200">Total Raised</span>
          <span className="text-lg font-extrabold text-white tracking-tight">
            ₹{raised.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* 2. CARD CONTENT */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mb-1.5">
            <span className="uppercase tracking-wider font-semibold">Ref: {fundraiser.public_id || `FND-${fundraiser.id}`}</span>
          </div>

          <Link to={`/fundraisers/${fundraiser.slug || fundraiser.id}`}>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight line-clamp-2">
              {fundraiser.title}
            </h3>
          </Link>

          <p className="font-sans text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
            {fundraiser.short_description || fundraiser.description || 'Community initiative driven by student organization members.'}
          </p>
        </div>

        {/* 3. PROGRESS BAR & FINANCIAL TOTALS */}
        <div className="space-y-2 pt-2 border-t border-slate-100 font-mono">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-extrabold text-slate-900 text-sm">₹{raised.toLocaleString('en-IN')}</span>
              <span className="text-slate-400 text-[11px] ml-1">of ₹{goal.toLocaleString('en-IN')}</span>
            </div>
            <span className="font-bold text-primary text-xs">
              {rawPercentage > 100 ? `${percentage}% (Goal Exceeded)` : `${percentage}%`}
            </span>
          </div>

          {/* Responsive Progress Bar */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 relative">
            <div
              className={`h-full transition-all duration-700 ease-out ${
                isGoalReached ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(100, rawPercentage)}%` }}
            />
          </div>

          {/* Donor Count */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <strong>{donorCount}</strong> {donorCount === 1 ? 'donation' : 'donations'}
            </span>
            {isGoalReached && (
              <span className="text-emerald-700 font-bold flex items-center gap-1 text-[10px] uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3" /> Funded
              </span>
            )}
          </div>
        </div>

        {/* 4. ACTION BUTTONS */}
        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDonateClick?.(fundraiser)}
            disabled={fundraiser.status === 'completed' || fundraiser.status === 'paused' || isExpired}
            className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xs shadow-xs hover:shadow-md transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5 fill-white/20" />
            <span>Donate Now</span>
          </button>

          <Link
            to={`/fundraisers/${fundraiser.slug || fundraiser.id}`}
            className="p-2.5 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 rounded-xs transition-colors cursor-pointer"
            title="View Details"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FundraiserCard;
