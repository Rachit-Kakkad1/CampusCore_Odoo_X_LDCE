// frontend/src/components/dashboard/DashboardSection.jsx
import React from 'react';

/**
 * DashboardSection Component
 * Structured container with 1px border, professional section header, and content area.
 *
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} [props.subtitle] - Section subtitle
 * @param {React.ReactNode} [props.action] - Header action (button / link)
 * @param {React.ReactNode} props.children - Section body
 */
export const DashboardSection = ({ title, subtitle, action, children, className = '' }) => {
  return (
    <div className={`border border-border bg-white p-6 sm:p-8 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-border">
        <div>
          <h2 className="text-xl sm:text-2xl text-slate-900 font-bold tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-slate-600 mt-1 font-normal">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div>
            {action}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};

export default DashboardSection;
