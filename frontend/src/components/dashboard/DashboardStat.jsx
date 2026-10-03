// frontend/src/components/dashboard/DashboardStat.jsx
import React from 'react';

/**
 * DashboardStat Component
 * Professional metric widget with high contrast and clean typography.
 *
 * @param {Object} props
 * @param {string} props.label - Metric label
 * @param {string|number} props.value - Numeric or text value
 * @param {string} [props.change] - Optional trend/status description
 * @param {string} [props.icon] - Optional icon
 */
export const DashboardStat = ({ label, value, change, icon: Icon }) => {
  return (
    <div className="border border-border bg-white p-6 shadow-sm transition-all duration-300 hover:border-slate-400 group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          {label}
        </span>
        {Icon && <Icon className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />}
      </div>
      <div className="text-3xl text-slate-900 font-bold tracking-tight mb-2">
        {value}
      </div>
      {change && (
        <div className="text-xs text-slate-600 font-medium">
          {change}
        </div>
      )}
    </div>
  );
};

export default DashboardStat;
