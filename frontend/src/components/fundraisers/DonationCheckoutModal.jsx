import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import fundraiserService from '../../services/fundraiser.service';
import authService from '../../services/auth.service';
import {
  Heart,
  X,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  User,
  AlertCircle,
  Copy,
  Check,
  Printer,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

// PhonePe Style Audio Success Chime (Web Audio API)
const playSuccessChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    // Dual frequency harmonic chime (D5 -> A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(0.28, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.7);
  } catch (e) {
    // Non-blocking fallback
  }
};

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500];

export const DonationCheckoutModal = ({
  fundraiser,
  isOpen,
  onClose,
  onDonationSuccess,
}) => {
  const currentUser = authService.getStoredUser();

  // Selected Amount & Custom Amount (default ₹500, directly editable in input box)
  const [selectedAmount, setSelectedAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState('500');

  // Donor Contact Information
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState('');

  // Flow State: 'form' | 'processing' | 'payment_done' | 'receipt'
  const [stage, setStage] = useState('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmedDonation, setConfirmedDonation] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Auto-advance from 'payment_done' animation to 'receipt'
  useEffect(() => {
    let timer;
    if (stage === 'payment_done') {
      timer = setTimeout(() => {
        setStage('receipt');
      }, 2400);
    }
    return () => clearTimeout(timer);
  }, [stage]);

  // Synchronize user fields if user logs in
  useEffect(() => {
    if (currentUser) {
      if (!name) setName(currentUser.name || '');
      if (!email) setEmail(currentUser.email || '');
    }
  }, [currentUser]);

  if (!isOpen || !fundraiser) return null;

  const currentGoal = parseFloat(fundraiser.goal_amount) || 10000;
  const currentRaised = parseFloat(fundraiser.total_raised) || 0;
  const activeAmount = parseFloat(customAmount) || 0;

  const handleSelectPreset = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount(String(amount));
    setError(null);
  };

  const handleCustomChange = (e) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setCustomAmount(val);
    const parsed = parseFloat(val);
    setSelectedAmount(PRESET_AMOUNTS.includes(parsed) ? parsed : null);
    setError(null);
  };

  const handleProceedToPayment = async (e) => {
    e.preventDefault();
    setError(null);

    // Form Validations
    if (!activeAmount || activeAmount <= 0) {
      setError('Please select or enter a valid donation amount (minimum ₹1).');
      return;
    }

    if (activeAmount > 1000000) {
      setError('Donation amount exceeds the maximum single limit of ₹1,000,000.');
      return;
    }

    if (!name.trim()) {
      setError('Please provide your Full Name.');
      return;
    }

    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setError('Please provide a valid Email Address for receipt confirmation.');
      return;
    }

    if (!phone.trim() || phone.trim().length < 7) {
      setError('Please provide a valid Phone Number.');
      return;
    }

    setLoading(true);

    try {
      // 1. Checkout Session
      const idempotencyKey = `idemp-don-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const checkoutRes = await fundraiserService.checkoutDonation(fundraiser.id, {
        amount: activeAmount,
        donor_name: name.trim(),
        donor_email: email.trim().toLowerCase(),
        donor_phone: phone.trim(),
        anonymous,
        message: message.trim() || null,
        idempotency_key: idempotencyKey,
      });

      const pendingDonation = checkoutRes.data || checkoutRes;

      // 2. Process Atomic Payment Confirmation
      const payRes = await fundraiserService.payDonation(pendingDonation.id, {
        payment_reference: `PAY-RZP-${Date.now().toString().slice(-6)}`,
        payment_mode: 'online',
      });

      const finalizedDonation = payRes.data || payRes;
      setConfirmedDonation(finalizedDonation);
      onDonationSuccess?.(finalizedDonation);

      // Play success chime and trigger celebration screen
      playSuccessChime();
      setStage('payment_done');
    } catch (err) {
      console.error('Donation checkout error:', err);
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Donation payment could not be completed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyReference = (ref) => {
    if (!ref) return;
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-white border border-[#e5e4de] w-full max-w-lg shadow-2xl overflow-hidden my-6 rounded-xs text-slate-900"
      >
        {/* Top Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5F3F56] via-purple-600 to-emerald-600" />

        {/* --------------------------------------------------------------- */}
        {/* STAGE 1: DONATION FORM                                          */}
        {/* --------------------------------------------------------------- */}
        {stage === 'form' && (
          <div>
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-[#e5e4de] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xs bg-[#5F3F56]/10 border border-[#5F3F56]/20 flex items-center justify-center text-[#5F3F56] shadow-xs">
                  <Heart className="w-5 h-5 fill-[#5F3F56]/20" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-[#5F3F56] bg-[#5F3F56]/10 px-2 py-0.5 rounded-xs border border-[#5F3F56]/20">
                    Verified Campaign
                  </span>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight mt-0.5 line-clamp-1">
                    {fundraiser.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Campaign Summary Bar */}
            <div className="bg-[#f7f6f2] px-6 py-3 border-b border-[#e5e4de] flex items-center justify-between font-mono text-xs text-slate-600">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Goal</span>
                <span className="font-bold text-slate-900">₹{currentGoal.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Raised to date</span>
                <span className="font-extrabold text-emerald-700">₹{currentRaised.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Checkout Form */}
            <form onSubmit={handleProceedToPayment} className="p-6 space-y-5 text-xs">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 font-mono text-xs flex items-center gap-2 rounded-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Amount Selection & Input Box */}
              <div className="space-y-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  How much do you want to donate? (₹) *
                </label>

                {/* Direct Custom Amount Input Box */}
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-500 text-sm">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Enter amount (e.g. 500, 1500, 5000)"
                    value={customAmount}
                    onChange={handleCustomChange}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-[#5F3F56] rounded-xs font-mono text-sm font-bold text-slate-900 outline-none transition-all shadow-2xs"
                  />
                </div>

                {/* Quick Select Preset Buttons */}
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5 font-medium">
                    Or select a quick amount:
                  </span>
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_AMOUNTS.map((amt) => {
                      const isSelected = selectedAmount === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleSelectPreset(amt)}
                          className={`py-2 px-1 text-center font-mono font-bold text-xs border rounded-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#5F3F56] text-white border-[#5F3F56] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          ₹{amt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Donor Details */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Your Information *
                  </label>
                  {currentUser ? (
                    <span className="text-[10px] font-mono text-emerald-600 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> Logged In
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">Guest Checkout</span>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    required
                    placeholder="Full Name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-medium rounded-xs outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="email"
                    required
                    placeholder="Email Address (Receipt) *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-mono rounded-xs outline-none transition-all"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Mobile / Phone Number *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-mono rounded-xs outline-none transition-all"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                      className="w-4 h-4 rounded-xs border-slate-300 text-emerald-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Make my donation <strong>anonymous</strong> on public boards</span>
                  </label>
                </div>

                <div>
                  <textarea
                    rows={2}
                    placeholder="Encouragement message or note (optional)..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 rounded-xs outline-none transition-all"
                  />
                </div>
              </div>

              {/* 3. Cost & Fee Breakdown */}
              <div className="bg-slate-50 p-3.5 border border-slate-200/80 rounded-xs font-mono space-y-1.5 text-slate-600">
                <div className="flex justify-between text-xs">
                  <span>Donation Pledge:</span>
                  <span className="font-bold text-slate-900">₹{activeAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Processing Fee:</span>
                  <span className="text-emerald-600 font-bold">₹0.00 (Covered)</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-1.5 mt-1">
                  <span>Total Due:</span>
                  <span className="text-emerald-700">₹{activeAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-border flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2.5 border border-border text-slate-700 hover:bg-slate-100 font-bold uppercase text-[11px] tracking-wider rounded-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || activeAmount <= 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-xs tracking-wider rounded-xs shadow-sm hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{loading ? 'Processing Real Payment...' : `Contribute ₹${activeAmount.toFixed(2)}`}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --------------------------------------------------------------- */}
        {/* STAGE 2: PAYMENT DONE SUCCESS ANIMATION                         */}
        {/* --------------------------------------------------------------- */}
        {stage === 'payment_done' && (
          <div className="p-12 text-center space-y-6 bg-gradient-to-b from-emerald-50/50 to-white">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-20 h-20 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-600/30"
            >
              <Check className="w-10 h-10 stroke-[3]" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100/60 px-3 py-1 rounded-full">
                Payment Authorized
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Donation of ₹{activeAmount.toFixed(2)} Confirmed!
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Updating real-time community treasury & generating official receipt...
              </p>
            </motion.div>
          </div>
        )}

        {/* --------------------------------------------------------------- */}
        {/* STAGE 3: OFFICIAL RECEIPT CONFIRMATION                          */}
        {/* --------------------------------------------------------------- */}
        {stage === 'receipt' && (
          <div className="p-6 sm:p-8 space-y-6 bg-white">
            {/* Success Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-emerald-700">
                    Official Tax-Deductible Receipt
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Thank you, {confirmedDonation?.donor_name || name}!
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-sm font-mono space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200/70 pb-2.5">
                <span className="text-xs text-slate-500 uppercase font-bold">Donation Reference</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-emerald-700 text-sm">
                    {confirmedDonation?.public_id || 'DON-VERIFIED'}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyReference(confirmedDonation?.public_id)}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <span className="text-slate-500">Fundraiser Cause:</span>
                <span className="font-bold text-slate-900 text-right line-clamp-1">
                  {fundraiser.title}
                </span>

                <span className="text-slate-500">Amount Contributed:</span>
                <span className="font-extrabold text-emerald-700 text-right text-sm">
                  ₹{parseFloat(confirmedDonation?.amount || activeAmount).toFixed(2)}
                </span>

                <span className="text-slate-500">Status:</span>
                <span className="text-right">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase">
                    Paid & Recorded
                  </span>
                </span>

                <span className="text-slate-500">Payment Reference:</span>
                <span className="font-mono text-right text-slate-700 text-[11px] truncate">
                  {confirmedDonation?.payment_reference || 'ONLINE-AUTH'}
                </span>

                <span className="text-slate-500">Delivered To:</span>
                <span className="text-right text-slate-700 truncate">
                  {confirmedDonation?.donor_email || email}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              A comprehensive confirmation receipt and tax documentation has been dispatched to{' '}
              <strong>{confirmedDonation?.donor_email || email}</strong>. The raised totals on the campaign board have been updated in real time.
            </p>

            {/* Receipt Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xs inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:flex-1 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-wider rounded-xs shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>View Updated Fundraiser</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default DonationCheckoutModal;
