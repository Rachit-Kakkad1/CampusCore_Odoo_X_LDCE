// frontend/src/components/dashboard/DashboardTable.jsx
import React from 'react';

/**
 * DashboardTable Component
 * Supports two usage patterns:
 *   1. Legacy: headers (string[]) + children (<tr> elements rendered directly)
 *   2. Column-driven: columns ([{key,header,render}]) + data ([])
 */
export const DashboardTable = ({
  // Legacy pattern
  headers,
  children,
  // Column-driven pattern
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

  // ── Legacy mode: headers[] + children ──────────────────────────────────────
  if (headers && Array.isArray(headers)) {
    return (
      <div className={`w-full overflow-x-auto border border-border bg-white shadow-sm ${className}`}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-slate-50">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="py-3.5 px-5 text-xs uppercase tracking-wider text-slate-700 font-bold text-left"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {children}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Column-driven mode: columns[] + data[] ─────────────────────────────────
  return (
    <div className={`w-full overflow-x-auto border border-border bg-white shadow-sm ${className}`}>
      <table className="w-full text-left border-collapse">
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
