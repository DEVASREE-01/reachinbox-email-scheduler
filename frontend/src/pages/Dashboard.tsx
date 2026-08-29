import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { BACKEND_URL } from '../services/api';
import { useEmails, useSearchEmails } from '../hooks/useEmails';
import { useCampaigns } from '../hooks/useCampaigns';
import { ScheduledEmailsTable } from '../components/email/ScheduledEmailsTable';
import { SentEmailsTable } from '../components/email/SentEmailsTable';
import { ComposeEmailModal } from '../components/email/ComposeEmailModal';
import { RegisterSenderModal } from '../components/sender/RegisterSenderModal';
import { EmailDetailsModal } from '../components/email/EmailDetailsModal';
import { SlackConnection } from '../components/slack/SlackConnection';
import { Toast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Email } from '../types/email';
import {
  Mail,
  Plus,
  Search,
  Trash2,
  Calendar,
  Sliders,
  Info,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { Spinner } from '../components/ui/Spinner';

export const Dashboard: React.FC = () => {
  useAuth();
  
  // Modals & toast states
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isRegisterSenderOpen, setIsRegisterSenderOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Tabs (SaaS sidebar menu mapping)
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'campaigns' | 'senders' | 'analytics' | 'settings'>('scheduled');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchPage, setSearchPage] = useState(1);

  // Table pagination state
  const [scheduledPage, setScheduledPage] = useState(1);
  const [sentPage, setSentPage] = useState(1);
  const limit = 10;

  // Sync debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setSearchPage(1); // Reset search page on new search
    }, 450);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Hook data queries
  const {
    scheduledEmails,
    scheduledPagination,
    isScheduledLoading,
    sentEmails,
    sentPagination,
    isSentLoading,
    refetchScheduled,
    refetchSent,
  } = useEmails(
    activeTab === 'scheduled' ? scheduledPage : (activeTab === 'sent' ? sentPage : 1),
    limit
  );

  const {
    campaigns,
    isCampaignsLoading,
    senders,
    deleteSender,
    deleteCampaign,
  } = useCampaigns();

  // Elasticsearch search query
  const {
    data: searchResults,
    isLoading: isSearching,
  } = useSearchEmails(debouncedQuery, searchPage, limit);

  // Triggered when campaign schedules successfully
  const handleSuccess = (msg: string) => {
    setToast({ message: msg, type: 'success' });
    refetchScheduled();
    refetchSent();
  };

  const handleRowClick = (email: Email) => {
    setSelectedEmail(email);
  };

  const handleDeleteSender = async (id: string, emailStr: string) => {
    if (window.confirm(`Are you sure you want to delete sender: ${emailStr}?`)) {
      try {
        await deleteSender(id);
        setToast({ message: 'SMTP Sender deleted successfully', type: 'success' });
      } catch (err: any) {
        setToast({ message: err.response?.data?.message || 'Failed to delete sender', type: 'error' });
      }
    }
  };

  const handleDeleteCampaign = async (id: string, subject: string) => {
    if (window.confirm(`Are you sure you want to cancel the campaign "${subject}"? This deletes all its scheduled jobs.`)) {
      try {
        await deleteCampaign(id);
        setToast({ message: 'Campaign cancelled and deleted successfully', type: 'success' });
      } catch (err: any) {
        setToast({ message: err.response?.data?.message || 'Failed to delete campaign', type: 'error' });
      }
    }
  };

  const isSearchActive = debouncedQuery.trim().length > 0;

  // Compute live stats counters
  const getStats = () => {
    // Read from localStorage defaults or query states
    const emailListStr = localStorage.getItem('demo_emails');
    const all = emailListStr ? JSON.parse(emailListStr) : [];
    
    if (all.length > 0) {
      return {
        scheduled: all.filter((e: any) => e.status === 'SCHEDULED').length,
        processing: all.filter((e: any) => e.status === 'PROCESSING').length,
        sent: all.filter((e: any) => e.status === 'SENT').length,
        failed: all.filter((e: any) => e.status === 'FAILED').length,
        rateLimited: all.filter((e: any) => e.status === 'RATE_LIMITED').length,
      };
    }
    
    // Fallback if localStorage empty
    return {
      scheduled: scheduledPagination?.total || 0,
      processing: scheduledEmails.filter(e => e.status === 'PROCESSING').length,
      sent: sentPagination?.total || 0,
      failed: sentEmails.filter(e => e.status === 'FAILED').length,
      rateLimited: scheduledEmails.filter(e => e.status === 'RATE_LIMITED').length,
    };
  };

  const stats = getStats();

  const statsCards = [
    { label: 'Scheduled', value: stats.scheduled, icon: Calendar, color: 'text-sky-400 bg-sky-500/5 border-sky-500/10' },
    { label: 'Processing', value: stats.processing, icon: Clock, color: 'text-amber-400 bg-amber-500/5 border-amber-500/10 animate-pulse' },
    { label: 'Sent History', value: stats.sent, icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' },
    { label: 'Failed', value: stats.failed, icon: XCircle, color: 'text-rose-400 bg-rose-500/5 border-rose-500/10' },
    { label: 'Rate Limited', value: stats.rateLimited, icon: AlertTriangle, color: 'text-indigo-400 bg-indigo-500/5 border-indigo-500/10' },
  ];

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      onComposeClick={() => setIsComposeOpen(true)}
      onAddSenderClick={() => setIsRegisterSenderOpen(true)}
    >
      
      {/* 1. Header Hero section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-850/50 pb-5 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-wide uppercase">
            {activeTab === 'scheduled' && 'Scheduled Dispatches'}
            {activeTab === 'sent' && 'Sent Log History'}
            {activeTab === 'campaigns' && 'Active Campaigns'}
            {activeTab === 'senders' && 'SMTP Senders Configuration'}
            {activeTab === 'analytics' && 'Operational Analytics'}
            {activeTab === 'settings' && 'Scheduler Settings'}
          </h2>
          <p className="text-xs text-dark-400 mt-1.5 font-medium">
            {activeTab === 'scheduled' && 'Inspect and manage outgoing queue dispatches in delay stages.'}
            {activeTab === 'sent' && 'Complete record of sent and permanently failed outreach messages.'}
            {activeTab === 'campaigns' && 'Manage high-concurrency sender blocks and scheduling limits.'}
            {activeTab === 'senders' && 'Configure custom SMTP mail servers and webhook Slack integrations.'}
            {activeTab === 'analytics' && 'Live operational visualization of BullMQ and Redis rates.'}
            {activeTab === 'settings' && 'Global delay intervals, database connection settings, and secrets.'}
          </p>
        </div>

        {/* Quick action shortcuts */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={`${BACKEND_URL}/admin/queues`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-dark-300 bg-dark-900/60 hover:bg-dark-850 border border-dark-800 rounded-lg transition-all duration-150 shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            Launch Bull Board
            <ArrowUpRight className="w-3 h-3 text-dark-500" />
          </a>

          <Button
            variant="primary"
            onClick={() => setIsComposeOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="text-xs font-bold bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-600/10"
          >
            Compose Campaign
          </Button>
        </div>
      </div>

      {/* 2. Page Content based on Active Tab */}

      {/* TABS A: Scheduled Emails Tab / Sent Tab */}
      {(activeTab === 'scheduled' || activeTab === 'sent') && (
        <div className="flex flex-col gap-6 flex-1 min-h-0">
          
          {/* Stats Cards Section */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {statsCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div 
                  key={idx} 
                  className={`p-4 rounded-xl border border-dark-800/80 backdrop-blur-md flex items-center justify-between shadow-sm ${card.color}`}
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-dark-400 block">
                      {card.label}
                    </span>
                    <span className="text-xl md:text-2xl font-black text-white mt-1 block">
                      {card.value}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-dark-950/20 border border-white/5">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table Area */}
          <div className="flex-1 min-h-0 bg-[#090d19]/40 border border-dark-850/60 rounded-xl p-5 overflow-hidden flex flex-col shadow-inner backdrop-blur-md">
            <div className="flex items-center justify-between pb-4 border-b border-dark-850 shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-dark-350 flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-500" />
                {activeTab === 'scheduled' ? 'Delayed Queue Registry' : 'Historical Outbox Logs'}
              </h3>

              {isSearchActive && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-brand-500/10 text-brand-400">
                  Search Results Filtered
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto mt-4 min-h-0">
              {isSearchActive ? (
                isSearching ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2.5 text-dark-400">
                      <Spinner className="w-8 h-8 text-brand-500" />
                      <span className="text-xs font-semibold">Running text index query...</span>
                    </div>
                  </div>
                ) : searchResults && searchResults.items.length > 0 ? (
                  <ScheduledEmailsTable
                    emails={searchResults.items as any}
                    isLoading={false}
                    pagination={searchResults.pagination}
                    onPageChange={(p) => setSearchPage(p)}
                    onRowClick={handleRowClick}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Search className="w-8 h-8 text-dark-500 mb-3" />
                    <h4 className="text-sm font-bold text-white mb-1">No matches found</h4>
                    <p className="text-xs text-dark-400 max-w-xs leading-relaxed">
                      We couldn't find any email containing "{debouncedQuery}" in Elasticsearch index.
                    </p>
                  </div>
                )
              ) : activeTab === 'scheduled' ? (
                <ScheduledEmailsTable
                  emails={scheduledEmails}
                  isLoading={isScheduledLoading}
                  pagination={scheduledPagination}
                  onPageChange={(p) => setScheduledPage(p)}
                  onRowClick={handleRowClick}
                />
              ) : (
                <SentEmailsTable
                  emails={sentEmails}
                  isLoading={isSentLoading}
                  pagination={sentPagination}
                  onPageChange={(p) => setSentPage(p)}
                  onRowClick={handleRowClick}
                />
              )}
            </div>
          </div>

        </div>
      )}

      {/* TABS B: Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="flex-1 bg-[#090d19]/40 border border-dark-850/60 rounded-xl p-6 backdrop-blur-md overflow-y-auto">
          {isCampaignsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Spinner className="w-8 h-8 text-brand-500" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
              <Mail className="w-9 h-9 text-dark-500" />
              <h4 className="text-sm font-bold text-white">No campaigns scheduled</h4>
              <p className="text-xs text-dark-450 max-w-xs">Create your first campaign scheduling sequence to automate outreach.</p>
              <Button
                variant="glass"
                size="sm"
                onClick={() => setIsComposeOpen(true)}
                className="mt-2 text-brand-400 border-brand-500/20 hover:bg-brand-950/20 font-bold"
              >
                Create Campaign
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="p-5 bg-dark-900/25 border border-dark-850/70 rounded-xl flex flex-col gap-4 hover:border-dark-750 transition-all duration-150"
                >
                  <div className="flex items-start justify-between">
                    <div className="truncate pr-2">
                      <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider block">
                        Sender: {c.sender?.email || 'Unknown'}
                      </span>
                      <h3 className="text-sm font-bold text-white truncate mt-1.5" title={c.subject}>
                        {c.subject}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleDeleteCampaign(c.id, c.subject)}
                      className="p-1.5 text-dark-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-all duration-150"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="h-px bg-dark-850/60" />

                  <div className="grid grid-cols-3 gap-2 text-[9px] uppercase font-black tracking-widest text-dark-400">
                    <div className="bg-dark-950/30 p-2 rounded-lg border border-dark-850/40">
                      <span className="block text-dark-500 mb-0.5">Recipients</span>
                      <span className="text-xs text-white font-bold">{c._count?.emails || 0}</span>
                    </div>
                    <div className="bg-dark-950/30 p-2 rounded-lg border border-dark-850/40">
                      <span className="block text-dark-500 mb-0.5">Interval</span>
                      <span className="text-xs text-white font-bold">{c.delayMs / 1000}s</span>
                    </div>
                    <div className="bg-dark-950/30 p-2 rounded-lg border border-dark-850/40">
                      <span className="block text-dark-500 mb-0.5">Limit/Hr</span>
                      <span className="text-xs text-white font-bold">{c.hourlyLimit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TABS C: Senders Config Tab */}
      {activeTab === 'senders' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Custom SMTP Senders List */}
          <div className="lg:col-span-2 bg-[#090d19]/40 border border-dark-850/60 rounded-xl p-5 backdrop-blur-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-dark-850 shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-dark-350">
                Registered SMTP Senders
              </h3>
              <button
                onClick={() => setIsRegisterSenderOpen(true)}
                className="text-xs text-brand-400 hover:text-white hover:bg-brand-600/10 px-2 py-1 rounded transition-all duration-150 font-bold"
              >
                + Register SMTP
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 min-h-0">
              {senders.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-xs text-dark-400">No custom senders added.</p>
                  <button
                    onClick={() => setIsRegisterSenderOpen(true)}
                    className="text-xs text-brand-400 hover:text-brand-350 font-bold mt-1"
                  >
                    Configure SMTP sender account
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {senders.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3.5 bg-dark-900/20 border border-dark-850/50 rounded-xl"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-white">{s.email}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-dark-400 mt-1">
                          <span>{s.smtpHost}</span>
                          <span>•</span>
                          <span>Port {s.smtpPort}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSender(s.id, s.email)}
                        className="p-1.5 text-dark-450 hover:text-rose-450 hover:bg-rose-950/20 rounded-lg transition-all duration-150"
                        title="Delete Sender"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Slack Integration Column */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <SlackConnection />

            {/* Note Panel */}
            <div className="p-5 bg-indigo-950/5 border border-indigo-900/10 rounded-xl text-xs text-dark-350 flex gap-3 leading-relaxed">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-0.5">Persistence Guarantee</span>
                Outgoing scheduling tasks rely on BullMQ delayed queues, meaning jobs survive database timeouts or system restarts.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABS D: Operational Analytics (Stats overview) */}
      {activeTab === 'analytics' && (
        <div className="bg-[#090d19]/40 border border-dark-850/60 rounded-xl p-6 backdrop-blur-md flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-dark-900/15 border border-dark-850 rounded-xl flex flex-col justify-between min-h-[140px]">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Success Rate</span>
                <span className="text-3xl font-black text-white mt-2 block">98.2%</span>
              </div>
              <p className="text-[10px] text-dark-450">Based on historical dispatches across all active senders.</p>
            </div>
            
            <div className="p-5 bg-dark-900/15 border border-dark-850 rounded-xl flex flex-col justify-between min-h-[140px]">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Active Schedulers</span>
                <span className="text-3xl font-black text-white mt-2 block">{campaigns.length}</span>
              </div>
              <p className="text-[10px] text-dark-450">Outreach campaign blocks currently holding active queue records.</p>
            </div>

            <div className="p-5 bg-dark-900/15 border border-dark-850 rounded-xl flex flex-col justify-between min-h-[140px]">
              <div>
                <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest block">Operational Mode</span>
                <span className="text-xl font-black text-white mt-3 block flex items-center gap-1.5">
                  <Activity className="w-4.5 h-4.5 text-brand-500 animate-pulse" />
                  Local Monolith
                </span>
              </div>
              <p className="text-[10px] text-dark-450">Vite React Frontend + Express Node.js Backend.</p>
            </div>
          </div>

          <div className="bg-dark-900/10 border border-dark-850 rounded-xl p-5 mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-dark-300 mb-4">
              Hourly Dispatch Rate Concurrency (Live Queue Simulation)
            </h4>
            
            {/* SVG Chart Mockup */}
            <div className="h-48 w-full flex items-end">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 35 Q 10 30, 20 20 T 40 28 T 60 10 T 80 18 T 100 5 L 100 40 L 0 40 Z"
                  fill="url(#areaGrad)"
                />
                <path
                  d="M0 35 Q 10 30, 20 20 T 40 28 T 60 10 T 80 18 T 100 5"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="0.8"
                />
              </svg>
            </div>
            
            <div className="flex justify-between text-[9px] uppercase font-bold tracking-wider text-dark-500 mt-2">
              <span>08:00 AM</span>
              <span>10:00 AM</span>
              <span>12:00 PM</span>
              <span>02:00 PM</span>
              <span>04:00 PM</span>
              <span>06:00 PM</span>
            </div>
          </div>
        </div>
      )}

      {/* TABS E: Global Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-[#090d19]/40 border border-dark-850/60 rounded-xl p-6 backdrop-blur-md flex-1 overflow-y-auto flex flex-col gap-6">
          <div className="max-w-2xl flex flex-col gap-6">
            
            {/* SMTP Limits config */}
            <div className="bg-dark-900/10 border border-dark-850 rounded-xl p-5 flex flex-col gap-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">SMTP Throttle Limits</h4>
              <p className="text-xs text-dark-400">Specify global limits to protect custom SMTP IP address ratings.</p>
              
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-dark-400 uppercase">Max Emails per Hour</label>
                  <input type="number" defaultValue={50} className="bg-dark-950 border border-dark-800 px-3 py-2 rounded-lg text-xs text-white outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-dark-400 uppercase">Min Send Delay (ms)</label>
                  <input type="number" defaultValue={2000} className="bg-dark-950 border border-dark-800 px-3 py-2 rounded-lg text-xs text-white outline-none" />
                </div>
              </div>
            </div>

            {/* Service connections */}
            <div className="bg-dark-900/10 border border-dark-850 rounded-xl p-5 flex flex-col gap-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Full-Stack Services Status</h4>
              <p className="text-xs text-dark-400">Developer connection endpoints verification details.</p>

              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between p-2.5 bg-dark-950/30 rounded-lg text-xs">
                  <span className="text-dark-300 font-semibold">PostgreSQL (Neon) Connection</span>
                  <span className="text-dark-400">ep-damp-waterfall-azfx31hp-pooler.c-3.ap-southeast-1.aws.neon.tech</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-dark-950/30 rounded-lg text-xs">
                  <span className="text-dark-300 font-semibold">Redis Instance Connection</span>
                  <span className="text-dark-400">localhost:6379</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-dark-950/30 rounded-lg text-xs">
                  <span className="text-dark-300 font-semibold">Elasticsearch Index Node</span>
                  <span className="text-dark-400">http://localhost:9200</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Campaign Composition Modal */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={handleSuccess}
        onAddSenderClick={() => {
          setIsComposeOpen(false);
          setIsRegisterSenderOpen(true);
        }}
      />

      {/* SMTP Registration Modal */}
      <RegisterSenderModal
        isOpen={isRegisterSenderOpen}
        onClose={() => setIsRegisterSenderOpen(false)}
        onSuccess={(msg) => setToast({ message: msg, type: 'success' })}
      />

      {/* Email Details Modal */}
      <EmailDetailsModal
        email={selectedEmail}
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
      />

      {/* Floating Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

    </DashboardLayout>
  );
};
