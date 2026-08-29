import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Slack, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const { user, logout, isLoggingOut, slackStatus, connectSlack, disconnectSlack, isDisconnectingSlack } = useAuth();

  if (!user) return null;

  return (
    <header className="w-full px-6 py-4 glass border-b border-dark-800/80 flex items-center justify-between z-10 shrink-0">
      {/* Brand Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
          <span className="text-white font-extrabold text-lg tracking-wider">R</span>
        </div>
        <div>
          <h1 className="text-base font-extrabold text-white tracking-wide leading-none">ReachInbox</h1>
          <span className="text-[10px] uppercase font-bold tracking-widest text-brand-400">Email Scheduler</span>
        </div>
      </div>

      {/* Integration controls and profile info */}
      <div className="flex items-center gap-6">
        {/* Slack Connection */}
        <div className="flex items-center gap-3 bg-dark-900/40 border border-dark-850 px-3.5 py-1.5 rounded-lg">
          <div className="flex items-center gap-2">
            <Slack className={`w-4 h-4 ${slackStatus?.connected ? 'text-emerald-400' : 'text-dark-400'}`} />
            <span className="text-xs font-semibold text-dark-300">Slack</span>
          </div>

          <div className="h-4 w-px bg-dark-800/80" />

          {slackStatus?.connected ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400 truncate max-w-[120px]">
                  {slackStatus.teamName}
                </span>
              </div>
              <Button
                variant="glass"
                size="sm"
                className="!px-2 !py-0.5 text-[10px] font-bold border-red-500/20 text-red-400 hover:bg-red-950/20"
                onClick={disconnectSlack}
                isLoading={isDisconnectingSlack}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-dark-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Not Connected</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="!px-2.5 !py-1 text-[10px] font-bold bg-brand-600 hover:bg-brand-500"
                onClick={connectSlack}
              >
                Connect
              </Button>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3.5">
          <div className="text-right hidden sm:block">
            <h4 className="text-sm font-bold text-white leading-tight">{user.name}</h4>
            <span className="text-[11px] text-dark-400">{user.email}</span>
          </div>
          <img
            src={user.avatar}
            alt={user.name}
            className="w-9 h-9 rounded-full border border-dark-800 object-cover shadow-inner"
          />
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          disabled={isLoggingOut}
          className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-950/20 transition-all duration-200"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
