import React from 'react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange
}) => {
  if (totalPages <= 1) return null;

  // Generate range of page numbers
  const pages: number[] = [];
  const maxVisiblePages = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-border w-full">
      <div className="text-xs text-text-secondary select-none">
        الصفحة {currentPage} من أصل {totalPages}
      </div>
      
      <div className="flex gap-1.5 items-center select-none" dir="ltr">
        {/* Left Arrow (Next page in RTL, which is previous page number logically) */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-2"
        >
          &larr; السابق
        </Button>

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1 text-sm rounded-md font-semibold focus:outline-none transition-all duration-200 ${
              p === currentPage 
                ? 'bg-primary-dark text-white shadow-sm' 
                : 'border border-border hover:bg-primary-dark/5 text-text-primary'
            }`}
          >
            {p}
          </button>
        ))}

        {/* Right Arrow (Previous page in RTL, which is next page number logically) */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-2"
        >
          التالي &rarr;
        </Button>
      </div>
    </div>
  );
};
export default Pagination;
