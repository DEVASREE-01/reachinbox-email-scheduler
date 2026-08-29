import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Campaign, Sender } from '../types/campaign';

const defaultSenders: Sender[] = [
  {
    id: 's-1',
    email: 'growth@reachinbox.ai',
    smtpHost: 'smtp.ethereal.email',
    smtpPort: 587,
    smtpUser: 'growth@reachinbox.ai',
    createdAt: new Date(Date.now() - 10000000).toISOString()
  },
  {
    id: 's-2',
    email: 'sales@reachinbox.ai',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpUser: 'sales@reachinbox.ai',
    createdAt: new Date(Date.now() - 20000000).toISOString()
  }
];

const defaultCampaigns: Campaign[] = [
  {
    id: 'c-1',
    userId: 'demo-user-id',
    senderId: 's-1',
    subject: 'Q3 Product Update Outreach',
    body: 'Hello {{firstName}},\n\nI wanted to share our Q3 product updates...',
    startTime: new Date(Date.now() + 15 * 60000).toISOString(),
    delayMs: 3000,
    hourlyLimit: 100,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    sender: { email: 'growth@reachinbox.ai' },
    _count: { emails: 15 }
  },
  {
    id: 'c-2',
    userId: 'demo-user-id',
    senderId: 's-2',
    subject: 'Partnership Proposal',
    body: 'Hi {{firstName}},\n\nHope this email finds you well. I was looking at your company...',
    startTime: new Date(Date.now() + 120 * 60000).toISOString(),
    delayMs: 5000,
    hourlyLimit: 50,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    sender: { email: 'sales@reachinbox.ai' },
    _count: { emails: 8 }
  }
];

function getLocalSenders(): Sender[] {
  const data = localStorage.getItem('demo_senders');
  if (data) return JSON.parse(data);
  localStorage.setItem('demo_senders', JSON.stringify(defaultSenders));
  return defaultSenders;
}

function getLocalCampaigns(): Campaign[] {
  const data = localStorage.getItem('demo_campaigns');
  if (data) return JSON.parse(data);
  localStorage.setItem('demo_campaigns', JSON.stringify(defaultCampaigns));
  return defaultCampaigns;
}

/**
 * Hook to manage campaigns and senders configurations.
 */
