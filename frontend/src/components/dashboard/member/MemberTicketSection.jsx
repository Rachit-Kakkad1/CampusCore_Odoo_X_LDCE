// frontend/src/components/dashboard/member/MemberTicketSection.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSection } from '../DashboardSection';
import { DashboardEmptyState } from '../DashboardEmptyState';
import { StatusBadge } from '../StatusBadge';
import eventsService from '../../../services/events.service';
import { QrCode, X, Copy, Check, Calendar, MapPin, Ticket, ShieldCheck } from 'lucide-react';

export const MemberTicketSection = ({ tickets = [], loading = false }) => {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleOpenQRModal = async (ticket) => {
    setSelectedTicket(ticket);
    setQrLoading(true);
    setQrData(null);
    try {
      const res = await eventsService.getTicketQR(ticket.id);
      setQrData(res?.qr || res);
    } catch (err) {
      console.error('Failed to load ticket QR code:', err);
    } finally {
      setQrLoading(false);
    }
  };

  const copyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <DashboardSection
        title="My Event Tickets"
        subtitle="Active reservations and passes for scheduled organization gatherings"
      >
        <div className="h-32 bg-[#f7f6f2] border border-[#e5e4de] animate-pulse"></div>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      title="My Event Tickets"
      subtitle="Active reservations and passes for scheduled organization gatherings"
    >
      {tickets.length === 0 ? (
        <DashboardEmptyState
          title="No Tickets Found"
          description="You have not booked any event tickets yet. Explore upcoming organization events above to reserve your seat."
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const price = Number(t.price || 0).toFixed(2);
            const eventDate = t.event_starts_at
              ? new Date(t.event_starts_at).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'TBA';

            return (
              <div
                key={t.id}
                className="bg-[#f7f6f2] border border-[#e5e4de] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[#5F3F56]/40"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#5F3F56] tracking-wider">
                      {t.fallback_code ? `Code: ${t.fallback_code}` : t.ticket_code}
                    </span>
                    <StatusBadge status={t.payment_status || 'paid'} />
                    {t.checked_in_at && (
                      <span className="font-mono text-[10px] uppercase bg-green-100 text-green-800 px-2 py-0.5 border border-green-200">
                        Checked In
                      </span>
                    )}
                  </div>

                  <h4 className="font-serif text-lg text-[#1c1c1c] tracking-tight">
                    {t.event_title || 'Campus Event'}
                  </h4>

                  <div className="font-mono text-xs text-[#1c1c1c]/60 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Venue: {t.event_venue || 'Main Campus'}</span>
                    <span>Date: {eventDate}</span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#e5e4de]">
                  <span className="font-mono text-base font-bold text-[#1c1c1c] block">
                    ₹{price}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenQRModal(t)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#5F3F56] hover:bg-[#5F3F56]/90 text-white font-mono text-[11px] uppercase tracking-wider rounded-xs transition-colors cursor-pointer shadow-2xs"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>View QR Pass</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIGITAL TICKET QR PASS MODAL                                              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-[#e2e8f0] shadow-2xl max-w-sm w-full rounded-sm overflow-hidden p-6 space-y-5 text-center relative my-6"
            >
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-[#5F3F56] bg-primary/10 px-2 py-0.5 rounded-xs border border-primary/20">
                  Official Admission Pass
                </span>
                <h3 className="font-serif text-xl font-bold text-slate-900 tracking-tight">
                  {selectedTicket.event_title || 'Campus Event'}
                </h3>
                <p className="font-mono text-xs text-slate-500">
                  {selectedTicket.event_venue || 'Main Auditorium'}
                </p>
              </div>

              {/* QR Image */}
              <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xs flex flex-col items-center justify-center min-h-[200px]">
                {qrLoading ? (
                  <div className="text-xs font-mono text-slate-400 animate-pulse">
                    Generating signed pass...
                  </div>
                ) : qrData?.qrDataUrl ? (
                  <>
                    <img
                      src={qrData.qrDataUrl}
                      alt="Ticket QR Code"
                      className="w-44 h-44 object-contain shadow-xs bg-white p-2 rounded-xs border border-slate-200"
                    />
                    <span className="font-mono text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-2.5">
                      Show at venue gate scanner
                    </span>
                  </>
                ) : (
                  <div className="text-xs font-mono text-amber-800">
                    QR pass temporarily unavailable. Please present fallback code below.
                  </div>
                )}
              </div>

              {/* Fallback Ticket Code Box */}
              <div className="bg-slate-50 border border-slate-200 p-3 flex items-center justify-between font-mono text-xs text-left">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Manual Entry Code</span>
                  <strong className="text-primary text-base select-all font-bold tracking-widest block font-mono">
                    {selectedTicket.fallback_code || selectedTicket.ticket_code}
                  </strong>
                  <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                    Ref: {selectedTicket.ticket_code}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyCode(selectedTicket.fallback_code || selectedTicket.ticket_code)}
                  className="px-2.5 py-1 text-[10px] font-mono bg-white border border-slate-200 hover:border-primary text-slate-700 rounded-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Tier: {selectedTicket.price_type || 'standard'}</span>
                <span>Paid: ₹{Number(selectedTicket.price || 0).toFixed(2)}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardSection>
  );
};

export default MemberTicketSection;
