import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, Zap, BellRing, Hourglass } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Login: React.FC = () => {
  const { login, loginDemo, isLoading, isAuthenticated } = useAuth();

  // If user is already logged in, redirect them
  React.useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/';
    }
  }, [isAuthenticated]);

  return (
    <div className="relative w-full h-screen bg-dark-950 flex flex-col justify-center items-center p-4 overflow-hidden">
      
      {/* Decorative Blurs */}
      <div className="absolute top-[10%] left-[20%] w-[35%] h-[35%] rounded-full bg-brand-800/10 blur-[130px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[10%] right-[20%] w-[40%] h-[40%] rounded-full bg-indigo-900/10 blur-[140px] pointer-events-none" />

      {/* Brand logo header */}
      <div className="flex items-center gap-3 mb-8 z-10 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-brand-500/25">
          <span className="text-white font-black text-2xl tracking-wider">R</span>
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-wide leading-none">ReachInbox</h1>
          <span className="text-[10px] uppercase font-bold tracking-widest text-brand-400">Email Scheduler</span>
        </div>
      </div>

      {/* Main glass login card */}
      <div className="w-full max-w-md glass-card rounded-xl p-8 shadow-2xl z-10 border border-white/5 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-6">
          <h2 className="text-xl font-extrabold text-white tracking-wide">Welcome to ReachInbox</h2>
          <p className="text-xs text-dark-400 mt-2 leading-relaxed">
            Configure automated email schedules, monitor queue concurrency, and manage custom sender limits.
          </p>
        </div>

        {/* OAuth & Demo Buttons */}
        <div className="flex flex-col gap-3.5">
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-3 py-3 font-semibold bg-brand-600 hover:bg-brand-500 hover:scale-[1.01] active:scale-[0.99]"
            onClick={login}
            isLoading={isLoading}
          >
            {/* Custom inline SVG Google Icon */}
            <svg className="w-5 h-5 fill-current text-white shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <Button
            variant="glass"
            size="lg"
            className="w-full flex items-center justify-center gap-2 py-3 font-bold border-brand-500/20 text-brand-400 hover:bg-brand-950/20 hover:scale-[1.01] active:scale-[0.99]"
            onClick={loginDemo}
          >
            Demo Login (Client-Side Preview)
          </Button>
        </div>

        {/* Features Checklist */}
        <div className="mt-8 space-y-4">
          <div className="h-px bg-dark-800/80" />
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-dark-400 text-center mb-3">
            Core Architectures
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex gap-2 p-2 bg-dark-900/20 border border-dark-850/50 rounded-lg">
              <Hourglass className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-bold text-white block">Rate Limiter</span>
                <span className="text-[9px] text-dark-400">Redis per-sender limits</span>
              </div>
            </div>

            <div className="flex gap-2 p-2 bg-dark-900/20 border border-dark-850/50 rounded-lg">
              <Zap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-bold text-white block">Queue Monitor</span>
                <span className="text-[9px] text-dark-400">Bull Board dashboard</span>
              </div>
            </div>

            <div className="flex gap-2 p-2 bg-dark-900/20 border border-dark-850/50 rounded-lg">
              <BellRing className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-bold text-white block">Slack Alerts</span>
                <span className="text-[9px] text-dark-400">Limit reach alerts</span>
              </div>
            </div>

            <div className="flex gap-2 p-2 bg-dark-900/20 border border-dark-850/50 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-bold text-white block">Restart Safe</span>
                <span className="text-[9px] text-dark-400">BullMQ job persistence</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer copyright */}
      <span className="absolute bottom-6 text-[10px] text-dark-500 tracking-wider">
        © 2026 ReachInbox. All rights reserved.
      </span>
    </div>
  );
};
