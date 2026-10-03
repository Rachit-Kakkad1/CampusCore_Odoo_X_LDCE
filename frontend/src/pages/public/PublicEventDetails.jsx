// frontend/src/pages/public/PublicEventDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import eventsService from '../../services/events.service';
import authService from '../../services/auth.service';
import membershipService from '../../services/membership.service';
import GuestTicketPurchase from './GuestTicketPurchase';
import { Calendar, MapPin, Users, ArrowLeft, ShieldCheck, Ticket, Sparkles, AlertCircle } from 'lucide-react';

export const PublicEventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // Membership status for dynamic member pricing
  const [currentUser, setCurrentUser] = useState(authService.getStoredUser());
  const [membership, setMembership] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const data = await eventsService.getEventById(id);
        const item = data?.data || data;
        setEvent(item);

        if (authService.isAuthenticated()) {
          try {
            const memRes = await membershipService.getMembership();
            const mem = memRes?.membership || memRes?.data || memRes;
            setMembership(mem);
          } catch (e) {
            setMembership(null);
          }
        }
      } catch (err) {
        console.error('Error fetching event details:', err);
        setError('Event not found or unavailable.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchEvent();
  }, [id]);

  // Membership state
  const isActiveMember = Boolean(
    membership &&
    membership.status === 'active' &&
    membership.dues_status === 'paid' &&
    (!membership.expiry_date || new Date(membership.expiry_date) > new Date())
  );

  const isExpiredMember = Boolean(
    membership &&
    (membership.status === 'expired' ||
      (membership.expiry_date && new Date(membership.expiry_date) <= new Date()))
  );

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
          <button
            type="button"
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/events')}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase px-4 py-2 border border-[#e5e4de] bg-white text-[#1c1c1c] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Events</span>
          </button>
        </div>
        <footer className="border-t border-[#e5e4de] py-6 text-center font-mono text-xs text-[#1c1c1c]/50">
          CampusCore Student Organization
        </footer>
      </div>
    );
  }

  const regularPrice = Number(event.non_member_price || 0).toFixed(2);
  const memberPrice = Number(event.member_price || 0).toFixed(2);
  const savings = (Number(event.non_member_price || 0) - Number(event.member_price || 0)).toFixed(2);
  const seatsRemaining = Number(event.seats_remaining || 0);
  const isPast = Boolean(event.starts_at && new Date(event.starts_at) < new Date());
  const isSoldOut = !isPast && seatsRemaining <= 0;

  const eventDateFormatted = event.starts_at
    ? new Date(event.starts_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date to be announced';

  const eventTimeFormatted = event.starts_at
    ? new Date(event.starts_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Time TBA';

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#1c1c1c] flex flex-col justify-between selection:bg-[#5F3F56] selection:text-white">
      <Navbar />

      <main className="flex-grow py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Breadcrumb Back Link */}
          <div>
            <button
              type="button"
              onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/events')}
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#1c1c1c]/60 hover:text-[#5F3F56] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Public Schedule</span>
            </button>
          </div>

          {/* Event Article / Details Card */}
          <div className="border border-[#e5e4de] bg-[#f7f6f2] p-8 sm:p-12 space-y-8">
            {/* Past Event Notice Banner */}
            {isPast && (
              <div className="p-4 bg-amber-50 border border-amber-300 text-amber-950 font-mono text-xs flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Event Concluded:</strong> This session was scheduled for {eventDateFormatted}. Ticket registration is closed.
                </span>
              </div>
            )}

            {/* Header Area */}
            <div className="border-b border-[#e5e4de] pb-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={`font-mono text-xs uppercase tracking-wider px-2.5 py-1 border font-semibold ${
                  isPast
                    ? 'bg-gray-100 text-gray-700 border-gray-300'
                    : isSoldOut
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-white text-[#5F3F56] border-[#e5e4de]'
                }`}>
                  {isPast ? 'EVENT CONCLUDED' : isSoldOut ? 'SOLD OUT' : `${seatsRemaining} seats remaining`}
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
                  {eventDateFormatted} · {eventTimeFormatted}
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

            {/* SECTION 4: CLEAR PRICING & TICKET ACTION BOX */}
            <div className="p-6 bg-white/80 border border-[#e5e4de] space-y-6">
              <div className="border-b border-[#e5e4de] pb-4">
                <span className="font-mono text-xs uppercase tracking-widest text-[#5F3F56] font-bold block mb-1">
                  TICKET PRICE
                </span>
                
                {/* Active Member Pricing View */}
                {isActiveMember ? (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-4 font-mono">
                      <div className="p-3 bg-gray-50 border border-gray-200">
                        <span className="text-[10px] uppercase text-[#1c1c1c]/50 block">Non-member</span>
                        <span className="text-xl line-through text-[#1c1c1c]/60">₹{regularPrice}</span>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-300">
                        <span className="text-[10px] uppercase font-bold text-green-900 block flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-green-700" />
                          ACTIVE MEMBER
                        </span>
                        <span className="text-2xl font-bold text-green-950">₹{memberPrice}</span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-green-100/60 border border-green-300 text-green-900 font-mono text-xs font-semibold flex items-center justify-between">
                      <span>✓ Your member discount is automatically unlocked</span>
                      <span className="text-sm">You save ₹{savings}</span>
                    </div>
                  </div>
                ) : isExpiredMember ? (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between font-mono">
                      <div>
                        <span className="text-[10px] uppercase text-[#1c1c1c]/50 block">Ticket Price</span>
                        <span className="text-3xl font-bold text-[#1c1c1c]">₹{regularPrice}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-amber-800 font-bold block">Membership: EXPIRED</span>
                        <span className="text-xs text-amber-900">Member rate: ₹{memberPrice}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 font-mono text-xs">
                      Renew your membership to unlock member pricing and save ₹{savings}.
                    </div>
                  </div>
                ) : (
                  /* Non-member / Guest View */
                  <div className="space-y-3 pt-2">
                    <div className="flex items-baseline justify-between font-mono">
                      <div>
                        <span className="text-[10px] uppercase text-[#1c1c1c]/50 block">Non-member Price</span>
                        <span className="text-3xl font-bold text-[#1c1c1c]">₹{regularPrice}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-[#5F3F56] font-semibold block">Member Rate</span>
                        <span className="text-xl font-bold text-[#5F3F56]">₹{memberPrice}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white border border-[#e5e4de] text-[#1c1c1c]/70 font-mono text-xs flex items-center justify-between">
                      <span>Become a member to unlock member pricing.</span>
                      <span className="text-[#5F3F56] font-bold">Save ₹{savings}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Purchase Button Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="font-mono text-xs text-[#1c1c1c]/60">
                  {isPast
                    ? 'Registration closed · Event has concluded'
                    : isSoldOut
                    ? 'Capacity reached · No tickets available'
                    : 'Includes instant signed QR admission pass & email delivery'}
                </span>

                <button
                  onClick={() => !isPast && setShowPurchaseModal(true)}
                  disabled={isSoldOut || isPast}
                  className={`font-mono text-xs uppercase tracking-widest px-8 py-4 border transition-all flex items-center justify-center gap-2 ${
                    isPast
                      ? 'bg-gray-200 text-gray-600 border-gray-300 cursor-not-allowed'
                      : isSoldOut
                      ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                      : 'bg-[#5F3F56] text-white border-[#5F3F56] hover:bg-[#5F3F56]/90 shadow-md cursor-pointer'
                  }`}
                >
                  <Ticket className="w-4 h-4" />
                  <span>{isPast ? 'EVENT CONCLUDED' : isSoldOut ? 'SOLD OUT' : 'GET TICKET'}</span>
                </button>
              </div>
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
          <span>CampusCore Student Organization · Event Registry</span>
          <span>CampusCore 2026</span>
        </div>
      </footer>
    </div>
  );
};

export default PublicEventDetails;
