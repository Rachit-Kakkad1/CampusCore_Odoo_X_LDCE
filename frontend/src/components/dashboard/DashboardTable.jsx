// frontend/src/components/dashboard/DashboardTable.jsx
import React from 'react';

/**
 * DashboardTable Component
 * Data-driven, 1px bordered tabular data presentation for ledgers, rosters, inventory, and orders.
 *
 * @param {Object} props
 * @param {Array<{ key: string, header: string, render?: (row: any) => React.ReactNode, align?: 'left'|'center'|'right', width?: string }>} props.columns
 * @param {Array<Object>} props.data
 * @param {string} [props.keyField='id']
 * @param {string} [props.emptyMessage='No records found.']
 * @param {Function} [props.onRowClick]
 * @param {string} [props.className]
 */
export const DashboardTable = ({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No records found.',
  onRowClick,
  className = '',
}) => {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={`w-full overflow-x-auto border border-border bg-background ${className}`}>
      <table className="w-full text-left border-collapse">
        {/* Table Header */}
        <thead>
          <tr className="border-b border-border bg-background">
            {columns.map((col, index) => (
              <th
                key={col.key || index}
                style={{ width: col.width }}
                className={`py-3.5 px-5 font-mono text-[9px] uppercase tracking-[0.25em] text-muted font-medium ${
                  alignClass[col.align || 'left']
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-border/80">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 px-6 text-center font-mono text-xs text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => {
              const rowKey = row[keyField] !== undefined ? row[keyField] : rowIndex;
              const isClickable = Boolean(onRowClick);

              return (
                <tr
                  key={rowKey}
                  onClick={() => isClickable && onRowClick(row)}
                  className={`transition-colors duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isClickable
                      ? 'cursor-pointer hover:bg-hover'
                      : 'hover:bg-hover/40'
                  }`}
                >
                  {columns.map((col, colIndex) => {
                    const cellContent = col.render
                      ? col.render(row)
                      : row[col.key] !== undefined
                      ? row[col.key]
                      : '—';

                    return (
                      <td
                        key={col.key || colIndex}
                        className={`py-4 px-5 font-sans text-xs text-foreground ${
                          alignClass[col.align || 'left']
                        }`}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DashboardTable;
