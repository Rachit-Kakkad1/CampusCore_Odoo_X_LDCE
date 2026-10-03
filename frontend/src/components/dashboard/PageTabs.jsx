// frontend/src/components/dashboard/PageTabs.jsx
import React from 'react';

/**
 * PageTabs Component
 * Clean horizontal tab bar with high contrast for switching sub-views within dashboards.
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
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-[1px] transition-colors whitespace-nowrap focus:outline-none ${
              isActive
                ? 'border-primary text-slate-900 font-bold bg-slate-50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {Icon && <Icon className="w-4 h-4 text-slate-600" />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`ml-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-slate-200 text-slate-700'
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
