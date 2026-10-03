// frontend/src/components/dashboard/DashboardSection.jsx
import React from 'react';

/**
 * DashboardSection Component
 * Structured container with 1px border, editorial section header, and content area.
 *
 * @param {Object} props
 * @param {string} props.title - Section title (Playfair Display)
 * @param {string} [props.subtitle] - Section subtitle (Space Grotesk)
 * @param {React.ReactNode} [props.action] - Header action (button / link)
 * @param {React.ReactNode} props.children - Section body
 */
export const DashboardSection = ({ title, subtitle, action, children, className = '' }) => {
  return (
    <div className={`border border-border bg-background p-6 sm:p-8 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-border">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl text-foreground uppercase tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="font-sans text-xs text-muted mt-1">
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
