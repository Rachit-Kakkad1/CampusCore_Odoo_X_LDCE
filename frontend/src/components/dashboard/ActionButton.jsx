// frontend/src/components/dashboard/ActionButton.jsx
import React from 'react';

/**
 * ActionButton Component
 * Clean professional button with clear contrast and readable typography.
 *
 * @param {Object} props
 * @param {'primary'|'secondary'|'outline'|'danger'|'ghost'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.isLoading=false]
 * @param {boolean} [props.disabled=false]
 * @param {React.ElementType} [props.icon]
 * @param {'left'|'right'} [props.iconPosition='left']
 * @param {Function} [props.onClick]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export const ActionButton = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  onClick,
  children,
  type = 'button',
  className = '',
}) => {
  // Sizing styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 font-semibold',
    md: 'px-4 py-2 text-sm gap-2 font-semibold',
    lg: 'px-6 py-3 text-base gap-2.5 font-semibold',
  };

  // Variant styles
  const variantStyles = {
    primary:
      'bg-primary text-white border border-primary hover:bg-primary-hover shadow-xs',
    secondary:
      'bg-white text-slate-800 border border-border hover:bg-slate-50 hover:text-slate-900 shadow-2xs',
    outline:
      'bg-transparent text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400',
    danger:
      'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300',
    ghost:
      'bg-transparent text-slate-600 border border-transparent hover:text-slate-900 hover:bg-slate-100',
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center rounded-sm select-none transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:pointer-events-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {isLoading ? (
        <>
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" />}
        </>
      )}
    </button>
  );
};

export default ActionButton;
