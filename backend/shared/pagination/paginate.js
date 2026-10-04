/**
 * Standard Production-Grade Pagination Utility for Backend.
 * Validates pagination inputs and formats consistent pagination contracts.
 */

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

/**
 * Validates and sanitizes pagination query parameters.
 * Rejects negative/zero or out-of-range bounds safely.
 *
 * @param {Object} query - Express req.query
 * @param {Object} options - Override defaults
 * @param {number} [options.defaultPageSize=20]
 * @param {number} [options.maxPageSize=100]
 * @param {Array<string>} [options.allowedSortFields=[]]
 * @param {string} [options.defaultSort='id']
 * @param {string} [options.defaultSortDirection='DESC']
 * @returns {{ page: number, pageSize: number, limit: number, offset: number, sort: string, sortDirection: 'ASC'|'DESC' }}
 */
function parsePaginationParams(query = {}, options = {}) {
  const defaultPageSize = options.defaultPageSize || DEFAULT_PAGE_SIZE;
  const maxPageSize = options.maxPageSize || MAX_PAGE_SIZE;
  const allowedSort = options.allowedSortFields || [];
  const defaultSort = options.defaultSort || 'id';
  const defaultSortDirection = options.defaultSortDirection || 'DESC';

  const rawPage = query.page !== undefined ? query.page : 1;
  const rawPageSize = query.pageSize !== undefined ? query.pageSize : (query.limit !== undefined ? query.limit : defaultPageSize);

  const page = parseInt(rawPage, 10);
  const pageSize = parseInt(rawPageSize, 10);

  if (isNaN(page) || page < 1) {
    const err = new Error('Page must be a positive integer greater than or equal to 1');
    err.code = 'INVALID_PAGE';
    err.status = 400;
    throw err;
  }

  if (isNaN(pageSize) || pageSize < 1) {
    const err = new Error('Page size must be a positive integer greater than or equal to 1');
    err.code = 'INVALID_PAGE_SIZE';
    err.status = 400;
    throw err;
  }

  if (pageSize > maxPageSize) {
    const err = new Error(`Page size exceeds maximum allowed limit of ${maxPageSize}`);
    err.code = 'PAGE_SIZE_EXCEEDED';
    err.status = 400;
    throw err;
  }

  // Safe sorting allowlist validation
  let sort = defaultSort;
  if (query.sort && typeof query.sort === 'string') {
    const requestedSort = query.sort.trim().toLowerCase();
    if (allowedSort.length > 0) {
      const matched = allowedSort.find(f => f.toLowerCase() === requestedSort);
      if (!matched) {
        const err = new Error(`Invalid sort field '${query.sort}'. Allowed: ${allowedSort.join(', ')}`);
        err.code = 'INVALID_SORT_FIELD';
        err.status = 400;
        throw err;
      }
      sort = matched;
    } else {
      sort = requestedSort;
    }
  }

  let sortDirection = defaultSortDirection;
  if (query.sortDirection && typeof query.sortDirection === 'string') {
    const dir = query.sortDirection.trim().toUpperCase();
    if (dir !== 'ASC' && dir !== 'DESC') {
      const err = new Error("Sort direction must be either 'ASC' or 'DESC'");
      err.code = 'INVALID_SORT_DIRECTION';
      err.status = 400;
      throw err;
    }
    sortDirection = dir;
  }

  const offset = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    limit: pageSize,
    offset,
    sort,
    sortDirection,
  };
}

/**
 * Builds the standard pagination metadata response contract.
 *
 * @param {Array} data - Array of records for current page
 * @param {number} totalItems - Total count of matching records
 * @param {number} page - Current 1-based page number
 * @param {number} pageSize - Records per page
 * @returns {{ data: Array, pagination: { page: number, pageSize: number, totalItems: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean }, success: boolean }}
 */
function buildPaginationResponse(data = [], totalItems = 0, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const total = Math.max(0, parseInt(totalItems, 10) || 0);
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);

  return {
    success: true,
    data,
    pagination: {
      page: currentPage,
      pageSize,
      totalItems: total,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
    // Backwards compatibility aliases for existing endpoints
    count: data.length,
    page: currentPage,
    limit: pageSize,
    total,
    totalPages,
  };
}

module.exports = {
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  parsePaginationParams,
  buildPaginationResponse,
};
