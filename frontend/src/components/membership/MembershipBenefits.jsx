// frontend/src/components/membership/MembershipBenefits.jsx
import React from 'react';
import { Check, ShieldCheck, Ticket, ShoppingBag, Bell, Calendar, Sparkles } from 'lucide-react';

export const MembershipBenefits = () => {
  const steps = [
    {
      num: '01',
      title: 'Choose a membership plan',
      desc: 'Select from 1 Month (₹99), 6 Months (₹499), or 12 Months (₹899) based on your semester and campus schedule.',
    },
    {
      num: '02',
      title: 'Complete payment',
      desc: 'Pay securely using Card, UPI, or Netbanking. Transaction is verified and confirmed atomically.',
    },
    {
      num: '03',
      title: 'Membership becomes ACTIVE',
      desc: 'Your account status is instantly updated to ACTIVE with a unique cryptographic member pass.',
    },
    {
      num: '04',
      title: 'Expiry calculated automatically',
      desc: 'PostgreSQL calculates your exact validity using precise interval arithmetic (1 month, 6 months, or 12 months).',
    },
    {
      num: '05',
      title: 'Member pricing unlocked everywhere',
      desc: 'Eligible events (e.g. ₹300 instead of ₹500) and merchandise discounts apply automatically at checkout.',
    },
  ];

  return (
    <div className="space-y-24 py-16">
      {/* 1. Value Proposition Grid */}
      <div className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary font-bold">
            Real Financial Value
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground font-bold tracking-tight">
            Membership pays for itself in just two events.
          </h2>
          <p className="font-sans text-sm text-muted">
            Designed to support active student participation with tangible savings on tickets, merchandise, and student activities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-card border border-border space-y-3 hover:border-primary/40 transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">Discounted Event Tickets</h3>
            <p className="font-sans text-xs text-muted leading-relaxed">
              Active members save up to ₹200 on every flagship campus symposium, workshop, and hackathon ticket.
            </p>
            <div className="pt-2 font-mono text-[11px] text-emerald-700 font-semibold">
              Save ₹200 per ticket · e.g. Spring Gala
            </div>
          </div>

          <div className="p-6 bg-card border border-border space-y-3 hover:border-primary/40 transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">Merchandise Discounts</h3>
            <p className="font-sans text-xs text-muted leading-relaxed">
              Receive 10% off official organization hoodies, t-shirts, and academic stationery at the student store.
            </p>
            <div className="pt-2 font-mono text-[11px] text-emerald-700 font-semibold">
              Automatic 10% discount at checkout
            </div>
          </div>

          <div className="p-6 bg-card border border-border space-y-3 hover:border-primary/40 transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">Digital Identity & Badge</h3>
            <p className="font-sans text-xs text-muted leading-relaxed">
              Official verified member badge, scannable entrance pass with QR code, and priority community updates.
            </p>
            <div className="pt-2 font-mono text-[11px] text-emerald-700 font-semibold">
              Instant cryptographic admission pass
            </div>
          </div>
        </div>
      </div>

      {/* 2. Feature Comparison Table */}
      <div className="space-y-6">
        <div className="border-b border-border pb-4">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary font-bold block mb-1">
            Compare Plans
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl text-foreground font-bold tracking-tight">
            Transparent feature comparison
          </h2>
        </div>

        <div className="overflow-x-auto bg-card border border-border">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-border bg-background/60">
                <th className="p-4 font-bold text-foreground uppercase tracking-wider">Feature</th>
                <th className="p-4 font-bold text-center text-foreground uppercase tracking-wider">1 Month</th>
                <th className="p-4 font-bold text-center text-foreground uppercase tracking-wider">6 Months</th>
                <th className="p-4 font-bold text-center text-primary uppercase tracking-wider">12 Months</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr>
                <td className="p-4 font-sans text-xs font-medium text-foreground">Member pricing on eligible events</td>
                <td className="p-4 text-center text-emerald-700 font-bold text-sm">✓</td>
                <td className="p-4 text-center text-emerald-700 font-bold text-sm">✓</td>
                <td className="p-4 text-center text-emerald-700 font-bold text-sm">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-sans text-xs font-medium text-foreground">Event benefits & priority seating</td>
                <td className="p-4 text-center text-emerald-700 font-bold text-sm">✓</td>
                <td className="p-4 text-center text-emerald-700 font-bold text-sm">✓</td>
                <td className="p-4 text-center text-emerald-700 font-bold text-sm">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-sans text-xs font-medium text-foreground">Merchandise benefits (10% off store)</td>
                <td className="p-4 text-center text-emerald-700 font-bold text-sm">✓</td>
                <td className="p-4 text-center text-emerald-700 font-bold text-sm">✓</td>
                <td className="p-4 text-center text-emerald-700 font-bold text-sm">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-sans text-xs font-medium text-foreground">Membership badge & digital pass</td>
                <td className="p-4 text-center text-emerald-700 font-bold text-sm">✓</td>
                <td className="p-4 text-center text-emerald-700 font-bold text-sm">✓</td>
                <td className="p-4 text-center text-emerald-700 font-bold text-sm">✓</td>
              </tr>
              <tr>
                <td className="p-4 font-sans text-xs font-medium text-foreground">Access to member announcements & offers</td>
                <td className="p-4 text-center text-emerald-700 font-bold text-sm">✓</td>
                <td className="p-4 text-center text-emerald-700 font-bold text-sm">✓</td>
                <td className="p-4 text-center text-emerald-700 font-bold text-sm">✓</td>
              </tr>
              <tr className="bg-background/30 font-bold">
                <td className="p-4 font-sans text-xs text-foreground">Validity Duration</td>
                <td className="p-4 text-center text-foreground">1 month</td>
                <td className="p-4 text-center text-foreground">6 months</td>
                <td className="p-4 text-center text-primary">12 months</td>
              </tr>
              <tr className="bg-background/50 font-bold">
                <td className="p-4 font-sans text-xs text-foreground">Membership Dues</td>
                <td className="p-4 text-center text-foreground text-sm">₹99</td>
                <td className="p-4 text-center text-foreground text-sm">₹499</td>
                <td className="p-4 text-center text-primary text-base">₹899</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. "How Membership Works" Section */}
      <div className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary font-bold">
            Transparent Lifecycle
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground font-bold tracking-tight">
            How membership works
          </h2>
          <p className="font-sans text-sm text-muted">
            Fully automated, authoritative backend validation from enrollment to check-in.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {steps.map((s, idx) => (
            <div key={idx} className="p-5 bg-card border border-border space-y-3 relative group hover:border-primary/40 transition-colors">
              <span className="font-mono text-2xl font-bold text-primary/40 group-hover:text-primary transition-colors block">
                {s.num}
              </span>
              <h4 className="font-serif text-sm font-bold text-foreground leading-snug">
                {s.title}
              </h4>
              <p className="font-sans text-[11px] text-muted leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MembershipBenefits;
