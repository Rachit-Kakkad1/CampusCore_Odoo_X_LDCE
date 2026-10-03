// frontend/src/components/dashboard/events/EventDoorCheckIn.jsx
import React, { useState } from 'react';
import { ActionButton } from '../ActionButton';
import { StatusBadge } from '../StatusBadge';
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
  MapPin,
  ShieldCheck,
} from 'lucide-react';

export const EventDoorCheckIn = ({ events = [], initialEventId = null }) => {
  const [selectedEventId, setSelectedEventId] = useState(initialEventId ? String(initialEventId) : '');
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

      const payload = ticketInput.trim();
      const res = await eventsService.checkInTicket(payload);
      const data = res?.ticket || res?.data || res;

      const memberStatus = (data?.member_status || res?.member_status || 'NONE').toUpperCase();

      const successEntry = {
        code: ticketInput.trim(),
        attendeeName: data?.attendee_name || data?.name || data?.user_name || 'Event Attendee',
        eventTitle: data?.event_title || data?.title || 'Campus Event',
        ticketId: data?.id || data?.ticket_id,
        memberStatus,
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

  const sampleCodes = ['TCK-SPRING-001', 'TCK-ALEX-101', 'TCK-GUEST-992'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Scanner Station */}
      <div className="lg:col-span-6 space-y-6">
        <div className="p-6 border border-border bg-white shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 border border-border bg-slate-50 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-slate-900">
                Door Check-in Station
              </h2>
              <p className="font-mono text-xs text-slate-500">
                Validate HMAC QR payloads & manual fallback ticket codes
              </p>
            </div>
          </div>

          {/* Event Filter */}
          {events.length > 0 && (
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold mb-1">
                Filter by Event (Optional)
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-3 py-2 border border-border bg-white font-sans text-xs focus:outline-hidden focus:border-slate-900"
              >
                <option value="">All Scheduled Events</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({new Date(ev.starts_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleCheckIn} className="space-y-4">
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold mb-1">
                Scan or Enter Ticket Code / QR Payload *
              </label>
              <div className="relative">
                <Ticket className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. TCK-SPRING-001 or signed QR payload"
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
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Validating Ticket...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-1.5" />
                    Validate & Admit Attendee
                  </>
                )}
              </ActionButton>
            </div>
          </form>

          {/* Quick Demo Test Buttons */}
          <div className="pt-4 border-t border-border space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 block">
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

        {/* Validation Result Banner */}
        {result && (
          <div
            className={`p-6 border ${
              result.status === 'SUCCESS'
                ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950'
                : 'border-red-300 bg-red-50/70 text-red-950'
            } shadow-xs space-y-4 transition-all duration-300`}
          >
            <div className="flex items-center gap-3">
              {result.status === 'SUCCESS' ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-7 h-7 text-red-600 shrink-0" />
              )}
              <div>
                <h3 className="font-serif font-bold text-base">
                  {result.status === 'SUCCESS' ? 'ADMISSION GRANTED' : 'ADMISSION DENIED'}
                </h3>
                <p className="font-mono text-xs opacity-80">{result.message}</p>
              </div>
            </div>

            {result.status === 'SUCCESS' && (
              <div className="p-4 border border-emerald-200 bg-white/90 grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Attendee</span>
                  <span className="font-bold text-slate-900 text-sm">{result.attendeeName}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Membership</span>
                  <StatusBadge
                    variant={result.memberStatus === 'ACTIVE' ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {result.memberStatus}
                  </StatusBadge>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Event</span>
                  <span className="font-bold text-slate-900 truncate block">{result.eventTitle}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Checked-in At</span>
                  <span className="text-slate-900">{result.timestamp}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Live Audit Stream */}
      <div className="lg:col-span-6 space-y-6">
        <div className="p-6 border border-border bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="font-serif font-bold text-base text-slate-900">
              Live Check-in Activity
            </h3>
            <span className="font-mono text-xs text-slate-500">
              {recentCheckIns.length} {recentCheckIns.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {recentCheckIns.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs">
              No check-ins recorded in this session yet.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {recentCheckIns.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-border bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 font-mono font-bold text-[11px]">
                      ✓
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{item.attendeeName}</div>
                      <div className="font-mono text-[10px] text-slate-500">{item.code}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px]">
                    <div className="text-slate-500">{item.timestamp}</div>
                    <span className="text-emerald-700 font-semibold text-[10px]">Admitted</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDoorCheckIn;
