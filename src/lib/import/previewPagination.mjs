/**
 * Paginate import preview rows while keeping aggregate counts and validation
 * errors visible regardless of the current page.
 *
 * @template T
 * @param {Array<T>} rows
 * @param {number} page 1-based page number
 * @param {number} pageSize
 * @returns {{
 *   page: number;
 *   pageRows: Array<T>;
 *   totalPages: number;
 *   hasPrev: boolean;
 *   hasNext: boolean;
 *   start: number;
 *   end: number;
 * }}
 */
export function paginatePreviewRows(rows, page, pageSize = 25) {
  const totalRows = rows.length;
  const totalPages = totalRows === 0 ? 0 : Math.ceil(totalRows / pageSize);
  const safePage = totalPages === 0
    ? 1
    : Math.min(Math.max(page, 1), totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRows);
  const pageRows = rows.slice(startIndex, endIndex);

  return {
    page: safePage,
    pageRows,
    totalPages,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
    start: totalRows === 0 ? 0 : startIndex + 1,
    end: totalRows === 0 ? 0 : endIndex,
  };
}
