import React, { useState } from 'react';
import {
  Activity,
  Zap,
  TrendingUp,
  DollarSign,
  Clock,
  Minimize2,
  Maximize2,
  X,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TelemetryState, AppLanguage } from '../types';

interface LiveTelemetryMonitorProps {
  telemetry: TelemetryState;
  isOpen: boolean;
  onClose: () => void;
  language: AppLanguage;
  onClearLogs?: () => void;
}

export function LiveTelemetryMonitor({
  telemetry,
  isOpen,
  onClose,
  language,
  onClearLogs,
}: LiveTelemetryMonitorProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  const successRate = telemetry.totalRequests > 0
    ? ((telemetry.successfulRequests / telemetry.totalRequests) * 100).toFixed(1)
    : '100.00';

  const krwCost = Math.round(telemetry.totalCostUsd * 1420);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 md:w-96 rounded-2xl bg-white border-3 border-[#111111] shadow-[6px_6px_0_#111111] text-[#111111] overflow-hidden font-mono-neo text-xs transition-all duration-300 pointer-events-auto">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-[#ffd166] border-b-2 border-[#111111] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff477e] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff477e]"></span>
          </span>
          <span className="font-extrabold tracking-wider text-[11px] text-[#111111] uppercase">
            LITELLM PROXY MONITOR
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[#111111]">
          {onClearLogs && (
            <button
              onClick={onClearLogs}
              title="Reset metrics"
              className="p-1 hover:bg-white rounded border border-transparent hover:border-[#111111] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white rounded border border-transparent hover:border-[#111111] transition-colors cursor-pointer"
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" /> : <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#ff477e] hover:text-white rounded border border-transparent hover:border-[#111111] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-3.5 space-y-3 bg-[#fffbf2]">
          {/* 2-Column Metrics */}
          <div className="grid grid-cols-2 gap-2">
            {/* Tokens */}
            <div className="p-2.5 rounded-xl bg-white border-2 border-[#111111] shadow-[2px_2px_0_#111111]">
              <div className="flex items-center gap-1 text-[10px] text-[#555555] font-extrabold uppercase mb-1">
                <Zap className="w-3 h-3 text-[#ff477e]" />
                <span>TOKENS</span>
              </div>
              <div className="text-sm font-extrabold text-[#111111] truncate">
                {telemetry.totalInTokens.toLocaleString()} <span className="text-[#888888] font-normal">/</span> {telemetry.totalOutTokens.toLocaleString()}
              </div>
            </div>

            {/* Requests */}
            <div className="p-2.5 rounded-xl bg-white border-2 border-[#111111] shadow-[2px_2px_0_#111111]">
              <div className="flex items-center gap-1 text-[10px] text-[#555555] font-extrabold uppercase mb-1">
                <Activity className="w-3 h-3 text-[#00ffca]" />
                <span>REQUESTS</span>
              </div>
              <div className="text-sm font-extrabold text-[#111111]">
                {telemetry.totalRequests} <span className="text-[11px] text-[#ff477e] font-bold">@ {successRate}%</span>
              </div>
            </div>
          </div>

          {/* Estimated Cost */}
          <div className="p-2.5 rounded-xl bg-white border-2 border-[#111111] shadow-[2px_2px_0_#111111] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-[10px] text-[#555555] font-extrabold uppercase mb-0.5">
                <DollarSign className="w-3 h-3 text-[#00ffca]" />
                <span>ESTIMATED COST</span>
              </div>
              <div className="text-base font-extrabold text-[#111111]">
                ${telemetry.totalCostUsd.toFixed(6)}
              </div>
            </div>
            <div className="text-xs text-[#555555] font-bold">
              ≈ ₩{krwCost.toLocaleString()}
            </div>
          </div>

          {/* Live Stream Section */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-[#555555] font-extrabold uppercase mb-1.5 px-0.5">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#ff477e]" />
                <span>LIVE STREAM</span>
              </div>
              <span className="text-[#888888] font-bold">{telemetry.logs.length} calls</span>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px] scrollbar-thin">
              {telemetry.logs.length === 0 ? (
                <div className="p-3 text-center text-[#555555] rounded-lg bg-white border border-[#111111]">
                  Ready for API requests...
                </div>
              ) : (
                telemetry.logs.slice(-5).reverse().map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg bg-white border border-[#111111] shadow-[1px_1px_0_#111111] flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#111111] font-extrabold truncate max-w-[140px]">
                        {log.model}
                      </span>
                      <span className="text-[#555555] font-bold">{log.latencyMs}ms</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#555555]">
                      <span>In: {log.inTokens} | Out: {log.outTokens}</span>
                      <span className="text-[#ff477e] font-extrabold flex items-center gap-1">
                        ${log.costUsd.toFixed(6)}
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00ffca] border border-[#111111] inline-block"></span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Status Bar */}
          <div className="pt-1 border-t border-[#111111]/20 flex items-center justify-between text-[9px] text-[#555555] font-extrabold uppercase tracking-wider">
            <span>STATUS: OPERATIONAL</span>
            <span>V1.0.0-PROXY</span>
          </div>
        </div>
      )}
    </div>
  );
}
