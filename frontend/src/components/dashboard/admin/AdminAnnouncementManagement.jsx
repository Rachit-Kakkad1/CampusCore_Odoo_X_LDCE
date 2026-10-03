// frontend/src/components/dashboard/admin/AdminAnnouncementManagement.jsx
import React, { useState } from 'react';
import { ActionButton } from '../ActionButton';
import announcementsService from '../../../services/announcements.service';
import { Plus, X, Megaphone, AlertCircle } from 'lucide-react';

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

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const res = await announcementsService.createAnnouncement({
        title,
        body,
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
    <div className="space-y-6">
      {/* Header with CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-2xl text-[#1c1c1c]">Organization Bulletins & Broadcasts</h3>
          <span className="font-mono text-xs text-[#1c1c1c]/60">
            {announcements.length} published notices
          </span>
        </div>
        <ActionButton
          variant="primary"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Post Announcement</span>
        </ActionButton>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 border border-[#e5e4de] bg-white/50 animate-pulse"></div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="p-12 border border-[#e5e4de] text-center font-mono text-xs text-[#1c1c1c]/60">
          No announcements published yet.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => {
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
              <div
                key={ann.id}
                className="border border-[#e5e4de] bg-[#f7f6f2] p-6 space-y-3 hover:border-[#5F3F56]/40 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#e5e4de]">
                  <h4 className="font-serif text-2xl text-[#1c1c1c]">
                    {ann.title}
                  </h4>
                  <span className="font-mono text-xs text-[#1c1c1c]/50">
                    {postDate}
                  </span>
                </div>

                <p className="font-sans text-sm text-[#1c1c1c]/80 leading-relaxed whitespace-pre-line">
                  {ann.body}
                </p>

                <div className="pt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#5F3F56]">
                  <span className="w-1.5 h-1.5 bg-[#5F3F56]"></span>
                  <span>Executive Board Notice #{ann.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Announcement Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#1c1c1c]/70 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreate}
            className="border border-[#e5e4de] bg-[#f7f6f2] p-6 sm:p-8 w-full max-w-lg space-y-6 my-8"
          >
            <div className="flex items-center justify-between border-b border-[#e5e4de] pb-3">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-[#5F3F56] font-semibold block mb-1">
                  Broadcast Communications
                </span>
                <h3 className="font-serif text-2xl text-[#1c1c1c]">Publish Official Notice</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#1c1c1c]/50 hover:text-[#1c1c1c]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 font-mono text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70 mb-1">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Semester Kickoff & Membership Registration"
                  className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70 mb-1">
                  Message Body *
                </label>
                <textarea
                  rows={4}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Details of the announcement..."
                  className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#e5e4de] flex justify-end gap-3">
              <ActionButton
                variant="secondary"
                onClick={() => setShowAddModal(false)}
                disabled={formLoading}
              >
                Cancel
              </ActionButton>
              <ActionButton
                type="submit"
                variant="primary"
                disabled={formLoading}
              >
                {formLoading ? 'Publishing...' : 'Broadcast Notice'}
              </ActionButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncementManagement;
