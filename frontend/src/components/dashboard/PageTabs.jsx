// frontend/src/components/dashboard/PageTabs.jsx
import React from 'react';

/**
 * PageTabs Component
 * Minimalist horizontal tab bar for switching sub-views within dashboards.
 *
 * @param {Object} props
 * @param {Array<{ id: string, label: string, icon?: React.ElementType, badge?: string|number }>} props.tabs
 * @param {string} props.activeTab - Currently selected tab id
 * @param {Function} props.onChange - Tab change handler (id: string) => void
 * @param {string} [props.className]
 */
export const PageTabs = ({ tabs = [], activeTab, onChange, className = '' }) => {
  return (
    <div className={`border-b border-border flex items-center gap-2 overflow-x-auto select-none ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange && onChange(tab.id)}
            className={`flex items-center gap-2.5 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.25em] border-b-2 -mb-[1px] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap focus:outline-none ${
              isActive
                ? 'border-primary text-foreground font-semibold bg-hover/50'
                : 'border-transparent text-muted hover:text-foreground hover:border-border'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`ml-1 px-1.5 py-0.5 text-[8px] font-mono border ${
                  isActive
                    ? 'border-primary/40 bg-primary text-white'
                    : 'border-border text-muted'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PageTabs;
