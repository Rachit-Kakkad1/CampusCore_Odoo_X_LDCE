// frontend/src/components/dashboard/member/MemberAnnouncementSection.jsx
import React from 'react';
import { DashboardSection } from '../DashboardSection';
import { DashboardEmptyState } from '../DashboardEmptyState';

export const MemberAnnouncementSection = ({
  announcements = [],
  loading = false,
}) => {
  if (loading) {
    return (
      <DashboardSection
        title="Official Announcements"
        subtitle="Important organization notices, semester updates & assembly bulletins"
      >
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-[#f7f6f2] border border-[#e5e4de] animate-pulse"></div>
          ))}
        </div>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      title="Official Announcements"
      subtitle="Important organization notices, semester updates & assembly bulletins"
    >
      {announcements.length === 0 ? (
        <DashboardEmptyState
          title="No Announcements"
          description="There are currently no active announcements from the organization board."
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => {
            const postDate = item.created_at
              ? new Date(item.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Recent';

            return (
              <div
                key={item.id}
                className="bg-[#f7f6f2] border border-[#e5e4de] p-5 relative space-y-2 hover:border-[#5F3F56]/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#e5e4de]">
                  <h3 className="font-serif text-xl text-[#1c1c1c] tracking-tight">
                    {item.title}
                  </h3>
                  <span className="font-mono text-xs text-[#1c1c1c]/50">
                    {postDate}
                  </span>
                </div>

                <p className="font-sans text-sm text-[#1c1c1c]/80 leading-relaxed pt-1">
                  {item.body}
                </p>

                <div className="pt-2 flex items-center gap-2 font-mono text-[10px] text-[#5F3F56] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-[#5F3F56]"></span>
                  <span>Skyline Executive Board Notice</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardSection>
  );
};

export default MemberAnnouncementSection;
