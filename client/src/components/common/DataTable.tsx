import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  headerAlign?: 'right' | 'left' | 'center';
  cellAlign?: 'right' | 'left' | 'center';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading,
  onRowClick,
  emptyTitle = 'لا توجد سجلات',
  emptyDescription = 'لم يتم العثور على أي نتائج مطابقة.'
}: DataTableProps<T>) {
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-border shadow-sm p-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-border shadow-sm p-12">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden bg-white rounded-lg border border-border shadow-sm">
      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-max table-auto border-collapse text-right">
          <thead>
            <tr className="bg-primary-dark text-white text-sm font-semibold border-b border-border">
              {columns.map((col, idx) => {
                const alignClass = 
                  col.headerAlign === 'center' ? 'text-center' :
                  col.headerAlign === 'left' ? 'text-left' : 'text-right';
                
                return (
                  <th 
                    key={col.key || idx} 
                    className={`px-6 py-4 ${alignClass} font-semibold`}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-border text-sm text-text-primary">
            {data.map((row, rowIdx) => (
              <tr 
                key={row.id || rowIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors duration-150 ${
                  onRowClick ? 'cursor-pointer hover:bg-primary-dark/5 active:bg-primary-dark/10' : 'hover:bg-bg-light/40'
                }`}
              >
                {columns.map((col, colIdx) => {
                  const alignClass = 
                    col.cellAlign === 'center' ? 'text-center' :
                    col.cellAlign === 'left' ? 'text-left' : 'text-right';
                  
                  return (
                    <td 
                      key={col.key || colIdx} 
                      className={`px-6 py-4 ${alignClass}`}
                    >
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default DataTable;
