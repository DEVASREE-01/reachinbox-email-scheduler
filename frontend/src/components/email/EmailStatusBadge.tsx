import React from 'react';
import { EmailStatus } from '../../types/email';

export interface EmailStatusBadgeProps {
  status: EmailStatus;
}

export const EmailStatusBadge: React.FC<EmailStatusBadgeProps> = ({ status }) => {
  const configs = {
    SCHEDULED: {
      label: 'Scheduled',
      styles: 'bg-blue-500/10 text-blue-400 border border-blue-500/25',
    },
    PROCESSING: {
      label: 'Processing',
      styles: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25 animate-pulse',
    },
    SENT: {
      label: 'Sent',
      styles: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
    },
    FAILED: {
      label: 'Failed',
      styles: 'bg-rose-500/10 text-rose-400 border border-rose-500/25',
    },
    RATE_LIMITED: {
      label: 'Rate Limited',
      styles: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
    },
  };

  const config = configs[status] || {
    label: status,
    styles: 'bg-dark-500/10 text-dark-400 border border-dark-500/25',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${config.styles}`}>
      {config.label}
    </span>
  );
};
