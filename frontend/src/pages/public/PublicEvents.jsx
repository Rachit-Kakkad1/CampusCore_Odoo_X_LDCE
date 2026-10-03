// frontend/src/pages/public/PublicEvents.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import eventsService from '../../services/events.service';
import { Calendar, MapPin, Search, ArrowRight, Users } from 'lucide-react';

export const PublicEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const data = await eventsService.getEvents();
        const list = Array.isArray(data?.data || data) ? (data?.data || data) : [];
        setEvents(list);
      } catch (err) {
        console.error('Failed to load events:', err);
        setError('Unable to load upcoming events at this time.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const filteredEvents = events.filter((ev) => {
    const q = search.toLowerCase();
    return (
      (ev.title && ev.title.toLowerCase().includes(q)) ||
      (ev.venue && ev.venue.toLowerCase().includes(q)) ||
      (ev.description && ev.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#1c1c1c] flex flex-col justify-between selection:bg-[#5F3F56] selection:text-white">
      <Navbar />

      <main className="flex-grow py-16 px-6">
        <div className="max-w-6xl mx-auto space-y-10">
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
                Discover scheduled flagship gatherings, academic seminars, and workshops. Reserve guest tickets directly.
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

          {/* Events Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-56 bg-white/60 border border-[#e5e4de] animate-pulse"></div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 border border-red-200 bg-red-50 text-red-900 font-mono text-xs">
              {error}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-16 border border-[#e5e4de] text-center font-mono text-xs text-[#1c1c1c]/60">
              No matching events found. Please check your search keyword or return later.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredEvents.map((event) => {
                const nonMemberPrice = Number(event.non_member_price || 0).toFixed(2);
                const isSoldOut = Number(event.seats_remaining || 0) <= 0;
                const eventDate = event.starts_at
                  ? new Date(event.starts_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'TBA';

                return (
                  <div
                    key={event.id}
                    className="border border-[#e5e4de] bg-[#f7f6f2] p-6 flex flex-col justify-between hover:border-[#5F3F56]/50 transition-all space-y-6"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-mono text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 border ${
                          isSoldOut
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-white/80 text-[#5F3F56] border-[#e5e4de]'
                        }`}>
                          {isSoldOut ? 'Sold Out' : `${event.seats_remaining} seats remaining`}
                        </span>
                        <span className="font-mono text-xs text-[#1c1c1c]/60">
                          Capacity: {event.capacity}
                        </span>
                      </div>

                      <h3 className="font-serif text-2xl text-[#1c1c1c] tracking-tight">
                        {event.title}
                      </h3>

                      <p className="font-sans text-xs text-[#1c1c1c]/70 line-clamp-3 leading-relaxed">
                        {event.description || 'Join students and faculty for this scheduled organization event.'}
                      </p>

                      <div className="space-y-1.5 pt-3 border-t border-[#e5e4de] font-mono text-xs text-[#1c1c1c]/80">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#1c1c1c]/40 shrink-0" />
                          <span>Venue: {event.venue}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#1c1c1c]/40 shrink-0" />
                          <span>Date: {eventDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#e5e4de] flex items-center justify-between gap-4">
                      <div>
                        <span className="font-mono text-[10px] uppercase text-[#1c1c1c]/50 block">
                          Guest Ticket Price
                        </span>
                        <span className="font-mono text-2xl font-bold text-[#1c1c1c]">
                          ₹{nonMemberPrice}
                        </span>
                      </div>

                      <button
                        onClick={() => navigate(`/events/${event.id}`)}
                        disabled={isSoldOut}
                        className={`font-mono text-xs uppercase tracking-wider px-5 py-2.5 border transition-all flex items-center gap-2 ${
                          isSoldOut
                            ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                            : 'bg-[#1c1c1c] text-white border-[#1c1c1c] hover:bg-[#5F3F56] hover:border-[#5F3F56]'
                        }`}
                      >
                        <span>{isSoldOut ? 'Sold Out' : 'Details & Tickets'}</span>
                        {!isSoldOut && <ArrowRight className="w-3.5 h-3.5" />}
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
          <span>Skyline Student Organization · Public Events</span>
          <span>Odoo × LDCE 2026</span>
        </div>
      </footer>
    </div>
  );
};

export default PublicEvents;
