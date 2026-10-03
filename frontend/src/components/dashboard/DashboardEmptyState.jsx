// frontend/src/components/dashboard/DashboardEmptyState.jsx
import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * DashboardEmptyState Component
 * Clean professional empty state container for blank tables, queues, or catalogs.
 *
 * @param {Object} props
 * @param {string} props.title - Empty state title
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
      className={`border border-border bg-white p-12 flex flex-col items-center justify-center text-center space-y-4 shadow-sm ${className}`}
    >
      <div className="w-12 h-12 border border-border flex items-center justify-center bg-slate-50 text-slate-600 rounded-sm">
        <Icon className="w-6 h-6" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-lg font-bold text-slate-900">
          {title}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed font-normal">
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
