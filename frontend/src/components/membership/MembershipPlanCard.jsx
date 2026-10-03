// frontend/src/components/membership/MembershipPlanCard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

export const MembershipPlanCard = ({ plan, isRecommended = false }) => {
  const navigate = useNavigate();

  const handleSelectPlan = () => {
    navigate(`/membership/checkout?plan=${plan.id}`);
  };

  const getBadge = () => {
    if (plan.id === '12_months') {
      return {
        label: 'Best Value · Full Year',
        className: 'bg-primary text-white border-primary',
      };
    }
    if (plan.id === '6_months') {
      return {
        label: 'Most Popular',
        className: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      };
    }
    return {
      label: 'Flexible Trial',
      className: 'bg-gray-100 text-gray-700 border-gray-300',
    };
  };

  const badge = getBadge();

  return (
    <div
      className={`relative bg-card border flex flex-col justify-between transition-all duration-300 hover:shadow-xl ${
        isRecommended
          ? 'border-primary ring-2 ring-primary/20 shadow-lg scale-[1.02]'
          : 'border-border hover:border-primary/50'
      }`}
    >
      {/* Top Banner Tag */}
      <div className="p-6 sm:p-8 border-b border-border/80">
        <div className="flex items-center justify-between gap-2 mb-4">
          <span
            className={`font-mono text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 border ${badge.className}`}
          >
            {badge.label}
          </span>
          {isRecommended && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-primary font-bold">
              <Sparkles className="w-3 h-3 text-primary" />
              RECOMMENDED
            </span>
          )}
        </div>

        <h3 className="font-serif text-2xl text-foreground font-bold tracking-tight">
          {plan.name}
        </h3>

        <p className="font-sans text-xs text-muted mt-1">
          {plan.duration_months === 1
            ? 'Access all student organization member privileges for 1 month.'
            : plan.duration_months === 6
            ? 'Continuous active member access across semester events and merch.'
            : 'Unlocks maximum financial savings and 365 days of active member access.'}
        </p>

        {/* Pricing display */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight">
              ₹{plan.price}
            </span>
            <span className="font-mono text-xs uppercase text-muted">
              / {plan.duration_label}
            </span>
          </div>

          <div className="font-mono text-[11px] text-muted mt-1.5 flex items-center gap-1">
            {plan.id === '12_months' && (
              <span className="text-emerald-700 font-semibold">
                ≈ ₹75/mo · Save 24% vs monthly renewals
              </span>
            )}
            {plan.id === '6_months' && (
              <span className="text-emerald-700 font-semibold">
                ≈ ₹83/mo · Save 16% vs monthly renewals
              </span>
            )}
            {plan.id === '1_month' && (
              <span className="text-muted">Single month pass · No recurring trap</span>
            )}
          </div>
        </div>
      </div>

      {/* Benefits List */}
      <div className="p-6 sm:p-8 space-y-4 flex-1 bg-background/30">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted font-bold">
          Plan Privileges & Perks
        </div>

        <ul className="space-y-3 font-sans text-xs text-foreground/90">
          {plan.benefits.map((benefit, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span className="leading-snug">{benefit}</span>
            </li>
          ))}
          <li className="flex items-start gap-2.5 pt-1 text-[11px] font-mono text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <span>Digital Member Pass with scannable entry QR</span>
          </li>
        </ul>
      </div>

      {/* Card Action CTA */}
      <div className="p-6 sm:p-8 border-t border-border bg-card">
        <button
          onClick={handleSelectPlan}
          className={`w-full py-3.5 px-4 font-mono text-xs uppercase tracking-widest font-bold border transition-all duration-300 flex items-center justify-center gap-2 group ${
            isRecommended
              ? 'bg-primary text-white border-primary hover:bg-primary-hover shadow-md'
              : 'bg-foreground text-white border-foreground hover:bg-primary hover:border-primary'
          }`}
        >
          <span>Get Membership</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};

export default MembershipPlanCard;
