// frontend/src/components/dashboard/DashboardEmptyState.jsx
import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * DashboardEmptyState Component
 * Clean editorial empty state container for blank tables, queues, or catalogs.
 *
 * @param {Object} props
 * @param {string} props.title - Empty state title (Playfair Display)
 * @param {string} props.description - Explanatory message
 * @param {React.ElementType} [props.icon=Inbox] - Icon component
 * @param {React.ReactNode} [props.action] - Optional ActionButton
 * @param {string} [props.className]
 */
export const DashboardEmptyState = ({
  title = 'No Records Available',
  description = 'There is currently no data to display for this section.',
  icon: Icon = Inbox,
  action,
  className = '',
}) => {
  return (
    <div
      className={`border border-border bg-background p-12 flex flex-col items-center justify-center text-center space-y-4 ${className}`}
    >
      <div className="w-12 h-12 border border-border flex items-center justify-center bg-hover text-muted">
        <Icon className="w-5 h-5" />
      </div>

      <div className="space-y-1 max-w-sm">
        <h3 className="font-serif text-lg sm:text-xl text-foreground uppercase tracking-tight">
          {title}
        </h3>
        <p className="font-sans text-xs text-muted leading-relaxed">
          {description}
        </p>
      </div>

      {action && (
        <div className="pt-2">
          {action}
        </div>
      )}
    </div>
  );
};

export default DashboardEmptyState;
