// frontend/src/pages/announcements/Announcements.jsx
import React, { useState, useEffect } from 'react';
import announcementsService from '../../services/announcements.service';

export const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await announcementsService.getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      setError(err.message || 'Unable to connect to announcements service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setFormFeedback({ type: 'error', text: 'Please provide both title and announcement content.' });
      return;
    }

    try {
      setSubmitting(true);
      setFormFeedback({ type: '', text: '' });

      const newAnnouncement = await announcementsService.createAnnouncement({
        title: title.trim(),
        body: body.trim()
      });

      // Optimistically update list without needing a full page refresh
      setAnnouncements((prev) => [newAnnouncement, ...prev]);

      // Reset form
      setTitle('');
      setBody('');
      setFormFeedback({ type: 'success', text: 'Announcement posted successfully!' });
      setShowForm(false);
    } catch (err) {
      setFormFeedback({ type: 'error', text: err.message || 'Failed to publish announcement.' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-slate-100">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Announcements</h1>
          <p className="text-sm text-slate-400 mt-1">
            Official bulletins, community notices, and updates from organization leadership
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm(!showForm);
            setFormFeedback({ type: '', text: '' });
          }}
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium text-sm text-white shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          {showForm ? 'Cancel' : '+ New Announcement'}
        </button>
      </div>

      {/* Action Notification */}
      {formFeedback.text && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm border ${
            formFeedback.type === 'error'
              ? 'bg-red-950/50 border-red-800 text-red-300'
              : 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
          }`}
        >
          {formFeedback.text}
        </div>
      )}

      {/* Create Announcement Form */}
      {showForm && (
        <div className="mb-8 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
          <h2 className="text-base font-semibold text-white">Create Announcement</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Announcement Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Semester Kickoff Meeting & Officer Elections"
                maxLength={255}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Content / Message Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the full announcement details here..."
                rows={4}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Dismiss
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 font-medium text-sm text-white shadow-md shadow-indigo-600/25 disabled:opacity-50 transition-all"
              >
                {submitting ? 'Publishing...' : 'Publish Announcement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Content Area: Loading / Error / Empty / List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
          <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading announcements...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-red-950/40 border border-red-800 rounded-2xl text-red-300 text-sm space-y-4">
          <p>{error}</p>
          <button
            onClick={fetchAnnouncements}
            className="px-4 py-2 bg-red-900/60 hover:bg-red-800 rounded-xl text-xs font-semibold text-white uppercase tracking-wider transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
          <p className="text-base font-medium text-slate-300">No announcements yet</p>
          <p className="text-xs text-slate-500">
            Check back later for new bulletins or post the first announcement above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs uppercase font-mono tracking-widest text-slate-500 pb-2">
            Historical Records ({announcements.length} updates)
          </div>
          {announcements.map((item) => (
            <article
              key={item.id}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-lg space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-800/80 pb-3">
                <h2 className="text-lg font-semibold text-white tracking-tight">{item.title}</h2>
                <time className="text-xs font-mono text-slate-400 shrink-0">
                  {formatDate(item.created_at)}
                </time>
              </div>

              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {item.body}
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/40">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>Posted by:</span>
                  <span className="text-slate-300 font-medium">
                    {item.author_name || 'Organization Admin'}
                  </span>
                  {item.author_role && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold bg-slate-800 text-indigo-400 border border-slate-700">
                      {item.author_role}
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] text-slate-600">ID #{item.id}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Announcements;
