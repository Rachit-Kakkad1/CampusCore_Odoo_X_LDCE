// frontend/src/pages/public/GuestHome.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import eventsService from '../../services/events.service';
import announcementsService from '../../services/announcements.service';
import { ArrowRight, Calendar, Megaphone, ShieldCheck, Users } from 'lucide-react';

export const GuestHome = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [evData, annData] = await Promise.all([
          eventsService.getEvents().catch(() => []),
          announcementsService.getAnnouncements().catch(() => []),
        ]);
        setEvents(Array.isArray(evData?.data || evData) ? (evData?.data || evData) : []);
        setAnnouncements(Array.isArray(annData?.data || annData) ? (annData?.data || annData) : []);
      } catch (err) {
        console.error('Error loading guest home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#1c1c1c] flex flex-col justify-between selection:bg-[#5F3F56] selection:text-white">
      <Navbar />

      <main className="flex-grow">
        {/* Editorial Public Hero */}
        <section className="pt-20 pb-16 px-6 border-b border-[#e5e4de] bg-[#f7f6f2]">
          <div className="max-w-6xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 border border-[#e5e4de] bg-white/60 mb-8">
              <span className="w-2 h-2 rounded-full bg-[#5F3F56] animate-pulse"></span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#5F3F56] font-semibold">
                CampusCore Student Organization · Public Portal
              </span>
            </div>

            <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl leading-[1.05] tracking-tight mb-8 max-w-4xl">
              Connecting campus talent through open events, projects & community.
            </h1>

            <p className="font-sans text-lg text-[#1c1c1c]/70 max-w-2xl mb-10 leading-relaxed">
              Explore public assemblies, register for open flagship events, and experience student-driven initiatives. Open to all students and guest attendees.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/events"
                className="bg-[#5F3F56] text-white font-mono text-xs uppercase tracking-widest px-6 py-3.5 border border-[#5F3F56] hover:bg-[#5F3F56]/90 transition-all flex items-center gap-2"
              >
                <span>Browse Available Events</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="font-mono text-xs uppercase tracking-widest px-6 py-3.5 border border-[#e5e4de] bg-white/60 hover:bg-white transition-all text-[#1c1c1c]"
              >
                Sign In / Guest Access
              </Link>
            </div>
          </div>
        </section>

        {/* Public Pillars Grid */}
        <section className="py-16 px-6 border-b border-[#e5e4de] bg-white/40">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 border border-[#e5e4de] bg-[#f7f6f2] space-y-3">
              <div className="w-8 h-8 border border-[#e5e4de] flex items-center justify-center font-mono text-xs text-[#5F3F56]">
                01
              </div>
              <h3 className="font-serif text-xl">Open Campus Events</h3>
              <p className="font-sans text-xs text-[#1c1c1c]/70 leading-relaxed">
                Attend keynote sessions, technical workshops, and social galas with standard public guest tickets.
              </p>
            </div>

            <div className="p-6 border border-[#e5e4de] bg-[#f7f6f2] space-y-3">
              <div className="w-8 h-8 border border-[#e5e4de] flex items-center justify-center font-mono text-xs text-[#5F3F56]">
                02
              </div>
              <h3 className="font-serif text-xl">Instant Ticket Verification</h3>
              <p className="font-sans text-xs text-[#1c1c1c]/70 leading-relaxed">
                Secure digital ticket codes generated instantly for fast-track entry at the venue doors.
              </p>
            </div>

            <div className="p-6 border border-[#e5e4de] bg-[#f7f6f2] space-y-3">
              <div className="w-8 h-8 border border-[#e5e4de] flex items-center justify-center font-mono text-xs text-[#5F3F56]">
                03
              </div>
              <h3 className="font-serif text-xl">Official Broadcasts</h3>
              <p className="font-sans text-xs text-[#1c1c1c]/70 leading-relaxed">
                Stay updated with verified notices and announcements directly from executive leadership.
              </p>
            </div>
          </div>
        </section>

        {/* Upcoming Public Events Section */}
        <section className="py-20 px-6 border-b border-[#e5e4de]">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-[#5F3F56] block mb-1">
                  Schedule & Registration
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#1c1c1c]">
                  Upcoming Public Events
                </h2>
              </div>
              <Link
                to="/events"
                className="font-mono text-xs uppercase tracking-wider text-[#5F3F56] hover:underline flex items-center gap-1.5"
              >
                <span>View Full Schedule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((n) => (
                  <div key={n} className="h-44 bg-white/60 border border-[#e5e4de] animate-pulse"></div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="p-12 border border-[#e5e4de] text-center font-mono text-xs text-[#1c1c1c]/60">
                No public events are currently scheduled.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.slice(0, 4).map((event) => {
                  const nonMemberPrice = Number(event.non_member_price || 0).toFixed(2);
                  const eventDate = event.starts_at
                    ? new Date(event.starts_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'TBA';

                  return (
                    <div
                      key={event.id}
                      className="border border-[#e5e4de] bg-[#f7f6f2] p-6 flex flex-col justify-between hover:border-[#5F3F56]/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-[#5F3F56] font-semibold">
                            {event.seats_remaining} seats remaining
                          </span>
                          <span className="font-mono text-xs text-[#1c1c1c]/60">
                            {eventDate}
                          </span>
                        </div>

                        <h3 className="font-serif text-2xl mb-2 text-[#1c1c1c]">
                          {event.title}
                        </h3>
                        <p className="font-sans text-xs text-[#1c1c1c]/70 line-clamp-2 mb-6">
                          {event.description}
                        </p>

                        <div className="font-mono text-xs text-[#1c1c1c]/70 pb-4 border-b border-[#e5e4de] mb-4">
                          Venue: {event.venue}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <span className="font-mono text-[10px] uppercase text-[#1c1c1c]/50 block">
                            Guest Ticket Price
                          </span>
                          <span className="font-mono text-xl font-bold text-[#1c1c1c]">
                            ₹{nonMemberPrice}
                          </span>
                        </div>

                        <button
                          onClick={() => navigate(`/events/${event.id}`)}
                          className="font-mono text-xs uppercase tracking-wider px-4 py-2.5 bg-[#1c1c1c] text-white hover:bg-[#5F3F56] transition-colors"
                        >
                          View Details & Buy
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Public Announcements Feed */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10">
              <span className="font-mono text-xs uppercase tracking-widest text-[#5F3F56] block mb-1">
                Official Updates
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#1c1c1c]">
                Organization Bulletins
              </h2>
            </div>

            {announcements.length === 0 ? (
              <div className="p-8 border border-[#e5e4de] text-center font-mono text-xs text-[#1c1c1c]/60">
                No active announcements at this time.
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="border border-[#e5e4de] bg-white/40 p-6 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#e5e4de]">
                      <h4 className="font-serif text-xl">{ann.title}</h4>
                      <span className="font-mono text-xs text-[#1c1c1c]/50">
                        {ann.created_at
                          ? new Date(ann.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </span>
                    </div>
                    <p className="font-sans text-sm text-[#1c1c1c]/80 leading-relaxed pt-1">
                      {ann.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e4de] py-8 px-6 bg-[#f7f6f2] font-mono text-xs text-[#1c1c1c]/60">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>CampusCore Student Organization · Public Gateway</span>
          <span>CampusCore 2026</span>
        </div>
      </footer>
    </div>
  );
};

export default GuestHome;
