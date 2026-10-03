// frontend/src/components/dashboard/member/MemberPassCard.jsx
import React from 'react';
import { StatusBadge } from '../StatusBadge';

export const MemberPassCard = ({ passData, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-[#f7f6f2] border border-[#e5e4de] p-6 animate-pulse">
        <div className="h-6 w-1/2 bg-[#e5e4de] mb-4"></div>
        <div className="h-32 w-full bg-[#e5e4de]"></div>
      </div>
    );
  }

  const computedStatus = (
    passData?.computed_status ||
    passData?.status ||
    'PENDING'
  ).toUpperCase();
  const isActive = computedStatus === 'ACTIVE';
  const memberCode = passData?.member_code || 'UNASSIGNED';
  const memberName = passData?.member_name || 'Skyline Member';
  const userEmail = passData?.user_email || 'member@skyline.org';
  const role = (passData?.role || 'member').toUpperCase();
  const expiryDate = passData?.expiry_date
    ? new Date(passData.expiry_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'PENDING PAYMENT';
  const startDate = (passData?.start_date || passData?.started_at)
    ? new Date(passData.start_date || passData.started_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <div className="bg-[#f7f6f2] border border-[#e5e4de] p-6 flex flex-col justify-between relative overflow-hidden">
      {/* Decorative Technical Top Bar */}
      <div className="flex items-center justify-between border-b border-[#e5e4de] pb-4 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-[#5F3F56]"></div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#1c1c1c]/70">
            Digital Member Credential
          </span>
        </div>
        <StatusBadge status={computedStatus} />
      </div>

      {/* Main Pass Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Left 2 Cols: Member Profile and Credentials */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <span className="font-mono text-xs uppercase text-[#1c1c1c]/50 tracking-wider">
              Organization Member
            </span>
            <h3 className="font-serif text-2xl font-normal text-[#1c1c1c] tracking-tight">
              {memberName}
            </h3>
            <span className="font-mono text-xs text-[#5F3F56] block mt-0.5">
              {userEmail} · Role: {role}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-[#e5e4de]">
            <div>
              <span className="font-mono text-[10px] uppercase text-[#1c1c1c]/50 block">
                Member ID
              </span>
              <span className="font-mono text-xs font-semibold text-[#1c1c1c] block mt-0.5">
                {memberCode}
              </span>
            </div>

            <div>
              <span className="font-mono text-[10px] uppercase text-[#1c1c1c]/50 block">
                Issued Date
              </span>
              <span className="font-mono text-xs text-[#1c1c1c] block mt-0.5">
                {startDate}
              </span>
            </div>

            <div>
              <span className="font-mono text-[10px] uppercase text-[#1c1c1c]/50 block">
                Valid Through
              </span>
              <span className="font-mono text-xs font-medium text-[#1c1c1c] block mt-0.5">
                {expiryDate}
              </span>
            </div>
          </div>
        </div>

        {/* Right Col: QR Pass / Verification Matrix */}
        <div className="flex flex-col items-center justify-center p-4 bg-white/70 border border-[#e5e4de] relative text-center">
          {/* QR Code SVG / Technical Representation */}
          <div className={`p-2 bg-white border border-[#e5e4de] inline-block ${!isActive ? 'opacity-40 grayscale blur-[1px]' : ''}`}>
            <svg
              className="w-24 h-24"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="100" height="100" fill="#ffffff" />
              {/* Corner squares */}
              <rect x="10" y="10" width="24" height="24" fill="#1c1c1c" />
              <rect x="14" y="14" width="16" height="16" fill="#ffffff" />
              <rect x="18" y="18" width="8" height="8" fill="#1c1c1c" />

              <rect x="66" y="10" width="24" height="24" fill="#1c1c1c" />
              <rect x="70" y="14" width="16" height="16" fill="#ffffff" />
              <rect x="74" y="18" width="8" height="8" fill="#1c1c1c" />

              <rect x="10" y="66" width="24" height="24" fill="#1c1c1c" />
              <rect x="14" y="70" width="16" height="16" fill="#ffffff" />
              <rect x="18" y="74" width="8" height="8" fill="#1c1c1c" />

              {/* Data pattern blocks */}
              <rect x="42" y="12" width="6" height="6" fill="#5F3F56" />
              <rect x="52" y="12" width="6" height="6" fill="#1c1c1c" />
              <rect x="42" y="24" width="6" height="6" fill="#1c1c1c" />
              <rect x="48" y="32" width="6" height="6" fill="#5F3F56" />
              <rect x="12" y="44" width="6" height="6" fill="#1c1c1c" />
              <rect x="24" y="44" width="6" height="6" fill="#1c1c1c" />
              <rect x="36" y="44" width="6" height="6" fill="#5F3F56" />
              <rect x="48" y="44" width="6" height="6" fill="#1c1c1c" />
              <rect x="60" y="44" width="6" height="6" fill="#1c1c1c" />
              <rect x="72" y="44" width="6" height="6" fill="#5F3F56" />
              <rect x="84" y="44" width="6" height="6" fill="#1c1c1c" />
              <rect x="42" y="66" width="6" height="6" fill="#1c1c1c" />
              <rect x="54" y="74" width="6" height="6" fill="#5F3F56" />
              <rect x="66" y="66" width="6" height="6" fill="#1c1c1c" />
              <rect x="78" y="78" width="6" height="6" fill="#1c1c1c" />
            </svg>
          </div>

          <span className="font-mono text-[10px] uppercase text-[#1c1c1c]/60 mt-2 block tracking-wider">
            {isActive ? 'Scan For Fast Check-in' : 'Pass Inactive'}
          </span>
        </div>
      </div>

      {/* Bottom Security Footer */}
      <div className="mt-5 pt-3 border-t border-[#e5e4de] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-[#1c1c1c]/60 gap-2">
        <span>SKYLINE STUDENT ORGANIZATION · OFFICIAL SYSTEM</span>
        <span className="tracking-widest uppercase">SEC-AUTH-{memberCode.slice(-6)}</span>
      </div>
    </div>
  );
};

export default MemberPassCard;
