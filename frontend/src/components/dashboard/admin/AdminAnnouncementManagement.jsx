// frontend/src/components/dashboard/admin/AdminAnnouncementManagement.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import announcementsService from '../../../services/announcements.service';
import Pagination from '../../common/Pagination';
import {
  Plus,
  X,
  Megaphone,
  AlertCircle,
  Radio,
  Search,
  Calendar,
  Sparkles,
  Send,
  Bell
} from 'lucide-react';
import { ThreeDCard } from '../charts/ThreeDCharts';

export const AdminAnnouncementManagement = ({
  announcements = [],
  loading = false,
  onAnnouncementCreated,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filteredAnnouncements = announcements.filter((a) => {
    const q = search.toLowerCase();
    return (
      (a.title && a.title.toLowerCase().includes(q)) ||
      (a.body && a.body.toLowerCase().includes(q))
    );
  });

  const paginatedAnnouncements = filteredAnnouncements.slice((page - 1) * pageSize, page * pageSize);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    if (!title.trim() || !body.trim()) {
      setFormError('Please provide both Title and Notice Body.');
      setFormLoading(false);
      return;
    }

    try {
      const res = await announcementsService.createAnnouncement({
        title: title.trim(),
        body: body.trim(),
      });

      setShowAddModal(false);
      setTitle('');
      setBody('');
      onAnnouncementCreated?.(res?.data || res);
    } catch (err) {
      console.error('Error posting announcement:', err);
      setFormError(err.response?.data?.error?.message || err.message || 'Failed to post announcement');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* 1. TOP METRICS & BROADCAST STATUS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <ThreeDCard
          className="p-6 border-l-4 border-l-primary"
          accentGlow="rgba(95, 63, 86, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Bulletins
            </span>
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            {announcements.length}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Broadcasted to community</span>
            <span className="w-2 h-2 rounded-full bg-primary" />
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-emerald-600"
          accentGlow="rgba(5, 150, 105, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Broadcast Status
            </span>
            <div className="w-8 h-8 rounded-sm bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Live
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Synchronized across dashboards</span>
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-indigo-600"
          accentGlow="rgba(79, 70, 229, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Audience Reach
            </span>
            <div className="w-8 h-8 rounded-sm bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            All Members
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Public & Member portals</span>
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
          </div>
        </ThreeDCard>
      </div>

      {/* 2. SEARCH & ACTION HEADER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 border border-border shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bulletins by title, message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-primary focus:bg-white font-mono transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Post Official Notice</span>
        </button>
      </div>

      {/* 3. BULLETINS LIST */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 border border-border bg-white animate-pulse" />
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="p-12 border border-border bg-white text-center font-mono text-xs text-slate-500">
          No announcements found. Click "Post Official Notice" to broadcast one.
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedAnnouncements.map((ann) => {
            const postDate = ann.created_at
              ? new Date(ann.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent';

            return (
              <ThreeDCard
                key={ann.id}
                className="p-6 space-y-3"
                accentGlow="rgba(95, 63, 86, 0.1)"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">
                      {ann.title}
                    </h4>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {postDate}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
                  {ann.body}
                </p>

                <div className="pt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  <span className="text-primary font-bold">
                    Executive Board Notice #{ann.id}
                  </span>
                  <span>Active Public Dispatch</span>
                </div>
              </ThreeDCard>
            );
          })}

          {filteredAnnouncements.length > pageSize && (
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(filteredAnnouncements.length / pageSize)}
              totalItems={filteredAnnouncements.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              pageSizeOptions={[5, 10, 20]}
            />
          )}
        </div>
      )}

      {/* 4. UPGRADED MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative bg-white border border-[#e2e8f0] shadow-2xl max-w-lg w-full rounded-sm overflow-hidden my-8"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

              <div className="p-6 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-xs border border-primary/20">
                      Broadcasting Operations
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                      Post Official Notice
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 font-mono text-xs flex items-center gap-2 rounded-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Notice Subject / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Campus Spring Festival Registration Open"
                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-medium rounded-xs outline-none transition-all shadow-2xs placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Official Notice Content *
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write the full message broadcast to students, members, and attendees..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-sans rounded-xs outline-none transition-all shadow-2xs placeholder:text-slate-400"
                  />
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={formLoading}
                    className="px-4 py-2 border border-border text-slate-700 hover:bg-slate-100 font-bold uppercase text-[11px] tracking-wider rounded-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-bold uppercase text-[11px] tracking-wider rounded-xs shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{formLoading ? 'Broadcasting...' : 'Broadcast Bulletin'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminAnnouncementManagement;
