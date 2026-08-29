import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <AlertTriangle className="w-5 h-5 text-rose-400" />,
    info: <Info className="w-5 h-5 text-brand-400" />,
  };

  const borders = {
    success: 'border-emerald-500/30 bg-emerald-950/20',
    error: 'border-rose-500/30 bg-rose-950/20',
    info: 'border-brand-500/30 bg-brand-950/20',
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3.5 px-4.5 py-3.5 border ${borders[type]} rounded-lg shadow-2xl glass animate-in slide-in-from-bottom-5 duration-200`}
      role="alert"
    >
      {icons[type]}
      <span className="text-sm font-medium text-dark-100">{message}</span>
      <button
        onClick={onClose}
        className="p-0.5 rounded text-dark-400 hover:text-white hover:bg-dark-800 transition-all duration-200"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
