'use client';

import React from 'react';
import { getPaginationRange } from '@/lib/pagination';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = '',
  siblingCount = 1,
}) {
  if (totalPages <= 1) return null;

  const paginationRange = getPaginationRange(currentPage, totalPages, siblingCount);

  return (
    <div
      className={`flex items-center justify-center gap-1.5 sm:gap-2 select-none ${className}`}
      role="navigation"
      aria-label="Pagination"
    >
      {/* Previous Button */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-200 text-primary transition-all duration-300 font-bold text-sm cursor-pointer select-none
          ${
            currentPage === 1
              ? 'opacity-40 cursor-not-allowed border-slate-100 text-slate-400'
              : 'hover:border-accent hover:bg-accent/5 hover:text-accent active:scale-95'
          }`}
        aria-label="Previous Page"
      >
        ←
      </button>

      {/* Page Numbers and Ellipses */}
      {paginationRange.map((page, idx) => {
        if (typeof page === 'string' && page.startsWith('...')) {
          const isLeft = page === '...left' || (page === '...' && idx < paginationRange.length / 2);
          const jumpTarget = isLeft
            ? Math.max(1, currentPage - 5)
            : Math.min(totalPages, currentPage + 5);

          return (
            <button
              key={`dots-${idx}`}
              type="button"
              onClick={() => onPageChange(jumpTarget)}
              title={isLeft ? 'Previous 5 pages' : 'Next 5 pages'}
              className="flex items-center justify-center w-8 h-9 sm:w-9 sm:h-10 text-slate-400 hover:text-accent transition-colors font-bold text-sm tracking-widest cursor-pointer rounded-full hover:bg-slate-100"
              aria-label={isLeft ? 'Jump back 5 pages' : 'Jump forward 5 pages'}
            >
              …
            </button>
          );
        }

        const pageNum = Number(page);
        const isActive = currentPage === pageNum;

        return (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border font-bold text-sm transition-all duration-300 cursor-pointer select-none
              ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-md hover:bg-primary/95'
                  : 'border-slate-200 text-primary hover:border-accent hover:bg-accent/5 hover:text-accent active:scale-95'
              }`}
          >
            {pageNum}
          </button>
        );
      })}

      {/* Next Button */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-200 text-primary transition-all duration-300 font-bold text-sm cursor-pointer select-none
          ${
            currentPage === totalPages
              ? 'opacity-40 cursor-not-allowed border-slate-100 text-slate-400'
              : 'hover:border-accent hover:bg-accent/5 hover:text-accent active:scale-95'
          }`}
        aria-label="Next Page"
      >
        →
      </button>
    </div>
  );
}
export { getPaginationRange };
