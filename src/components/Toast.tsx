import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

export function Toast({ message, type, isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible || !message) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#111111] shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-white shrink-0" />,
    info: <Info className="w-5 h-5 text-[#111111] shrink-0" />,
  };

  const bgColors = {
    success: 'bg-[#00ffca] border-3 border-[#111111] text-[#111111] shadow-[5px_5px_0_#111111]',
    error: 'bg-[#ff477e] border-3 border-[#111111] text-white shadow-[5px_5px_0_#111111]',
    info: 'bg-[#ffd166] border-3 border-[#111111] text-[#111111] shadow-[5px_5px_0_#111111]',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md pointer-events-auto">
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${bgColors[type]}`}
      >
        <div className="flex items-center gap-2.5">
          {icons[type]}
          <span className="text-sm font-mono-neo font-bold leading-snug">{message}</span>
        </div>
        <button
          onClick={onClose}
          className="hover:opacity-75 p-1 rounded-md transition-colors cursor-pointer"
        >
          <X className="w-4 h-4 stroke-[3]" />
        </button>
      </div>
    </div>
  );
}
