// frontend/src/pages/public/GuestTicketPurchase.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import eventsService from '../../services/events.service';
import authService from '../../services/auth.service';
import { ActionButton } from '../../components/dashboard/ActionButton';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { CheckCircle2, Ticket, X, AlertCircle } from 'lucide-react';

export const GuestTicketPurchase = ({ event, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(authService.getStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());

  // Quick Auth State (if not logged in)
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Purchase State
  const [paymentMode, setPaymentMode] = useState('online');
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState(null);
  const [confirmedTicket, setConfirmedTicket] = useState(null);

  const nonMemberPrice = Number(event?.non_member_price || 0).toFixed(2);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        const res = await authService.login(email, password);
        setCurrentUser(res.user);
        setIsAuthenticated(true);
      } else {
        const res = await authService.register({ name, email, password, role: 'guest' });
        setCurrentUser(res.user);
        setIsAuthenticated(true);
      }
    } catch (err) {
      setAuthError(err.response?.data?.error?.message || err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!isAuthenticated) {
      setPurchaseError('Please sign in or register to complete ticket reservation.');
      return;
    }

    setPurchaseLoading(true);
    setPurchaseError(null);

    try {
      const res = await eventsService.purchaseTicket(event.id, paymentMode);
      const ticket = res?.data || res;
      setConfirmedTicket(ticket);
      onSuccess?.(ticket);
    } catch (err) {
      console.error('Purchase error:', err);
      setPurchaseError(err.response?.data?.error?.message || err.message || 'Ticket purchase failed');
    } finally {
      setPurchaseLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1c1c1c]/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#f7f6f2] border border-[#e5e4de] w-full max-w-lg p-6 sm:p-8 shadow-2xl relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-[#1c1c1c]/50 hover:text-[#1c1c1c] p-1 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Confirmation State */}
        {confirmedTicket ? (
          <div className="text-center space-y-6 py-4">
            <div className="w-14 h-14 bg-green-100 border border-green-300 text-green-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-[#5F3F56] font-semibold block mb-1">
                Reservation Confirmed
              </span>
              <h3 className="font-serif text-3xl text-[#1c1c1c]">
                Ticket Code: {confirmedTicket.ticket_code}
              </h3>
              <p className="font-sans text-sm text-[#1c1c1c]/70 mt-2">
                Your guest ticket for <strong>{event.title}</strong> has been issued.
              </p>
            </div>

            {/* Ticket Card Summary */}
            <div className="bg-white/80 border border-[#e5e4de] p-5 text-left font-mono text-xs space-y-2">
              <div className="flex justify-between border-b border-[#e5e4de] pb-2">
                <span className="text-[#1c1c1c]/50">EVENT:</span>
                <span className="font-bold text-[#1c1c1c]">{event.title}</span>
              </div>
              <div className="flex justify-between border-b border-[#e5e4de] pb-2">
                <span className="text-[#1c1c1c]/50">VENUE:</span>
                <span className="text-[#1c1c1c]">{event.venue}</span>
              </div>
              <div className="flex justify-between border-b border-[#e5e4de] pb-2">
                <span className="text-[#1c1c1c]/50">TIER:</span>
                <span className="text-[#1c1c1c] uppercase">{confirmedTicket.price_type || 'non_member'}</span>
              </div>
              <div className="flex justify-between pt-1 font-bold text-sm">
                <span>AMOUNT PAID:</span>
                <span className="text-[#5F3F56]">₹{Number(confirmedTicket.price).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <ActionButton
                variant="primary"
                className="w-full"
                onClick={() => {
                  onClose();
                  navigate('/dashboard');
                }}
              >
                View in Workspace
              </ActionButton>
              <ActionButton
                variant="secondary"
                className="w-full"
                onClick={onClose}
              >
                Done
              </ActionButton>
            </div>
          </div>
        ) : (
          /* Checkout Step */
          <div className="space-y-6">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-[#5F3F56] font-semibold block mb-1">
                Guest Ticket Checkout
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#1c1c1c]">
                {event.title}
              </h3>
            </div>

            {/* Error Callout */}
            {purchaseError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 font-mono text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{purchaseError}</span>
              </div>
            )}

            {/* Order Price Summary */}
            <div className="p-4 bg-white/70 border border-[#e5e4de] space-y-2">
              <div className="flex items-center justify-between font-mono text-xs text-[#1c1c1c]/70">
                <span>Standard Guest Pass</span>
                <span>₹{nonMemberPrice}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-xs text-[#1c1c1c]/70">
                <span>Processing & Entry Fee</span>
                <span>₹0.00</span>
              </div>
              <div className="flex items-center justify-between font-mono text-base font-bold text-[#1c1c1c] pt-2 border-t border-[#e5e4de]">
                <span>Total Due:</span>
                <span className="text-[#5F3F56]">₹{nonMemberPrice}</span>
              </div>
            </div>

            {/* If user is NOT authenticated: inline login / register */}
            {!isAuthenticated ? (
              <div className="p-5 border border-[#e5e4de] bg-white/40 space-y-4">
                <div className="flex items-center justify-between border-b border-[#e5e4de] pb-3">
                  <span className="font-mono text-xs uppercase font-semibold text-[#1c1c1c]">
                    {authMode === 'login' ? 'Sign In to Proceed' : 'Register Guest Account'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === 'login' ? 'register' : 'login');
                      setAuthError(null);
                    }}
                    className="font-mono text-[10px] uppercase text-[#5F3F56] underline"
                  >
                    {authMode === 'login' ? 'Create Account' : 'Existing User?'}
                  </button>
                </div>

                {authError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 font-mono text-xs">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-3">
                  {authMode === 'register' && (
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-[#1c1c1c]/60 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Greg Guest"
                        className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#1c1c1c]/60 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="guest@example.com"
                      className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#1c1c1c]/60 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
                    />
                  </div>

                  <ActionButton
                    type="submit"
                    variant="secondary"
                    className="w-full"
                    disabled={authLoading}
                  >
                    {authLoading ? 'Authenticating...' : authMode === 'login' ? 'Sign In & Continue' : 'Create & Continue'}
                  </ActionButton>
                </form>
              </div>
            ) : (
              /* Authenticated user: Payment selection */
              <div className="space-y-4">
                <div className="p-3 bg-white/60 border border-[#e5e4de] flex items-center justify-between font-mono text-xs">
                  <span className="text-[#1c1c1c]/60">Ticket Holder:</span>
                  <span className="font-semibold text-[#1c1c1c]">{currentUser?.name} ({currentUser?.email})</span>
                </div>

                <div className="space-y-2">
                  <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['online', 'upi', 'card', 'cash'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`p-3 border text-left font-mono text-xs uppercase tracking-wider transition-all ${
                          paymentMode === mode
                            ? 'border-[#5F3F56] bg-[#5F3F56]/10 text-[#5F3F56] font-bold'
                            : 'border-[#e5e4de] bg-white/60 text-[#1c1c1c]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#e5e4de] flex justify-end gap-3">
                  <ActionButton
                    variant="secondary"
                    onClick={onClose}
                    disabled={purchaseLoading}
                  >
                    Cancel
                  </ActionButton>
                  <ActionButton
                    variant="primary"
                    onClick={handleConfirmPurchase}
                    disabled={purchaseLoading}
                  >
                    {purchaseLoading ? 'Processing Ticket...' : `Pay ₹${nonMemberPrice} & Confirm`}
                  </ActionButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestTicketPurchase;
