// frontend/src/components/dashboard/DashboardList.jsx
import React from 'react';

/**
 * DashboardList Component
 * Data-driven vertical list presentation for announcements, tasks, activity, and tickets.
 *
 * @param {Object} props
 * @param {Array<Object>} props.items
 * @param {(item: any, index: number) => React.ReactNode} props.renderItem
 * @param {string} [props.keyField='id']
 * @param {string} [props.emptyMessage='No items in this list.']
 * @param {string} [props.className]
 */
export const DashboardList = ({
  items = [],
  renderItem,
  keyField = 'id',
  emptyMessage = 'No items in this list.',
  className = '',
}) => {
  if (items.length === 0) {
    return (
      <div className="border border-border p-8 text-center font-mono text-xs text-muted bg-background">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`border border-border bg-background divide-y divide-border ${className}`}>
      {items.map((item, index) => {
        const itemKey = item[keyField] !== undefined ? item[keyField] : index;
        return (
          <div
            key={itemKey}
            className="p-5 transition-colors duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-hover"
          >
            {renderItem(item, index)}
          </div>
        );
      })}
    </div>
  );
};

export default DashboardList;
