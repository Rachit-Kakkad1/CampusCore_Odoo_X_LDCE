// frontend/src/components/dashboard/ActionButton.jsx
import React from 'react';

/**
 * ActionButton Component
 * Editorial-tech button with Space Mono typography, 1px border, and sharp corners.
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
    sm: 'px-3 py-1.5 text-[9px] tracking-[0.2em] gap-1.5',
    md: 'px-5 py-2.5 text-[10px] tracking-[0.25em] gap-2',
    lg: 'px-8 py-3.5 text-[11px] tracking-[0.3em] gap-2.5',
  };

  // Variant styles
  const variantStyles = {
    primary:
      'bg-primary text-white border border-primary hover:bg-primary/90 hover:tracking-[0.3em]',
    secondary:
      'bg-background text-foreground border border-border hover:border-primary hover:text-primary hover:bg-hover',
    outline:
      'bg-transparent text-foreground border border-border hover:bg-hover hover:border-foreground',
    danger:
      'bg-background text-foreground border border-foreground/30 hover:border-foreground hover:bg-foreground hover:text-background',
    ghost:
      'bg-transparent text-muted border border-transparent hover:text-foreground hover:border-border',
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-mono uppercase font-medium select-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none disabled:opacity-40 disabled:pointer-events-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {isLoading ? (
        <>
          <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-3.5 h-3.5 shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-3.5 h-3.5 shrink-0" />}
        </>
      )}
    </button>
  );
};

export default ActionButton;
