// frontend/src/components/dashboard/DashboardLoadingState.jsx
import React from 'react';

/**
 * DashboardLoadingState Component
 * Technical loading indicator adhering to the editorial-tech design system.
 *
 * @param {Object} props
 * @param {string} [props.message='Synchronizing data...']
 * @param {number} [props.rows=3] - Optional skeleton rows count
 * @param {string} [props.className]
 */
export const DashboardLoadingState = ({
  message = 'Synchronizing data from ledger...',
  rows = 3,
  className = '',
}) => {
  return (
    <div className={`border border-border bg-background p-8 space-y-6 ${className}`}>
      {/* Loading Indicator Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground">
            {message}
          </span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
          Loading
        </span>
      </div>

      {/* Skeleton Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-10 border border-border/60 bg-hover/40 animate-pulse flex items-center px-4"
          >
            <div className="w-1/3 h-2 bg-border/80 rounded-[1px]" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardLoadingState;
