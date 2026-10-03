// frontend/src/components/dashboard/DashboardPageHeader.jsx
import React from 'react';

/**
 * DashboardPageHeader Component
 * Canonical page header for all role dashboards and nested operational views.
 *
 * @param {Object} props
 * @param {string} props.title - Editorial main title (Playfair Display)
 * @param {string} [props.subtitle] - Descriptive subtitle (Space Grotesk)
 * @param {string} [props.badge] - Technical uppercase tag (Space Mono)
 * @param {React.ReactNode} [props.actions] - Action buttons
 * @param {Array<{ label: string, href?: string }>} [props.breadcrumbs] - Optional breadcrumb path
 * @param {string} [props.className]
 */
export const DashboardPageHeader = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs = [],
  className = '',
}) => {
  return (
    <div className={`border-b border-border pb-8 mb-8 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span>/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          {badge && (
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-border bg-background">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground">
                {badge}
              </span>
            </div>
          )}
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground tracking-tight uppercase">
            {title}
          </h1>
          {subtitle && (
            <p className="font-sans text-sm sm:text-base text-muted max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPageHeader;
