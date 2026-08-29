import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { BACKEND_URL } from '../../services/api';
import {
  LayoutDashboard,
  Calendar,
  Mail,
  Sliders,
  Settings as SettingsIcon,
  BarChart3,
  Search,
  Slack,
  LogOut,
  Menu,
  X
} from 'lucide-react';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: 'scheduled' | 'sent' | 'campaigns' | 'senders' | 'analytics' | 'settings';
  setActiveTab: (tab: any) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onComposeClick: () => void;
  onAddSenderClick: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onComposeClick,
  onAddSenderClick,
}) => {
  const {
    user,
    logout,
    isLoggingOut,
    slackStatus,
    connectSlack,
    disconnectSlack,
    isDisconnectingSlack,
  } = useAuth();

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!user) return null;

  const menuItems = [
    { id: 'scheduled', label: 'Scheduled Emails', icon: Calendar },
    { id: 'sent', label: 'Sent History', icon: Mail },
    { id: 'campaigns', label: 'Campaigns', icon: LayoutDashboard },
    { id: 'senders', label: 'SMTP Senders', icon: SettingsIcon },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: 'Demo' },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  return (
    <div className="relative w-full h-screen bg-[#070a13] text-dark-50 flex overflow-hidden font-sans">
      
      {/* Background Decorative Blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[35%] h-[35%] rounded-full bg-brand-900/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/10 blur-[140px] pointer-events-none" />

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 1. LEFT SIDEBAR (Desktop: Fixed, Mobile: Drawer) */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-[#090d19]/90 backdrop-blur-md border-r border-dark-850/60 z-50 flex flex-col transition-all duration-300
        lg:static lg:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:flex'}
      `}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-dark-850/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <span className="text-white font-black text-base tracking-wider">R</span>
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-wide leading-none">ReachInbox</h1>
              <span className="text-[9px] uppercase font-bold tracking-widest text-brand-400">Scheduler</span>
            </div>
          </div>

          {/* Close button for Mobile */}
          <button 
            className="lg:hidden p-1 text-dark-400 hover:text-white rounded"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Menu Options */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-dark-500 px-3 mb-2 block">
            Navigation
          </span>
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileOpen(false);
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 group
                  ${isActive 
                    ? 'bg-brand-600/15 text-brand-400 border-l-2 border-brand-500 pl-2.5 font-bold' 
                    : 'text-dark-400 hover:text-white hover:bg-dark-900/40 border-l-2 border-transparent'}
                `}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-brand-400' : 'text-dark-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[8px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="h-px bg-dark-850/60 my-4" />

          {/* Schedulers Info */}
          <span className="text-[10px] font-bold uppercase tracking-wider text-dark-500 px-3 mb-2 block">
            Monitoring
          </span>

          <a
            href={`${BACKEND_URL}/admin/queues`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-dark-400 hover:text-white hover:bg-dark-900/40 border-l-2 border-transparent transition-all duration-150 group"
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Queue Monitor</span>
            </div>
            <span className="text-[8px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
              Board
            </span>
          </a>
        </nav>

        {/* Sidebar Footer Senders configuration CTA */}
        <div className="p-4 border-t border-dark-850/60 flex flex-col gap-2 shrink-0">
          <Button
            variant="glass"
            size="sm"
            className="w-full text-xs font-bold border-dark-800 text-dark-300 hover:bg-dark-900"
            onClick={onAddSenderClick}
          >
            + Add SMTP Account
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="w-full text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white"
            onClick={onComposeClick}
          >
            Compose Campaign
          </Button>
        </div>
      </aside>

      {/* 2. RIGHT CONTENT AREA (Top Bar + Main Page Body) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* TOP BAR */}
        <header className="h-16 bg-[#080d17]/80 backdrop-blur-md border-b border-dark-850/60 px-6 flex items-center justify-between shrink-0 z-30">
          
          <div className="flex items-center gap-4 flex-1 max-w-lg">
            {/* Hamburger menu for mobile */}
            <button 
              className="lg:hidden p-1.5 text-dark-350 hover:text-white hover:bg-dark-900/50 rounded-lg shrink-0 transition-colors"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Top Bar Search Input */}
            <div className="relative w-full max-w-sm hidden sm:block">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-dark-500" />
              <input
                type="text"
                placeholder="Search recipient, subject, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d1222]/60 hover:bg-[#11182c]/85 focus:bg-[#11182c] border border-dark-800 focus:border-brand-500/60 px-9 py-2 rounded-lg text-xs text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 transition-all duration-200"
              />
            </div>
          </div>

          {/* Top Bar Right side controls */}
          <div className="flex items-center gap-6">
            
            {/* Slack Connection Pill */}
            <div className="flex items-center gap-3 bg-[#0d1222]/50 border border-dark-800 px-3.5 py-1.5 rounded-lg shrink-0 select-none">
              <div className="flex items-center gap-1.5">
                <Slack className={`w-3.5 h-3.5 ${slackStatus?.connected ? 'text-emerald-400' : 'text-dark-400'}`} />
                <span className="text-[10px] font-bold text-dark-300 hidden md:inline">Slack</span>
              </div>
              
              <div className="h-3 w-px bg-dark-800" />

              {slackStatus?.connected ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-emerald-400 truncate max-w-[100px]" title={slackStatus.teamName || ''}>
                    {slackStatus.teamName}
                  </span>
                  <button
                    onClick={disconnectSlack}
                    disabled={isDisconnectingSlack}
                    className="text-[9px] font-bold text-rose-400 hover:text-rose-300 bg-rose-950/10 hover:bg-rose-950/30 px-1.5 py-0.5 rounded border border-rose-900/20"
                  >
                    {isDisconnectingSlack ? '...' : 'Disconnect'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-dark-450">Offline</span>
                  <button
                    onClick={connectSlack}
                    className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/10 hover:bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-900/20"
                  >
                    Connect
                  </button>
                </div>
              )}
            </div>

            {/* Profile Avatar and Name */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <h4 className="text-xs font-bold text-white leading-tight">{user.name}</h4>
                <span className="text-[10px] text-dark-450 block mt-0.5">{user.email}</span>
              </div>
              <img
                src={user.avatar || 'https://lh3.googleusercontent.com/a/default-user=s96-c'}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-dark-800 object-cover shadow-md"
              />
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              disabled={isLoggingOut}
              className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-950/20 transition-all duration-150 shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* MAIN BODY SCROLL AREA */}
        <main className="flex-1 w-full p-6 overflow-y-auto min-h-0 flex flex-col gap-6">
          {/* Mobile search bar fallback */}
          <div className="relative w-full sm:hidden shrink-0">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-dark-500" />
            <input
              type="text"
              placeholder="Search recipients or subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1222]/60 border border-dark-800 focus:border-brand-500/60 px-9 py-2 rounded-lg text-xs text-white focus:outline-none"
            />
          </div>

          {children}
        </main>
      </div>
    </div>
  );
};
