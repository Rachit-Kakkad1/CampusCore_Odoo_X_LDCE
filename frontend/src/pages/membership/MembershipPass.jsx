// frontend/src/pages/membership/MembershipPass.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import membershipService from '../../services/membership.service';

export const MembershipPass = () => {
  const [passData, setPassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPass = async () => {
      try {
        setLoading(true);
        const data = await membershipService.getMemberPass();
        setPassData(data);
      } catch (err) {
        setError(err.message || 'Unable to load member pass.');
      } finally {
        setLoading(false);
      }
    };
    fetchPass();
  }, []);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 text-slate-100">
      <div className="w-full max-w-sm mb-6 flex items-center justify-between">
        <Link to="/membership" className="text-xs font-semibold text-slate-400 hover:text-white uppercase tracking-wider">
          ← Back to Membership
        </Link>
        <span className="text-xs uppercase font-mono tracking-widest text-indigo-400">Official Pass</span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
          Loading Pass...
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800 text-red-300 text-sm text-center max-w-sm">
          {error}
        </div>
      ) : (
        <div className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-500/30 shadow-2xl p-6 relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
                S
              </div>
              <div>
                <h3 className="font-semibold text-sm tracking-tight text-white">Skyline Student Org</h3>
                <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Member Identifier</p>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                passData.is_active
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
            >
              {passData.computed_status}
            </span>
          </div>

          {/* Pass Body */}
          <div className="py-6 space-y-4">
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Member Name
              </span>
              <span className="text-lg font-bold text-white tracking-tight">{passData.member_name}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Member ID
                </span>
                <span className="font-mono text-xs font-semibold text-indigo-300">{passData.member_code}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Role
                </span>
                <span className="capitalize text-xs font-medium text-slate-200">{passData.role}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Valid Until
                </span>
                <span className="text-xs font-medium text-slate-200">
                  {passData.expiry_date ? String(passData.expiry_date).split('T')[0] : '—'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Dues Status
                </span>
                <span
                  className={`text-xs font-semibold capitalize ${
                    passData.dues_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {passData.dues_status}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Card */}
          <div className="pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              LDCE • Student Chapter 2026
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembershipPass;
