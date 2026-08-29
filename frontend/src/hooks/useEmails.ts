import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { EmailListResponse, Email } from '../types/email';

const defaultEmails: Email[] = [
  {
    id: 'e-1',
    campaignId: 'c-1',
    senderId: 's-1',
    recipient: 'john.doe@example.com',
    subject: 'Q3 Product Update Outreach',
    body: 'Hello John,\n\nI wanted to share our Q3 product updates...',
    scheduledAt: new Date(Date.now() + 15 * 60000).toISOString(),
    sentAt: null,
    status: 'SCHEDULED',
    attempts: 0,
    bullJobId: 'job-1',
    messageId: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'e-2',
    campaignId: 'c-1',
    senderId: 's-1',
    recipient: 'jane.smith@example.com',
    subject: 'Q3 Product Update Outreach',
    body: 'Hello Jane,\n\nI wanted to share our Q3 product updates...',
    scheduledAt: new Date(Date.now() + 30 * 60000).toISOString(),
    sentAt: null,
    status: 'PROCESSING',
    attempts: 1,
    bullJobId: 'job-2',
    messageId: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'e-3',
    campaignId: 'c-1',
    senderId: 's-1',
    recipient: 'error.user@example.com',
    subject: 'Q3 Product Update Outreach',
    body: 'Hello Error,\n\nI wanted to share our Q3 product updates...',
    scheduledAt: new Date(Date.now() + 5 * 60000).toISOString(),
    sentAt: null,
    status: 'SCHEDULED',
    attempts: 2,
    bullJobId: 'job-3',
    messageId: null,
    errorMessage: 'SMTP connection timeout',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'e-4',
    campaignId: 'c-2',
    senderId: 's-2',
    recipient: 'bob.harris@example.com',
    subject: 'Partnership Proposal',
    body: 'Hi Bob,\n\nHope this email finds you well...',
    scheduledAt: new Date(Date.now() - 10 * 60000).toISOString(),
    sentAt: new Date(Date.now() - 10 * 60000).toISOString(),
    status: 'SENT',
    attempts: 1,
    bullJobId: 'job-4',
    messageId: '<msg-12345@reachinbox.ai>',
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'e-5',
    campaignId: 'c-2',
    senderId: 's-2',
    recipient: 'failed.recipient@example.com',
    subject: 'Partnership Proposal',
    body: 'Hi Failed,\n\nHope this email finds you well...',
    scheduledAt: new Date(Date.now() - 20 * 60000).toISOString(),
    sentAt: null,
    status: 'FAILED',
    attempts: 3,
    bullJobId: 'job-5',
    messageId: null,
    errorMessage: '550 5.1.1 User Unknown',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'e-6',
    campaignId: 'c-2',
    senderId: 's-2',
    recipient: 'limited.user@example.com',
    subject: 'Partnership Proposal',
    body: 'Hi Limited,\n\nHope this email finds you well...',
    scheduledAt: new Date(Date.now() + 60 * 60000).toISOString(),
    sentAt: null,
    status: 'RATE_LIMITED',
    attempts: 1,
    bullJobId: 'job-6',
    messageId: null,
    errorMessage: 'Sender rate limit exceeded (50/hr)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

function getLocalEmails(): Email[] {
  const data = localStorage.getItem('demo_emails');
  if (data) return JSON.parse(data);
  localStorage.setItem('demo_emails', JSON.stringify(defaultEmails));
  return defaultEmails;
}

function paginate(items: Email[], page: number, limit: number): EmailListResponse {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginatedItems = items.slice(offset, offset + limit);

  return {
    items: paginatedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: totalPages || 1,
    }
  };
}

/**
 * Hook to retrieve scheduled and sent emails with page-based pagination.
 */
export function useEmails(page = 1, limit = 10) {
  // 1. Fetch Scheduled / Processing emails
  const scheduledQuery = useQuery<EmailListResponse>({
    queryKey: ['emails-scheduled', page, limit],
    queryFn: async () => {
      if (localStorage.getItem('demo_logged_in') === 'true') {
        const all = getLocalEmails();
        const scheduled = all.filter(e => e.status === 'SCHEDULED' || e.status === 'PROCESSING' || e.status === 'RATE_LIMITED');
        return paginate(scheduled, page, limit);
      }
      const res = await api.get('/emails/scheduled', {
        params: { page, limit },
      });
      return res.data.data;
    },
    placeholderData: (prev) => prev,
  });

  // 2. Fetch Sent / Failed emails
  const sentQuery = useQuery<EmailListResponse>({
    queryKey: ['emails-sent', page, limit],
    queryFn: async () => {
      if (localStorage.getItem('demo_logged_in') === 'true') {
        const all = getLocalEmails();
        const sent = all.filter(e => e.status === 'SENT' || e.status === 'FAILED');
        return paginate(sent, page, limit);
      }
      const res = await api.get('/emails/sent', {
        params: { page, limit },
      });
      return res.data.data;
    },
    placeholderData: (prev) => prev,
  });

  return {
    scheduledEmails: scheduledQuery.data?.items || [],
    scheduledPagination: scheduledQuery.data?.pagination || null,
    isScheduledLoading: scheduledQuery.isLoading,
    scheduledError: scheduledQuery.error,
    refetchScheduled: scheduledQuery.refetch,

    sentEmails: sentQuery.data?.items || [],
    sentPagination: sentQuery.data?.pagination || null,
    isSentLoading: sentQuery.isLoading,
    sentError: sentQuery.error,
    refetchSent: sentQuery.refetch,
  };
}

/**
 * Hook to query emails using debounced Elasticsearch endpoint.
 */
export function useSearchEmails(query: string, page = 1, limit = 10) {
  return useQuery<EmailListResponse>({
    queryKey: ['emails-search', query, page, limit],
    queryFn: async () => {
      if (localStorage.getItem('demo_logged_in') === 'true') {
        const all = getLocalEmails();
        const lower = query.toLowerCase();
        const filtered = all.filter(e => 
          e.recipient.toLowerCase().includes(lower) || 
          e.subject.toLowerCase().includes(lower) || 
          e.body.toLowerCase().includes(lower)
        );
        return paginate(filtered, page, limit);
      }
      const res = await api.get('/emails/search', {
        params: { q: query, page, limit },
      });
      return res.data.data;
    },
    enabled: query.trim().length > 0,
    placeholderData: (prev) => prev,
  });
}
