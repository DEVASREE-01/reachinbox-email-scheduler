import React from 'react';
import { Slack, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

export const SlackConnection: React.FC = () => {
  const { slackStatus, connectSlack, disconnectSlack, isDisconnectingSlack, isSlackLoading } = useAuth();

  if (isSlackLoading) {
    return (
      <div className="glass-card rounded-xl p-5 border border-dark-800/40 flex items-center justify-center">
        <span className="text-xs font-semibold text-dark-400">Syncing Slack workspace...</span>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-5 border border-dark-800/40 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
          <Slack className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide">Slack Integration</h3>
          <p className="text-xs text-dark-400 mt-0.5 leading-relaxed">
            Send real-time alerts to your Slack workspace the instant a sender hits their configured hourly limit.
          </p>
        </div>
      </div>

      <div className="h-px bg-dark-800/40" />

      {slackStatus?.connected ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wide text-dark-400">Connection Status</span>
              <h4 className="text-xs font-bold text-emerald-400 mt-0.5">{slackStatus.teamName}</h4>
            </div>
          </div>
          <Button
            variant="glass"
            size="sm"
            className="!px-3 !py-1 text-xs border-red-500/20 text-red-400 hover:bg-red-950/20"
            onClick={disconnectSlack}
            isLoading={isDisconnectingSlack}
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-dark-450">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wide text-dark-400">Connection Status</span>
              <h4 className="text-xs font-bold text-dark-300 mt-0.5">Not Integrated</h4>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="text-xs bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/15"
            onClick={connectSlack}
          >
            Connect Workspace
          </Button>
        </div>
      )}
    </div>
  );
};
