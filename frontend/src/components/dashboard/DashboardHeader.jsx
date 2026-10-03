// frontend/src/components/dashboard/DashboardHeader.jsx
import React from 'react';

/**
 * DashboardHeader Component
 * Standard editorial-tech header for dashboard views.
 *
 * @param {Object} props
 * @param {string} props.title - Editorial main title (Playfair Display)
 * @param {string} props.subtitle - Descriptive subtitle (Space Grotesk)
 * @param {string} [props.badge] - Technical uppercase tag (Space Mono)
 * @param {React.ReactNode} [props.actions] - Optional action buttons
 */
export const DashboardHeader = ({ title, subtitle, badge, actions }) => {
  return (
    <div className="border-b border-border pb-8 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div className="space-y-2">
        {badge && (
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-border bg-background">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground">
              {badge}
            </span>
          </div>
        )}
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground tracking-tight uppercase">
          {title}
        </h1>
        {subtitle && (
          <p className="font-sans text-sm sm:text-base text-muted max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;
