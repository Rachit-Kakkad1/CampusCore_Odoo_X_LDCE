// frontend/src/components/membership/MembershipSummary.jsx
import React from 'react';
import { ShieldCheck, Check, Lock, ArrowRight, Loader2 } from 'lucide-react';

export const MembershipSummary = ({
  plan,
  loading = false,
  onSubmit,
}) => {
  return (
    <div className="bg-card border border-border p-6 sm:p-8 space-y-6 sticky top-8 shadow-sm">
      <div className="border-b border-border pb-4">
        <h2 className="font-serif text-2xl font-bold text-foreground tracking-tight">
          Summary
        </h2>
        <span className="font-mono text-[10px] uppercase text-muted tracking-wider">
          Review your selection
        </span>
      </div>

      {/* Selected Item Breakdown */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-sans font-bold text-base text-foreground">
              {plan.name}
            </h3>
            <p className="font-mono text-xs text-muted mt-0.5">
              Duration: {plan.duration_label}
            </p>
            <span className="inline-block mt-1 font-mono text-[10px] text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 font-bold uppercase">
              Active Member Tier
            </span>
          </div>

          <div className="text-right">
            <span className="font-mono text-xl font-bold text-foreground">
              ₹{plan.price}
            </span>
          </div>
        </div>

        {/* Benefits Checklist in Summary */}
        <div className="p-4 bg-background/50 border border-border/80 rounded space-y-2">
          <span className="font-mono text-[10px] uppercase font-bold text-muted tracking-wider block">
            Included Privileges:
          </span>
          <ul className="space-y-1.5 font-sans text-xs text-foreground/80">
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Discounted pricing on eligible events</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>10% discount on official merchandise</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Digital scannable membership pass</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Total Section */}
      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex items-center justify-between font-mono text-xs text-muted">
          <span>Membership subtotal</span>
          <span>₹{plan.price}</span>
        </div>
        <div className="flex items-center justify-between font-mono text-xs text-muted">
          <span>Taxes & fees</span>
          <span className="text-emerald-700 font-semibold">Included</span>
        </div>

        <div className="flex items-baseline justify-between pt-3 border-t border-border font-mono">
          <span className="font-sans font-bold text-base text-foreground">
            Total order amount
          </span>
          <span className="text-3xl font-extrabold text-primary">
            ₹{plan.price}
          </span>
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="w-full py-4 px-6 bg-primary hover:bg-primary-hover text-white font-mono text-xs uppercase tracking-widest font-bold border border-primary transition-all duration-300 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing Activation...</span>
          </>
        ) : (
          <>
            <span>Pay ₹{plan.price}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>

      {/* Security Reassurance Footer */}
      <div className="pt-2 text-center space-y-1">
        <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] text-muted">
          <Lock className="w-3 h-3 text-muted" />
          <span>SSL 256-Bit Encrypted Payment</span>
        </div>
        <p className="font-sans text-[10px] text-muted/80">
          Immediate activation. Your membership status updates atomically.
        </p>
      </div>
    </div>
  );
};

export default MembershipSummary;
