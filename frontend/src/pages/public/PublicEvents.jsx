// frontend/src/pages/public/PublicEvents.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import eventsService from '../../services/events.service';
import authService from '../../services/auth.service';
import membershipService from '../../services/membership.service';
import { Calendar, MapPin, Search, ArrowRight, ShieldCheck, AlertCircle, Ticket } from 'lucide-react';

export const PublicEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  // User & Membership state (for dynamic member pricing display)
  const [currentUser, setCurrentUser] = useState(authService.getStoredUser());
  const [membership, setMembership] = useState(null);

  useEffect(() => {
    const fetchEventsAndMembership = async () => {
      try {
        setLoading(true);
        const data = await eventsService.getEvents();
        const list = Array.isArray(data?.data || data) ? (data?.data || data) : [];
        setEvents(list);

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
        console.error('Failed to load events:', err);
        setError('Unable to load upcoming events at this time.');
      } finally {
        setLoading(false);
      }
    };
    fetchEventsAndMembership();
  }, []);

  // Membership status determination (strictly aligned with backend rules)
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

  const [statusFilter, setStatusFilter] = useState('ALL');

  // Dynamic event status computation (derived from timestamps / backend single-source-of-truth)
  const getEventStatus = (event) => {
    if (event.computed_status) {
      return event.computed_status.toUpperCase();
    }
    const now = new Date();
    const startsAt = new Date(event.starts_at);
    const endsAt = event.ends_at
      ? new Date(event.ends_at)
      : new Date(startsAt.getTime() + 3 * 60 * 60 * 1000);

    if (now < startsAt) return 'UPCOMING';
    if (now >= startsAt && now <= endsAt) return 'LIVE';
    return 'PAST';
  };

  const allCount = events.length;
  const upcomingCount = events.filter((e) => getEventStatus(e) === 'UPCOMING').length;
  const liveCount = events.filter((e) => getEventStatus(e) === 'LIVE').length;
  const pastCount = events.filter((e) => getEventStatus(e) === 'PAST').length;

  const filteredEvents = events.filter((ev) => {
    const status = getEventStatus(ev);
    const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (ev.title && ev.title.toLowerCase().includes(q)) ||
      (ev.venue && ev.venue.toLowerCase().includes(q)) ||
      (ev.description && ev.description.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#1c1c1c] flex flex-col justify-between selection:bg-[#5F3F56] selection:text-white">
      <Navbar />

      <main className="flex-grow py-16 px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="border-b border-[#e5e4de] pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#e5e4de] bg-white/60 mb-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#5F3F56] font-semibold">
                  Public Schedule
                </span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl text-[#1c1c1c] tracking-tight">
                Campus Events & Assemblies
              </h1>
              <p className="font-sans text-sm text-[#1c1c1c]/70 mt-2 max-w-xl leading-relaxed">
                Discover scheduled flagship gatherings, academic seminars, and workshops. Reserve tickets directly.
              </p>
            </div>

            {/* Search Input */}
            <div className="w-full md:w-72">
              <div className="relative">
                <Search className="w-4 h-4 text-[#1c1c1c]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search events or venue..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/70 border border-[#e5e4de] font-mono text-xs text-[#1c1c1c] placeholder-[#1c1c1c]/40 focus:outline-none focus:border-[#5F3F56]"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'All', count: allCount },
              { id: 'UPCOMING', label: 'Upcoming', count: upcomingCount },
              { id: 'LIVE', label: 'Live', count: liveCount },
              { id: 'PAST', label: 'Past', count: pastCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-2 ${
                  statusFilter === tab.id
                    ? 'bg-[#5F3F56] text-white border-[#5F3F56] shadow-xs'
                    : 'bg-white/80 text-[#1c1c1c]/70 border-[#e5e4de] hover:bg-white hover:text-[#1c1c1c]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Events Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 bg-white/60 border border-[#e5e4de] animate-pulse"></div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 border border-red-200 bg-red-50 text-red-900 font-mono text-xs">
              {error}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-16 border border-[#e5e4de] text-center font-mono text-xs text-[#1c1c1c]/60 space-y-3">
              <p>No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} events found matching your filter criteria.</p>
              {statusFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className="px-4 py-1.5 bg-[#5F3F56] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#5F3F56]/90 transition-colors cursor-pointer"
                >
                  View All Events ({allCount})
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredEvents.map((event) => {
                const regularPrice = Number(event.non_member_price || 0).toFixed(2);
                const memberPrice = Number(event.member_price || 0).toFixed(2);
                const savings = (Number(event.non_member_price || 0) - Number(event.member_price || 0)).toFixed(2);
                const seatsRemaining = Number(event.seats_remaining || 0);
                const isSoldOut = seatsRemaining <= 0;
                const status = getEventStatus(event);

                const eventDateFormatted = event.starts_at
                  ? new Date(event.starts_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Date TBA';

                const eventTimeFormatted = event.starts_at
                  ? new Date(event.starts_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Time TBA';

                return (
                  <div
                    key={event.id}
                    className="border border-[#e5e4de] bg-[#f7f6f2] p-6 flex flex-col justify-between hover:border-[#5F3F56]/60 transition-all space-y-6"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {status === 'LIVE' && (
                            <span className="font-mono text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-rose-600 text-white animate-pulse">
                              ● LIVE NOW
                            </span>
                          )}
                          {status === 'UPCOMING' && (
                            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Upcoming
                            </span>
                          )}
                          {status === 'PAST' && (
                            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 border border-slate-300">
                              Past Session
                            </span>
                          )}
                          <span className={`font-mono text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 border ${
                            isSoldOut
                              ? 'bg-red-50 text-red-800 border-red-200'
                              : 'bg-white/80 text-[#5F3F56] border-[#e5e4de]'
                          }`}>
                            {isSoldOut ? 'SOLD OUT' : `${seatsRemaining} seats left`}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-[#1c1c1c]/50">
                          Capacity: {event.capacity}
                        </span>
                      </div>

                      {/* Event Title */}
                      <h3 className="font-serif text-2xl text-[#1c1c1c] tracking-tight">
                        {event.title}
                      </h3>

                      {/* Description */}
                      <p className="font-sans text-xs text-[#1c1c1c]/70 line-clamp-2 leading-relaxed">
                        {event.description || 'Join students, faculty, and guests for this scheduled campus event.'}
                      </p>

                      {/* Date, Time & Venue */}
                      <div className="space-y-1.5 pt-3 border-t border-[#e5e4de] font-mono text-xs text-[#1c1c1c]/80">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#5F3F56] shrink-0" />
                          <span>{eventDateFormatted} · {eventTimeFormatted}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#5F3F56] shrink-0" />
                          <span>{event.venue}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pricing Breakdown & CTA */}
                    <div className="pt-4 border-t border-[#e5e4de] space-y-3">
                      {/* DYNAMIC MEMBER VS NON-MEMBER PRICING SECTION */}
                      {isActiveMember ? (
                        <div className="p-3 bg-green-50/80 border border-green-200 font-mono text-xs flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase text-green-900/60 block">
                              Regular: <span className="line-through">₹{regularPrice}</span>
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-base font-bold text-green-950">
                                ₹{memberPrice}
                              </span>
                              <span className="text-[10px] font-bold text-green-800 uppercase px-1.5 py-0.2 bg-green-200/60 border border-green-300">
                                ACTIVE MEMBER
                              </span>
                            </div>
                          </div>
                          <span className="font-bold text-green-800 text-xs">
                            SAVE ₹{savings}
                          </span>
                        </div>
                      ) : isExpiredMember ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 font-mono text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[#1c1c1c]/70">Ticket Price:</span>
                            <span className="font-bold text-base text-[#1c1c1c]">₹{regularPrice}</span>
                          </div>
                          <div className="text-[10px] text-amber-800 flex items-center justify-between pt-1 border-t border-amber-200/60">
                            <span>Membership: <strong className="uppercase">EXPIRED</strong></span>
                            <span>Renew to unlock ₹{memberPrice}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-white/70 border border-[#e5e4de] font-mono text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase text-[#1c1c1c]/50 block">Non-member</span>
                              <span className="font-bold text-base text-[#1c1c1c]">₹{regularPrice}</span>
                            </div>
                            <div className="text-right space-y-0.5">
                              <span className="text-[10px] uppercase text-[#5F3F56] font-semibold block">Active Member</span>
                              <span className="font-bold text-base text-[#5F3F56]">₹{memberPrice}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-[#1c1c1c]/60 pt-1 border-t border-[#e5e4de]">
                            Become a member to unlock member pricing (Save ₹{savings}).
                          </p>
                        </div>
                      )}

                      {/* GET TICKET Button */}
                      <button
                        onClick={() => navigate(`/events/${event.id}`)}
                        disabled={isSoldOut}
                        className={`w-full font-mono text-xs uppercase tracking-widest py-3 border transition-all flex items-center justify-center gap-2 ${
                          isSoldOut
                            ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                            : 'bg-[#1c1c1c] text-white border-[#1c1c1c] hover:bg-[#5F3F56] hover:border-[#5F3F56] shadow-sm'
                        }`}
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>{isSoldOut ? 'SOLD OUT' : 'GET TICKET'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-[#e5e4de] py-8 px-6 bg-[#f7f6f2] font-mono text-xs text-[#1c1c1c]/60">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>CampusCore Student Organization · Public Events</span>
          <span>CampusCore 2026</span>
        </div>
      </footer>
    </div>
  );
};

export default PublicEvents;
