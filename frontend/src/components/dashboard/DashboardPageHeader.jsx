// frontend/src/components/dashboard/DashboardPageHeader.jsx
import React from 'react';

/**
 * DashboardPageHeader Component
 * Clean professional page header for all role dashboards with high contrast.
 *
 * @param {Object} props
 * @param {string} props.title - Main title
 * @param {string} [props.subtitle] - Descriptive subtitle
 * @param {string} [props.badge] - Category or status tag
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
    <div className={`border-b border-border pb-6 mb-8 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wider text-slate-500 font-semibold">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span>/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-slate-900 transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-slate-900">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          {badge && (
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-border bg-white shadow-2xs rounded-xs">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs uppercase tracking-wider font-bold text-slate-800">
                {badge}
              </span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm sm:text-base text-slate-600 font-normal max-w-3xl">
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
