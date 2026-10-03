// frontend/src/pages/public/GuestTicketPurchase.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import eventsService from '../../services/events.service';
import authService from '../../services/auth.service';
import membershipService from '../../services/membership.service';
import { ActionButton } from '../../components/dashboard/ActionButton';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import {
  CheckCircle2,
  Ticket,
  X,
  AlertCircle,
  Copy,
  Check,
  Mail,
  Phone,
  User,
  CreditCard,
  Printer,
  Sparkles,
  ShieldCheck,
  Lock,
  ArrowRight,
  Inbox
} from 'lucide-react';

// PhonePe Style Audio Success Chime (Web Audio API)
const playPhonePeChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    // High-satisfaction PhonePe style dual-chime:
    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);

    // Tone 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(0.28, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.65);
  } catch (e) {
    // Non-blocking fallback if browser policy restricts audio
  }
};

export const GuestTicketPurchase = ({ event, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(authService.getStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());

  // Attendee Information (Required for ticket delivery & admission)
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [mobile, setMobile] = useState('');

  // Flow Stage: 'form' | 'payment_done' | 'confirmation'
  const [stage, setStage] = useState('form');

  // Membership & Pricing State
  const [isActiveMember, setIsActiveMember] = useState(false);
  const [isExpiredMember, setIsExpiredMember] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(false);

  // Optional Inline Sign-In (for existing members to unlock member discount)
  const [showMemberSignIn, setShowMemberSignIn] = useState(false);
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState(null);
  const [signInLoading, setSignInLoading] = useState(false);

  // Purchase & Confirmation State
  const [paymentMode, setPaymentMode] = useState('online');
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState(null);
  const [confirmedTicket, setConfirmedTicket] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Check seat status
  const seatsRemaining = Number(event?.seats_remaining || 0);
  const isSoldOut = seatsRemaining <= 0;

  // Auto-advance from 'payment_done' to 'confirmation' after animation
  useEffect(() => {
    let timer;
    if (stage === 'payment_done') {
      timer = setTimeout(() => {
        setStage('confirmation');
      }, 4200);
    }
    return () => clearTimeout(timer);
  }, [stage]);

  // Check membership on mount or auth change
  useEffect(() => {
    const checkMemberStatus = async () => {
      if (!authService.isAuthenticated()) {
        setIsActiveMember(false);
        setIsExpiredMember(false);
        return;
      }
      try {
        setCheckingMembership(true);
        const memData = await membershipService.getMembership();
        const mem = memData?.membership || memData?.data || memData;
        const active = Boolean(
          mem &&
          mem.status === 'active' &&
          mem.dues_status === 'paid' &&
          (!mem.expiry_date || new Date(mem.expiry_date) > new Date())
        );
        const expired = Boolean(
          mem &&
          (mem.status === 'expired' ||
            (mem.expiry_date && new Date(mem.expiry_date) <= new Date()))
        );
        setIsActiveMember(active);
        setIsExpiredMember(expired);
      } catch (err) {
        setIsActiveMember(false);
        setIsExpiredMember(false);
      } finally {
        setCheckingMembership(false);
      }
    };
    checkMemberStatus();
  }, [isAuthenticated]);

  // Compute pricing
  const memberPrice = Number(event?.member_price || 0);
  const nonMemberPrice = Number(event?.non_member_price || 0);
  const applicablePrice = (isActiveMember ? memberPrice : nonMemberPrice).toFixed(2);
  const savings = (nonMemberPrice - memberPrice).toFixed(2);

  // Handle Inline Member Login
  const handleMemberLogin = async (e) => {
    e.preventDefault();
    setSignInError(null);
    setSignInLoading(true);
    try {
      const res = await authService.login(signInEmail, signInPassword);
      setCurrentUser(res.user);
      setIsAuthenticated(true);
      if (!name) setName(res.user?.name || '');
      if (!email) setEmail(res.user?.email || '');
      setShowMemberSignIn(false);
    } catch (err) {
      setSignInError(err.response?.data?.error?.message || err.message || 'Login failed. Please verify credentials.');
    } finally {
      setSignInLoading(false);
    }
  };

  // Handle Ticket Purchase Confirmation
  const handleConfirmPurchase = async (e) => {
    if (e) e.preventDefault();
    setPurchaseError(null);

    // Validation
    if (isSoldOut) {
      setPurchaseError('This event is currently sold out. No seats available.');
      return;
    }

    if (!name.trim()) {
      setPurchaseError('Please enter attendee Full Name.');
      return;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setPurchaseError('Please provide a valid Email Address for ticket delivery.');
      return;
    }
    if (!mobile.trim() || mobile.trim().length < 7) {
      setPurchaseError('Please provide a valid Mobile Number for entry verification.');
      return;
    }

    setPurchaseLoading(true);

    try {
      const res = await eventsService.purchaseTicket(event.id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        paymentMode,
      });

      const ticket = res?.ticket || res?.data || res;
      setConfirmedTicket(ticket);
      onSuccess?.(ticket);
      // Play satisfying PhonePe success chime
      playPhonePeChime();
      // Transition to PhonePe Payment Done animation screen
      setStage('payment_done');
    } catch (err) {
      console.error('Purchase error:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Ticket reservation failed';
      setPurchaseError(msg);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const copyTicketCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedEventDate = event?.starts_at
    ? new Date(event.starts_at).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Date TBA';

  return (
    <div className="fixed inset-0 z-50 bg-[#1c1c1c]/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#f7f6f2] border border-[#e5e4de] w-full max-w-lg p-6 sm:p-8 shadow-2xl relative my-6 text-[#1c1c1c] transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#1c1c1c]/50 hover:text-[#1c1c1c] p-1.5 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">
          {/* ============================================================ */}
          {/* STAGE 1: PHONEPE STYLE ANIMATED GREEN TICK — PAYMENT DONE    */}
          {/* ============================================================ */}
          {stage === 'payment_done' && (
            <motion.div
              key="payment_done_screen"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
              className="py-6 text-center space-y-5"
            >
              {/* PhonePe Concentric Pulsing Waves + Animated Checkmark Disc */}
              <div className="relative inline-flex items-center justify-center py-3">
                {/* Ripple Wave 1 */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.75 }}
                  animate={{ scale: [0.8, 1.45, 1.8], opacity: [0.75, 0.3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-emerald-500/25"
                />

                {/* Ripple Wave 2 */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.55 }}
                  animate={{ scale: [0.8, 1.7, 2.2], opacity: [0.55, 0.2, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.35, ease: 'easeOut' }}
                  className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-emerald-400/20"
                />

                {/* Ripple Wave 3 */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.35 }}
                  animate={{ scale: [0.8, 2.0, 2.6], opacity: [0.35, 0.1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.7, ease: 'easeOut' }}
                  className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-emerald-300/15"
                />

                {/* Center PhonePe Vibrant Emerald Circle */}
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 11, stiffness: 180, delay: 0.05 }}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-green-400 flex items-center justify-center shadow-2xl shadow-emerald-500/40 relative z-10 border-4 border-white"
                >
                  <motion.svg
                    className="w-12 h-12 sm:w-14 sm:h-14 text-white drop-shadow-md"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <motion.path
                      d="M5 13l4.5 4.5L19 7"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
                    />
                  </motion.svg>
                </motion.div>
              </div>

              {/* Payment Details Typography */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="space-y-1.5"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/90 border border-emerald-300 text-emerald-900 rounded-full font-mono text-[11px] font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  Paid Successfully
                </div>

                <div className="pt-1">
                  <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[#1c1c1c] tracking-tight">
                    ₹{applicablePrice}
                  </div>
                  <p className="font-sans text-xs text-[#1c1c1c]/65 mt-0.5">
                    Paid to Odoo × LDCE Student Organization
                  </p>
                </div>
              </motion.div>

              {/* Prominent Email Delivery Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45, duration: 0.35 }}
                className="p-3.5 bg-emerald-50/90 border border-emerald-300 text-left max-w-sm mx-auto shadow-sm"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 text-xs text-emerald-950">
                    <span className="font-mono text-[10px] uppercase font-bold text-emerald-800 block">
                      Ticket & QR Entry Pass Sent To:
                    </span>
                    <strong className="font-mono text-xs block text-emerald-950 font-bold break-all">
                      {email}
                    </strong>
                    <p className="text-[10px] text-emerald-800/80 pt-0.5">
                      Check your Inbox and Spam folder for the official pass.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Transaction Ref & Countdown Progress */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-3 pt-1 max-w-sm mx-auto"
              >
                {confirmedTicket?.ticket_code && (
                  <div className="font-mono text-[11px] text-[#1c1c1c]/60 flex items-center justify-between border-t border-[#e5e4de] pt-2">
                    <span>Txn Ref:</span>
                    <span className="font-semibold text-[#1c1c1c]">{confirmedTicket.ticket_code}</span>
                  </div>
                )}

                {/* Animated timer progress bar */}
                <div className="w-full bg-gray-200 h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 4.2, ease: 'linear' }}
                    className="bg-emerald-600 h-full"
                  />
                </div>

                <ActionButton
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2 text-xs py-3 bg-emerald-700 hover:bg-emerald-800 border-emerald-700 shadow-sm"
                  onClick={() => setStage('confirmation')}
                >
                  <span>View Official QR Pass & Ticket</span>
                  <ArrowRight className="w-4 h-4" />
                </ActionButton>
              </motion.div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* STAGE 2: CONFIRMATION SCREEN — "CHECK YOUR MAIL" + QR PASS    */}
          {/* ============================================================ */}
          {stage === 'confirmation' && confirmedTicket && (
            <motion.div
              key="confirmation_screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="space-y-6 text-center py-1"
            >
              {/* TOP HERO CALLOUT: CHECK YOUR MAIL FOR THE TICKET */}
              <div className="p-4 sm:p-5 bg-emerald-50 border-2 border-emerald-500/40 text-emerald-950 text-left shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-800 font-bold block">
                      Delivery Confirmation
                    </span>
                    <h4 className="font-serif text-lg sm:text-xl font-bold text-emerald-950 leading-snug">
                      Check your mail for the ticket and other details!
                    </h4>
                    <p className="font-sans text-xs text-emerald-900/80 leading-relaxed pt-0.5">
                      Your entry ticket, signed QR pass, and event schedule have been sent to{' '}
                      <strong className="underline underline-offset-2 font-mono text-emerald-950">{email}</strong>.
                    </p>
                    <p className="font-mono text-[10px] text-emerald-800/70 pt-1">
                      Tip: Please check your Inbox (as well as Spam/Promotions folder).
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <span className="font-mono text-[11px] uppercase tracking-widest text-[#5F3F56] font-bold block mb-1">
                  Official Admission Pass
                </span>
                <h3 className="font-serif text-2xl text-[#1c1c1c] tracking-tight">
                  TICKET CONFIRMED ✓
                </h3>
              </div>

              {/* Ticket Reference Code Box */}
              <div className="bg-white border border-[#e5e4de] p-3.5 flex items-center justify-between font-mono text-xs max-w-md mx-auto">
                <div className="text-left">
                  <span className="text-[10px] text-[#1c1c1c]/50 block uppercase tracking-wider">
                    Ticket Reference Code
                  </span>
                  <span className="font-bold text-sm text-[#1c1c1c] tracking-wider select-all">
                    {confirmedTicket.ticket_code}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyTicketCode(confirmedTicket.ticket_code)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#e5e4de] bg-[#f7f6f2] hover:bg-[#e5e4de] text-[#1c1c1c] transition-colors text-[11px]"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#1c1c1c]/60" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* ACTUAL RENDERED SIGNED QR CODE */}
              {confirmedTicket.qr_data_url ? (
                <div className="bg-white border-2 border-[#1c1c1c] p-4 text-center mx-auto shadow-md max-w-xs">
                  <img
                    src={confirmedTicket.qr_data_url}
                    alt="Official Signed Ticket QR Code"
                    className="w-48 h-48 mx-auto object-contain"
                  />
                  <div className="mt-2.5 font-mono text-[10px] tracking-wider uppercase text-[#1c1c1c]/80 font-semibold border-t border-[#e5e4de] pt-2">
                    Show this QR code at the entrance
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 font-mono text-xs max-w-md mx-auto">
                  Digital Pass: Present ticket code <strong>{confirmedTicket.ticket_code}</strong> at the check-in desk for entry.
                </div>
              )}

              {/* Ticket Card Details Summary */}
              <div className="bg-white/90 border border-[#e5e4de] p-4 text-left font-mono text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between border-b border-[#e5e4de] pb-1.5">
                  <span className="text-[#1c1c1c]/50">EVENT:</span>
                  <span className="font-semibold text-[#1c1c1c] text-right truncate ml-2">{event.title}</span>
                </div>
                <div className="flex justify-between border-b border-[#e5e4de] pb-1.5">
                  <span className="text-[#1c1c1c]/50">VENUE:</span>
                  <span className="text-[#1c1c1c] text-right">{event.venue}</span>
                </div>
                <div className="flex justify-between border-b border-[#e5e4de] pb-1.5">
                  <span className="text-[#1c1c1c]/50">DATE:</span>
                  <span className="text-[#1c1c1c] text-right">{formattedEventDate}</span>
                </div>
                <div className="flex justify-between border-b border-[#e5e4de] pb-1.5">
                  <span className="text-[#1c1c1c]/50">ATTENDEE:</span>
                  <span className="text-[#1c1c1c] text-right font-medium">{name} ({email})</span>
                </div>
                <div className="flex justify-between border-b border-[#e5e4de] pb-1.5">
                  <span className="text-[#1c1c1c]/50">CONTACT:</span>
                  <span className="text-[#1c1c1c] text-right">{mobile || confirmedTicket.attendee_mobile || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-[#e5e4de] pb-1.5">
                  <span className="text-[#1c1c1c]/50">TIER:</span>
                  <span className="text-[#1c1c1c] uppercase font-bold">
                    {confirmedTicket.price_type === 'member' ? 'ACTIVE MEMBER' : 'NON-MEMBER / GUEST'}
                  </span>
                </div>
                <div className="flex justify-between pt-1 font-bold text-sm">
                  <span>PRICE PAID:</span>
                  <span className="text-[#5F3F56]">₹{Number(confirmedTicket.price || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Section 12: Resilient Email Delivery Status Handling */}
              <div className="max-w-md mx-auto text-left">
                {confirmedTicket.email_delivery?.success ? (
                  <p className="font-mono text-xs text-green-900 text-center">
                    A copy of your ticket has been sent to your email.
                  </p>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 font-mono text-xs">
                    Ticket purchased successfully. Email delivery is temporarily unavailable. You can access your ticket here.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 max-w-md mx-auto">
                <ActionButton
                  variant="secondary"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handlePrint}
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save Pass</span>
                </ActionButton>
                <ActionButton
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    onClose();
                    if (isAuthenticated) {
                      navigate('/dashboard');
                    }
                  }}
                >
                  Done
                </ActionButton>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* STAGE 0: CHECKOUT & ATTENDEE FORM (SECTION 6 & 10)           */}
          {/* ============================================================ */}
          {stage === 'form' && (
            <motion.div
              key="form_screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs uppercase tracking-widest text-[#5F3F56] font-semibold">
                    Confirm Ticket
                  </span>
                  {isSoldOut ? (
                    <span className="bg-red-100 text-red-800 text-[10px] font-mono uppercase px-2 py-0.5 font-bold border border-red-300">
                      SOLD OUT
                    </span>
                  ) : (
                    <span className="bg-green-50 text-green-800 text-[10px] font-mono uppercase px-2 py-0.5 font-semibold border border-green-200">
                      {seatsRemaining} Seats Remaining
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl text-[#1c1c1c] tracking-tight">
                  {event.title}
                </h3>
                <div className="font-mono text-xs text-[#1c1c1c]/60 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <span>📍 {event.venue}</span>
                  <span>📅 {formattedEventDate}</span>
                </div>
              </div>

              {/* Sold Out Banner */}
              {isSoldOut && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 font-mono text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
                  <span>This event is SOLD OUT. No further seats are available.</span>
                </div>
              )}

              {/* Error Callout */}
              {purchaseError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 font-mono text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
                  <span>{purchaseError}</span>
                </div>
              )}

              {/* SECTION 10: CONFIRM TICKET PREVIEW CARD */}
              <div className="p-4 bg-white/80 border border-[#e5e4de] space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#e5e4de]">
                  <span className="text-[#1c1c1c]/60">Event:</span>
                  <span className="font-bold text-[#1c1c1c]">{event.title}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-[#e5e4de]">
                  <span className="text-[#1c1c1c]/60">Ticket:</span>
                  <span className={`font-bold uppercase ${isActiveMember ? 'text-green-800' : 'text-[#1c1c1c]'}`}>
                    {isActiveMember ? 'ACTIVE MEMBER' : 'NON-MEMBER'}
                  </span>
                </div>

                {isActiveMember ? (
                  <div className="p-2.5 bg-green-50 border border-green-200 text-green-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <ShieldCheck className="w-4 h-4 text-green-700" />
                      Member price applied
                    </span>
                    <span className="font-bold text-green-800">Save ₹{savings}</span>
                  </div>
                ) : isExpiredMember ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>Membership: EXPIRED</span>
                      <span>Ticket: ₹{nonMemberPrice.toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-amber-800">
                      Renew your membership to unlock member pricing (₹{memberPrice.toFixed(2)}).
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-[#1c1c1c]/60 pt-1">
                    <span>Active Member Price: ₹{memberPrice.toFixed(2)}</span>
                    {!isAuthenticated ? (
                      <button
                        type="button"
                        onClick={() => setShowMemberSignIn(!showMemberSignIn)}
                        className="text-[#5F3F56] underline font-semibold hover:text-[#4A3244]"
                      >
                        {showMemberSignIn ? 'Close Sign In' : 'Member? Sign In to Save ₹' + savings}
                      </button>
                    ) : (
                      <span className="text-amber-800">Become a member to unlock member pricing.</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-base font-bold text-[#1c1c1c] pt-2 border-t border-[#e5e4de]">
                  <span>Price:</span>
                  <span className="text-[#5F3F56] text-xl">₹{applicablePrice}</span>
                </div>
              </div>

              {/* Inline Member Sign-In (Optional for members without current session) */}
              {showMemberSignIn && !isAuthenticated && (
                <div className="p-4 border border-[#5F3F56]/30 bg-[#5F3F56]/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase font-bold text-[#5F3F56] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Sign In for Member Pricing (₹{memberPrice.toFixed(2)})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowMemberSignIn(false)}
                      className="font-mono text-[10px] text-[#1c1c1c]/60 uppercase underline"
                    >
                      Cancel
                    </button>
                  </div>

                  {signInError && (
                    <div className="p-2 bg-red-50 border border-red-200 text-red-800 font-mono text-xs">
                      {signInError}
                    </div>
                  )}

                  <form onSubmit={handleMemberLogin} className="space-y-2.5">
                    <input
                      type="email"
                      required
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="member@campuscore.org"
                      className="w-full p-2 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
                    />
                    <input
                      type="password"
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full p-2 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
                    />
                    <ActionButton
                      type="submit"
                      variant="secondary"
                      className="w-full text-xs"
                      disabled={signInLoading}
                    >
                      {signInLoading ? 'Verifying...' : 'Sign In & Apply Member Rate'}
                    </ActionButton>
                  </form>
                </div>
              )}

              {/* SECTION 6: GUEST ATTENDEE CONTACT DETAILS FORM */}
              <form onSubmit={handleConfirmPurchase} className="space-y-4">
                <div className="space-y-3">
                  <div className="border-b border-[#e5e4de] pb-1">
                    <span className="font-mono text-xs uppercase tracking-wider font-semibold text-[#1c1c1c]">
                      Attendee Information
                    </span>
                    <p className="font-sans text-[11px] text-[#1c1c1c]/60 mt-0.5">
                      The ticket and entry QR will be sent to this email.
                    </p>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block font-mono text-[10px] uppercase font-semibold text-[#1c1c1c]/70 mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#5F3F56]" />
                      <span>Full Name *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rachit Hiren Kakkad"
                      className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs text-[#1c1c1c] focus:outline-none focus:border-[#5F3F56]"
                    />
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block font-mono text-[10px] uppercase font-semibold text-[#1c1c1c]/70 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#5F3F56]" />
                      <span>Email Address *</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. kakkadrachit1@gmail.com"
                      className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs text-[#1c1c1c] focus:outline-none focus:border-[#5F3F56]"
                    />
                    <span className="font-mono text-[10px] text-[#1c1c1c]/50 mt-1 block">
                      Required: Your admission ticket and QR code will be delivered here.
                    </span>
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block font-mono text-[10px] uppercase font-semibold text-[#1c1c1c]/70 mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#5F3F56]" />
                      <span>Mobile Number *</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="e.g. 8200250915"
                      className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs text-[#1c1c1c] focus:outline-none focus:border-[#5F3F56]"
                    />
                  </div>
                </div>

                {/* Payment Mode Selection */}
                <div className="space-y-2 pt-2 border-t border-[#e5e4de]">
                  <label className="block font-mono text-[10px] uppercase font-semibold text-[#1c1c1c]/70 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#5F3F56]" />
                    <span>Select Payment Method</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'online', label: 'Online / Gateway' },
                      { id: 'upi', label: 'UPI Instant' },
                      { id: 'card', label: 'Card Payment' },
                      { id: 'cash', label: 'Pay at Desk' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMode(m.id)}
                        className={`p-2.5 border text-left font-mono text-xs transition-all ${
                          paymentMode === m.id
                            ? 'border-[#5F3F56] bg-[#5F3F56]/10 text-[#5F3F56] font-bold'
                            : 'border-[#e5e4de] bg-white text-[#1c1c1c] hover:border-[#1c1c1c]/40'
                        }`}
                      >
                        <div className="text-[11px] uppercase tracking-wide">{m.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modal Action Buttons (Section 10) */}
                <div className="pt-4 border-t border-[#e5e4de] flex items-center justify-end gap-3">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    disabled={purchaseLoading}
                  >
                    Cancel
                  </ActionButton>

                  <ActionButton
                    type="submit"
                    variant="primary"
                    disabled={purchaseLoading || isSoldOut}
                    className="min-w-[180px]"
                  >
                    {purchaseLoading
                      ? 'Issuing Ticket...'
                      : isSoldOut
                      ? 'SOLD OUT'
                      : `Confirm & Pay ₹${applicablePrice}`}
                  </ActionButton>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GuestTicketPurchase;
