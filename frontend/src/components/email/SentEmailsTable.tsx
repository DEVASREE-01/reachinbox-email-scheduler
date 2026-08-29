import React from 'react';
import { Email } from '../../types/email';
import { Pagination } from '../../types/email';
import { Table } from '../ui/Table';
import { EmailStatusBadge } from './EmailStatusBadge';
import { EmptyState } from '../ui/EmptyState';
import { Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { Spinner } from '../ui/Spinner';

export interface SentEmailsTableProps {
  emails: Email[];
  isLoading: boolean;
  pagination: Pagination | null;
  onPageChange: (page: number) => void;
  onRowClick: (email: Email) => void;
}

export const SentEmailsTable: React.FC<SentEmailsTableProps> = ({
  emails,
  isLoading,
  pagination,
  onPageChange,
  onRowClick,
}) => {
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center glass-card rounded-xl">
        <div className="flex flex-col items-center gap-3 text-dark-400">
          <Spinner className="w-8 h-8 text-brand-500" />
          <span className="text-sm font-semibold">Loading sent history...</span>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <EmptyState
        icon={Send}
        title="No sent emails"
        description="Your sent history will appear here once scheduler jobs begin sending."
      />
    );
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-';
    const d = new Date(timeStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Table headers={['Recipient', 'Subject', 'Processed Time', 'Status']}>
        {emails.map((email) => (
          <tr
            key={email.id}
            onClick={() => onRowClick(email)}
            className="hover:bg-dark-900/40 cursor-pointer border-b border-dark-900/30 transition-all duration-150"
          >
            <td className="px-5 py-4 font-semibold text-white tracking-wide truncate max-w-[200px]">
              {email.recipient}
            </td>
            <td className="px-5 py-4 text-dark-200 truncate max-w-[250px]">
              {email.subject}
            </td>
            <td className="px-5 py-4 text-dark-300">
              {formatTime(email.sentAt || email.updatedAt)}
            </td>
            <td className="px-5 py-4">
              <EmailStatusBadge status={email.status} />
            </td>
          </tr>
        ))}
      </Table>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-dark-950/20 border border-dark-850 rounded-lg shrink-0">
          <span className="text-xs text-dark-400">
            Showing Page <strong className="text-white font-bold">{pagination.page}</strong> of{' '}
            <strong className="text-white font-bold">{pagination.totalPages}</strong> (
            {pagination.total} total items)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-dark-800 text-dark-400 hover:text-white hover:bg-dark-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-dark-800 text-dark-400 hover:text-white hover:bg-dark-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
