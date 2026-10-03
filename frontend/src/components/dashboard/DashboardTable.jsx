// frontend/src/components/dashboard/DashboardTable.jsx
import React from 'react';

/**
 * DashboardTable Component
 * Data-driven, crisp bordered tabular data presentation with high contrast.
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
    <div className={`w-full overflow-x-auto border border-border bg-white shadow-sm ${className}`}>
      <table className="w-full text-left border-collapse">
        {/* Table Header */}
        <thead>
          <tr className="border-b border-border bg-slate-50">
            {columns.map((col, index) => (
              <th
                key={col.key || index}
                style={{ width: col.width }}
                className={`py-3.5 px-5 text-xs uppercase tracking-wider text-slate-700 font-bold ${
                  alignClass[col.align || 'left']
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-border">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 px-6 text-center text-sm font-medium text-slate-600"
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
                  className={`transition-colors duration-200 ${
                    isClickable
                      ? 'cursor-pointer hover:bg-slate-50'
                      : 'hover:bg-slate-50/70'
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
                        className={`py-4 px-5 text-sm text-slate-800 font-normal ${
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
