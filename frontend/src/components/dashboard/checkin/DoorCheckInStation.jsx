// frontend/src/components/dashboard/checkin/DoorCheckInStation.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import eventsService from '../../../services/events.service';
import { ThreeDCard } from '../charts/ThreeDCharts';
import { StatusBadge } from '../StatusBadge';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clipboard,
  Clock,
  User,
  Calendar,
  MapPin,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  ArrowRight,
  Check,
  X
} from 'lucide-react';

// Web Audio API feedback chimes
const playFeedbackChime = (type = 'success', enabled = true) => {
  if (!enabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    if (type === 'success') {
      // Pleasant dual chime
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain1.gain.setValueAtTime(0.18, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.25);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain2.gain.setValueAtTime(0.24, ctx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.55);
    } else {
      // Low dual warning buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(164.81, ctx.currentTime); // E3
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    // Non-blocking fallback
  }
};

export const DoorCheckInStation = ({ defaultEventId = null }) => {
  const [inputCode, setInputCode] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(defaultEventId || '');
  const [eventsList, setEventsList] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [pastedNotice, setPastedNotice] = useState(false);
  const inputRef = useRef(null);

  // Load available events for the event filter dropdown
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await eventsService.getEvents();
        const list = Array.isArray(res?.data || res) ? (res?.data || res) : [];
        setEventsList(list);
      } catch (err) {
        console.error('Failed to load events for check-in station:', err);
      }
    };
    fetchEvents();
  }, []);

  // Autofocus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle Scan / Manual Code Submission
  const handleProcessCode = async (codeToVerify) => {
    const code = (codeToVerify || inputCode).trim();
    if (!code) return;

    setLoading(true);
    setVerificationResult(null);

    try {
      const res = await eventsService.scanCheckIn(code, selectedEventId || null);
      setVerificationResult(res);

      const timestamp = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      if (res.result === 'VALID') {
        playFeedbackChime('success', soundEnabled);
        // Prepend to session history
        setHistory((prev) => [
          {
            id: Date.now(),
            code: res.ticket_code || code,
            name: res.holder?.name || 'Attendee',
            email: res.holder?.email,
            memberStatus: res.member_status || 'NONE',
            eventTitle: res.event?.title || 'Campus Event',
            result: 'VALID',
            scanMode: res.scan_mode || 'manual_code',
            time: timestamp,
          },
          ...prev,
        ]);
        // Clear input for rapid next scan
        setInputCode('');
        inputRef.current?.focus();
      } else {
        playFeedbackChime('error', soundEnabled);
        setHistory((prev) => [
          {
            id: Date.now(),
            code: res.ticket_code || code,
            name: res.holder?.name || 'Unknown',
            email: res.holder?.email,
            memberStatus: res.member_status || 'NONE',
            result: res.result || 'INVALID',
            error: res.error || res.message,
            scanMode: res.scan_mode || 'manual_code',
            time: timestamp,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      playFeedbackChime('error', soundEnabled);
      const fallbackResult = {
        result: 'INVALID',
        error: 'NETWORK_ERROR',
        message: err.message || 'Verification service unreachable',
        ticket_code: code,
      };
      setVerificationResult(fallbackResult);
    } finally {
      setLoading(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputCode(text.trim());
        setPastedNotice(true);
        setTimeout(() => setPastedNotice(false), 2000);
        handleProcessCode(text.trim());
      }
    } catch (e) {
      console.warn('Clipboard read permission denied', e);
    }
  };

  // Metrics computed from current session
  const totalScans = history.length;
  const admittedCount = history.filter((h) => h.result === 'VALID').length;
  const duplicateCount = history.filter((h) => h.result === 'ALREADY_USED').length;
  const invalidCount = history.filter((h) => h.result === 'INVALID').length;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. STATION CONTROLS & HEADER                                              */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 border border-border shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-xs border border-primary/20">
                Door Station Live
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Real-Time Admission Verification
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              Door Check-In & Ticket Search Station
            </h3>
          </div>
        </div>

        {/* Filter & Sound Toggles */}
        <div className="flex items-center gap-3">
          {/* Event Filter Select */}
          <div className="relative">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 rounded-xs focus:outline-none focus:border-primary cursor-pointer pr-8"
            >
              <option value="">All Events (Any Valid Pass)</option>
              {eventsList.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.seats_remaining || 0} seats left)
                </option>
              ))}
            </select>
          </div>

          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`p-2 border rounded-xs transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-rose-50 border-rose-200 text-rose-600'
            }`}
            title={soundEnabled ? 'Audio chime enabled' : 'Audio chime muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INSTANT SEARCH / TICKET INPUT BOX                                      */}
      {/* ========================================================================= */}
      <ThreeDCard className="p-6 space-y-4" accentGlow="rgba(95, 63, 86, 0.2)">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Instant Ticket Code or QR Payload Search
          </label>
          <span className="text-[11px] font-mono text-slate-400">
            Accepts raw fallback code (e.g. <span className="text-primary font-bold">TCK-...</span>) or signed QR string
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProcessCode();
          }}
          className="relative flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Enter manual entry code (e.g. AB7K9), full ticket code, or scan QR..."
              className="w-full pl-11 pr-24 py-3 bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-primary text-sm font-mono text-slate-900 rounded-xs outline-none transition-all shadow-inner tracking-wider"
            />
            {inputCode && (
              <button
                type="button"
                onClick={() => {
                  setInputCode('');
                  inputRef.current?.focus();
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-mono font-bold bg-white border border-slate-200 text-slate-600 hover:text-primary hover:border-primary transition-colors flex items-center gap-1 rounded-xs"
              title="Paste from clipboard"
            >
              {pastedNotice ? <Check className="w-3 h-3 text-emerald-600" /> : <Clipboard className="w-3 h-3" />}
              <span>{pastedNotice ? 'Pasted' : 'Paste'}</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !inputCode.trim()}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify & Admit</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Helper Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px] text-slate-500">
          <span>Quick verification presets:</span>
          {['TCK-1791041491513-41250906', 'TCK-1791041491562-2AFD62DA', 'TCK-ALEX-101'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setInputCode(preset);
                handleProcessCode(preset);
              }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-primary/10 hover:text-primary border border-slate-200 rounded-xs transition-colors cursor-pointer text-[10px]"
            >
              {preset}
            </button>
          ))}
        </div>
      </ThreeDCard>

      {/* ========================================================================= */}
      {/* 3. LIVE VERIFICATION RESULT CARD                                          */}
      {/* ========================================================================= */}
      <AnimatePresence mode="wait">
        {verificationResult && (
          <motion.div
            key={verificationResult.ticket_code + '-' + (verificationResult.result || 'res')}
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {/* SUCCESS: VALID ADMISSION */}
            {verificationResult.result === 'VALID' && (
              <div className="p-6 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border-2 border-emerald-500 rounded-sm shadow-md text-emerald-950 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase font-bold tracking-widest bg-emerald-600 text-white px-2 py-0.5 rounded-xs">
                          ADMISSION GRANTED ✓
                        </span>
                        <span className="text-[10px] font-mono text-emerald-800">
                          Mode: {verificationResult.scan_mode === 'manual_code' ? 'Manual Code' : 'Signed QR'}
                        </span>
                      </div>
                      <h4 className="font-serif text-2xl font-bold text-emerald-950 mt-0.5">
                        {verificationResult.holder?.name || 'Verified Attendee'}
                      </h4>
                    </div>
                  </div>

                  {/* Membership Tag */}
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono text-emerald-700 block">
                      Roster Status
                    </span>
                    <span className={`inline-block font-mono text-xs font-bold px-2.5 py-1 rounded-xs border ${
                      verificationResult.member_status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : verificationResult.member_status === 'EXPIRED'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-slate-100 text-slate-800 border-slate-300'
                    }`}>
                      {verificationResult.member_status === 'ACTIVE'
                        ? 'ACTIVE MEMBER'
                        : verificationResult.member_status === 'EXPIRED'
                        ? 'EXPIRED MEMBER'
                        : 'GUEST ATTENDEE'}
                    </span>
                  </div>
                </div>

                {/* Admission Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                  <div className="p-3 bg-white/80 border border-emerald-200 rounded-xs space-y-1">
                    <span className="text-[10px] uppercase text-emerald-700 block">Admission Code</span>
                    <strong className="text-slate-900 block select-all">
                      {verificationResult.fallback_code ? `${verificationResult.fallback_code} (${verificationResult.ticket_code})` : verificationResult.ticket_code}
                    </strong>
                  </div>

                  <div className="p-3 bg-white/80 border border-emerald-200 rounded-xs space-y-1">
                    <span className="text-[10px] uppercase text-emerald-700 block">Attendee Email</span>
                    <strong className="text-slate-900 block truncate">{verificationResult.holder?.email || '—'}</strong>
                  </div>

                  <div className="p-3 bg-white/80 border border-emerald-200 rounded-xs space-y-1">
                    <span className="text-[10px] uppercase text-emerald-700 block">Target Event</span>
                    <strong className="text-slate-900 block truncate">{verificationResult.event?.title || 'Campus Event'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* WARNING: ALREADY USED */}
            {verificationResult.result === 'ALREADY_USED' && (
              <div className="p-6 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 border-2 border-amber-500 rounded-sm shadow-md text-amber-950 space-y-4">
                <div className="flex items-center gap-3 border-b border-amber-200 pb-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase font-bold tracking-widest bg-amber-500 text-white px-2 py-0.5 rounded-xs">
                      ALREADY CHECKED IN ⚠️
                    </span>
                    <h4 className="font-serif text-xl font-bold text-amber-950 mt-0.5">
                      Duplicate Admission Prohibited
                    </h4>
                    <p className="text-xs text-amber-900/80 font-sans mt-0.5">
                      This ticket was already used for entry at{' '}
                      <strong>
                        {verificationResult.checked_in_at
                          ? new Date(verificationResult.checked_in_at).toLocaleTimeString()
                          : 'earlier today'}
                      </strong>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="p-3 bg-white/80 border border-amber-200 rounded-xs space-y-1">
                    <span className="text-[10px] uppercase text-amber-700 block">Ticket Code</span>
                    <strong className="text-slate-900 block">{verificationResult.ticket_code}</strong>
                  </div>
                  <div className="p-3 bg-white/80 border border-amber-200 rounded-xs space-y-1">
                    <span className="text-[10px] uppercase text-amber-700 block">Original Holder</span>
                    <strong className="text-slate-900 block">{verificationResult.holder?.name || 'Attendee'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* ERROR: INVALID / REJECTED */}
            {verificationResult.result === 'INVALID' && (
              <div className="p-6 bg-gradient-to-br from-rose-50 via-white to-rose-50/50 border-2 border-rose-500 rounded-sm shadow-md text-rose-950 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <XCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase font-bold tracking-widest bg-rose-600 text-white px-2 py-0.5 rounded-xs">
                      INVALID TICKET ✕
                    </span>
                    <h4 className="font-serif text-xl font-bold text-rose-950 mt-0.5">
                      {verificationResult.message || 'Verification Failed'}
                    </h4>
                    <p className="text-xs font-mono text-rose-800 mt-0.5">
                      Error Code: {verificationResult.error || 'INVALID_CREDENTIALS'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 4. STATION SESSION METRICS & AUDIT LOG                                    */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-bold text-slate-900 tracking-tight">
              Session Door Admission Log
            </h4>
            <span className="text-xs font-mono text-slate-400">
              Audit trail of scanned and fallback verified tickets this shift
            </span>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-xs">
              ✓ {admittedCount} Admitted
            </span>
            <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 font-bold rounded-xs">
              ⚠ {duplicateCount} Dupes
            </span>
            <span className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 font-bold rounded-xs">
              ✕ {invalidCount} Invalid
            </span>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="p-8 border border-border bg-white text-center font-mono text-xs text-slate-400 rounded-xs">
            No check-in attempts recorded in this session yet. Type or paste a ticket code above to begin.
          </div>
        ) : (
          <div className="border border-border bg-white overflow-x-auto shadow-2xs rounded-xs">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-slate-50/80 text-[10px] uppercase font-bold tracking-wider text-slate-600">
                  <th className="p-3">Time</th>
                  <th className="p-3">Ticket Code</th>
                  <th className="p-3">Attendee Name</th>
                  <th className="p-3">Roster Status</th>
                  <th className="p-3">Verification Mode</th>
                  <th className="p-3 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 text-slate-500">{item.time}</td>
                    <td className="p-3 font-bold text-slate-900">{item.code}</td>
                    <td className="p-3 text-slate-700">{item.name}</td>
                    <td className="p-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-xs font-bold uppercase ${
                        item.memberStatus === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-900'
                          : item.memberStatus === 'EXPIRED'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.memberStatus}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {item.scanMode === 'manual_code' ? 'Manual Code' : 'QR Scan'}
                    </td>
                    <td className="p-3 text-right">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-xs ${
                        item.result === 'VALID'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : item.result === 'ALREADY_USED'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}>
                        {item.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoorCheckInStation;
