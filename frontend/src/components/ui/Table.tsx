import React from 'react';

export interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ headers, children, className = '' }) => {
  return (
    <div className={`w-full overflow-x-auto rounded-lg border border-dark-800/60 bg-dark-900/25 ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-dark-800/80 bg-dark-900/60 text-xs font-semibold uppercase tracking-wider text-dark-300">
            {headers.map((header, idx) => (
              <th key={idx} className="px-5 py-3.5">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-800/40 text-sm text-dark-100">
          {children}
        </tbody>
      </table>
    </div>
  );
};
