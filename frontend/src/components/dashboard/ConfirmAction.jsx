// frontend/src/components/dashboard/ConfirmAction.jsx
import React from 'react';
import ActionButton from './ActionButton';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmAction Component
 * Modal dialog for confirming critical operational or financial transactions.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Visibility state
 * @param {string} props.title - Action title (Playfair Display)
 * @param {string} props.description - Explanatory warning/message
 * @param {string} [props.confirmLabel='Confirm'] - Confirmation button text
 * @param {string} [props.cancelLabel='Cancel'] - Dismiss button text
 * @param {'primary'|'danger'} [props.confirmVariant='primary']
 * @param {boolean} [props.isLoading=false]
 * @param {Function} props.onConfirm - Action handler
 * @param {Function} props.onCancel - Dismiss handler
 */
export const ConfirmAction = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-[2px]">
      <div className="w-full max-w-lg border border-border bg-background p-8 relative shadow-none animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-6 right-6 text-muted hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4 mb-6">
          <div className="p-2 border border-border bg-hover shrink-0">
            <AlertTriangle className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-serif text-xl text-foreground uppercase tracking-tight">
              {title}
            </h3>
            <p className="font-sans text-xs text-muted leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-border">
          <ActionButton
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </ActionButton>
          <ActionButton
            variant={confirmVariant}
            size="md"
            isLoading={isLoading}
            onClick={onConfirm}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default ConfirmAction;