export function useCampaigns() {
  const queryClient = useQueryClient();

  // 1. Fetch all Campaigns
  const campaignsQuery = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      if (localStorage.getItem('demo_logged_in') === 'true') {
        return getLocalCampaigns();
      }
      const res = await api.get('/campaigns');
      return res.data.data;
    },
  });

  // 2. Fetch all Senders
  const sendersQuery = useQuery<Sender[]>({
    queryKey: ['senders'],
    queryFn: async () => {
      if (localStorage.getItem('demo_logged_in') === 'true') {
        return getLocalSenders();
      }
      const res = await api.get('/senders');
      return res.data.data;
    },
  });

  // 3. Mutation: Schedule Campaign (handles JSON or multipart/form-data)
  const scheduleMutation = useMutation({
    mutationFn: async (formData: FormData | object) => {
      if (localStorage.getItem('demo_logged_in') === 'true') {
        const campaigns = getLocalCampaigns();
        const senders = getLocalSenders();
        
        let newCampaign: Partial<Campaign> = {};
        let recipientCount = 0;
        let recipientEmails: string[] = [];

        if (formData instanceof FormData) {
          const senderId = formData.get('senderId') as string;
          const subject = formData.get('subject') as string;
          const body = formData.get('body') as string;
          const startTime = formData.get('startTime') as string;
          const delayMs = Number(formData.get('delayMs'));
          const hourlyLimit = Number(formData.get('hourlyLimit'));
          
          const file = formData.get('file') as File;
          if (file) {
            try {
              const text = await file.text();
              const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
              const lines = text.split(/\r?\n/);
              for (const line of lines) {
                if (!line.trim()) continue;
                const cells = line.split(',');
                for (const cell of cells) {
                  const cleaned = cell.trim().toLowerCase();
                  if (emailRegex.test(cleaned) && !recipientEmails.includes(cleaned)) {
                    recipientEmails.push(cleaned);
                  }
                }
              }
            } catch (err) {
              // ignore
            }
          }
          recipientCount = recipientEmails.length || 5;

          const matchedSender = senders.find(s => s.id === senderId);

          newCampaign = {
            id: 'c-' + Math.random().toString(36).substr(2, 9),
            userId: 'demo-user-id',
            senderId,
            subject,
            body,
            startTime: startTime || new Date().toISOString(),
            delayMs: delayMs || 2000,
            hourlyLimit: hourlyLimit || 50,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sender: { email: matchedSender ? matchedSender.email : 'sender@reachinbox.ai' },
            _count: { emails: recipientCount }
          };
        } else {
          const data = formData as any;
          const matchedSender = senders.find(s => s.id === data.senderId);
          newCampaign = {
            id: 'c-' + Math.random().toString(36).substr(2, 9),
            userId: 'demo-user-id',
            senderId: data.senderId,
            subject: data.subject,
            body: data.body,
            startTime: data.startTime || new Date().toISOString(),
            delayMs: data.delayMs || 2000,
            hourlyLimit: data.hourlyLimit || 50,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sender: { email: matchedSender ? matchedSender.email : 'sender@reachinbox.ai' },
            _count: { emails: 5 }
          };
          recipientCount = 5;
        }

        campaigns.unshift(newCampaign as Campaign);
        localStorage.setItem('demo_campaigns', JSON.stringify(campaigns));

        const emailListStr = localStorage.getItem('demo_emails');
        const emailList = emailListStr ? JSON.parse(emailListStr) : [];
        
        const finalRecipients = recipientEmails.length > 0 ? recipientEmails : ['recipient1@example.com', 'recipient2@example.com', 'recipient3@example.com'];
        finalRecipients.forEach((recipient, idx) => {
          emailList.unshift({
            id: 'e-' + Math.random().toString(36).substr(2, 9),
            campaignId: newCampaign.id,
            senderId: newCampaign.senderId,
            recipient,
            subject: newCampaign.subject,
            body: newCampaign.body,
            scheduledAt: new Date(new Date(newCampaign.startTime!).getTime() + idx * (newCampaign.delayMs || 2000)).toISOString(),
            sentAt: null,
            status: 'SCHEDULED',
            attempts: 0,
            bullJobId: 'job-' + Math.random().toString(36).substr(2, 9),
            messageId: null,
            errorMessage: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        });
        localStorage.setItem('demo_emails', JSON.stringify(emailList));
        
        return newCampaign;
      }

      const isMultipart = formData instanceof FormData;
      const res = await api.post('/campaigns/schedule', formData, {
        headers: {
          'Content-Type': isMultipart ? 'multipart/form-data' : 'application/json',
        },
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['emails-scheduled'] });
      queryClient.invalidateQueries({ queryKey: ['emails-sent'] });
    },
  });

  // 4. Mutation: Delete/Cancel Campaign
  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      if (localStorage.getItem('demo_logged_in') === 'true') {
        const campaigns = getLocalCampaigns();
        const filtered = campaigns.filter(c => c.id !== campaignId);
        localStorage.setItem('demo_campaigns', JSON.stringify(filtered));

        const emailListStr = localStorage.getItem('demo_emails');
        if (emailListStr) {
          const emailList = JSON.parse(emailListStr);
          const filteredEmails = emailList.filter((e: any) => e.campaignId !== campaignId);
          localStorage.setItem('demo_emails', JSON.stringify(filteredEmails));
        }
        return;
      }
      await api.delete(`/campaigns/${campaignId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['emails-scheduled'] });
      queryClient.invalidateQueries({ queryKey: ['emails-sent'] });
    },
  });

  // 5. Mutation: Register custom SMTP Sender
  const registerSenderMutation = useMutation({
    mutationFn: async (senderData: Omit<Sender, 'id' | 'createdAt'> & { smtpPassword?: string }) => {
      if (localStorage.getItem('demo_logged_in') === 'true') {
        const senders = getLocalSenders();
        const newSender: Sender = {
          id: 's-' + Math.random().toString(36).substr(2, 9),
          email: senderData.email,
          smtpHost: senderData.smtpHost,
          smtpPort: senderData.smtpPort,
          smtpUser: senderData.smtpUser,
          createdAt: new Date().toISOString(),
        };
        senders.unshift(newSender);
        localStorage.setItem('demo_senders', JSON.stringify(senders));
        return newSender;
      }
      const res = await api.post('/senders', senderData);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['senders'] });
    },
  });

  // 6. Mutation: Delete SMTP Sender
  const deleteSenderMutation = useMutation({
    mutationFn: async (senderId: string) => {
      if (localStorage.getItem('demo_logged_in') === 'true') {
        const senders = getLocalSenders();
        const filtered = senders.filter(s => s.id !== senderId);
        localStorage.setItem('demo_senders', JSON.stringify(filtered));
        return;
      }
      await api.delete(`/senders/${senderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['senders'] });
    },
  });

  return {
    campaigns: campaignsQuery.data || [],
    isCampaignsLoading: campaignsQuery.isLoading,
    refetchCampaigns: campaignsQuery.refetch,

    senders: sendersQuery.data || [],
    isSendersLoading: sendersQuery.isLoading,
    refetchSenders: sendersQuery.refetch,

    scheduleCampaign: (data: FormData | object) => scheduleMutation.mutateAsync(data),
    isScheduling: scheduleMutation.isPending,
    scheduleError: scheduleMutation.error,

    deleteCampaign: (id: string) => deleteCampaignMutation.mutateAsync(id),
    isDeletingCampaign: deleteCampaignMutation.isPending,

    registerSender: (data: any) => registerSenderMutation.mutateAsync(data),
    isRegisteringSender: registerSenderMutation.isPending,

    deleteSender: (id: string) => deleteSenderMutation.mutateAsync(id),
    isDeletingSender: deleteSenderMutation.isPending,
  };
}
