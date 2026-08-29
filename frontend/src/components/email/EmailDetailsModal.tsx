import React from 'react';
import { Modal } from '../ui/Modal';
import { Email } from '../../types/email';
import { EmailStatusBadge } from './EmailStatusBadge';
import { Mail, AlertCircle } from 'lucide-react';

export interface EmailDetailsModalProps {
  email: Email | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EmailDetailsModal: React.FC<EmailDetailsModalProps> = ({
  email,
  isOpen,
  onClose,
}) => {
  if (!email) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Email Delivery Details" size="md">
      <div className="flex flex-col gap-5 pb-2 text-sm text-dark-200">
        
        {/* Recipient / Sender Info */}
        <div className="grid grid-cols-2 gap-4 bg-dark-900/40 p-4 border border-dark-850 rounded-lg">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-dark-400 block mb-1">
              Recipient Email
            </span>
            <div className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-brand-400" />
              <span className="font-semibold text-white truncate">{email.recipient}</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-dark-400 block mb-1">
              Delivery Status
            </span>
            <EmailStatusBadge status={email.status} />
          </div>
        </div>

        {/* Timestamps & Attempts */}
        <div className="grid grid-cols-3 gap-3 bg-dark-900/10 border border-dark-850/50 p-4 rounded-lg text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-dark-400 block mb-1">
              Scheduled
            </span>
            <span className="font-medium text-white">{new Date(email.scheduledAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-dark-400 block mb-1">
              Processed
            </span>
            <span className="font-medium text-white">
              {email.sentAt ? new Date(email.sentAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-dark-400 block mb-1">
              Retries / Attempts
            </span>
            <span className="font-semibold text-white">{email.attempts} / 3</span>
          </div>
        </div>

        {/* Message Content */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-dark-400">
            Subject Line
          </span>
          <div className="px-3.5 py-2.5 bg-dark-900/30 border border-dark-850 rounded-lg text-white font-medium">
            {email.subject}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-dark-400">
            Body Message
          </span>
          <div className="px-3.5 py-3 bg-dark-900/30 border border-dark-850 rounded-lg text-dark-200 leading-relaxed font-mono text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
            {email.body}
          </div>
        </div>

        {/* Server & SMTP identifiers */}
        <div className="flex flex-col gap-2 text-xs">
          {email.messageId && (
            <div className="flex items-center justify-between p-2.5 bg-dark-900/20 border border-dark-850/60 rounded">
              <span className="text-dark-400 font-medium">SMTP Message ID</span>
              <span className="font-mono text-white select-text truncate max-w-[280px]">
                {email.messageId}
              </span>
            </div>
          )}

          {email.bullJobId && (
            <div className="flex items-center justify-between p-2.5 bg-dark-900/20 border border-dark-850/60 rounded">
              <span className="text-dark-400 font-medium">Queue Job ID</span>
              <span className="font-mono text-white select-text">
                {email.bullJobId}
              </span>
            </div>
          )}

          {email.errorMessage && (
            <div className="flex flex-col gap-1 p-3 bg-red-950/20 border border-red-900/30 rounded">
              <span className="text-red-400 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Latest SMTP Processing Error
              </span>
              <p className="text-red-300 font-mono text-[11px] leading-relaxed select-text mt-1">
                {email.errorMessage}
              </p>
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
};
