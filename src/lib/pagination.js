/**
 * Generates an array of page numbers and ellipsis markers.
 *
 * @param {number} currentPage - Current active page (1-based)
 * @param {number} totalPages - Total count of pages
 * @param {number} siblingCount - Number of siblings on each side of currentPage in middle mode
 * @returns {Array<number|string>} Array of page numbers and dots (e.g. [1, 2, 3, 4, 5, 6, '...', 50])
 */
export function getPaginationRange(currentPage, totalPages, siblingCount = 1) {
  // If total pages is 7 or less, show all numbers without any dots
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Left dots are needed if currentPage is far enough from start (> 5)
  const shouldShowLeftDots = currentPage > 5;
  // Right dots are needed if currentPage is far enough from end (< totalPages - 4)
  const shouldShowRightDots = currentPage < totalPages - 4;

  const firstPageIndex = 1;
  const lastPageIndex = totalPages;

  // Case 1: At the beginning (Page 1..5) -> Show 1 2 3 4 5 6 ... [lastPage]
  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftRange = [1, 2, 3, 4, 5, 6];
    return [...leftRange, '...right', lastPageIndex];
  }

  // Case 2: At the end -> Show 1 ... [last 6 pages]
  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightStart = totalPages - 5;
    if (rightStart <= 2) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const rightRange = [];
    for (let i = rightStart; i <= totalPages; i++) {
      rightRange.push(i);
    }
    return [firstPageIndex, '...left', ...rightRange];
  }

  // Case 3: In the middle -> Show 1 ... [currentPage-1, currentPage, currentPage+1] ... [lastPage]
  if (shouldShowLeftDots && shouldShowRightDots) {
    const middleRange = [];
    const start = Math.max(currentPage - siblingCount, 2);
    const end = Math.min(currentPage + siblingCount, totalPages - 1);
    for (let i = start; i <= end; i++) {
      middleRange.push(i);
    }
    return [firstPageIndex, '...left', ...middleRange, '...right', lastPageIndex];
  }

  return Array.from({ length: totalPages }, (_, i) => i + 1);
}
