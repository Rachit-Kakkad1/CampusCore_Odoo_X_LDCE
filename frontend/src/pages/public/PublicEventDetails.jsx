// frontend/src/pages/public/PublicEventDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import eventsService from '../../services/events.service';
import GuestTicketPurchase from './GuestTicketPurchase';
import { Calendar, MapPin, Users, ArrowLeft, ShieldCheck, Ticket } from 'lucide-react';

export const PublicEventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const data = await eventsService.getEventById(id);
        const item = data?.data || data;
        setEvent(item);
      } catch (err) {
        console.error('Error fetching event details:', err);
        setError('Event not found or unavailable.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] flex flex-col justify-between">
        <Navbar />
        <div className="max-w-4xl mx-auto p-12 w-full">
          <div className="h-64 bg-white/60 border border-[#e5e4de] animate-pulse"></div>
        </div>
        <footer className="border-t border-[#e5e4de] py-6 text-center font-mono text-xs text-[#1c1c1c]/50">
          Loading event details...
        </footer>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] flex flex-col justify-between">
        <Navbar />
        <div className="max-w-3xl mx-auto p-12 text-center space-y-4">
          <h2 className="font-serif text-3xl text-[#1c1c1c]">Event Unavailable</h2>
          <p className="font-sans text-sm text-[#1c1c1c]/70">{error || 'The requested event could not be found.'}</p>
          <Link
            to="/events"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase px-4 py-2 border border-[#e5e4de] bg-white text-[#1c1c1c]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Events</span>
          </Link>
        </div>
        <footer className="border-t border-[#e5e4de] py-6 text-center font-mono text-xs text-[#1c1c1c]/50">
          Skyline Student Organization
        </footer>
      </div>
    );
  }

  const nonMemberPrice = Number(event.non_member_price || 0).toFixed(2);
  const isSoldOut = Number(event.seats_remaining || 0) <= 0;
  const eventDate = event.starts_at
    ? new Date(event.starts_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Date to be announced';

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#1c1c1c] flex flex-col justify-between selection:bg-[#5F3F56] selection:text-white">
      <Navbar />

      <main className="flex-grow py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Breadcrumb Back Link */}
          <div>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#1c1c1c]/60 hover:text-[#5F3F56] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Public Schedule</span>
            </Link>
          </div>

          {/* Event Article / Details Card */}
          <div className="border border-[#e5e4de] bg-[#f7f6f2] p-8 sm:p-12 space-y-8">
            {/* Header Area */}
            <div className="border-b border-[#e5e4de] pb-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={`font-mono text-xs uppercase tracking-wider px-2.5 py-1 border font-semibold ${
                  isSoldOut
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-white text-[#5F3F56] border-[#e5e4de]'
                }`}>
                  {isSoldOut ? 'Sold Out' : `${event.seats_remaining} seats remaining`}
                </span>
                <span className="font-mono text-xs text-[#1c1c1c]/60">
                  Event ID: EVT-00{event.id}
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl text-[#1c1c1c] tracking-tight leading-tight">
                {event.title}
              </h1>
            </div>

            {/* Technical Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white/60 border border-[#e5e4de] space-y-1">
                <div className="flex items-center gap-2 font-mono text-xs uppercase text-[#1c1c1c]/50">
                  <Calendar className="w-3.5 h-3.5 text-[#5F3F56]" />
                  <span>Scheduled Date & Time</span>
                </div>
                <div className="font-mono text-sm font-medium text-[#1c1c1c] pt-1">
                  {eventDate}
                </div>
              </div>

              <div className="p-4 bg-white/60 border border-[#e5e4de] space-y-1">
                <div className="flex items-center gap-2 font-mono text-xs uppercase text-[#1c1c1c]/50">
                  <MapPin className="w-3.5 h-3.5 text-[#5F3F56]" />
                  <span>Campus Venue</span>
                </div>
                <div className="font-mono text-sm font-medium text-[#1c1c1c] pt-1">
                  {event.venue}
                </div>
              </div>
            </div>

            {/* Event Description */}
            <div className="space-y-3 pt-2">
              <h3 className="font-mono text-xs uppercase tracking-widest text-[#5F3F56] font-semibold">
                Event Overview
              </h3>
              <p className="font-sans text-base text-[#1c1c1c]/80 leading-relaxed whitespace-pre-line">
                {event.description || 'Join students and community guests for this flagship campus gathering.'}
              </p>
            </div>

            {/* Pricing & Ticket Action Box */}
            <div className="p-6 bg-white/70 border border-[#e5e4de] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="font-mono text-[10px] uppercase text-[#1c1c1c]/50 block">
                      Member Pass
                    </span>
                    <div className="font-mono text-2xl font-bold text-[#5F3F56]">
                      ₹{Number(event.member_price || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="h-8 border-r border-[#e5e4de]"></div>
                  <div>
                    <span className="font-mono text-[10px] uppercase text-[#1c1c1c]/50 block">
                      Guest / Regular
                    </span>
                    <div className="font-mono text-2xl font-bold text-[#1c1c1c]">
                      ₹{nonMemberPrice}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#1c1c1c]/60 block pt-1">
                  Active members save ₹{(Number(event.non_member_price || 0) - Number(event.member_price || 0)).toFixed(2)} on this event.
                </span>
              </div>

              <button
                onClick={() => setShowPurchaseModal(true)}
                disabled={isSoldOut}
                className={`font-mono text-xs uppercase tracking-widest px-8 py-4 border transition-all flex items-center justify-center gap-2 ${
                  isSoldOut
                    ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                    : 'bg-[#5F3F56] text-white border-[#5F3F56] hover:bg-[#5F3F56]/90 shadow-sm'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>{isSoldOut ? 'Event Sold Out' : 'Get Event Ticket'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Ticket Purchase Modal Flow */}
      {showPurchaseModal && (
        <GuestTicketPurchase
          event={event}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={(ticket) => {
            // Live update remaining seats locally
            setEvent((prev) => prev ? {
              ...prev,
              seats_remaining: Math.max(0, Number(prev.seats_remaining || 0) - 1)
            } : prev);
          }}
        />
      )}

      <footer className="border-t border-[#e5e4de] py-8 px-6 bg-[#f7f6f2] font-mono text-xs text-[#1c1c1c]/60">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>Skyline Student Organization · Event Registry</span>
          <span>Odoo × LDCE 2026</span>
        </div>
      </footer>
    </div>
  );
};

export default PublicEventDetails;
