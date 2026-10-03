// frontend/src/components/dashboard/DataRow.jsx
import React from 'react';

/**
 * DataRow Component
 * Structured key-value row display for details, summaries, orders, tickets, and accounts.
 *
 * @param {Object} props
 * @param {string} props.label - Key/Field label (Space Mono, uppercase)
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
        borderBottom ? 'border-b border-border/80' : ''
      } ${className}`}
    >
      <div className="space-y-0.5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          {label}
        </div>
        {sublabel && (
          <div className="font-sans text-xs text-muted/80">
            {sublabel}
          </div>
        )}
      </div>

      <div className="font-sans text-sm text-foreground font-medium sm:text-right">
        {value}
      </div>
    </div>
  );
};

export default DataRow;
