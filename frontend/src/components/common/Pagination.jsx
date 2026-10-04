import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

/**
 * Universal Production-Grade Pagination Component
 *
 * @param {Object} props
 * @param {number} props.page - Current active 1-indexed page
 * @param {number} props.pageSize - Number of items per page
 * @param {number} props.totalItems - Total count of records across dataset
 * @param {number} [props.totalPages] - Total pages (computed if not provided)
 * @param {Function} props.onPageChange - Callback when user navigates page (newPage: number)
 * @param {Function} [props.onPageSizeChange] - Callback when user changes page size (newSize: number)
 * @param {number[]} [props.pageSizeOptions=[10, 20, 50]] - Available page sizes
 * @param {boolean} [props.loading=false] - Whether data is actively loading
 * @param {boolean} [props.showPageSize=true] - Whether to show the page size selector
 * @param {boolean} [props.showInfo=true] - Whether to display "Showing X-Y of Z results"
 * @param {string} [props.className=''] - Additional custom CSS classes
 * @param {boolean} [props.compact=false] - Compact mode for narrow panels
 */
export default function Pagination({
  page: propPage,
  currentPage: propCurrentPage,
  pageSize: propPageSize,
  limit: propLimit,
  totalItems: propTotalItems,
  total: propTotal,
  totalPages: propTotalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  loading = false,
  showPageSize = true,
  showInfo = true,
  className = '',
  compact = false,
}) {
  const rawPage = propCurrentPage !== undefined ? propCurrentPage : (propPage !== undefined ? propPage : 1);
  const rawTotal = propTotalItems !== undefined ? propTotalItems : (propTotal !== undefined ? propTotal : 0);
  const rawPageSize = propPageSize !== undefined ? propPageSize : (propLimit !== undefined ? propLimit : 20);

  const safeTotal = Math.max(0, parseInt(rawTotal, 10) || 0);
  const safePageSize = Math.max(1, parseInt(rawPageSize, 10) || 20);
  const totalPages =
    propTotalPages !== undefined
      ? Math.max(1, parseInt(propTotalPages, 10) || 1)
      : Math.max(1, Math.ceil(safeTotal / safePageSize));

  const currentPage = Math.min(Math.max(1, parseInt(rawPage, 10) || 1), totalPages);

  // If there are no items and only 1 empty page, don't show controls if compact or optionally show 0 results
  const from = safeTotal === 0 ? 0 : (currentPage - 1) * safePageSize + 1;
  const to = Math.min(currentPage * safePageSize, safeTotal);

  const canGoPrevious = currentPage > 1 && !loading;
  const canGoNext = currentPage < totalPages && !loading;

  const handlePageClick = (p) => {
    if (loading || p < 1 || p > totalPages || p === currentPage) return;
    if (typeof onPageChange === 'function') {
      onPageChange(p);
    }
  };

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    if (!isNaN(newSize) && typeof onPageSizeChange === 'function') {
      onPageSizeChange(newSize);
    }
  };

  /**
   * Generates page window array with ellipses
   * e.g. [1, '...', 4, 5, 6, '...', 15]
   */
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const showLeftEllipsis = currentPage > 4;
    const showRightEllipsis = currentPage < totalPages - 3;

    if (!showLeftEllipsis && showRightEllipsis) {
      // Near start
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (showLeftEllipsis && !showRightEllipsis) {
      // Near end
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      // In middle
      pages.push(1);
      pages.push('...');
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  // If there are zero items, render friendly empty pagination info
  if (safeTotal === 0) {
    return (
      <div
        className={`flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-500 ${className}`}
      >
        <span>No matching records found</span>
      </div>
    );
  }

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-xs transition-all ${className}`}
    >
      {/* Left: Results Info & Page Size */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700 w-full sm:w-auto justify-between sm:justify-start">
        {showInfo && (
          <div className="font-medium text-slate-800">
            Showing <span className="font-semibold text-black">{from}</span> to{' '}
            <span className="font-semibold text-black">{to}</span> of{' '}
            <span className="font-semibold text-black">{safeTotal}</span> results
          </div>
        )}

        {showPageSize && onPageSizeChange && !compact && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 pl-1 border-l border-slate-200">
            <span>Per page:</span>
            <select
              value={safePageSize}
              onChange={handlePageSizeChange}
              disabled={loading}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-md px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 cursor-pointer transition-colors"
              aria-label="Records per page"
            >
              {Array.from(new Set([...pageSizeOptions, safePageSize]))
                .sort((a, b) => a - b)
                .map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Navigation Controls */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
        {/* First Page */}
        {!compact && totalPages > 4 && (
          <button
            type="button"
            onClick={() => handlePageClick(1)}
            disabled={!canGoPrevious}
            title="First Page"
            aria-label="Go to first page"
            className="p-1.5 text-slate-600 hover:text-black hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={!canGoPrevious}
          aria-label="Previous page"
          className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:text-black hover:bg-slate-100 rounded-lg border border-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Prev</span>
        </button>

        {/* Numbered Page Buttons */}
        {!compact && (
          <div className="hidden sm:flex items-center gap-1 px-1">
            {getPageNumbers().map((item, idx) => {
              if (item === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 py-1 text-sm text-slate-400 select-none"
                  >
                    …
                  </span>
                );
              }

              const isCurrent = item === currentPage;
              return (
                <button
                  key={`page-${item}`}
                  type="button"
                  onClick={() => handlePageClick(item)}
                  disabled={loading}
                  aria-current={isCurrent ? 'page' : undefined}
                  aria-label={`Page ${item}`}
                  className={`min-w-[32px] h-8 px-2 text-sm font-medium rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-black'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile current page indicator if compact or small screen */}
        {(compact || totalPages > 1) && (
          <span className="sm:hidden px-2 text-xs font-medium text-slate-600">
            {currentPage} / {totalPages}
          </span>
        )}

        {/* Next Page */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={!canGoNext}
          aria-label="Next page"
          className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:text-black hover:bg-slate-100 rounded-lg border border-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <span className="hidden xs:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        {!compact && totalPages > 4 && (
          <button
            type="button"
            onClick={() => handlePageClick(totalPages)}
            disabled={!canGoNext}
            title="Last Page"
            aria-label="Go to last page"
            className="p-1.5 text-slate-600 hover:text-black hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </nav>
  );
}
