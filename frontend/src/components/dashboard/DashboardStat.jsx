// frontend/src/components/dashboard/DashboardStat.jsx
import React from 'react';

/**
 * DashboardStat Component
 * Minimalist, 1px bordered metric display widget with sharp corners.
 *
 * @param {Object} props
 * @param {string} props.label - Metric label (Space Mono, uppercase)
 * @param {string|number} props.value - Numeric or text value
 * @param {string} [props.change] - Optional trend/status description
 * @param {string} [props.icon] - Optional icon
 */
export const DashboardStat = ({ label, value, change, icon: Icon }) => {
  return (
    <div className="border border-border bg-background p-6 transition-colors duration-700 hover:bg-hover group">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted group-hover:text-foreground transition-colors">
          {label}
        </span>
        {Icon && <Icon className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />}
      </div>
      <div className="font-mono text-2xl sm:text-3xl text-foreground font-medium tracking-tight mb-2">
        {value}
      </div>
      {change && (
        <div className="font-sans text-xs text-muted">
          {change}
        </div>
      )}
    </div>
  );
};

export default DashboardStat;
