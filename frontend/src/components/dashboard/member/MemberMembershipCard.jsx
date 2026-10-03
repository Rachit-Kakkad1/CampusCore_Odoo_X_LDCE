// frontend/src/components/dashboard/member/MemberMembershipCard.jsx
import React, { useState } from 'react';
import { StatusBadge } from '../StatusBadge';
import { ActionButton } from '../ActionButton';
import { ConfirmAction } from '../ConfirmAction';

export const MemberMembershipCard = ({
  membership,
  loading = false,
  onPayDues,
  onRenew,
}) => {
  const [showPayModal, setShowPayModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState('online');
  const [actionLoading, setActionLoading] = useState(false);

  if (loading) {
    return (
      <div className="bg-[#f7f6f2] border border-[#e5e4de] p-6 animate-pulse">
        <div className="h-6 w-1/3 bg-[#e5e4de] mb-4"></div>
        <div className="h-4 w-2/3 bg-[#e5e4de] mb-2"></div>
        <div className="h-4 w-1/2 bg-[#e5e4de]"></div>
      </div>
    );
  }

  const computedStatus = (
    membership?.computed_status ||
    membership?.status ||
    'PENDING'
  ).toUpperCase();
  const isActive = computedStatus === 'ACTIVE';
  const isExpired = computedStatus === 'EXPIRED';
  const isPending = computedStatus === 'PENDING' || computedStatus === 'NONE';

  const memberCode = membership?.member_code || 'UNASSIGNED';
  const duesAmount = membership?.dues_amount ? Number(membership.dues_amount).toFixed(2) : '500.00';
  const expiryDate = membership?.expiry_date
    ? new Date(membership.expiry_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;
  const startDate = (membership?.start_date || membership?.started_at)
    ? new Date(membership.start_date || membership.started_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;
  const daysRemaining = membership?.days_remaining ?? 0;

  const handlePayConfirm = async () => {
    try {
      setActionLoading(true);
      await onPayDues?.(membership?.id, paymentMode);
      setShowPayModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenewConfirm = async () => {
    try {
      setActionLoading(true);
      await onRenew?.(membership?.id);
      setShowRenewModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="bg-[#f7f6f2] border border-[#e5e4de] p-6 relative transition-all duration-300">
      {/* Top Banner & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e5e4de]">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-xs tracking-wider uppercase text-[#1c1c1c]/60">
              CampusCore Org · Membership Status
            </span>
            <StatusBadge status={computedStatus} />
          </div>
          <h2 className="font-serif text-2xl text-[#1c1c1c] tracking-tight">
            {isActive && 'Active Verified Membership'}
            {isExpired && 'Expired Membership'}
            {isPending && 'Pending Dues Payment'}
          </h2>
        </div>

        <div className="text-left sm:text-right">
          <span className="block font-mono text-xs uppercase text-[#1c1c1c]/60">Member ID</span>
          <span className="font-mono text-sm font-semibold text-[#5F3F56] tracking-wider">
            {memberCode}
          </span>
        </div>
      </div>

      {/* State-specific Body & Benefits */}
      <div className="py-6 space-y-6">
        {isActive && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white/60 border border-[#e5e4de]">
                <span className="block font-mono text-xs text-[#1c1c1c]/60 uppercase">Valid Until</span>
                <span className="font-mono text-base font-medium text-[#1c1c1c] mt-1 block">
                  {expiryDate || 'Active'}
                </span>
                <span className="font-mono text-xs text-[#5F3F56] mt-0.5 block">
                  {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Annual plan'}
                </span>
              </div>

              <div className="p-4 bg-white/60 border border-[#e5e4de]">
                <span className="block font-mono text-xs text-[#1c1c1c]/60 uppercase">Member Since</span>
                <span className="font-mono text-base font-medium text-[#1c1c1c] mt-1 block">
                  {startDate || 'Current Term'}
                </span>
                <span className="font-mono text-xs text-[#1c1c1c]/60 mt-0.5 block">
                  Dues Paid · ₹{duesAmount}
                </span>
              </div>

              <div className="p-4 bg-white/60 border border-[#e5e4de]">
                <span className="block font-mono text-xs text-[#1c1c1c]/60 uppercase">Privilege Level</span>
                <span className="font-mono text-base font-medium text-[#5F3F56] mt-1 block">
                  Full Voting Member
                </span>
                <span className="font-mono text-xs text-[#1c1c1c]/60 mt-0.5 block">
                  Pass Verified · Active
                </span>
              </div>
            </div>

            {/* Active Benefits Section */}
            <div className="bg-white/40 border border-[#e5e4de] p-4">
              <span className="font-mono text-xs uppercase tracking-wider text-[#5F3F56] font-semibold block mb-3">
                Active Member Privileges
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[#1c1c1c] font-sans">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#5F3F56]"></span>
                  <span>Discounted tickets for flagship events & galas</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#5F3F56]"></span>
                  <span>10% automatic discount on official merchandise</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#5F3F56]"></span>
                  <span>Digital Pass with fast-track check-in QR code</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#5F3F56]"></span>
                  <span>Voting eligibility in general student assembly</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50/50 border border-red-200/80">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-red-600 mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-sans font-medium text-red-900 text-base">
                    Membership Expired on {expiryDate || 'Past Cycle'}
                  </h4>
                  <p className="font-sans text-sm text-red-800/90 mt-1 leading-relaxed">
                    Your previous membership cycle has concluded. Member discounts on tickets and merchandise, voting rights, and active digital pass access are currently inactive until renewed.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/60 border border-[#e5e4de] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-mono text-xs uppercase text-[#1c1c1c]/60">Annual Renewal Dues</span>
                <div className="font-mono text-2xl font-bold text-[#1c1c1c] mt-0.5">₹{duesAmount}</div>
                <span className="font-mono text-xs text-[#1c1c1c]/60">Valid for 365 days upon activation</span>
              </div>
              <ActionButton
                variant="primary"
                onClick={() => setShowRenewModal(true)}
                disabled={actionLoading}
              >
                Renew Membership Now
              </ActionButton>
            </div>
          </div>
        )}

        {isPending && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50/60 border border-amber-200/80">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-600 mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-sans font-medium text-amber-900 text-base">
                    Action Required: Complete Dues Payment
                  </h4>
                  <p className="font-sans text-sm text-amber-800/90 mt-1 leading-relaxed">
                    Your membership registration is logged as <strong>PENDING</strong>. Complete your annual dues payment of ₹{duesAmount} to activate your official CampusCore membership and unlock member rates.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/60 border border-[#e5e4de] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-mono text-xs uppercase text-[#1c1c1c]/60">Outstanding Dues</span>
                <div className="font-mono text-2xl font-bold text-[#5F3F56] mt-0.5">₹{duesAmount}</div>
                <span className="font-mono text-xs text-[#1c1c1c]/60">One-time annual organization fee</span>
              </div>
              <ActionButton
                variant="primary"
                onClick={() => setShowPayModal(true)}
                disabled={actionLoading}
              >
                Pay Annual Dues (₹{duesAmount})
              </ActionButton>
            </div>
          </div>
        )}
      </div>

      {/* Pay Dues Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-[#1c1c1c]/60 flex items-center justify-center p-4">
          <div className="bg-[#f7f6f2] border border-[#e5e4de] w-full max-w-md p-6 shadow-xl">
            <span className="font-mono text-xs uppercase text-[#5F3F56] tracking-wider block mb-1">
              Payment Gateway
            </span>
            <h3 className="font-serif text-2xl text-[#1c1c1c] mb-2">
              Pay Annual Membership Dues
            </h3>
            <p className="font-sans text-sm text-[#1c1c1c]/70 mb-6">
              Total dues amount: <strong>₹{duesAmount}</strong> for 1-year verified CampusCore membership.
            </p>

            <div className="space-y-4 mb-6">
              <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70">
                Select Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['online', 'upi', 'card', 'cash'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`p-3 border text-left font-mono text-xs uppercase tracking-wider transition-colors ${
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

            <div className="flex justify-end gap-3 pt-4 border-t border-[#e5e4de]">
              <ActionButton
                variant="secondary"
                onClick={() => setShowPayModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={handlePayConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : `Confirm & Pay ₹${duesAmount}`}
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 bg-[#1c1c1c]/60 flex items-center justify-center p-4">
          <div className="bg-[#f7f6f2] border border-[#e5e4de] w-full max-w-md p-6 shadow-xl">
            <span className="font-mono text-xs uppercase text-[#5F3F56] tracking-wider block mb-1">
              Membership Renewal
            </span>
            <h3 className="font-serif text-2xl text-[#1c1c1c] mb-2">
              Renew Expired Membership
            </h3>
            <p className="font-sans text-sm text-[#1c1c1c]/70 mb-6">
              Initiate a renewed membership term for <strong>{memberCode}</strong>. Annual dues of ₹{duesAmount} will activate your full benefits for the upcoming academic year.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#e5e4de]">
              <ActionButton
                variant="secondary"
                onClick={() => setShowRenewModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={handleRenewConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? 'Initiating...' : 'Confirm Renewal'}
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberMembershipCard;
