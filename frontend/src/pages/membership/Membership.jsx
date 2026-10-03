// frontend/src/pages/membership/Membership.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import membershipService from '../../services/membership.service';
import authService from '../../services/auth.service';

export const Membership = () => {
  const [user, setUser] = useState(authService.getStoredUser());
  const [membershipData, setMembershipData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState('online');
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchMembership = async () => {
    try {
      setLoading(true);
      const data = await membershipService.getMembership();
      setMembershipData(data);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load membership details.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembership();
  }, []);

  const handleInitiate = async () => {
    try {
      setActionLoading(true);
      setMessage({ type: '', text: '' });
      await membershipService.createMembership();
      setMessage({ type: 'success', text: 'Membership initiated! Please proceed to pay annual dues.' });
      await fetchMembership();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to initiate membership.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayDues = async () => {
    try {
      setActionLoading(true);
      setMessage({ type: '', text: '' });
      await membershipService.payDues(paymentMode);
      setMessage({ type: 'success', text: 'Annual dues paid successfully! Your membership is now active.' });
      await fetchMembership();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Payment processing failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const mem = membershipData?.membership;
  const isActive = membershipData?.is_active;
  const computedStatus = membershipData?.computed_status || 'none';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-slate-100">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Membership Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your student organization membership status and dues</p>
        </div>

        {isActive && (
          <Link
            to="/membership/pass"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium text-sm text-white shadow-md shadow-indigo-600/20 transition-all"
          >
            View Digital Member Pass
          </Link>
        )}
      </div>

      {/* Notifications */}
      {message.text && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm border ${
            message.type === 'error'
              ? 'bg-red-950/50 border-red-800 text-red-300'
              : 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
          Loading membership status...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Status Card */}
          <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-sm font-medium text-slate-400">Current Status</span>
              {computedStatus === 'active' && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active Member
                </span>
              )}
              {computedStatus === 'pending' && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Dues Pending
                </span>
              )}
              {computedStatus === 'expired' && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                  Membership Expired
                </span>
              )}
              {computedStatus === 'none' && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-slate-700 text-slate-300">
                  Not Registered
                </span>
              )}
            </div>

            {/* Member Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs uppercase text-slate-500 font-semibold mb-1">Member Name</span>
                <span className="font-medium text-slate-200">{mem?.user_name || user?.name || '—'}</span>
              </div>
              <div>
                <span className="block text-xs uppercase text-slate-500 font-semibold mb-1">Member Code</span>
                <span className="font-mono text-xs text-indigo-400 font-medium">{mem?.member_code || 'Unassigned'}</span>
              </div>
              <div>
                <span className="block text-xs uppercase text-slate-500 font-semibold mb-1">Dues Status</span>
                <span className={`capitalize font-medium ${mem?.dues_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {mem?.dues_status || 'Unpaid'}
                </span>
              </div>
              <div>
                <span className="block text-xs uppercase text-slate-500 font-semibold mb-1">Expiry Date</span>
                <span className="font-medium text-slate-200">
                  {mem?.expiry_date ? String(mem.expiry_date).split('T')[0] : '—'}
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-800">
              {computedStatus === 'none' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    You do not currently have a membership record. Initiate registration to unlock member privileges.
                  </p>
                  <button
                    onClick={handleInitiate}
                    disabled={actionLoading}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium text-sm text-white shadow-md shadow-indigo-600/25 transition-all"
                  >
                    {actionLoading ? 'Initiating...' : 'Initiate Membership'}
                  </button>
                </div>
              )}

              {(computedStatus === 'pending' || computedStatus === 'expired') && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    Annual membership dues of <span className="text-white font-semibold">₹500.00</span> are required to activate benefits.
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="online">Online (Simulated)</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="cash">Cash Desk</option>
                    </select>
                    <button
                      onClick={handlePayDues}
                      disabled={actionLoading}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 font-medium text-sm text-white shadow-md shadow-emerald-600/25 transition-all"
                    >
                      {actionLoading ? 'Processing...' : 'Pay Dues (₹500)'}
                    </button>
                  </div>
                </div>
              )}

              {computedStatus === 'active' && (
                <p className="text-sm text-emerald-400 font-medium">
                  ✓ Your membership is in good standing and valid through the current academic year.
                </p>
              )}
            </div>
          </div>

          {/* Membership Benefits Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-white">Active Benefits</h2>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">✓</span>
                <span>Discounted member pricing on all club event tickets.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">✓</span>
                <span>Member-only exclusive merchandise store discounts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">✓</span>
                <span>Digital Member Pass for fast check-in verification.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">✓</span>
                <span>Voting eligibility in organization elections and meetings.</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Membership;
