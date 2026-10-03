// frontend/src/components/dashboard/DataRow.jsx
import React from 'react';

/**
 * DataRow Component
 * Structured key-value row display for details, summaries, orders, tickets, and accounts.
 *
 * @param {Object} props
 * @param {string} props.label - Key/Field label
 * @param {React.ReactNode} props.value - Field value or component
 * @param {string} [props.sublabel] - Optional secondary helper text
 * @param {boolean} [props.borderBottom=true] - 1px bottom border divider
 * @param {string} [props.className]
 */
export const DataRow = ({
  label,
  value,
  sublabel,
  borderBottom = true,
  className = '',
}) => {
  return (
    <div
      className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
        borderBottom ? 'border-b border-border' : ''
      } ${className}`}
    >
      <div className="space-y-0.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          {label}
        </div>
        {sublabel && (
          <div className="text-xs text-slate-500">
            {sublabel}
          </div>
        )}
      </div>

      <div className="text-sm text-slate-900 font-semibold sm:text-right">
        {value}
      </div>
    </div>
  );
};

export default DataRow;
