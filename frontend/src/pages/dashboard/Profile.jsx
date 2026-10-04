// frontend/src/pages/dashboard/Profile.jsx
import React, { useState, useEffect, useCallback } from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardPageHeader from '../../components/dashboard/DashboardPageHeader';
import { DashboardLoadingState } from '../../components/dashboard/DashboardLoadingState';
import authService from '../../services/auth.service';
import tasksService from '../../services/tasks.service';
import eventsService from '../../services/events.service';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Lock,
  Calendar,
  CheckSquare,
  Ticket,
  Save,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const Profile = () => {
  const storedUser = authService.getStoredUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Profile Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileToast, setProfileToast] = useState(null);

  // Change Password Form State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordToast, setPasswordToast] = useState(null);

  // Overview Activity Counts
  const [myTasksCount, setMyTasksCount] = useState(0);
  const [myTicketsCount, setMyTicketsCount] = useState(0);

  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userRes = await authService.getProfile();
      setProfile(userRes);
      setEditName(userRes?.name || '');
      setEditPhone(userRes?.phone || '');

      // Load activity summaries safely
      try {
        const tasksRes = await tasksService.getMyTasks();
        const tList = tasksRes?.tasks || tasksRes?.data || (Array.isArray(tasksRes) ? tasksRes : []);
        setMyTasksCount(tList.length);
      } catch {}

      try {
        const ticketsRes = await eventsService.getMyTickets();
        const tkList = ticketsRes?.tickets || ticketsRes?.data || (Array.isArray(ticketsRes) ? ticketsRes : []);
        setMyTicketsCount(tkList.length);
      } catch {}
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err.response?.data?.error || err.message || 'Failed to retrieve profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setProfileToast(null);
      const res = await authService.updateProfile({
        name: editName.trim(),
        phone: editPhone.trim(),
      });
      setProfile(res.user || res);
      setIsEditing(false);
      setProfileToast({ type: 'success', message: 'Profile information updated successfully!' });
    } catch (err) {
      setProfileToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to update profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordToast({ type: 'error', message: 'New password and confirm password do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordToast({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }

    try {
      setSavingPassword(true);
      setPasswordToast(null);
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordToast({ type: 'success', message: 'Password updated successfully!' });
    } catch (err) {
      setPasswordToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to change password.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const role = profile?.role || storedUser?.role || 'member';

  return (
    <DashboardShell activeRole={role}>
      <DashboardPageHeader
        title="Account Profile & Security"
        subtitle="Manage your identity credentials, profile information, and account security settings."
        badge="Account Settings"
      />

      {loading ? (
        <div className="py-12">
          <DashboardLoadingState title="Loading Account Profile..." />
        </div>
      ) : error ? (
        <div className="p-6 border border-rose-200 bg-rose-50 text-rose-900 text-xs font-mono">
          {error}
        </div>
      ) : (
        <div className="space-y-8 max-w-5xl">
          {/* Main Profile Info Section */}
          <div className="border border-border bg-white shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xs border border-primary/30 bg-primary/10 flex items-center justify-center text-primary font-bold text-lg font-mono">
                  {(profile?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-sans font-bold text-slate-900">
                    {profile?.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-border bg-slate-100 text-slate-700 text-[10px] font-mono uppercase font-bold rounded-xs">
                      <ShieldCheck className="w-3 h-3 text-primary" />
                      <span>{role.replace('_', ' ')}</span>
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Member ID: #{profile?.id}
                    </span>
                  </div>
                </div>
              </div>

              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-slate-50 hover:bg-slate-100 text-xs font-mono uppercase font-bold text-slate-700 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {profileToast && (
              <div
                className={`p-3.5 border font-mono text-xs flex items-center justify-between ${
                  profileToast.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <span>{profileToast.message}</span>
                <button
                  onClick={() => setProfileToast(null)}
                  className="font-bold underline ml-4 uppercase cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-border bg-white focus:outline-hidden focus:border-slate-900 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-border bg-white focus:outline-hidden focus:border-slate-900 font-sans"
                    />
                  </div>
                </div>

                <div className="p-3 border border-amber-200 bg-amber-50/50 text-amber-800 text-[11px] font-mono">
                  <strong>Note:</strong> Email address is tied to your primary authentication identity and cannot be changed without administrative re-verification.
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(profile?.name || '');
                      setEditPhone(profile?.phone || '');
                    }}
                    className="px-4 py-2 border border-border bg-slate-100 hover:bg-slate-200 uppercase font-bold text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 font-mono text-xs">
                <div className="p-4 border border-slate-100 bg-slate-50/50">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Full Name
                  </span>
                  <div className="font-sans font-semibold text-slate-900 text-sm">
                    {profile?.name}
                  </div>
                </div>

                <div className="p-4 border border-slate-100 bg-slate-50/50">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Primary Email
                  </span>
                  <div className="text-slate-900 font-medium">
                    {profile?.email}
                  </div>
                </div>

                <div className="p-4 border border-slate-100 bg-slate-50/50">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Phone Number
                  </span>
                  <div className="text-slate-900 font-medium">
                    {profile?.phone || 'Not configured'}
                  </div>
                </div>

                <div className="p-4 border border-slate-100 bg-slate-50/50">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Assigned Role
                  </span>
                  <div className="text-slate-900 font-bold uppercase">
                    {role.replace('_', ' ')}
                  </div>
                </div>

                <div className="p-4 border border-slate-100 bg-slate-50/50">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Account Created
                  </span>
                  <div className="text-slate-900 font-medium">
                    {formatDate(profile?.created_at)}
                  </div>
                </div>

                <div className="p-4 border border-slate-100 bg-slate-50/50">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Membership Status
                  </span>
                  <div className="text-slate-900 font-medium capitalize">
                    {profile?.membership_status || 'Standard'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Activity Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 border border-border bg-white shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase text-slate-500 font-bold">
                  My Active Tasks
                </span>
                <div className="text-2xl font-sans font-bold text-slate-900">
                  {myTasksCount}
                </div>
              </div>
              <CheckSquare className="w-8 h-8 text-primary/40" />
            </div>

            <div className="p-5 border border-border bg-white shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase text-slate-500 font-bold">
                  Purchased Tickets
                </span>
                <div className="text-2xl font-sans font-bold text-slate-900">
                  {myTicketsCount}
                </div>
              </div>
              <Ticket className="w-8 h-8 text-primary/40" />
            </div>
          </div>

          {/* Security & Password Section */}
          <div className="border border-border bg-white shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="font-sans font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span>Security Credentials</span>
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  Update your account password. Passwords are encrypted with salted bcrypt hashing.
                </p>
              </div>

              {!isChangingPassword && (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-slate-50 hover:bg-slate-100 text-xs font-mono uppercase font-bold text-slate-700 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </button>
              )}
            </div>

            {passwordToast && (
              <div
                className={`p-3.5 border font-mono text-xs flex items-center justify-between ${
                  passwordToast.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <span>{passwordToast.message}</span>
                <button
                  onClick={() => setPasswordToast(null)}
                  className="font-bold underline ml-4 uppercase cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {isChangingPassword && (
              <form onSubmit={handleChangePassword} className="space-y-4 font-mono text-xs max-w-md">
                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-white focus:outline-hidden focus:border-slate-900 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-white focus:outline-hidden focus:border-slate-900 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-white focus:outline-hidden focus:border-slate-900 font-sans"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{savingPassword ? 'Updating...' : 'Update Password'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="px-4 py-2 border border-border bg-slate-100 hover:bg-slate-200 uppercase font-bold text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
};

export default Profile;
