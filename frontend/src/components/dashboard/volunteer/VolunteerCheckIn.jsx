// frontend/src/components/dashboard/volunteer/VolunteerCheckIn.jsx
import React, { useState } from 'react';
import { ActionButton } from '../ActionButton';
import eventsService from '../../../services/events.service';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Ticket,
  Calendar,
  Sparkles,
  Search,
  ShieldCheck,
} from 'lucide-react';

/**
 * VolunteerCheckIn Component
 * Door check-in station allowing volunteers to scan or enter ticket codes,
 * validate authenticity, and mark attendees checked-in.
 */
export const VolunteerCheckIn = () => {
  const [ticketInput, setTicketInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [recentCheckIns, setRecentCheckIns] = useState([]);

  const handleCheckIn = async (e) => {
    e?.preventDefault();
    if (!ticketInput.trim()) return;

    try {
      setScanning(true);
      setResult(null);

      const res = await eventsService.checkInTicket(ticketInput.trim());
      const data = res?.ticket || res?.data || res;

      const successEntry = {
        code: ticketInput.trim(),
        attendeeName: data?.attendee_name || data?.name || data?.user_name || 'Event Attendee',
        eventTitle: data?.event_title || data?.title || 'Campus Event',
        ticketId: data?.id || data?.ticket_id,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: 'SUCCESS',
        message: res?.message || 'Check-in validated successfully. Admittance granted.',
      };

      setResult(successEntry);
      setRecentCheckIns((prev) => [successEntry, ...prev.slice(0, 9)]);
      setTicketInput('');
    } catch (err) {
      console.error('Check-in failed:', err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Ticket validation failed. Invalid code or ticket already checked in.';

      setResult({
        code: ticketInput.trim(),
        status: 'ERROR',
        message: errMsg,
      });
    } finally {
      setScanning(false);
    }
  };

  const sampleCodes = ['TKT-A82F21', 'TKT-TEST-001', 'TKT-MAY-992'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Scanner Station */}
      <div className="lg:col-span-6 space-y-6">
        <div className="p-6 border border-border bg-white shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-10 h-10 border border-border bg-slate-50 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-base text-slate-900">
                Door Check-in Station
              </h2>
              <p className="font-mono text-xs text-slate-500">
                Validate QR tokens & ticket admission codes
              </p>
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleCheckIn} className="space-y-4">
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold mb-1">
                Scan or Enter Ticket Code *
              </label>
              <div className="relative">
                <Ticket className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. TKT-A82F21 or QR JSON Payload"
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  disabled={scanning}
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 border border-border bg-white font-mono text-sm uppercase placeholder:normal-case placeholder:text-slate-400 focus:outline-hidden focus:border-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ActionButton
                type="submit"
                variant="primary"
                className="flex-1 justify-center py-2.5"
                disabled={scanning || !ticketInput.trim()}
              >
                {scanning ? (
                  <span>Verifying Ticket...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Validate & Check In</span>
                  </>
                )}
              </ActionButton>
            </div>
          </form>

          {/* Quick Test Codes */}
          <div className="pt-2 border-t border-border">
            <span className="font-mono text-[10px] uppercase text-slate-400 block mb-2">
              Quick Test Codes:
            </span>
            <div className="flex flex-wrap gap-2">
              {sampleCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setTicketInput(code)}
                  className="font-mono text-xs px-2.5 py-1 border border-border bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Validation Result Feedback */}
        {result && (
          <div
            className={`p-6 border font-mono animate-in fade-in duration-200 ${
              result.status === 'SUCCESS'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-start gap-4">
              {result.status === 'SUCCESS' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm uppercase tracking-wider">
                    {result.status === 'SUCCESS' ? 'Admittance Approved' : 'Admittance Denied'}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-white/70 border border-current">
                    {result.code}
                  </span>
                </div>

                <p className="text-xs leading-relaxed">{result.message}</p>

                {result.status === 'SUCCESS' && (
                  <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-emerald-700 block text-[10px] uppercase">Attendee:</span>
                      <span className="font-bold text-emerald-900">{result.attendeeName}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 block text-[10px] uppercase">Time:</span>
                      <span className="font-bold text-emerald-900">{result.timestamp}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Recent Door Check-in Log */}
      <div className="lg:col-span-6 space-y-4">
        <div className="p-6 border border-border bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="font-sans font-bold text-base text-slate-900">
              Station Check-in Activity
            </h3>
            <span className="font-mono text-xs text-slate-500">
              {recentCheckIns.length} Verified
            </span>
          </div>

          {recentCheckIns.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Ticket className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-sans font-medium text-slate-700 text-sm">
                No tickets scanned this session
              </p>
              <p className="font-mono text-xs text-slate-400">
                Validated attendees will be recorded here in real time.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentCheckIns.map((ci, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div>
                      <span className="font-bold text-slate-900 block font-sans">
                        {ci.attendeeName}
                      </span>
                      <span className="text-slate-500 text-[11px]">{ci.code}</span>
                    </div>
                  </div>
                  <span className="text-slate-400 text-[11px]">{ci.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VolunteerCheckIn;
