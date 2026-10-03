// frontend/src/components/dashboard/AnnouncementsModal.jsx
import React, { useState, useEffect } from 'react';
import { Megaphone, X, Calendar, Bell, ShieldCheck } from 'lucide-react';
import announcementsService from '../../services/announcements.service';

/**
 * AnnouncementsModal Component
 * Interactive modal that displays official broadcasts across all roles.
 */
export const AnnouncementsModal = ({ isOpen, onClose }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      announcementsService
        .getAnnouncements()
        .then((data) => {
          const list = data?.data || data || [];
          setAnnouncements(Array.isArray(list) ? list : []);
        })
        .catch((err) => {
          console.error('Failed to load announcements:', err);
          setAnnouncements([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-border max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-border bg-white flex items-center justify-center shadow-xs">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-base text-slate-900 tracking-tight">
                Official Campus Bulletins & Broadcasts
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Authoritative communications from executive leadership
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs animate-pulse">
              Loading broadcast bulletins...
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Bell className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-sans font-medium text-slate-700 text-sm">
                No active announcements
              </p>
              <p className="font-mono text-xs text-slate-400">
                All organization bulletins are currently up to date.
              </p>
            </div>
          ) : (
            announcements.map((ann) => (
              <article
                key={ann.id}
                className="p-5 border border-border bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-sans font-bold text-sm text-slate-900">
                    {ann.title}
                  </h3>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-border bg-white font-mono text-[10px] text-slate-600 shrink-0">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>
                      {ann.created_at
                        ? new Date(ann.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Recent'}
                    </span>
                  </div>
                </div>

                <p className="font-sans text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {ann.body || ann.content}
                </p>

                <div className="pt-2 border-t border-border/50 flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                  <ShieldCheck className="w-3 h-3 text-primary" />
                  <span>Verified Organization Broadcast</span>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 font-mono text-xs uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Close Bulletin
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsModal;
