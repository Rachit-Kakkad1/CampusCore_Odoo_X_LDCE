import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import fundraiserService from '../../services/fundraiser.service';
import {
  Heart,
  CheckCircle2,
  Calendar,
  ExternalLink,
  DollarSign,
  AlertCircle,
  Copy,
  Check,
  Printer,
} from 'lucide-react';

export const UserDonationsList = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchUserDonations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fundraiserService.getUserDonations();
      setDonations(res.data || []);
    } catch (err) {
      console.error('Error fetching user donations:', err);
      setError('Unable to load your donation history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDonations();
  }, []);

  const copyRef = (ref) => {
    navigator.clipboard.writeText(ref);
    setCopiedId(ref);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white border border-border animate-pulse rounded-xs" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 font-mono text-xs rounded-xs">
        {error}
      </div>
    );
  }

  if (donations.length === 0) {
    return (
      <div className="bg-white border border-border p-12 text-center space-y-4 rounded-xs">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <Heart className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-lg font-bold text-slate-900">No Donations Yet</h3>
        <p className="font-sans text-xs text-slate-500 max-w-sm mx-auto">
          You have not made any donations under this account yet. Support an active student cause today.
        </p>
        <Link
          to="/fundraisers"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
        >
          Explore Causes
        </Link>
      </div>
    );
  }

  const totalUserDonated = donations
    .filter((d) => d.status === 'paid')
    .reduce((acc, d) => acc + (parseFloat(d.amount) || 0), 0);

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Overview Stat Box */}
      <div className="bg-white border border-border p-6 rounded-xs flex items-center justify-between shadow-2xs font-mono">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Your Cumulative Giving
          </span>
          <span className="text-3xl font-extrabold text-emerald-700">
            ₹{totalUserDonated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="text-right text-xs text-slate-500">
          <span>{donations.length} total contributions</span>
        </div>
      </div>

      {/* Donations Table */}
      <div className="bg-white border border-border rounded-xs overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-border bg-slate-50 flex items-center justify-between font-mono text-xs font-bold uppercase text-slate-700">
          <span>Donation Records &amp; Tax Receipts</span>
          <span className="text-[11px] text-slate-500">Live Ledger Synchronized</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-500 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Fundraiser Cause</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Donation Ref</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {donations.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                    {d.created_at ? new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 font-sans font-bold text-slate-900">
                    <Link
                      to={`/fundraisers/${d.fundraiser_slug || d.fundraiser_id}`}
                      className="hover:text-primary transition-colors line-clamp-1"
                    >
                      {d.fundraiser_title}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                    ₹{parseFloat(d.amount).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider ${
                        d.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : d.status === 'refunded'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>{d.public_id}</span>
                      <button
                        type="button"
                        onClick={() => copyRef(d.public_id)}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Copy Reference"
                      >
                        {copiedId === d.public_id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Link
                      to={`/fundraisers/${d.fundraiser_slug || d.fundraiser_id}`}
                      className="p-1.5 hover:bg-slate-200 rounded-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 text-[11px] font-bold uppercase"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserDonationsList;
