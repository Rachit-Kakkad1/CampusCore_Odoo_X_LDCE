// frontend/src/components/dashboard/DashboardErrorState.jsx
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import ActionButton from './ActionButton';

/**
 * DashboardErrorState Component
 * Clean error container with retry action support for failed API requests.
 *
 * @param {Object} props
 * @param {string} [props.title='Unable to Load Data']
 * @param {string} [props.message='An error occurred while connecting to the server. Please verify your connection or permissions.']
 * @param {Function} [props.onRetry]
 * @param {string} [props.className]
 */
export const DashboardErrorState = ({
  title = 'Unable to Load Data',
  message = 'An error occurred while connecting to the server. Please verify your connection or permissions.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`border border-foreground/30 bg-background p-8 flex flex-col items-center justify-center text-center space-y-4 ${className}`}
    >
      <div className="w-10 h-10 border border-foreground/30 flex items-center justify-center bg-hover text-foreground">
        <AlertCircle className="w-5 h-5" />
      </div>

      <div className="space-y-1 max-w-md">
        <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted">
          System Notice
        </div>
        <h3 className="font-serif text-lg text-foreground uppercase tracking-tight">
          {title}
        </h3>
        <p className="font-sans text-xs text-muted leading-relaxed">
          {message}
        </p>
      </div>

      {onRetry && (
        <div className="pt-2">
          <ActionButton
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={onRetry}
          >
            Retry Request
          </ActionButton>
        </div>
      )}
    </div>
  );
};

export default DashboardErrorState;
