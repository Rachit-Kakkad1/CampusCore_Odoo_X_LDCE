// frontend/src/pages/membership/MembershipSuccessPage.jsx
import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Ticket, ArrowRight, ShieldCheck, Calendar, Sparkles } from 'lucide-react';
import Navbar from '../../components/common/Navbar';

export const MembershipSuccessPage = ({ activatedData }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Prefer props, then navigation state, then fallback
  const result = activatedData || location.state?.result || {};
  const membership = result?.membership || result?.data || result;
  const plan = result?.plan || {};

  const startedAt = membership?.started_at
    ? new Date(membership.started_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

  const expiresAt = membership?.expiry_date
    ? new Date(membership.expiry_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'In 1 Year';

  const planName = plan?.name || (membership?.dues_amount === 99 ? '1 Month Membership' : membership?.dues_amount === 499 ? '6 Month Membership' : '12 Month Membership');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full bg-card border border-border p-8 sm:p-12 space-y-8 shadow-xl text-center"
        >
          {/* Animated Celebration Icon */}
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute w-20 h-20 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg relative z-10">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <span className="font-mono text-xs uppercase font-bold tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 border border-emerald-300 inline-block">
              Payment Confirmed ✓
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Membership Activated
            </h1>
            <p className="font-sans text-sm text-muted max-w-md mx-auto">
              Welcome to the LDCE Student Organization! Your member benefits are now active across all events, stores, and portals.
            </p>
          </div>

          {/* Details Card */}
          <div className="p-6 bg-background/60 border border-border text-left font-mono text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <span className="text-muted uppercase">Plan:</span>
              <span className="font-bold text-foreground text-sm">{planName}</span>
            </div>

            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <span className="text-muted uppercase">Status:</span>
              <span className="font-bold text-emerald-800 uppercase px-2 py-0.5 bg-emerald-100 border border-emerald-300">
                ACTIVE
              </span>
            </div>

            {membership?.member_code && (
              <div className="flex items-center justify-between border-b border-border/80 pb-2">
                <span className="text-muted uppercase">Member Code:</span>
                <span className="font-bold text-foreground select-all">{membership.member_code}</span>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <span className="text-muted uppercase">Started:</span>
              <span className="font-medium text-foreground">{startedAt}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-muted uppercase">Expires:</span>
              <span className="font-bold text-primary text-sm">{expiresAt}</span>
            </div>
          </div>

          {/* Benefits Callout */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 font-sans text-xs flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Member pricing on events (Save ₹200) and merchandise (10% off) is now unlocked automatically.
            </span>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              onClick={() => navigate('/events')}
              className="flex-1 py-3.5 px-6 bg-primary hover:bg-primary-hover text-white font-mono text-xs uppercase tracking-widest font-bold border border-primary transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Ticket className="w-4 h-4" />
              <span>Explore Events</span>
            </button>

            <button
              onClick={() => navigate('/dashboard/member')}
              className="flex-1 py-3.5 px-6 bg-card hover:bg-background text-foreground font-mono text-xs uppercase tracking-widest font-bold border border-border transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>View Membership</span>
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default MembershipSuccessPage;
